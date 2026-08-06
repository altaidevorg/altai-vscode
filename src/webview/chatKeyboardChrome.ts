/**
 * Pure key helpers for dismissible Chat chrome.
 */

export function isEscapeDismissKey(input: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (input.metaKey || input.ctrlKey || input.altKey) {
    return false;
  }
  return input.key === "Escape";
}
