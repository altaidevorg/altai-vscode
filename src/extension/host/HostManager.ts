import type { HostStatusPayload } from "../../shared/messages.js";
import { CapabilityStore } from "../rpc/capabilityStore.js";
import type { FrameError } from "../rpc/frameCodec.js";
import { RpcClient } from "../rpc/RpcClient.js";
import {
  formatDiagnostic,
  HostDiagnosticCode,
  type HostDiagnostic,
} from "./HostDiagnostics.js";
import {
  crashDiagnostic,
  type HostProcessFactory,
  spawnHostProcess,
} from "./HostProcess.js";
import { resolveHostBinary } from "./HostResolver.js";

export type HostLifecycleState =
  | "Idle"
  | "Starting"
  | "Ready"
  | "Restarting"
  | "Stopping"
  | "Error";

export type HostManagerOptions = {
  extensionPath: string;
  workspaceRoot: string | undefined;
  isTrusted: () => boolean;
  onDidGrantTrust?: (listener: () => void) => { dispose: () => void };
  log?: (line: string) => void;
  onStatus?: (status: HostStatusPayload) => void;
  extensionVersion: string;
  processFactory?: HostProcessFactory;
  env?: NodeJS.ProcessEnv;
  initializeTimeoutMs?: number;
};

type ActiveSession = {
  rpc: RpcClient;
  kill: () => void;
  pid: number | undefined;
  intentionalStop: boolean;
};

/**
 * Lifecycle manager for one native agent host per extension host instance.
 */
export class HostManager {
  private state: HostLifecycleState = "Idle";
  private lastDiagnostic: HostDiagnostic | undefined;
  private resolvedPath: string | undefined;
  private session: ActiveSession | undefined;
  private readonly capabilities = new CapabilityStore();
  private readonly trustDisposable: { dispose: () => void } | undefined;
  private startGeneration = 0;
  private disposed = false;

  constructor(private readonly options: HostManagerOptions) {
    if (options.onDidGrantTrust) {
      this.trustDisposable = options.onDidGrantTrust(() => {
        void this.start();
      });
    }
  }

  getLifecycleState(): HostLifecycleState {
    return this.state;
  }

  getLastDiagnostic(): HostDiagnostic | undefined {
    return this.lastDiagnostic;
  }

  getResolvedPath(): string | undefined {
    return this.resolvedPath;
  }

  getCapabilities(): readonly string[] {
    return this.capabilities.list();
  }

  getStatus(): HostStatusPayload {
    const status = lifecycleToHostStatus(this.state);
    const message = this.lastDiagnostic
      ? formatDiagnostic(this.lastDiagnostic)
      : defaultMessage(this.state);
    const payload: HostStatusPayload = {
      status,
      message,
      extensionVersion: this.options.extensionVersion,
    };
    if (this.lastDiagnostic) {
      payload.diagnosticCode = this.lastDiagnostic.code;
    }
    return payload;
  }

