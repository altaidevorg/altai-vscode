/**
 * Known AI providers for ALTAI Settings / command palette.
 * API keys are entered only via Extension Host password prompts — never Webview.
 */

export type KnownProvider = {
  id: string;
  label: string;
  /** Optional hint for expected key shape (not enforced client-side). */
  keyHint?: string;
  /** Console URL for “Get key”. */
  consoleUrl?: string;
  /** Requires an OpenAI-compatible HTTP(S) base URL before the key. */
  requiresBaseUrl?: boolean;
  /** No API key required (local runtimes). */
  keyless?: boolean;
};

export const KNOWN_PROVIDERS: readonly KnownProvider[] = [
  {
    id: "openai",
    label: "OpenAI",
    keyHint: "sk-…",
    consoleUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    keyHint: "sk-ant-…",
    consoleUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "google",
    label: "Google",
    consoleUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "xai",
    label: "xAI",
    keyHint: "xai-…",
    consoleUrl: "https://console.x.ai/",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    keyHint: "csk-…",
    consoleUrl: "https://cloud.cerebras.ai/",
  },
  {
    id: "groq",
    label: "Groq",
    keyHint: "gsk_…",
    consoleUrl: "https://console.groq.com/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    keyHint: "sk-…",
    consoleUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "mistral",
    label: "Mistral",
    consoleUrl: "https://console.mistral.ai/api-keys/",
  },
  {
    id: "zai",
    label: "Z.AI",
    consoleUrl: "https://z.ai/manage-apikey/apikey-list",
  },
  {
    id: "zai-coding-plan",
    label: "Z.AI Coding Plan",
    consoleUrl: "https://z.ai/manage-apikey/apikey-list",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyHint: "sk-or-…",
    consoleUrl: "https://openrouter.ai/keys",
  },
  {
    id: "openai-compatible",
    label: "OpenAI Compatible",
    requiresBaseUrl: true,
    consoleUrl: "https://platform.openai.com/docs/api-reference",
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    keyless: true,
    consoleUrl: "https://lmstudio.ai/docs/basics/server",
  },
  {
    id: "mlx",
    label: "MLX",
    keyless: true,
    consoleUrl: "https://github.com/ml-explore/mlx-lm",
  },
] as const;

export function knownProviderById(id: string): KnownProvider | undefined {
  return KNOWN_PROVIDERS.find((p) => p.id === id);
}

export function knownProviderLabel(id: string): string {
  return knownProviderById(id)?.label ?? id;
}
