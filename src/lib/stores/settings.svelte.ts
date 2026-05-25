import { browser } from "$app/environment";
import { DEFAULT_PROMPTS, type PersonaKind } from "$lib/data/personas";

const STORAGE_KEY = "mentora.settings.v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

interface Persisted {
  apiKey: string;
  model: string;
  prompts: Record<PersonaKind, string>;
  demoMode: boolean;
}

function defaults(): Persisted {
  return {
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
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model:
        typeof parsed.model === "string" && parsed.model
          ? parsed.model
          : DEFAULT_MODEL,
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
        apiKey: settings.apiKey,
        model: settings.model,
        prompts: settings.prompts,
        demoMode: settings.demoMode,
      });
      localStorage.setItem(STORAGE_KEY, payload);
    });
  });
}

export type ModelProvider = "anthropic" | "openai" | "google";

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  blurb: string;
  tier: "flagship" | "balanced" | "fast";
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    blurb: "Nuanced reasoning across all three voices.",
    tier: "flagship",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "google",
    blurb: "Long-context reasoning, preview.",
    tier: "flagship",
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
    blurb: "Snappy replies, low cost.",
    tier: "fast",
  },
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
    blurb: "OpenAI's broad-capability flagship.",
    tier: "flagship",
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    blurb: "Smaller, faster, cheaper.",
    tier: "fast",
  },
];

export const SUGGESTED_MODELS = MODEL_OPTIONS.map((m) => m.id);

export const PROVIDER_LABEL: Record<ModelProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

export function clearKey() {
  settings.apiKey = "";
}

export function resetPrompts() {
  settings.prompts = { ...DEFAULT_PROMPTS };
}
