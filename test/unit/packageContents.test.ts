import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isSupportedNativeTarget,
  nativeHostFileName,
  packagedNativeDirRelative,
  platformArchToTarget,
  SUPPORTED_NATIVE_TARGETS,
} from "../../src/extension/host/nativeTargets.js";
import {
  auditManifest,
  auditPackageContents,
} from "../../src/extension/host/packageContents.js";

describe("nativeTargets", () => {
  it("lists release packaging targets", () => {
    expect(SUPPORTED_NATIVE_TARGETS).toEqual([
      "darwin-arm64",
      "darwin-x64",
      "linux-x64",
      "win32-x64",
    ]);
    expect(isSupportedNativeTarget("darwin-arm64")).toBe(true);
    expect(isSupportedNativeTarget("linux-arm64")).toBe(false);
  });

  it("maps platform+arch and host filenames", () => {
    expect(platformArchToTarget("darwin", "arm64")).toBe("darwin-arm64");
    expect(platformArchToTarget("linux", "arm64")).toBeUndefined();
    expect(nativeHostFileName("win32")).toBe("altai-agent-host.exe");
    expect(nativeHostFileName("darwin")).toBe("altai-agent-host");
    expect(packagedNativeDirRelative("linux-x64")).toBe(
      "resources/native/linux-x64",
    );
  });
});

describe("auditManifest", () => {
  it("requires workspace extensionKind and limited untrusted workspaces", () => {
    const findings = auditManifest({
      name: "altai",
      main: "./dist/extension/extension.js",
      engines: { vscode: "^1.90.0" },
      extensionKind: ["workspace"],
      capabilities: {
        untrustedWorkspaces: { supported: "limited" },
        virtualWorkspaces: { supported: "limited" },
      },
    });
    expect(findings.filter((f) => f.level === "error")).toHaveLength(0);
  });

  it("rejects UI-only extensionKind and missing trust limits", () => {
    const findings = auditManifest({
      name: "altai",
      main: "./wrong.js",
      engines: { vscode: "^1.90.0" },
      extensionKind: ["ui"],
      capabilities: {
        untrustedWorkspaces: { supported: true },
        virtualWorkspaces: { supported: true },
      },
    });
    const codes = findings.map((f) => f.code);
    expect(codes).toContain("manifest_main");
    expect(codes).toContain("manifest_extension_kind");
    expect(codes).toContain("manifest_untrusted");
    expect(codes).toContain("manifest_virtual");
  });
});

describe("auditPackageContents", () => {
  it("accepts a minimal built tree without native hosts", () => {
    const root = mkdtempSync(path.join(tmpdir(), "altai-pkg-"));
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "altai",
        main: "./dist/extension/extension.js",
        engines: { vscode: "^1.90.0" },
        extensionKind: ["workspace"],
        capabilities: {
          untrustedWorkspaces: { supported: "limited" },
          virtualWorkspaces: { supported: "limited" },
        },
      }),
    );
    mkdirSync(path.join(root, "dist", "extension"), { recursive: true });
    mkdirSync(path.join(root, "dist", "webview"), { recursive: true });
    writeFileSync(path.join(root, "dist", "extension", "extension.js"), "export {};");
    writeFileSync(path.join(root, "dist", "webview", "main.js"), "console.log(1)");
    writeFileSync(path.join(root, "dist", "webview", "main.css"), "/* ok */");

    const result = auditPackageContents({ extensionRoot: root });
    expect(result.ok).toBe(true);
  });

  it("validates packaged native host checksum and rejects unknown targets", () => {
    const root = mkdtempSync(path.join(tmpdir(), "altai-pkg-native-"));
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "altai",
        main: "./dist/extension/extension.js",
        engines: { vscode: "^1.90.0" },
        extensionKind: ["workspace"],
        capabilities: { untrustedWorkspaces: { supported: "limited" } },
      }),
    );
    mkdirSync(path.join(root, "dist", "extension"), { recursive: true });
    mkdirSync(path.join(root, "dist", "webview"), { recursive: true });
    writeFileSync(path.join(root, "dist", "extension", "extension.js"), "export {};");
    writeFileSync(path.join(root, "dist", "webview", "main.js"), "ok");
    writeFileSync(path.join(root, "dist", "webview", "main.css"), "/* ok */");

    const goodDir = path.join(root, "resources", "native", "darwin-arm64");
    mkdirSync(goodDir, { recursive: true });
    const exe = path.join(goodDir, "altai-agent-host");
    writeFileSync(exe, "binary-bytes");
    chmodSync(exe, 0o755);
    writeFileSync(
      `${exe}.sha256`,
      createHash("sha256").update("binary-bytes").digest("hex"),
    );

    const badDir = path.join(root, "resources", "native", "freebsd-x64");
    mkdirSync(badDir, { recursive: true });

    const badChecksum = auditPackageContents({
      extensionRoot: root,
      expectedSingleTarget: "darwin-arm64",
    });
    expect(badChecksum.ok).toBe(false);
    expect(badChecksum.findings.map((f) => f.code)).toContain(
      "native_unknown_target",
    );

    // Remove unknown target; require mismatch-free single target.
    rmSync(badDir, { recursive: true, force: true });
    writeFileSync(`${exe}.sha256`, "0".repeat(64));
    const mismatch = auditPackageContents({
      extensionRoot: root,
      expectedSingleTarget: "darwin-arm64",
    });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.findings.map((f) => f.code)).toContain(
      "native_checksum_mismatch",
    );
  });

  it("requires native hosts when mandated", () => {
    const root = mkdtempSync(path.join(tmpdir(), "altai-pkg-req-"));
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "altai",
        main: "./dist/extension/extension.js",
        engines: { vscode: "^1.90.0" },
        extensionKind: ["workspace"],
        capabilities: { untrustedWorkspaces: { supported: "limited" } },
      }),
    );
    mkdirSync(path.join(root, "dist", "extension"), { recursive: true });
    mkdirSync(path.join(root, "dist", "webview"), { recursive: true });
    writeFileSync(path.join(root, "dist", "extension", "extension.js"), "export {};");
    writeFileSync(path.join(root, "dist", "webview", "main.js"), "ok");
    writeFileSync(path.join(root, "dist", "webview", "main.css"), "/* ok */");

    const result = auditPackageContents({
      extensionRoot: root,
      requireNativeHosts: true,
      requireTargets: ["linux-x64"],
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("native_root_missing");
  });
});
