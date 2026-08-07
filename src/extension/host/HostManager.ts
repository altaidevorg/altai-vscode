import { EventEmitter } from "node:events";
import type { HostStatusPayload } from "../../shared/messages.js";
import { CapabilityStore } from "../rpc/capabilityStore.js";
import type { FrameError as RpcFrameError } from "../rpc/frameCodec.js";
import { RpcClient, type RpcNotification } from "../rpc/RpcClient.js";
import {
  formatDiagnostic,
  HostDiagnosticCode,
  type HostDiagnostic,
} from "./HostDiagnostics.js";
import {
  crashDiagnostic,
  type HostProcessFactory,
  type HostProcessHandle,
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
  /** Current workspace root for the host `--workspace` arg (re-read on each start). */
  getWorkspaceRoot: () => string | undefined;
  isTrusted: () => boolean;
  onDidGrantTrust?: (listener: () => void) => { dispose: () => void };
  log?: (line: string) => void;
  onStatus?: (status: HostStatusPayload) => void;
  extensionVersion: string;
  processFactory?: HostProcessFactory;
  env?: NodeJS.ProcessEnv;
  initializeTimeoutMs?: number;
  /** Absolute agent host path from `altai.agentHostPath` (may be empty). */
  getAgentHostPathOverride?: () => string | undefined;
};

type ActiveSession = {
  rpc: RpcClient;
  kill: () => void;
  disposeListeners: () => void;
  pid: number | undefined;
  intentionalStop: boolean;
};

type HostManagerEvents = {
  notification: [RpcNotification];
};

/**
 * Lifecycle manager for one native agent host per extension host instance.
 */
export class HostManager extends EventEmitter<HostManagerEvents> {
  private state: HostLifecycleState = "Idle";
  private lastDiagnostic: HostDiagnostic | undefined;
  private resolvedPath: string | undefined;
  private session: ActiveSession | undefined;
  private readonly capabilities = new CapabilityStore();
  private readonly trustDisposable: { dispose: () => void } | undefined;
  private startGeneration = 0;
  private disposed = false;
  /** Last --workspace path passed to a successful or attempted spawn. */
  private lastSpawnedWorkspaceRoot: string | undefined;

  constructor(private readonly options: HostManagerOptions) {
    super();
    if (options.onDidGrantTrust) {
      this.trustDisposable = options.onDidGrantTrust(() => {
        void this.start();
      });
    }
  }

  /**
   * Forward a JSON-RPC request to the ready native host.
   * Rejects when the host is not Ready.
   */
  async request(method: string, params?: unknown): Promise<unknown> {
    const rpc = this.session?.rpc;
    if (!rpc || this.state !== "Ready") {
      throw new Error("host_not_ready");
    }
    return rpc.request(method, params);
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
    const workspaceRoot = this.options.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.fail({
        code: HostDiagnosticCode.NoWorkspace,
        message: "No workspace folder open for the agent host",
      });
      return;
    }
    this.lastSpawnedWorkspaceRoot = workspaceRoot;

    const generation = ++this.startGeneration;
    this.setState("Starting");
    this.lastDiagnostic = undefined;
    this.publishStatus();

    const pathOverride = this.options.getAgentHostPathOverride?.()?.trim();
    const resolved = resolveHostBinary({
      extensionPath: this.options.extensionPath,
      ...(this.options.env !== undefined ? { env: this.options.env } : {}),
      ...(pathOverride ? { agentHostPathOverride: pathOverride } : {}),
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
    let handle: HostProcessHandle;
    try {
      handle = factory({
        executablePath: resolved.binary.executablePath,
        args: [
          "serve",
          "--stdio",
          "--protocol",
          "1",
          "--workspace",
          workspaceRoot,
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
    const onStderr = (chunk: string): void => {
      for (const line of String(chunk).split(/\r?\n/)) {
        if (line.length > 0) {
          this.log(`[host:stderr] ${line}`);
        }
      }
    };
    handle.stderr.setEncoding("utf8");
    handle.stderr.on("data", onStderr);

    const removeExitListener = handle.onExit((code, signal) => {
      if (generation !== this.startGeneration) {
        return;
      }
      const session = this.session;
      if (
        !session ||
        session.intentionalStop ||
        this.state === "Stopping" ||
        this.state === "Restarting"
      ) {
        return;
      }
      exitedEarly = true;
      this.clearSession();
      this.fail(crashDiagnostic(code, signal));
    });

    const disposeListeners = (): void => {
      handle.stderr.off("data", onStderr);
      removeExitListener();
    };

    const rpc = new RpcClient(handle.stdin, handle.stdout, {
      onNotification: (notification) => {
        if (generation !== this.startGeneration) {
          return;
        }
        this.emit("notification", notification);
      },
      onFrameError: (error: RpcFrameError) => {
        if (generation !== this.startGeneration) {
          return;
        }
        this.log(`[altai] frame error: ${error.code}`);
        // Mark intentional before kill so the exit handler does not report crash.
        this.stopSessionIntentional();
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
      kill: () => {
        try {
          handle.kill("SIGTERM");
        } catch {
          // Process may already be gone.
        }
      },
      disposeListeners,
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
      // Frame errors are already failed via onFrameError; avoid double-report.
      if (this.state === "Error" && this.hasFrameErrorDiagnostic()) {
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

  async restart(options?: { force?: boolean }): Promise<void> {
    if (this.disposed) {
      return;
    }
    const force = options?.force === true;
    const nextRoot = this.options.getWorkspaceRoot();
    if (
      !force &&
      this.state === "Ready" &&
      nextRoot !== undefined &&
      nextRoot === this.lastSpawnedWorkspaceRoot
    ) {
      this.log(
        "[altai] restart skipped; host already ready for current workspace root",
      );
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
    this.stopSessionIntentional();
  }

  private stopSessionIntentional(): void {
    const session = this.session;
    this.session = undefined;
    if (!session) {
      return;
    }
    session.intentionalStop = true;
    session.disposeListeners();
    session.rpc.dispose("host_stopped");
    session.kill();
  }

  private clearSession(): void {
    const session = this.session;
    this.session = undefined;
    if (!session) {
      return;
    }
    session.disposeListeners();
    session.rpc.dispose("host_cleared");
  }

  private hasFrameErrorDiagnostic(): boolean {
    return this.lastDiagnostic?.code === HostDiagnosticCode.FrameError;
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
