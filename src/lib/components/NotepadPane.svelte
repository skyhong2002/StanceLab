<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		notepad: string;
		onNotepad: (v: string) => void;
		isFullscreen: boolean;
		onToggleFullscreen: () => void;
		onComplete: () => void;
	}

	let { notepad, onNotepad, isFullscreen, onToggleFullscreen, onComplete }: Props = $props();
	const ready = $derived(notepad.trim().length > 0);
</script>

<section class={['pane', 'pane-notepad', { fullscreen: isFullscreen }]}>
	<header class="pane-head">
		<div class="pane-title">
			<span class="pane-title-icon"><Icon name="edit" /></span>
			<div>
				<div class="pane-title-main">Your notepad</div>
				<div class="pane-title-sub">a quiet place to write what you'll share</div>
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

	<div class="pane-body notepad-body">
		<textarea
			class="notepad-area"
			placeholder="Start drafting the post you'll actually share. You can paste lines from the conversation using the copy icon on each card, or write freely. Nothing leaves this page on its own."
			value={notepad}
			oninput={(e) => onNotepad(e.currentTarget.value)}
		></textarea>
	</div>

	<footer class="notepad-foot">
		<span class="muted text-sans" style="font-size: 12px;">
			<Icon name="shield" class="inline-icon" /> Nothing leaves on its own
		</span>
		<button
			class="btn btn-primary btn-sm"
			onclick={onComplete}
			disabled={!ready}
			title={ready ? 'Mark as ready and move on' : 'Write something first'}
		>
			<Icon name="check" /> Complete
		</button>
	</footer>
</section>

<style>
	:global(.inline-icon) {
		vertical-align: -2px;
		width: 12px;
		height: 12px;
		display: inline-block;
	}
</style>
