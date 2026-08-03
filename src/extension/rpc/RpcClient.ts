import { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
import { encodeFrame, FrameDecoder, FrameError } from "./frameCodec.js";

export type JsonRpcId = string | number;

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type RpcNotification = {
  method: string;
  params?: unknown;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type RpcClientOptions = {
  onNotification?: (notification: RpcNotification) => void;
  onFrameError?: (error: FrameError) => void;
  onTransportError?: (error: Error) => void;
};

/**
 * JSON-RPC 2.0 client over Content-Length framed stdio streams.
 */
export class RpcClient extends EventEmitter {
  private readonly decoder = new FrameDecoder();
  private readonly pending = new Map<string, Pending>();
  private nextId = 1;
  private disposed = false;
  private readonly stdout: Readable;
  private readonly stdin: Writable;
  private readonly onNotification: ((notification: RpcNotification) => void) | undefined;
  private readonly onFrameError: ((error: FrameError) => void) | undefined;
  private readonly onTransportError: ((error: Error) => void) | undefined;
  private readonly onStdoutData: (chunk: Buffer) => void;
  private readonly onStdoutError: (error: Error) => void;

  constructor(
    stdin: Writable,
    stdout: Readable,
    options: RpcClientOptions = {},
  ) {
    super();
    this.stdin = stdin;
    this.stdout = stdout;
    this.onNotification = options.onNotification;
    this.onFrameError = options.onFrameError;
    this.onTransportError = options.onTransportError;

    this.onStdoutData = (chunk: Buffer) => {
      this.onData(chunk);
    };
    this.onStdoutError = (error: Error) => {
      this.failTransport(error);
    };
    stdout.on("data", this.onStdoutData);
    stdout.on("error", this.onStdoutError);
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    if (this.disposed) {
      throw new Error("rpc_client_disposed");
    }
    const id = this.nextId;
    this.nextId += 1;
    const key = String(id);
    const message: Record<string, unknown> = {
      jsonrpc: "2.0",
      id,
      method,
    };
    if (params !== undefined) {
      message.params = params;
    }

    const response = new Promise<unknown>((resolve, reject) => {
      this.pending.set(key, { resolve, reject });
    });
    try {
      this.writeMessage(message);
    } catch (error) {
      this.pending.delete(key);
      throw error instanceof Error ? error : new Error(String(error));
    }
    // dispose() during/after write rejects via the pending map; surface that path.
    if (this.disposed && !this.pending.has(key)) {
      return response;
    }
    return response;
  }

  notify(method: string, params?: unknown): void {
    if (this.disposed) {
      throw new Error("rpc_client_disposed");
    }
    const message: Record<string, unknown> = {
      jsonrpc: "2.0",
      method,
    };
    if (params !== undefined) {
      message.params = params;
    }
    this.writeMessage(message);
  }

  dispose(reason = "rpc_client_disposed"): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const error = new Error(reason);
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
    this.stdout.off("data", this.onStdoutData);
    this.stdout.off("error", this.onStdoutError);
    this.emit("disposed", reason);
  }

  private writeMessage(message: Record<string, unknown>): void {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    const frame = encodeFrame(body);
    const ok = this.stdin.write(frame);
    if (!ok) {
      // Backpressure: still valid; Node will drain. No action required.
    }
  }

  private onData(chunk: Buffer): void {
    if (this.disposed) {
      return;
    }
    let frames: Buffer[];
    try {
      frames = this.decoder.push(chunk);
    } catch (error) {
      const frameError =
        error instanceof FrameError
          ? error
          : new FrameError("invalid_header", String(error));
      this.onFrameError?.(frameError);
      this.dispose(`frame_error:${frameError.code}`);
      return;
    }

    for (const frame of frames) {
      this.handleFrame(frame);
    }
  }

  private handleFrame(frame: Buffer): void {
    let value: unknown;
    try {
      value = JSON.parse(frame.toString("utf8")) as unknown;
    } catch (error) {
      const err = new Error(
        `invalid_json:${error instanceof Error ? error.message : String(error)}`,
      );
      this.onTransportError?.(err);
      this.dispose(err.message);
      return;
    }

    if (!isRecord(value) || value.jsonrpc !== "2.0") {
      this.onTransportError?.(new Error("invalid_jsonrpc"));
      this.dispose("invalid_jsonrpc");
      return;
    }

    if (Object.prototype.hasOwnProperty.call(value, "id") && value.method === undefined) {
      this.handleResponse(value);
      return;
    }

    if (typeof value.method === "string") {
      const notification: RpcNotification = { method: value.method };
      if (Object.prototype.hasOwnProperty.call(value, "params")) {
        notification.params = value.params;
      }
      this.onNotification?.(notification);
      this.emit("notification", notification);
      return;
    }

    this.onTransportError?.(new Error("unrecognized_rpc_message"));
  }

  private handleResponse(value: Record<string, unknown>): void {
    const key = String(value.id);
    const pending = this.pending.get(key);
    if (!pending) {
      return;
    }
    this.pending.delete(key);
    if (isRecord(value.error) && typeof value.error.message === "string") {
      const err = new Error(value.error.message);
      (err as Error & { code?: unknown; data?: unknown }).code = value.error.code;
      (err as Error & { data?: unknown }).data = value.error.data;
      pending.reject(err);
      return;
    }
    pending.resolve(value.result);
  }

  private failTransport(error: Error): void {
    this.onTransportError?.(error);
    this.dispose(error.message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
