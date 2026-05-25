<script lang="ts">
	import Icon from './Icon.svelte';
	import { PERSONA_META, type PersonaKind, type Turn } from '$lib/data/personas';

	interface Props {
		turn: Turn;
		persona: PersonaKind;
		onClose: () => void;
		onQuoteToNotepad: (p: PersonaKind, body: string) => void;
		onUseAsFollowUp: (p: PersonaKind, body: string) => void;
	}

	let { turn, persona, onClose, onQuoteToNotepad, onUseAsFollowUp }: Props = $props();

	const meta = $derived(PERSONA_META[persona]);
	const body = $derived(turn.responses?.[persona] ?? '');
	const paragraphs = $derived(body.split('\n\n'));
</script>

<div
	class="modal-backdrop"
	role="button"
	tabindex="-1"
	onclick={onClose}
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose();
	}}
>
	<div
		class={['modal-card', persona]}
		role="dialog"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<header class="modal-head">
			<div class="persona-name">
				<span class="persona-glyph"><Icon name={meta.glyph} /></span>
				{meta.name}
				<span class="persona-tag">{meta.tagline}</span>
			</div>
			<button class="icon-btn" onclick={onClose}><Icon name="close" /> Close</button>
		</header>
		<div class="modal-body">
			<div class="modal-context">in reply to:</div>
			<div class="turn-user" style="margin-bottom: 22px;">{turn.user}</div>
			<div class="persona-body" style="font-size: 18px; line-height: 1.65;">
				{#each paragraphs as para, i (i)}
					<p>{para}</p>
				{/each}
			</div>
		</div>
		<footer class="modal-foot">
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => {
					onQuoteToNotepad(persona, body);
					onClose();
				}}
			>
				<Icon name="copy" /> Quote into notepad
			</button>
			<button
				class="btn btn-primary btn-sm"
				onclick={() => {
					onUseAsFollowUp(persona, body);
					onClose();
				}}
			>
				<Icon name="reply" /> Reply to this
			</button>
		</footer>
	</div>
</div>
