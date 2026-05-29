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
  onChunk?: (chunk: string) => void;
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

export async function chatStream(
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
      stream: true,
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

  const reader = res.body?.getReader();
  if (!reader) throw new OpenRouterError(0, "Response body is not readable");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const content: string = parsed?.choices?.[0]?.delta?.content ?? "";
        if (content) {
          fullText += content;
          opts.onChunk?.(content);
        }
      } catch {
        // skip malformed JSON lines
      }
    }
  }

  return fullText.trim();
}

export function streamingVisibleText(accumulated: string): string {
  const idx = accumulated.indexOf("</thinking>");
  if (idx === -1) return "";
  let visible = accumulated.slice(idx + "</thinking>".length);
  visible = visible.replace(/<\/?response>/gi, "");
  return visible.trim();
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
          "請根據使用者的立場，建議一則簡短的開放式問題（20字以內），捕捉其核心張力。偏好是非題或「應該」句式。只回覆問題本身——不要引號、不要前言。",
      },
      { role: "user", content: opinion },
    ],
    { maxTokens: 80, temperature: 0.6, signal },
  );
  const firstLine = out.split(/\r?\n/).find((l) => l.trim().length > 0) ?? out;
  const sentence = firstLine.match(/^[^.!?]*[.!?]?/)?.[0] ?? firstLine;
  return sentence.replace(/^["']|["']$/g, "").trim();
}

export function parseThinkingResponse(text: string): {
  thinking: string;
  response: string;
} {
  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  const responseMatch = text.match(/<response>([\s\S]*?)<\/response>/i);

  const thinking = thinkingMatch ? thinkingMatch[1].trim() : "";

  if (!thinkingMatch && !responseMatch) {
    return { thinking: "", response: text.trim() };
  }

  let response: string;
  if (responseMatch) {
    response = responseMatch[1].trim();
  } else {
    response = text.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();
  }

  return { thinking, response };
}

export async function testConnection(signal?: AbortSignal): Promise<void> {
  await chat([{ role: "user", content: "ping" }], {
    maxTokens: 4,
    temperature: 0,
    signal,
  });
}
