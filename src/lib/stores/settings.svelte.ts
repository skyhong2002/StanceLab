import { browser } from "$app/environment";
import { DEFAULT_PROMPTS, type PersonaKind } from "$lib/data/personas";

const STORAGE_KEY = "mentora.settings.v1";
export type ApiProviderId = "openrouter" | "opencode-go";

export interface ApiProviderOption {
  id: ApiProviderId;
  name: string;
  keyLabel: string;
  keyPlaceholder: string;
  help: string;
  keyUrl: string;
  endpoint: string;
}

export const API_PROVIDERS: ApiProviderOption[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    keyLabel: "OpenRouter API key",
    keyPlaceholder: "sk-or-v1-...",
    help: "Use any OpenRouter chat-completions model.",
    keyUrl: "https://openrouter.ai/keys",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    keyLabel: "OpenCode Go API key",
    keyPlaceholder: "sk-...",
    help: "Use OpenCode Go models exposed through its chat-completions endpoint.",
    keyUrl: "https://opencode.ai/zen",
    endpoint: "/api/opencode-go/chat",
  },
];

export const DEFAULT_MODEL_BY_PROVIDER: Record<ApiProviderId, string> = {
  openrouter: "anthropic/claude-sonnet-4.6",
  "opencode-go": "glm-5.1",
};

const DEFAULT_MODEL = DEFAULT_MODEL_BY_PROVIDER.openrouter;

interface Persisted {
  apiProvider: ApiProviderId;
  apiKey: string;
  model: string;
  prompts: Record<PersonaKind, string>;
  demoMode: boolean;
}

function defaults(): Persisted {
  return {
    apiProvider: "openrouter",
    apiKey: "",
    model: DEFAULT_MODEL,
    prompts: { ...DEFAULT_PROMPTS },
    demoMode: false,
  };
}

function load(): Persisted {
  if (!browser) return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const apiProvider: ApiProviderId =
      parsed.apiProvider === "opencode-go" ? "opencode-go" : "openrouter";
    return {
      apiProvider,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model:
        typeof parsed.model === "string" && parsed.model
          ? parsed.model
          : DEFAULT_MODEL_BY_PROVIDER[apiProvider],
      prompts: { ...DEFAULT_PROMPTS, ...(parsed.prompts ?? {}) },
      demoMode: !!parsed.demoMode,
    };
  } catch {
    return defaults();
  }
}

const initial = load();

export const settings = $state<Persisted>({ ...initial });

if (browser) {
  $effect.root(() => {
    $effect(() => {
      const payload = JSON.stringify({
        apiProvider: settings.apiProvider,
        apiKey: settings.apiKey,
        model: settings.model,
        prompts: settings.prompts,
        demoMode: settings.demoMode,
      });
      localStorage.setItem(STORAGE_KEY, payload);
    });
  });
}

export type ModelProvider = "anthropic" | "openai" | "google" | "opencode";

export interface ModelOption {
  apiProvider: ApiProviderId;
  id: string;
  name: string;
  provider: ModelProvider;
  blurb: string;
  tier: "flagship" | "balanced" | "fast";
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    apiProvider: "openrouter",
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    blurb: "在三種聲音間都能細膩推理。",
    tier: "flagship",
  },
  {
    apiProvider: "openrouter",
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "google",
    blurb: "長脈絡推理，預覽版。",
    tier: "flagship",
  },
  {
    apiProvider: "openrouter",
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
    blurb: "回應俐落，成本低廉。",
    tier: "fast",
  },
  {
    apiProvider: "openrouter",
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    blurb: "OpenAI 全能旗艦。",
    tier: "flagship",
  },
  {
    apiProvider: "openrouter",
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    blurb: "更小、更快、更便宜。",
    tier: "fast",
  },
  {
    apiProvider: "opencode-go",
    id: "glm-5.1",
    name: "GLM-5.1",
    provider: "opencode",
    blurb: "Strong Go coding model with the highest per-request budget.",
    tier: "flagship",
  },
  {
    apiProvider: "opencode-go",
    id: "glm-5",
    name: "GLM-5",
    provider: "opencode",
    blurb: "Balanced reasoning through OpenCode Go.",
    tier: "balanced",
  },
  {
    apiProvider: "opencode-go",
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    provider: "opencode",
    blurb: "Current Kimi option on the Go chat endpoint.",
    tier: "balanced",
  },
  {
    apiProvider: "opencode-go",
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    provider: "opencode",
    blurb: "Lower-cost Kimi option for longer sessions.",
    tier: "balanced",
  },
  {
    apiProvider: "opencode-go",
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "opencode",
    blurb: "Deeper reasoning model on Go.",
    tier: "flagship",
  },
  {
    apiProvider: "opencode-go",
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "opencode",
    blurb: "Fast, high-volume Go model.",
    tier: "fast",
  },
  {
    apiProvider: "opencode-go",
    id: "mimo-v2.5",
    name: "MiMo-V2.5",
    provider: "opencode",
    blurb: "Long-context Go chat model.",
    tier: "balanced",
  },
  {
    apiProvider: "opencode-go",
    id: "mimo-v2.5-pro",
    name: "MiMo-V2.5 Pro",
    provider: "opencode",
    blurb: "Higher-capability MiMo option.",
    tier: "flagship",
  },
];

export function getModelOptions(apiProvider: ApiProviderId): ModelOption[] {
  return MODEL_OPTIONS.filter((m) => m.apiProvider === apiProvider);
}

export function getSuggestedModels(apiProvider: ApiProviderId): string[] {
  return getModelOptions(apiProvider).map((m) => m.id);
}

export const SUGGESTED_MODELS = getSuggestedModels("openrouter");

export const PROVIDER_LABEL: Record<ModelProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  opencode: "Go",
};

export function clearKey() {
  settings.apiKey = "";
}

export function resetPrompts() {
  settings.prompts = { ...DEFAULT_PROMPTS };
}
