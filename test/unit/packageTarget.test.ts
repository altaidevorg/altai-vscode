import { describe, expect, it } from "vitest";
import {
  formatNativeChecksum,
  parsePackageTargetArgs,
  planPackageTarget,
  resolveHostSourcePath,
  vsixArtifactName,
  PACKAGE_STAGING_ENTRIES,
} from "../../src/extension/host/packageTarget.js";

describe("planPackageTarget", () => {
  it("plans staging paths and vsix name for a release target", () => {
    const plan = planPackageTarget({
      target: "darwin-arm64",
      version: "0.1.0",
    });
    expect(plan.stagingDirRelative).toBe(".package/darwin-arm64");
    expect(plan.hostRelativePath).toBe(
      "resources/native/darwin-arm64/altai-agent-host",
    );
    expect(plan.checksumRelativePath).toBe(
      "resources/native/darwin-arm64/altai-agent-host.sha256",
    );
    expect(plan.vsixFileName).toBe("altai-0.1.0-darwin-arm64.vsix");
  });

  it("uses win32 executable name", () => {
    const plan = planPackageTarget({
      target: "win32-x64",
      version: "1.2.3",
    });
    expect(plan.hostFileName).toBe("altai-agent-host.exe");
    expect(vsixArtifactName("1.2.3", "win32-x64")).toBe(
      "altai-1.2.3-win32-x64.vsix",
    );
  });

  it("rejects unknown targets and bad versions", () => {
    expect(() =>
      planPackageTarget({ target: "linux-arm64", version: "0.1.0" }),
    ).toThrow(/unsupported package target/);
    expect(() =>
      planPackageTarget({ target: "linux-x64", version: "not-a-version" }),
    ).toThrow(/invalid extension version/);
  });
});

describe("resolveHostSourcePath", () => {
  it("prefers an explicit host override", () => {
    const result = resolveHostSourcePath({
      extensionRoot: "/ext",
      target: "linux-x64",
      hostOverride: "/bin/host",
      pathJoin: (...parts) => parts.join("/"),
      exists: (p) => p === "/bin/host",
    });
    expect(result).toEqual({
      ok: true,
      path: "/bin/host",
      source: "override",
    });
  });

  it("falls back to packaged layout", () => {
    const result = resolveHostSourcePath({
      extensionRoot: "/ext",
      target: "linux-x64",
      pathJoin: (...parts) => parts.join("/"),
      exists: (p) =>
        p === "/ext/resources/native/linux-x64/altai-agent-host",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("packaged");
      expect(result.path).toContain("resources/native/linux-x64");
    }
  });

  it("explains when no binary is available", () => {
    const result = resolveHostSourcePath({
      extensionRoot: "/ext",
      target: "darwin-x64",
      pathJoin: (...parts) => parts.join("/"),
      exists: () => false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/No host binary/);
    }
  });
});

describe("formatNativeChecksum / parsePackageTargetArgs", () => {
  it("normalizes checksum body", () => {
    const hex = "ab".repeat(32);
    expect(formatNativeChecksum(` ${hex.toUpperCase()} `)).toBe(`${hex}\n`);
    expect(() => formatNativeChecksum("short")).toThrow(/64 lowercase/);
  });

  it("parses CLI flags", () => {
    expect(
      parsePackageTargetArgs([
        "--target=linux-x64",
        "--host=/tmp/host",
        "--out-dir=artifacts",
        "--skip-verify",
      ]),
    ).toEqual({
      target: "linux-x64",
      host: "/tmp/host",
      outDir: "artifacts",
      skipVerify: true,
      help: false,
    });
    expect(parsePackageTargetArgs(["darwin-arm64"]).target).toBe(
      "darwin-arm64",
    );
  });

  it("lists required staging entries", () => {
    expect(PACKAGE_STAGING_ENTRIES).toContain("dist");
    expect(PACKAGE_STAGING_ENTRIES).toContain("package.json");
  });
});
