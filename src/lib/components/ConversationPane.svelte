<script lang="ts">
	import Icon from './Icon.svelte';
	import PersonaCard from './PersonaCard.svelte';
	import QuestionBanner from './QuestionBanner.svelte';
	import { PERSONAS, type PersonaKind, type Turn } from '$lib/data/personas';

	interface Props {
		question: string;
		onQuestion: (v: string) => void;
		turns: Turn[];
		currentInput: string;
		onCurrentInput: (v: string) => void;
		onSend: () => void;
		isThinking: boolean;
		onChooseHelpful: (idx: number, p: PersonaKind) => void;
		onUseAsFollowUp: (p: PersonaKind, body: string) => void;
		onQuoteToNotepad: (p: PersonaKind, body: string) => void;
		onRetry: (idx: number, p: PersonaKind) => void;
		expandedPersona: { t: number; p: PersonaKind } | null;
		onExpandPersona: (v: { t: number; p: PersonaKind } | null) => void;
		isFullscreen: boolean;
		onToggleFullscreen: () => void;
		showPauseNudge: boolean;
		composerRef: (el: HTMLTextAreaElement | null) => void;
	}

	let {
		question,
		onQuestion,
		turns,
		currentInput,
		onCurrentInput,
		onSend,
		isThinking,
		onChooseHelpful,
		onUseAsFollowUp,
		onQuoteToNotepad,
		onRetry,
		expandedPersona,
		onExpandPersona,
		isFullscreen,
		onToggleFullscreen,
		showPauseNudge,
		composerRef
	}: Props = $props();

	let bodyEl: HTMLElement | undefined = $state();
	let composerEl: HTMLTextAreaElement | undefined = $state();
	let collapsedMap = $state<Record<string, boolean>>({});

	$effect(() => {
		composerRef(composerEl ?? null);
	});

	$effect(() => {
		// re-run on turns growth or thinking toggle
		void turns.length;
		void isThinking;
		bodyEl?.scrollTo?.({ top: 999999, behavior: 'smooth' });
	});

	function isCollapsed(i: number, p: PersonaKind) {
		return !!collapsedMap[`${i}-${p}`];
	}
	function toggleCollapse(i: number, p: PersonaKind) {
		const key = `${i}-${p}`;
		collapsedMap = { ...collapsedMap, [key]: !collapsedMap[key] };
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			if (currentInput.trim()) onSend();
		}
	}

	const completedExchanges = $derived(turns.filter((t) => t.responses).length);
</script>

<section class={['pane', 'pane-convo', { fullscreen: isFullscreen }]}>
	<header class="pane-head">
		<div class="pane-title">
			<span class="pane-title-icon"><Icon name="message" /></span>
			<div>
				<div class="pane-title-main">Three voices</div>
				<div class="pane-title-sub">
					{completedExchanges} exchange{completedExchanges === 1 ? '' : 's'}
				</div>
			</div>
		</div>
		<div class="pane-actions">
			<button
				class="mini-btn"
				onclick={onToggleFullscreen}
				title={isFullscreen ? 'Restore split view' : 'Fullscreen this pane'}
			>
				{#if isFullscreen}<Icon name="collapse" />{:else}<Icon name="expand" />{/if}
			</button>
		</div>
	</header>

	<QuestionBanner {question} {onQuestion} />

	<div class="pane-body" bind:this={bodyEl}>
		{#if turns.length === 0 && !isThinking}
			<div class="empty-convo">
				<div class="empty-convo-mark"><Icon name="spark" /></div>
				<h3>Ready when you are.</h3>
				<p>
					Your opinion is already in the composer below. Edit it, or send as-is — all three voices
					respond at once.
				</p>
			</div>
		{/if}

		{#each turns as turn, idx (idx)}
			<div class="turn-block">
				<div class="turn-user">{turn.user}</div>
				<div class="persona-grid">
					{#each PERSONAS as p (p)}
						{@const body = turn.responses?.[p] ?? null}
						{@const err = turn.errors?.[p]}
						{@const loading = !turn.responses && !err}
						<PersonaCard
							kind={p}
							{body}
							isLoading={loading}
							error={err}
							isSelected={turn.helpful === p}
							onSelect={() => onChooseHelpful(idx, p)}
							onUseAsFollowUp={() => onUseAsFollowUp(p, body ?? '')}
							onSendToNotepad={() => onQuoteToNotepad(p, body ?? '')}
							onExpand={() =>
								onExpandPersona(
									expandedPersona && expandedPersona.t === idx && expandedPersona.p === p
										? null
										: { t: idx, p }
								)}
							collapsed={isCollapsed(idx, p)}
							onToggleCollapse={() => toggleCollapse(idx, p)}
							isExpanded={false}
							onRetry={() => onRetry(idx, p)}
						/>
					{/each}
				</div>
			</div>
		{/each}

		{#if showPauseNudge}
			<div class="pause-card">
				<Icon name="pause" />
				<div>
					You've been at this for a few exchanges. There's no rush — your notepad will be here when
					you come back.
				</div>
			</div>
		{/if}
	</div>

	<div class="composer">
		<div class="composer-inner">
			<textarea
				placeholder={turns.length === 0
					? 'Your opinion is here — edit it, or send as-is.'
					: 'Reply to whichever voice felt most useful.'}
				value={currentInput}
				oninput={(e) => onCurrentInput(e.currentTarget.value)}
				onkeydown={onKey}
				rows={2}
				bind:this={composerEl}
			></textarea>
			<div class="composer-row">
				<span class="composer-hint">
					<Icon name="message" />
					<span class="kbd">⌘</span> <span class="kbd">↵</span> · all three respond
				</span>
				<button
					class="btn btn-primary btn-sm"
					disabled={!currentInput.trim() || isThinking}
					onclick={onSend}
				>
					{isThinking ? 'Thinking…' : 'Send'}
					{#if !isThinking}<Icon name="arrow" class="btn-arrow" />{/if}
				</button>
			</div>
		</div>
	</div>
</section>
