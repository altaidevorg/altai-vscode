import { describe, expect, it } from "vitest";
import {
  auditVsixEntries,
  normalizeVsixEntry,
} from "../../src/extension/host/vsixContents.js";

describe("normalizeVsixEntry", () => {
  it("normalizes separators and trailing slash", () => {
    expect(normalizeVsixEntry("extension\\dist\\main.js\\")).toBe(
      "extension/dist/main.js",
    );
  });
});

describe("auditVsixEntries", () => {
  const goodLinux = [
    "extension/package.json",
    "extension/dist/extension/extension.js",
    "extension/dist/webview/main.js",
    "extension/dist/webview/main.css",
    "extension/media/altai-activity.svg",
    "extension/resources/native/linux-x64/altai-agent-host",
    "extension/resources/native/linux-x64/altai-agent-host.sha256",
  ];

  it("accepts a single-target linux VSIX entry set", () => {
    const result = auditVsixEntries({
      target: "linux-x64",
      entries: [
        ...goodLinux,
        "extension/resources/native/PIN.json",
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("requires win32 .exe host name", () => {
    const result = auditVsixEntries({
      target: "win32-x64",
      entries: [
        "extension/package.json",
        "extension/dist/extension/extension.js",
        "extension/dist/webview/main.js",
        "extension/dist/webview/main.css",
        "extension/resources/native/win32-x64/altai-agent-host.exe",
        "extension/resources/native/win32-x64/altai-agent-host.exe.sha256",
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing host, maps, extra targets, and src trees", () => {
    const result = auditVsixEntries({
      target: "linux-x64",
      entries: [
        "extension/package.json",
        "extension/dist/extension/extension.js",
        "extension/dist/webview/main.js",
        "extension/dist/webview/main.css",
        "extension/dist/webview/main.js.map",
        "extension/src/webview/main.ts",
        "extension/resources/native/darwin-arm64/altai-agent-host",
        "extension/resources/native/darwin-arm64/altai-agent-host.sha256",
      ],
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain("vsix_host_missing");
    expect(codes).toContain("vsix_checksum_missing");
    expect(codes).toContain("vsix_extra_target");
    expect(codes).toContain("vsix_source_map");
    expect(codes).toContain("vsix_dev_tree");
  });
});
