/**
 * Studio model catalog for VS Code host surfaces.
 * Keep in sync with altai-app MODELS (labels/ids); secrets never stored here.
 */

export type CatalogModelInfo = {
  id: string;
  label: string;
  providerId: string;
};

export const CATALOG_MODELS: readonly CatalogModelInfo[] = [
  {
    "id": "gpt-5.5",
    "providerId": "openai",
    "label": "GPT-5.5"
  },
  {
    "id": "gpt-5.4-mini",
    "providerId": "openai",
    "label": "GPT-5.4 mini"
  },
  {
    "id": "gpt-5.4-nano",
    "providerId": "openai",
    "label": "GPT-5.4 nano"
  },
  {
    "id": "gpt-5.3-codex",
    "providerId": "openai",
    "label": "GPT-5.3 Codex"
  },
  {
    "id": "gpt-4.1-mini",
    "providerId": "openai",
    "label": "GPT-4.1 mini"
  },
  {
    "id": "claude-opus-4-7",
    "providerId": "anthropic",
    "label": "Claude Opus 4.7"
  },
  {
    "id": "claude-sonnet-4-6",
    "providerId": "anthropic",
    "label": "Claude Sonnet 4.6"
  },
  {
    "id": "claude-haiku-4-5",
    "providerId": "anthropic",
    "label": "Claude Haiku 4.5"
  },
  {
    "id": "claude-opus-4-6",
    "providerId": "anthropic",
    "label": "Claude Opus 4.6"
  },
  {
    "id": "gemini-3.1-pro-preview",
    "providerId": "google",
    "label": "Gemini 3.1 Pro"
  },
  {
    "id": "gemini-3-flash-preview",
    "providerId": "google",
    "label": "Gemini 3 Flash"
  },
  {
    "id": "gemini-2.5-pro",
    "providerId": "google",
    "label": "Gemini 2.5 Pro"
  },
  {
    "id": "gemini-2.5-flash",
    "providerId": "google",
    "label": "Gemini 2.5 Flash"
  },
  {
    "id": "grok-4.20-reasoning",
    "providerId": "xai",
    "label": "Grok 4.20 Reasoning"
  },
  {
    "id": "grok-4.20-non-reasoning",
    "providerId": "xai",
    "label": "Grok 4.20"
  },
  {
    "id": "grok-4-fast-reasoning",
    "providerId": "xai",
    "label": "Grok 4 Fast"
  },
  {
    "id": "deepseek-v4-pro",
    "providerId": "deepseek",
    "label": "DeepSeek V4 Pro"
  },
  {
    "id": "deepseek-v4-flash",
    "providerId": "deepseek",
    "label": "DeepSeek V4 Flash"
  },
  {
    "id": "deepseek-reasoner",
    "providerId": "deepseek",
    "label": "DeepSeek Reasoner"
  },
  {
    "id": "mistral-large-latest",
    "providerId": "mistral",
    "label": "Mistral Large 3"
  },
  {
    "id": "mistral-medium-latest",
    "providerId": "mistral",
    "label": "Mistral Medium 3.5"
  },
  {
    "id": "codestral-latest",
    "providerId": "mistral",
    "label": "Codestral"
  },
  {
    "id": "glm-5.2",
    "providerId": "zai",
    "label": "GLM 5.2"
  },
  {
    "id": "glm-5.1",
    "providerId": "zai",
    "label": "GLM 5.1"
  },
  {
    "id": "glm-5-turbo",
    "providerId": "zai",
    "label": "GLM 5 Turbo"
  },
  {
    "id": "glm-4.7",
    "providerId": "zai",
    "label": "GLM 4.7"
  },
  {
    "id": "glm-4.7-flash",
    "providerId": "zai",
    "label": "GLM 4.7 Flash"
  },
  {
    "id": "glm-4.5-air",
    "providerId": "zai",
    "label": "GLM 4.5 Air"
  },
  {
    "id": "gpt-oss-120b",
    "providerId": "cerebras",
    "label": "GPT-OSS 120B"
  },
  {
    "id": "llama3.3-70b",
    "providerId": "cerebras",
    "label": "Llama 3.3 70B"
  },
  {
    "id": "qwen-3-32b",
    "providerId": "cerebras",
    "label": "Qwen 3 32B"
  },
  {
    "id": "openai/gpt-oss-20b",
    "providerId": "groq",
    "label": "GPT-OSS 20B"
  },
  {
    "id": "llama-3.3-70b-versatile",
    "providerId": "groq",
    "label": "Llama 3.3 70B"
  },
  {
    "id": "deepseek-r1-distill-llama-70b",
    "providerId": "groq",
    "label": "DeepSeek R1 Distill 70B"
  },
  {
    "id": "anthropic/claude-opus-4-7",
    "providerId": "openrouter",
    "label": "Claude Opus 4.7"
  },
  {
    "id": "anthropic/claude-sonnet-4-6",
    "providerId": "openrouter",
    "label": "Claude Sonnet 4.6"
  },
  {
    "id": "openai/gpt-5.5",
    "providerId": "openrouter",
    "label": "GPT-5.5"
  },
  {
    "id": "openai/gpt-5.4-mini",
    "providerId": "openrouter",
    "label": "GPT-5.4 mini"
  },
  {
    "id": "google/gemini-3.1-pro-preview",
    "providerId": "openrouter",
    "label": "Gemini 3.1 Pro"
  },
  {
    "id": "x-ai/grok-4.20-reasoning",
    "providerId": "openrouter",
    "label": "Grok 4.20 Reasoning"
  },
  {
    "id": "deepseek/deepseek-v4-pro",
    "providerId": "openrouter",
    "label": "DeepSeek V4 Pro"
  },
  {
    "id": "deepseek/deepseek-reasoner",
    "providerId": "openrouter",
    "label": "DeepSeek Reasoner"
  },
  {
    "id": "meta-llama/llama-4-scout-17b-16e-instruct",
    "providerId": "openrouter",
    "label": "Llama 4 Scout"
  },
  {
    "id": "meta-llama/llama-4-maverick",
    "providerId": "openrouter",
    "label": "Llama 4 Maverick"
  },
  {
    "id": "moonshotai/kimi-k2.5",
    "providerId": "openrouter",
    "label": "Kimi K2.5"
  },
  {
    "id": "qwen/qwen3-max",
    "providerId": "openrouter",
    "label": "Qwen 3 Max"
  },
  {
    "id": "qwen/qwen3-coder",
    "providerId": "openrouter",
    "label": "Qwen 3 Coder"
  },
  {
    "id": "mistralai/mistral-large-latest",
    "providerId": "openrouter",
    "label": "Mistral Large"
  },
  {
    "id": "z-ai/glm-4.6",
    "providerId": "openrouter",
    "label": "GLM 4.6"
  },
  {
    "id": "openai-compatible-custom",
    "providerId": "openai-compatible",
    "label": "Custom endpoint"
  },
  {
    "id": "lmstudio-local",
    "providerId": "lmstudio",
    "label": "LM Studio"
  },
  {
    "id": "mlx-local",
    "providerId": "mlx",
    "label": "MLX"
  }
];
