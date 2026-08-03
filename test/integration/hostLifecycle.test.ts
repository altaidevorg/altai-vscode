import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HostDiagnosticCode } from "../../src/extension/host/HostDiagnostics.js";
import { HostManager } from "../../src/extension/host/HostManager.js";
import { AGENT_HOST_PATH_ENV } from "../../src/extension/host/HostResolver.js";
import { spawnHostProcess } from "../../src/extension/host/HostProcess.js";

const fixtureHost = path.resolve(
  process.cwd(),
  "test/fixtures/mock-agent-host.mjs",
);

const managers: HostManager[] = [];

afterEach(async () => {
  for (const manager of managers.splice(0)) {
    await manager.shutdown();
    manager.dispose();
  }
});

function createManager(options: {
  trusted: boolean;
  hostPath?: string;
  envExtra?: Record<string, string>;
}): HostManager {
  const env = {
    ...process.env,
    ...(options.hostPath ? { [AGENT_HOST_PATH_ENV]: options.hostPath } : {}),
    ...options.envExtra,
  };
  // Ensure node can run the .mjs fixture when path points at the script.
  const manager = new HostManager({
    extensionPath: path.resolve("."),
    workspaceRoot: path.resolve("."),
    isTrusted: () => options.trusted,
    extensionVersion: "0.1.0",
    env,
    processFactory: (spawnOptions) => {
      const exe = spawnOptions.executablePath;
      if (exe.endsWith(".mjs")) {
        return spawnHostProcess({
          ...spawnOptions,
          executablePath: process.execPath,
          args: [exe, ...spawnOptions.args],
          env,
        });
      }
      return spawnHostProcess({ ...spawnOptions, env });
    },
    initializeTimeoutMs: 5_000,
  });
  managers.push(manager);
  return manager;
}

describe("host lifecycle integration", () => {
  it("start → initialize → restart → shutdown", async () => {
    const manager = createManager({
      trusted: true,
      hostPath: fixtureHost,
    });

    await manager.start();
    expect(manager.getLifecycleState()).toBe("Ready");
    expect(manager.getCapabilities()).toContain("stdio.serve");

    await manager.restart();
    expect(manager.getLifecycleState()).toBe("Ready");

    await manager.shutdown();
    expect(manager.getLifecycleState()).toBe("Idle");
  });

  it("reports missing path", async () => {
    const manager = createManager({
      trusted: true,
      hostPath: "/tmp/altai-definitely-missing-host-binary",
    });
    await manager.start();
    expect(manager.getLastDiagnostic()?.code).toBe(HostDiagnosticCode.Missing);
  });

  it("refuses untrusted workspace without spawning", async () => {
    const manager = createManager({
      trusted: false,
      hostPath: fixtureHost,
    });
    await manager.start();
    expect(manager.getLastDiagnostic()?.code).toBe(HostDiagnosticCode.Untrusted);
    expect(manager.getResolvedPath()).toBeUndefined();
  });

  it("records crash diagnostic from fixture", async () => {
    const manager = createManager({
      trusted: true,
      hostPath: fixtureHost,
      envExtra: { ALTAI_MOCK_HOST_CRASH: "1" },
    });
    await manager.start();
    expect(manager.getLifecycleState()).toBe("Ready");

    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (manager.getLifecycleState() === "Error") {
          clearInterval(timer);
          resolve();
        }
      }, 20);
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 3_000);
    });

    expect(manager.getLastDiagnostic()?.code).toBe(HostDiagnosticCode.Crashed);
  });
});