  async start(): Promise<void> {
    if (this.disposed) {
      return;
    }
    if (this.state === "Starting" || this.state === "Ready" || this.state === "Restarting") {
      return;
    }
    if (!this.options.isTrusted()) {
      this.fail({
        code: HostDiagnosticCode.Untrusted,
        message: "Workspace is not trusted; native host will not start",
      });
      return;
    }
    if (!this.options.workspaceRoot) {
      this.fail({
        code: HostDiagnosticCode.SpawnFailed,
        message: "No workspace folder open for the agent host",
      });
      return;
    }

    const generation = ++this.startGeneration;
    this.setState("Starting");
    this.lastDiagnostic = undefined;
    this.publishStatus();

    const resolved = resolveHostBinary({
      extensionPath: this.options.extensionPath,
      ...(this.options.env !== undefined ? { env: this.options.env } : {}),
    });
    if (!resolved.ok) {
      this.fail(resolved.diagnostic);
      return;
    }
    this.resolvedPath = resolved.binary.executablePath;
    this.log(
      `[altai] starting host from ${resolved.binary.source}: ${this.resolvedPath}`,
    );

    const factory = this.options.processFactory ?? spawnHostProcess;
    let handle;
    try {
      handle = factory({
        executablePath: resolved.binary.executablePath,
        args: [
          "serve",
          "--stdio",
          "--protocol",
          "1",
          "--workspace",
          this.options.workspaceRoot,
        ],
        env: this.options.env ?? process.env,
      });
    } catch (error) {
      this.fail({
        code: HostDiagnosticCode.SpawnFailed,
        message: "Failed to spawn ALTAI agent host",
        details: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    let exitedEarly = false;
    handle.onExit((code, signal) => {
      if (generation !== this.startGeneration) {
        return;
      }
      const session = this.session;
      if (
        session?.intentionalStop ||
        this.state === "Stopping" ||
        this.state === "Restarting"
      ) {
        return;
      }
      exitedEarly = true;
      this.clearSession();
      this.fail(crashDiagnostic(code, signal));
    });

    handle.stderr.setEncoding("utf8");
    handle.stderr.on("data", (chunk: string) => {
      for (const line of String(chunk).split(/\r?\n/)) {
        if (line.length > 0) {
          this.log(`[host:stderr] ${line}`);
        }
      }
    });

    const rpc = new RpcClient(handle.stdin, handle.stdout, {
      onFrameError: (error: FrameError) => {
        if (generation !== this.startGeneration) {
          return;
        }
        this.log(`[altai] frame error: ${error.code}`);
        handle.kill("SIGTERM");
        this.clearSession();
        this.fail({
          code: HostDiagnosticCode.FrameError,
          message: "Corrupt or invalid host frame",
          details: error.code,
        });
      },
      onTransportError: (error) => {
        this.log(`[altai] rpc transport: ${error.message}`);
      },
    });

    this.session = {
      rpc,
      kill: () => handle.kill("SIGTERM"),
      pid: handle.pid,
      intentionalStop: false,
    };

    try {
      const result = await withTimeout(
        rpc.request("initialize", {
          protocol_min: 1,
          protocol_max: 1,
        }),
        this.options.initializeTimeoutMs ?? 10_000,
        "initialize timed out",
      );
      if (generation !== this.startGeneration || exitedEarly) {
        return;
      }
      if (!isCompatibleInitialize(result)) {
        this.stopSessionIntentional();
        this.fail({
          code: HostDiagnosticCode.Incompatible,
          message: "Host protocol is incompatible with this extension",
          details: summarizeInitialize(result),
        });
        return;
      }
      this.capabilities.setFromInitialize(result);
      this.setState("Ready");
      this.lastDiagnostic = undefined;
      this.publishStatus();
      this.log("[altai] host ready");
    } catch (error) {
      if (generation !== this.startGeneration) {
        return;
      }
      this.stopSessionIntentional();
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("frame_error")) {
        this.fail({
          code: HostDiagnosticCode.FrameError,
          message: "Corrupt or invalid host frame during initialize",
          details: message,
        });
        return;
      }
      this.fail({
        code: HostDiagnosticCode.Incompatible,
        message: "Host initialize failed",
        details: message,
      });
    }
  }

  async restart(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.setState("Restarting");
    this.publishStatus();
    await this.stopProcess();
    this.setState("Idle");
    await this.start();
  }

  async shutdown(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.setState("Stopping");
    this.publishStatus();
    const rpc = this.session?.rpc;
    if (rpc) {
      try {
        await withTimeout(rpc.request("shutdown"), 3_000, "shutdown timed out");
      } catch {
        // Best-effort; kill below.
      }
    }
    await this.stopProcess();
    this.capabilities.clear();
    this.setState("Idle");
    this.lastDiagnostic = undefined;
    this.publishStatus();
  }

  dispose(): void {
    this.disposed = true;
    this.trustDisposable?.dispose();
    this.startGeneration += 1;
    void this.stopProcess();
  }

  private async stopProcess(): Promise<void> {
    const session = this.session;
    this.session = undefined;
    if (!session) {
      return;
    }
    session.intentionalStop = true;
    session.rpc.dispose("host_stopped");
    session.kill();
  }

  private stopSessionIntentional(): void {
    const session = this.session;
    this.session = undefined;
    if (!session) {
      return;
    }
    session.intentionalStop = true;
    session.rpc.dispose("host_stopped");
    session.kill();
  }

  private clearSession(): void {
    const session = this.session;
    this.session = undefined;
    session?.rpc.dispose("host_cleared");
  }

  private fail(diagnostic: HostDiagnostic): void {
    this.lastDiagnostic = diagnostic;
    this.setState("Error");
    this.log(`[altai] ${formatDiagnostic(diagnostic)}`);
    this.publishStatus();
  }

  private setState(state: HostLifecycleState): void {
    this.state = state;
  }

  private publishStatus(): void {
    this.options.onStatus?.(this.getStatus());
  }

  private log(line: string): void {
    this.options.log?.(line);
  }
}

function lifecycleToHostStatus(
  state: HostLifecycleState,
): HostStatusPayload["status"] {
  switch (state) {
    case "Ready":
      return "ready";
    case "Starting":
    case "Restarting":
      return "connecting";
    case "Error":
      return "error";
    case "Idle":
    case "Stopping":
      return "disconnected";
  }
}

function defaultMessage(state: HostLifecycleState): string {
  switch (state) {
    case "Ready":
      return "ALTAI host ready";
    case "Starting":
      return "Starting ALTAI host…";
    case "Restarting":
      return "Restarting ALTAI host…";
    case "Stopping":
      return "Stopping ALTAI host…";
    case "Error":
      return "ALTAI host error";
    case "Idle":
      return "ALTAI host not connected";
  }
}

function isCompatibleInitialize(result: unknown): boolean {
  if (!isRecord(result)) {
    return false;
  }
  const min =
    typeof result.protocol_min === "number" ? result.protocol_min : undefined;
  const max =
    typeof result.protocol_max === "number" ? result.protocol_max : undefined;
  if (min === undefined || max === undefined) {
    return false;
  }
  return min <= 1 && max >= 1;
}

function summarizeInitialize(result: unknown): string {
  if (!isRecord(result)) {
    return "non-object result";
  }
  return `protocol_min=${String(result.protocol_min)} protocol_max=${String(result.protocol_max)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
