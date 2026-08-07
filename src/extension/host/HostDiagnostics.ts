/**
 * Stable diagnostic codes for native host lifecycle failures.
 * Surfaced via output channel and host.status payloads.
 */

export const HostDiagnosticCode = {
  Untrusted: "host.untrusted",
  Missing: "host.missing",
  Corrupt: "host.corrupt",
  Incompatible: "host.incompatible",
  Crashed: "host.crashed",
  FrameError: "host.frame_error",
  SpawnFailed: "host.spawn_failed",
  NoWorkspace: "host.no_workspace",
} as const;

export type HostDiagnosticCode =
  (typeof HostDiagnosticCode)[keyof typeof HostDiagnosticCode];

export type HostDiagnostic = {
  code: HostDiagnosticCode;
  message: string;
  details?: string;
};

export function formatDiagnostic(diagnostic: HostDiagnostic): string {
  const detail = diagnostic.details ? ` (${diagnostic.details})` : "";
  return `[${diagnostic.code}] ${diagnostic.message}${detail}`;
}
