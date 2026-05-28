import { API_PROVIDERS, settings } from "$lib/stores/settings.svelte";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export class OpenRouterError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const key = settings.apiKey;
  if (!key) throw new OpenRouterError(0, "No API key configured");
  const apiProvider =
    API_PROVIDERS.find((p) => p.id === settings.apiProvider) ??
    API_PROVIDERS[0];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (apiProvider.id === "openrouter") {
    headers["HTTP-Referer"] =
      typeof window !== "undefined" ? window.location.origin : "";
    headers["X-Title"] = "StanceLab";
  }

  const res = await fetch(apiProvider.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      message = parsed?.error?.message ?? message;
    } catch {
      if (body) message = body.slice(0, 200);
    }
    throw new OpenRouterError(res.status, message);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return text.trim();
}

export async function suggestQuestion(
  opinion: string,
  signal?: AbortSignal,
): Promise<string> {
  const out = await chat(
    [
      {
        role: "system",
        content:
          '請根據使用者的立場，建議一則簡短的開放式問題（20字以內），捕捉其核心張力。偏好是非題或「應該」句式。只回覆問題本身——不要引號、不要前言。',
      },
      { role: "user", content: opinion },
    ],
    { maxTokens: 80, temperature: 0.6, signal },
  );
  const firstLine = out.split(/\r?\n/).find((l) => l.trim().length > 0) ?? out;
  const sentence = firstLine.match(/^[^.!?]*[.!?]?/)?.[0] ?? firstLine;
  return sentence.replace(/^["']|["']$/g, "").trim();
}

export async function testConnection(signal?: AbortSignal): Promise<void> {
  await chat([{ role: "user", content: "ping" }], {
    maxTokens: 4,
    temperature: 0,
    signal,
  });
}
