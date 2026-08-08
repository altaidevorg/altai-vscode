/**
 * Pure title/message for VS Code withProgress while agent host connects.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.110). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export function hostConnectingProgressPresentation(input: {
  status: string;
  message?: string;
}): { show: boolean; title: string } {
  if (input.status !== "connecting") {
    return { show: false, title: "" };
  }
  const detail = input.message?.trim();
  return {
    show: true,
    title: detail
      ? `ALTAI agent host: ${detail}`
      : "ALTAI agent host is starting…",
  };
}
