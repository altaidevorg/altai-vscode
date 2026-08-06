import { describe, expect, it } from "vitest";
import {
  auditHostPinCompatibility,
  parseNativeHostPin,
} from "../../src/extension/host/hostPin.js";
import { COMPATIBILITY } from "../../src/extension/compatibility.js";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("parseNativeHostPin", () => {
  it("parses a valid pin document", () => {
    const result = parseNativeHostPin({
      agentHost: "0.1.0-cli-stdio",
      protocolMajor: 1,
      sourcePackage: "altai-cli",
      sourceRevision: "abc123",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pin.agentHost).toBe("0.1.0-cli-stdio");
      expect(result.pin.sourceRevision).toBe("abc123");
    }
  });

  it("rejects invalid pins", () => {
    const result = parseNativeHostPin({ agentHost: "", protocolMajor: 0 });
    expect(result.ok).toBe(false);
  });
});

describe("auditHostPinCompatibility", () => {
  it("matches repo PIN.json to COMPATIBILITY", () => {
    const raw = JSON.parse(
      readFileSync(
        path.resolve(process.cwd(), "resources/native/PIN.json"),
        "utf8",
      ),
    );
    const parsed = parseNativeHostPin(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      auditHostPinCompatibility({
        extensionAgentHost: COMPATIBILITY.agentHost,
        extensionProtocol: COMPATIBILITY.protocol,
        pin: parsed.pin,
      }),
    ).toEqual([]);
  });

  it("flags protocol and id mismatches", () => {
    const findings = auditHostPinCompatibility({
      extensionAgentHost: "other",
      extensionProtocol: 2,
      pin: {
        agentHost: "0.1.0-cli-stdio",
        protocolMajor: 1,
        sourcePackage: "altai-cli",
      },
    });
    expect(findings.map((f) => f.code).sort()).toEqual([
      "pin_host_id_mismatch",
      "pin_protocol_mismatch",
    ]);
  });
});
