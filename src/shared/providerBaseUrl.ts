/**
 * Pure validation for OpenAI-compatible provider base URLs.
 * Secrets/API keys are never handled here.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.116). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export const MAX_PROVIDER_BASE_URL_CHARS = 2_048;

export function normalizeProviderBaseUrl(
  value: unknown,
  maxChars: number = MAX_PROVIDER_BASE_URL_CHARS,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > maxChars ||
    (!trimmed.startsWith("https://") && !trimmed.startsWith("http://"))
  ) {
    return null;
  }
  return trimmed;
}

export function providerRequiresBaseUrl(providerId: string): boolean {
  return providerId.trim() === "openai-compatible";
}
