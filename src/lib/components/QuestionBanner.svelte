<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		question: string;
		onQuestion: (v: string) => void;
	}
	let { question, onQuestion }: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let inputEl: HTMLInputElement = $state()!;

	$effect(() => {
		if (!editing) {
			draft = question;
		}
	});

	$effect(() => {
		if (editing) {
			inputEl?.focus();
		}
	});

	function commit() {
		const trimmed = draft.trim();
		onQuestion(trimmed || question);
		editing = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		}
		if (e.key === 'Escape') {
			draft = question;
			editing = false;
		}
	}
</script>

<div
	class="anchor-question editable"
	role="button"
	tabindex="0"
	onclick={() => !editing && (editing = true)}
	onkeydown={(e) => {
		if ((e.key === 'Enter' || e.key === ' ') && !editing) {
			e.preventDefault();
			editing = true;
		}
	}}
>
	<span class="anchor-quote">“</span>
	{#if editing}
		<input
			bind:this={inputEl}
			class="anchor-input"
			value={draft}
			oninput={(e) => (draft = e.currentTarget.value)}
			onblur={commit}
			onkeydown={onKey}
		/>
	{:else}
		<span class="anchor-text">{question || '我到底想釐清的是什麼？'}</span>
	{/if}
	{#if !editing}
		<button
			class="mini-btn anchor-edit"
			onclick={(e) => {
				e.stopPropagation();
				editing = true;
			}}
			title="編輯問題"
		>
			<Icon name="edit" />
		</button>
	{/if}
</div>
