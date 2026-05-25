<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
	import ConversationPane from '$lib/components/ConversationPane.svelte';
	import NotepadPane from '$lib/components/NotepadPane.svelte';
	import CompleteScreen from '$lib/components/CompleteScreen.svelte';
	import SettingsDrawer from '$lib/components/SettingsDrawer.svelte';
	import ApiKeyModal from '$lib/components/ApiKeyModal.svelte';
	import PersonaModal from '$lib/components/PersonaModal.svelte';

	import {
		PERSONA_META,
		PERSONAS,
		QUESTION_SUGGESTIONS,
		SCRIPTED_TURNS,
		type PersonaKind,
		type ScriptedTurn,
		type Turn
	} from '$lib/data/personas';
	import { settings } from '$lib/stores/settings.svelte';
	import { chat, suggestQuestion, OpenRouterError, type ChatMessage } from '$lib/openrouter';

	type Step = 'start' | 'workspace' | 'complete';
	type FullscreenPane = null | 'convo' | 'notepad';

	let step = $state<Step>('start');

	// start state
	let opinion = $state('');
	let question = $state('');
	let questionGenerating = $state(false);
	let confidence = $state(50);
	let feeling = $state<string[]>([]);

	// workspace state
	let turns = $state<Turn[]>([]);
	let currentInput = $state('');
	let isThinking = $state(false);
	let pauseShown = $state(false);

	// notepad
	let notepad = $state('');
	let postConfidence = $state<number | null>(null);

	// ui
	let fullscreen = $state<FullscreenPane>(null);
	let expandedPersona = $state<{ t: number; p: PersonaKind } | null>(null);
	let settingsOpen = $state(false);
	let settingsFocusApi = $state(false);
	let apiModalOpen = $state(false);
	let composerEl = $state<HTMLTextAreaElement | null>(null);

	// resizable split between conversation and notepad panes
	let splitPct = $state(50);
	let dragging = $state(false);
	let workspaceEl = $state<HTMLDivElement | null>(null);

	function onDividerDown(e: PointerEvent) {
		e.preventDefault();
		dragging = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onDividerMove(e: PointerEvent) {
		if (!dragging || !workspaceEl) return;
		const rect = workspaceEl.getBoundingClientRect();
		const padding = 14;
		const usable = rect.width - padding * 2;
		if (usable <= 0) return;
		const local = e.clientX - rect.left - padding;
		const pct = (local / usable) * 100;
		splitPct = Math.max(20, Math.min(80, pct));
	}
	function onDividerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const el = e.currentTarget as HTMLElement;
		if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
	}

	// Open the BYOK modal on first run (no key, not in demo mode)
	$effect(() => {
		if (!settings.apiKey && !settings.demoMode && step === 'start') {
			apiModalOpen = true;
		}
	});

	// pause nudge after 3 completed turns
	$effect(() => {
		const completed = turns.filter((t) => t.responses).length;
		if (completed >= 3 && !pauseShown) pauseShown = true;
	});

	function fallbackQuestion() {
		return QUESTION_SUGGESTIONS[Math.floor(Math.random() * QUESTION_SUGGESTIONS.length)];
	}

	async function generateQuestion() {
		if (!opinion.trim()) return;
		questionGenerating = true;
		try {
			if (settings.apiKey && !settings.demoMode) {
				const out = await suggestQuestion(opinion);
				question = out.length < 200 ? out : fallbackQuestion();
			} else {
				await new Promise((r) => setTimeout(r, 700));
				question = fallbackQuestion();
			}
		} catch {
			question = fallbackQuestion();
		} finally {
			questionGenerating = false;
		}
	}

	async function beginReflecting() {
		if (!question.trim()) {
			await generateQuestion();
		}
		currentInput = opinion;
		step = 'workspace';
	}

	function buildSystemPrompt(kind: PersonaKind): string {
		const base = settings.prompts[kind];
		const lines = [`Anchor question: ${question || '(none set yet)'}`];
		if (opinion) lines.push(`User's starting opinion (confidence ${confidence}%): ${opinion}`);
		if (feeling.length) lines.push(`Feelings the user named: ${feeling.join(', ')}`);
		return `${base}\n\n${lines.join('\n')}`;
	}

	function buildMessages(
		kind: PersonaKind,
		priorTurns: Turn[],
		userMsg: string
	): ChatMessage[] {
		const messages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt(kind) }];
		for (const t of priorTurns) {
			messages.push({ role: 'user', content: t.user });
			if (t.responses?.[kind]) {
				messages.push({ role: 'assistant', content: t.responses[kind] });
			}
		}
		messages.push({ role: 'user', content: userMsg });
		return messages;
	}

	function describeError(reason: unknown): string {
		if (reason instanceof OpenRouterError) {
			return reason.status ? `${reason.status}: ${reason.message}` : reason.message;
		}
		if (reason instanceof Error) return reason.message;
		return String(reason);
	}

	async function callPersonas(turnIdx: number, userMsg: string, kinds: readonly PersonaKind[]) {
		const priorTurns = turns.slice(0, turnIdx);
		const results = await Promise.allSettled(
			kinds.map((k) => chat(buildMessages(k, priorTurns, userMsg), { maxTokens: 500, temperature: 0.8 }))
		);
		turns = turns.map((t, i) => {
			if (i !== turnIdx) return t;
			const nextResponses: Partial<ScriptedTurn> = { ...(t.responses ?? {}) };
			const nextErrors: Partial<Record<PersonaKind, string>> = { ...(t.errors ?? {}) };
			results.forEach((r, j) => {
				const k = kinds[j];
				if (r.status === 'fulfilled') {
					nextResponses[k] = r.value;
					delete nextErrors[k];
				} else {
					nextErrors[k] = describeError(r.reason);
				}
			});
			return {
				...t,
				responses: nextResponses as ScriptedTurn,
				errors: nextErrors
			};
		});
	}

	async function send() {
		if (!currentInput.trim()) return;
		const userMsg = currentInput.trim();
		currentInput = '';
		const turnIdx = turns.length;
		const newTurn: Turn = { user: userMsg, responses: null, helpful: null, errors: {} };
		turns = [...turns, newTurn];
		isThinking = true;

		if (!settings.apiKey || settings.demoMode) {
			setTimeout(() => {
				const scripted = SCRIPTED_TURNS[Math.min(turnIdx, SCRIPTED_TURNS.length - 1)];
				turns = turns.map((t, i) =>
					i === turnIdx ? { ...t, responses: { ...scripted } as ScriptedTurn } : t
				);
				isThinking = false;
			}, 1400);
			return;
		}

		try {
			await callPersonas(turnIdx, userMsg, PERSONAS);
		} finally {
			isThinking = false;
		}
	}

	async function retryPersona(idx: number, p: PersonaKind) {
		const t = turns[idx];
		if (!t) return;
		// Clear that persona's error/response and re-call.
		turns = turns.map((tt, i) => {
			if (i !== idx) return tt;
			const responses = { ...(tt.responses ?? {}) } as Partial<ScriptedTurn>;
			delete responses[p];
			const errors = { ...(tt.errors ?? {}) };
			delete errors[p];
			const stillHasResponses = Object.keys(responses).length > 0;
			return {
				...tt,
				responses: stillHasResponses ? (responses as ScriptedTurn) : null,
				errors
			};
		});
		if (!settings.apiKey || settings.demoMode) {
			setTimeout(() => {
				const scripted = SCRIPTED_TURNS[Math.min(idx, SCRIPTED_TURNS.length - 1)];
				turns = turns.map((tt, i) => {
					if (i !== idx) return tt;
					const responses = { ...(tt.responses ?? {}) } as Partial<ScriptedTurn>;
					responses[p] = scripted[p];
					return { ...tt, responses: responses as ScriptedTurn };
				});
			}, 800);
			return;
		}
		await callPersonas(idx, t.user, [p]);
	}

	function chooseHelpful(idx: number, p: PersonaKind) {
		turns = turns.map((t, i) =>
			i === idx ? { ...t, helpful: t.helpful === p ? null : p } : t
		);
	}

	function useAsFollowUp(persona: PersonaKind, _body: string) {
		const seed = `Picking up on the ${persona}'s point: `;
		currentInput = seed;
		setTimeout(() => {
			if (composerEl) {
				composerEl.focus();
				composerEl.setSelectionRange(seed.length, seed.length);
			}
		}, 50);
	}

	function quoteToNotepad(persona: PersonaKind, text: string) {
		if (!text) return;
		const meta = PERSONA_META[persona];
		const lead = notepad && !notepad.endsWith('\n\n') ? '\n\n' : '';
		const quoted = text
			.split('\n')
			.map((l) => `> ${l}`)
			.join('\n');
		notepad = `${notepad}${lead}— ${meta.name} said:\n${quoted}\n\n`;
	}

	function exportText() {
		const blob = new Blob([notepad], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'mentora-post.txt';
		a.click();
		URL.revokeObjectURL(url);
	}

	function exportSession() {
		const data = {
			opinion,
			question,
			confidence,
			postConfidence,
			feeling,
			turns: turns.map((t) => ({
				user: t.user,
				responses: t.responses,
				helpful: t.helpful
			})),
			prompts: settings.prompts,
			model: settings.model,
			notepad,
			timestamp: new Date().toISOString()
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'mentora-session.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	function restart() {
		step = 'start';
		opinion = '';
		question = '';
		confidence = 50;
		feeling = [];
		turns = [];
		notepad = '';
		postConfidence = null;
		pauseShown = false;
		fullscreen = null;
		expandedPersona = null;
		currentInput = '';
	}

	function openSettings(focus = false) {
		settingsFocusApi = focus;
		settingsOpen = true;
	}

	const keyStatus = $derived(
		settings.apiKey ? 'ok' : settings.demoMode ? 'demo' : 'unset'
	);
</script>

<header class="topbar">
	<div class="brand">
		<span class="brand-mark"></span>
		Mentora <small>· think before you share</small>
	</div>

	<div class="topbar-actions">
		<button
			class="icon-btn key-status"
			data-status={keyStatus}
			onclick={() => {
				if (keyStatus === 'unset') apiModalOpen = true;
				else openSettings(true);
			}}
			title={keyStatus === 'ok'
				? 'OpenRouter key set'
				: keyStatus === 'demo'
					? 'Demo mode (no key)'
					: 'Add your OpenRouter key'}
		>
			<Icon name="key" />
			<span class="status-dot"></span>
		</button>
		{#if step === 'workspace' || step === 'complete'}
			<button class="icon-btn" onclick={restart} title="Start a new session">
				<Icon name="refresh" />
			</button>
		{/if}
		<button class="icon-btn" onclick={() => openSettings(false)}>
			<Icon name="settings" /> Researcher
		</button>
	</div>
</header>

{#if step === 'start'}
	<StartScreen
		{opinion}
		{question}
		{questionGenerating}
		{confidence}
		{feeling}
		onOpinion={(v) => (opinion = v)}
		onQuestion={(v) => (question = v)}
		onConfidence={(v) => (confidence = v)}
		onFeeling={(v) => (feeling = v)}
		onGenerateQuestion={generateQuestion}
		onBegin={beginReflecting}
	/>
{:else if step === 'workspace'}
	<div
		class={['workspace', fullscreen ? `fs-${fullscreen}` : '', dragging ? 'dragging' : '']}
		style="--split: {splitPct}%"
		bind:this={workspaceEl}
	>
		<ConversationPane
			{question}
			onQuestion={(v) => (question = v)}
			{turns}
			{currentInput}
			onCurrentInput={(v) => (currentInput = v)}
			onSend={send}
			{isThinking}
			onChooseHelpful={chooseHelpful}
			onUseAsFollowUp={useAsFollowUp}
			onQuoteToNotepad={quoteToNotepad}
			onRetry={retryPersona}
			{expandedPersona}
			onExpandPersona={(v) => (expandedPersona = v)}
			isFullscreen={fullscreen === 'convo'}
			onToggleFullscreen={() => (fullscreen = fullscreen === 'convo' ? null : 'convo')}
			showPauseNudge={pauseShown}
			composerRef={(el) => (composerEl = el)}
		/>
		{#if !fullscreen}
			<div
				class="workspace-divider"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize panes"
				onpointerdown={onDividerDown}
				onpointermove={onDividerMove}
				onpointerup={onDividerUp}
				onpointercancel={onDividerUp}
			></div>
		{/if}
		<NotepadPane
			{notepad}
			onNotepad={(v) => (notepad = v)}
			isFullscreen={fullscreen === 'notepad'}
			onToggleFullscreen={() => (fullscreen = fullscreen === 'notepad' ? null : 'notepad')}
			onComplete={() => (step = 'complete')}
		/>
	</div>
{:else if step === 'complete'}
	<CompleteScreen
		{notepad}
		{confidence}
		{postConfidence}
		onPostConfidence={(v) => (postConfidence = v)}
		onExport={exportText}
		onRestart={restart}
		onBack={() => (step = 'workspace')}
	/>
{/if}

{#if step === 'workspace' && expandedPersona && turns[expandedPersona.t]?.responses}
	<PersonaModal
		turn={turns[expandedPersona.t]}
		persona={expandedPersona.p}
		onClose={() => (expandedPersona = null)}
		onQuoteToNotepad={quoteToNotepad}
		onUseAsFollowUp={useAsFollowUp}
	/>
{/if}

<SettingsDrawer
	open={settingsOpen}
	focusApi={settingsFocusApi}
	onClose={() => (settingsOpen = false)}
	onExportSession={exportSession}
/>

{#if apiModalOpen}
	<ApiKeyModal onClose={() => (apiModalOpen = false)} />
{/if}

<style>
	:global(.key-status) {
		position: relative;
	}
	:global(.key-status .status-dot) {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		display: inline-block;
		margin-left: 4px;
		background: var(--rule);
	}
	:global(.key-status[data-status='ok'] .status-dot) {
		background: oklch(0.72 0.13 150);
	}
	:global(.key-status[data-status='demo'] .status-dot) {
		background: oklch(0.78 0.13 75);
	}
</style>
