import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HostDiagnosticCode } from "../../src/extension/host/HostDiagnostics.js";
import {
  AGENT_HOST_PATH_ENV,
  resolveHostBinary,
} from "../../src/extension/host/HostResolver.js";

describe("resolveHostBinary", () => {
  it("prefers env override", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "altai-resolve-"));
    const exe = path.join(dir, "host");
    writeFileSync(exe, "ok");
    chmodSync(exe, 0o755);

    const result = resolveHostBinary({
      extensionPath: "/unused",
      env: { [AGENT_HOST_PATH_ENV]: exe },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binary.source).toBe("env");
      expect(result.binary.executablePath).toContain("host");
    }
  });

  it("prefers settings override over env", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "altai-resolve-set-"));
    const fromSettings = path.join(dir, "from-settings");
    const fromEnv = path.join(dir, "from-env");
    writeFileSync(fromSettings, "settings");
    writeFileSync(fromEnv, "env");
    chmodSync(fromSettings, 0o755);
    chmodSync(fromEnv, 0o755);

    const result = resolveHostBinary({
      extensionPath: "/unused",
      env: { [AGENT_HOST_PATH_ENV]: fromEnv },
      agentHostPathOverride: fromSettings,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binary.source).toBe("settings");
      expect(result.binary.executablePath).toContain("from-settings");
    }
  });

  it("detects corrupt packaged digest", () => {
    const ext = mkdtempSync(path.join(tmpdir(), "altai-pack-"));
    const native = path.join(ext, "resources", "native", "darwin-arm64");
    mkdirSync(native, { recursive: true });
    const exe = path.join(native, "altai-agent-host");
    writeFileSync(exe, "binary-bytes");
    chmodSync(exe, 0o755);
    writeFileSync(`${exe}.sha256`, "0".repeat(64));

    const result = resolveHostBinary({
      extensionPath: ext,
      env: {},
      platform: "darwin",
      arch: "arm64",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe(HostDiagnosticCode.Corrupt);
    }

    const good = createHash("sha256").update("binary-bytes").digest("hex");
    writeFileSync(`${exe}.sha256`, good);
    const ok = resolveHostBinary({
      extensionPath: ext,
      env: {},
      platform: "darwin",
      arch: "arm64",
    });
    expect(ok.ok).toBe(true);
  });

  it("rejects relative env override paths", () => {
    const result = resolveHostBinary({
      extensionPath: "/unused",
      env: { [AGENT_HOST_PATH_ENV]: "relative/altai-host" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe(HostDiagnosticCode.Corrupt);
    }
  });

  it("rejects non-executable env override on unix", () => {
    if (process.platform === "win32") {
      return;
    }
    const dir = mkdtempSync(path.join(tmpdir(), "altai-resolve-"));
    const exe = path.join(dir, "host");
    writeFileSync(exe, "ok");
    chmodSync(exe, 0o644);

    const result = resolveHostBinary({
      extensionPath: "/unused",
      env: { [AGENT_HOST_PATH_ENV]: exe },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toBe(HostDiagnosticCode.Corrupt);
    }
  });
});
