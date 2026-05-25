import { settings } from '$lib/stores/settings.svelte';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
	role: ChatRole;
	content: string;
}

export class OpenRouterError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'OpenRouterError';
	}
}

export interface ChatOptions {
	maxTokens?: number;
	temperature?: number;
	signal?: AbortSignal;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
	const key = settings.apiKey;
	if (!key) throw new OpenRouterError(0, 'No API key configured');

	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
			'X-Title': 'Mentora'
		},
		body: JSON.stringify({
			model: settings.model,
			messages,
			max_tokens: opts.maxTokens ?? 600,
			temperature: opts.temperature ?? 0.7
		}),
		signal: opts.signal
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
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
	const text: string = data?.choices?.[0]?.message?.content ?? '';
	return text.trim();
}

export async function suggestQuestion(opinion: string, signal?: AbortSignal): Promise<string> {
	const out = await chat(
		[
			{
				role: 'system',
				content:
					'Suggest ONE short open-ended question (15 words max) that captures the core tension in the user\'s stance. Prefer yes/no or "should" style. Reply with ONLY the question — no quotes, no preamble.'
			},
			{ role: 'user', content: opinion }
		],
		{ maxTokens: 400, temperature: 0.6, signal }
	);
	const firstLine = out.split(/\r?\n/).find((l) => l.trim().length > 0) ?? out;
	const sentence = firstLine.match(/^[^.!?]*[.!?]?/)?.[0] ?? firstLine;
	return sentence.replace(/^["']|["']$/g, '').trim();
}

export async function testConnection(signal?: AbortSignal): Promise<void> {
	await chat([{ role: 'user', content: 'ping' }], { maxTokens: 4, temperature: 0, signal });
}
