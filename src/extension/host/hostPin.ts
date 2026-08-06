/**
 * Native host version pin (alpha packaging).
 * Stored at resources/native/PIN.json and echoed into diagnostics/compat.
 */
export type NativeHostPin = {
  /** SemVer-ish identifier for the packaged stdio host build. */
  agentHost: string;
  protocolMajor: number;
  /** Upstream crate / binary name that was staged as altai-agent-host. */
  sourcePackage: string;
  /** Optional git SHA of the altai-app (or monorepo) used to build the host. */
  sourceRevision?: string;
  notes?: string;
};

export type HostPinFinding = {
  code: string;
  message: string;
};

export function parseNativeHostPin(raw: unknown):
  | { ok: true; pin: NativeHostPin }
  | { ok: false; findings: HostPinFinding[] } {
  const findings: HostPinFinding[] = [];
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      findings: [{ code: "pin_invalid", message: "PIN.json root must be an object" }],
    };
  }
  const obj = raw as Record<string, unknown>;
  const agentHost = obj.agentHost;
  const protocolMajor = obj.protocolMajor;
  const sourcePackage = obj.sourcePackage;

  if (typeof agentHost !== "string" || !agentHost.trim()) {
    findings.push({
      code: "pin_agent_host",
      message: "PIN.agentHost must be a non-empty string",
    });
  }
  if (typeof protocolMajor !== "number" || !Number.isInteger(protocolMajor) || protocolMajor < 1) {
    findings.push({
      code: "pin_protocol",
      message: "PIN.protocolMajor must be a positive integer",
    });
  }
  if (typeof sourcePackage !== "string" || !sourcePackage.trim()) {
    findings.push({
      code: "pin_source",
      message: "PIN.sourcePackage must be a non-empty string",
    });
  }

  if (findings.length > 0) {
    return { ok: false, findings };
  }

  const pin: NativeHostPin = {
    agentHost: String(agentHost).trim(),
    protocolMajor: protocolMajor as number,
    sourcePackage: String(sourcePackage).trim(),
  };
  if (typeof obj.sourceRevision === "string" && obj.sourceRevision.trim()) {
    pin.sourceRevision = obj.sourceRevision.trim();
  }
  if (typeof obj.notes === "string" && obj.notes.trim()) {
    pin.notes = obj.notes.trim();
  }
  return { ok: true, pin };
}

/**
 * Require the extension pin to match the native PIN document (protocol + id).
 */
export function auditHostPinCompatibility(options: {
  extensionAgentHost: string;
  extensionProtocol: number;
  pin: NativeHostPin;
}): HostPinFinding[] {
  const findings: HostPinFinding[] = [];
  if (options.extensionProtocol !== options.pin.protocolMajor) {
    findings.push({
      code: "pin_protocol_mismatch",
      message: `COMPATIBILITY.protocol=${options.extensionProtocol} != PIN.protocolMajor=${options.pin.protocolMajor}`,
    });
  }
  if (options.extensionAgentHost !== options.pin.agentHost) {
    findings.push({
      code: "pin_host_id_mismatch",
      message: `COMPATIBILITY.agentHost=${options.extensionAgentHost} != PIN.agentHost=${options.pin.agentHost}`,
    });
  }
  return findings;
}
