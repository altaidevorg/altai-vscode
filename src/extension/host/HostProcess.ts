import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
import { HostDiagnosticCode, type HostDiagnostic } from "./HostDiagnostics.js";

export type HostProcessStreams = {
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
};

export type HostProcessHandle = HostProcessStreams & {
  pid: number | undefined;
  kill: (signal?: NodeJS.Signals) => boolean;
  onExit: (listener: (code: number | null, signal: NodeJS.Signals | null) => void) => void;
};

export type SpawnHostOptions = {
  executablePath: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type HostProcessFactory = (options: SpawnHostOptions) => HostProcessHandle;

/**
 * Spawn the native host with piped stdio. Never uses a shell.
 */
export function spawnHostProcess(options: SpawnHostOptions): HostProcessHandle {
  const child: ChildProcessWithoutNullStreams = spawn(
    options.executablePath,
    options.args,
    {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      cwd: options.cwd,
      env: options.env,
    },
  );

  return {
    stdin: child.stdin,
    stdout: child.stdout,
    stderr: child.stderr,
    pid: child.pid,
    kill: (signal) => child.kill(signal),
    onExit: (listener) => {
      child.once("exit", listener);
    },
  };
}

export type HostProcessEvents = {
  stderr: [line: string];
  exit: [code: number | null, signal: NodeJS.Signals | null];
  spawnError: [diagnostic: HostDiagnostic];
};

/**
 * Thin wrapper that redacts stderr lines for the output channel.
 */
export class HostProcessController extends EventEmitter {
  private handle: HostProcessHandle | undefined;

  spawn(options: SpawnHostOptions, factory: HostProcessFactory = spawnHostProcess): void {
    try {
      this.handle = factory(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit("spawnError", {
        code: HostDiagnosticCode.SpawnFailed,
        message: "Failed to spawn ALTAI agent host",
        details: message,
      } satisfies HostDiagnostic);
      return;
    }

    this.handle.stderr.setEncoding("utf8");
    this.handle.stderr.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.length === 0) {
          continue;
        }
        this.emit("stderr", redactSecrets(line));
      }
    });

    this.handle.onExit((code, signal) => {
      this.emit("exit", code, signal);
    });
  }

  get streams(): HostProcessStreams | undefined {
    if (!this.handle) {
      return undefined;
    }
    return {
      stdin: this.handle.stdin,
      stdout: this.handle.stdout,
      stderr: this.handle.stderr,
    };
  }

  get pid(): number | undefined {
    return this.handle?.pid;
  }

  kill(signal: NodeJS.Signals = "SIGTERM"): void {
    this.handle?.kill(signal);
  }
}

export function redactSecrets(line: string): string {
  return line
    .replace(
      /(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

export function crashDiagnostic(
  code: number | null,
  signal: NodeJS.Signals | null,
): HostDiagnostic {
  return {
    code: HostDiagnosticCode.Crashed,
    message: "ALTAI agent host exited unexpectedly",
    details: `code=${code ?? "null"} signal=${signal ?? "null"}`,
  };
}
