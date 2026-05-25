<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		notepad: string;
		confidence: number;
		postConfidence: number | null;
		onPostConfidence: (v: number) => void;
		onExport: () => void;
		onRestart: () => void;
		onBack: () => void;
	}

	let {
		notepad,
		confidence,
		postConfidence,
		onPostConfidence,
		onExport,
		onRestart,
		onBack
	}: Props = $props();

	let copied = $state(false);
	const moved = $derived(
		postConfidence !== null && Math.abs(postConfidence - confidence) >= 5
	);
	const shownConfidence = $derived(postConfidence === null ? confidence : postConfidence);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(notepad);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// ignore
		}
	}
</script>

<div class="page" style="max-width: 720px;">
	<p class="eyebrow">You shared it</p>
	<h1 class="display" style="font-size: clamp(34px, 4vw, 48px);">
		Nicely done. <em>That's the hard part.</em>
	</h1>
	<p class="lead" style="margin-bottom: 32px;">
		We're treating this as posted. What you wrote is yours — keep it, edit it later, or share it
		again in a different room. The conversation is what matters now.
	</p>

	<div class="paper-soft" style="margin-bottom: 24px;">
		<div
			class="muted text-sans"
			style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;"
		>
			What you shared
		</div>
		<div
			style="font-family: var(--serif); font-size: 16px; line-height: 1.6; color: var(--ink); white-space: pre-wrap;"
		>
			{notepad}
		</div>
	</div>

	<div class="row" style="gap: 10px; margin-bottom: 32px;">
		<button class="btn btn-ghost btn-sm" onclick={handleCopy}>
			{#if copied}
				<Icon name="check" /> Copied
			{:else}
				<Icon name="copy" /> Copy again
			{/if}
		</button>
		<button class="btn btn-ghost btn-sm" onclick={onExport}>
			<Icon name="download" /> Save as text
		</button>
	</div>

	<div class="paper-soft" style="margin-bottom: 24px;">
		<h2 style="margin-bottom: 6px;">Where do you sit now?</h2>
		<p class="muted text-sans" style="font-size: 13px; margin: 0 0 18px;">
			You started at <strong style="color: var(--ink);">{confidence}% sure</strong>. No right
			answer — this is just for you.
		</p>
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			value={shownConfidence}
			oninput={(e) => onPostConfidence(Number(e.currentTarget.value))}
			class="stance-slider"
		/>
		<div class="stance-labels">
			<span>Less sure</span>
			<span style="color: var(--ink); font-weight: 500;">{shownConfidence}%</span>
			<span>More sure</span>
		</div>
		{#if moved && postConfidence !== null}
			<p style="margin-top: 12px; font-size: 14px; font-style: italic; color: var(--ink-2);">
				You've moved {Math.abs(postConfidence - confidence)} points
				{postConfidence > confidence ? 'toward more sure' : 'toward less sure'}. Worth noticing.
			</p>
		{/if}
	</div>

	<div class="safety" style="margin-bottom: 28px;">
		<Icon name="hand" />
		<div>
			<strong>One small ask.</strong> If a response from your group changes your mind — even a little
			— come back here and write that down. The point isn't to be right; it's to be honest about how
			thinking moves.
		</div>
	</div>

	<div class="row-between" style="margin-top: 16px;">
		<button class="btn btn-ghost" onclick={onBack}>
			<Icon name="arrowLeft" class="btn-arrow" /> Back to my notepad
		</button>
		<button class="btn btn-primary" onclick={onRestart}>
			<Icon name="refresh" /> Start a new session
		</button>
	</div>
</div>
