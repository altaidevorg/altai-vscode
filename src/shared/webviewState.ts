/**
 * Presentation-only Webview state persisted via vscodeApi getState/setState.
 * Must not hold privileged host context or secrets.
 */

export type PersistedHostStatus = {
  status: string;
  message: string;
  extensionVersion: string;
  diagnosticCode?: string;
};

export type PersistedWebviewState = {
  hostStatus?: PersistedHostStatus;
};

export function parsePersistedWebviewState(
  value: unknown,
): PersistedWebviewState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const hostStatus = record.hostStatus;
  if (!isPersistedHostStatus(hostStatus)) {
    return {};
  }

  return { hostStatus };
}

function isPersistedHostStatus(value: unknown): value is PersistedHostStatus {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.status !== "string" ||
    typeof record.message !== "string" ||
    typeof record.extensionVersion !== "string"
  ) {
    return false;
  }
  if (
    Object.prototype.hasOwnProperty.call(record, "diagnosticCode") &&
    typeof record.diagnosticCode !== "string"
  ) {
    return false;
  }
  return true;
}
