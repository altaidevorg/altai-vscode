/**
 * LSP-style Content-Length framing for the ALTAI stdio host protocol.
 * Mirrors altai-app `altai-protocol` FrameDecoder / encode_frame.
 */

export type FrameLimits = {
  maxHeaderBytes: number;
  maxFrameBytes: number;
};

export const DEFAULT_FRAME_LIMITS: FrameLimits = {
  maxHeaderBytes: 8 * 1024,
  maxFrameBytes: 4 * 1024 * 1024,
};

export type FrameErrorCode =
  | "header_too_large"
  | "invalid_header"
  | "missing_content_length"
  | "duplicate_content_length"
  | "invalid_content_length"
  | "frame_too_large";

export class FrameError extends Error {
  readonly code: FrameErrorCode;

  constructor(code: FrameErrorCode, message: string) {
    super(message);
    this.name = "FrameError";
    this.code = code;
  }
}

export function encodeFrame(body: Uint8Array | Buffer | string): Buffer {
  const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body);
  const header = Buffer.from(`Content-Length: ${bytes.length}\r\n\r\n`, "utf8");
  return Buffer.concat([header, bytes]);
}

export class FrameDecoder {
  private readonly limits: FrameLimits;
  private buffer = Buffer.alloc(0);

  constructor(limits: FrameLimits = DEFAULT_FRAME_LIMITS) {
    this.limits = limits;
  }

  push(chunk: Uint8Array | Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    const frames: Buffer[] = [];

    for (;;) {
      const headerEnd = findHeaderEnd(this.buffer);
      if (headerEnd === undefined) {
        if (this.buffer.length > this.limits.maxHeaderBytes) {
          throw new FrameError("header_too_large", "header exceeds configured limit");
        }
        break;
      }
      if (headerEnd > this.limits.maxHeaderBytes) {
        throw new FrameError("header_too_large", "header exceeds configured limit");
      }

      const length = parseContentLength(this.buffer.subarray(0, headerEnd));
      if (length > this.limits.maxFrameBytes) {
        throw new FrameError(
          "frame_too_large",
          `frame length ${length} exceeds configured limit ${this.limits.maxFrameBytes}`,
        );
      }

      const bodyStart = headerEnd + 4;
      const total = bodyStart + length;
      if (!Number.isSafeInteger(total) || total < bodyStart) {
        throw new FrameError("invalid_content_length", "invalid Content-Length header");
      }
      if (this.buffer.length < total) {
        break;
      }

      frames.push(Buffer.from(this.buffer.subarray(bodyStart, total)));
      this.buffer = Buffer.from(this.buffer.subarray(total));
    }

    return frames;
  }

  bufferedLen(): number {
    return this.buffer.length;
  }
}

function findHeaderEnd(bytes: Buffer): number | undefined {
  for (let i = 0; i + 3 < bytes.length; i += 1) {
    if (
      bytes[i] === 13 &&
      bytes[i + 1] === 10 &&
      bytes[i + 2] === 13 &&
      bytes[i + 3] === 10
    ) {
      return i;
    }
  }
  return undefined;
}

function parseContentLength(header: Buffer): number {
  const text = header.toString("utf8");
  let found: number | undefined;
  for (const line of text.split("\r\n")) {
    if (line.length === 0) {
      continue;
    }
    const colon = line.indexOf(":");
    if (colon <= 0) {
      throw new FrameError("invalid_header", "malformed frame header");
    }
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (name.toLowerCase() === "content-length") {
      if (found !== undefined) {
        throw new FrameError(
          "duplicate_content_length",
          "duplicate Content-Length header",
        );
      }
      if (!/^\d+$/.test(value)) {
        throw new FrameError(
          "invalid_content_length",
          "invalid Content-Length header",
        );
      }
      found = Number(value);
    }
  }
  if (found === undefined) {
    throw new FrameError("missing_content_length", "missing Content-Length header");
  }
  return found;
}
