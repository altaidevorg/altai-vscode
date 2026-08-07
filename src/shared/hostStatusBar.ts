/**
 * Pure presentation for the host lifecycle status-bar badge.
 * No vscode imports.
 */

import type { HostStatusPayload } from "./messages.js";

export type HostStatusBarPresentation = {
  show: boolean;
  text: string;
  tooltip: string;
  command: string;
  warning: boolean;
};

export function hostStatusBarPresentation(
  status: Pick<HostStatusPayload, "status" | "message" | "diagnosticCode">,
): HostStatusBarPresentation {
  const message = status.message.trim() || status.status;
  if (status.status === "ready") {
    return {
      show: false,
      text: "$(check) ALTAI host",
      tooltip: message,
      command: "altai.openSidePanel",
      warning: false,
    };
  }
  if (status.status === "connecting") {
    return {
      show: true,
      text: "$(sync~spin) ALTAI host",
      tooltip: message,
      command: "altai.openSidePanel",
      warning: false,
    };
  }
  if (status.status === "error") {
    const detail = status.diagnosticCode
      ? `${message} (${status.diagnosticCode})`
      : message;
    return {
      show: true,
      text: "$(error) ALTAI host",
      tooltip: `${detail} — Run Diagnostics`,
      command: "altai.runDiagnostics",
      warning: true,
    };
  }
  // disconnected (or other non-ready)
  return {
    show: true,
    text: "$(debug-disconnect) ALTAI host",
    tooltip: `${message} — Open ALTAI`,
    command: "altai.openSidePanel",
    warning: false,
  };
}
