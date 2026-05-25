<script lang="ts">
	import Icon from './Icon.svelte';
	import ModelSelect from './ModelSelect.svelte';
	import { settings, SUGGESTED_MODELS } from '$lib/stores/settings.svelte';

	interface Props {
		onClose: () => void;
	}
	let { onClose }: Props = $props();

	let keyDraft = $state(settings.apiKey);
	let modelDraft = $state(settings.model);
	let showKey = $state(false);
	let error = $state('');

	function save() {
		const k = keyDraft.trim();
		if (!k) {
			error = 'Paste your OpenRouter key, or use demo mode below.';
			return;
		}
		settings.apiKey = k;
		settings.model = modelDraft.trim() || SUGGESTED_MODELS[0];
		settings.demoMode = false;
		onClose();
	}

	function useDemo() {
		settings.demoMode = true;
		onClose();
	}
</script>

<div class="modal-backdrop" role="button" tabindex="-1" onclick={onClose} onkeydown={(e) => {
	if (e.key === 'Escape') onClose();
}}>
	<div class="api-modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
		<header class="api-modal-head">
			<div class="api-modal-title">
				<span class="api-modal-icon"><Icon name="key" /></span>
				<div>
					<div class="pane-title-main">Add an OpenRouter API key</div>
					<div class="pane-title-sub">
						Mentora's three voices and question generator call OpenRouter directly from this browser.
					</div>
				</div>
			</div>
			<button class="icon-btn" onclick={onClose} title="Close"><Icon name="close" /></button>
		</header>

		<div class="api-modal-body">
			<p class="muted text-sans" style="font-size: 13px; margin: 0 0 14px;">
				Don't have a key? <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer noopener" class="link-inline">Get one at openrouter.ai/keys</a> — it takes a minute, and you only pay for what you use.
			</p>

			<label class="api-label" for="api-key-input">API key</label>
			<div class="api-key-row">
				<input
					id="api-key-input"
					class="field"
					type={showKey ? 'text' : 'password'}
					placeholder="sk-or-v1-..."
					value={keyDraft}
					oninput={(e) => {
						keyDraft = e.currentTarget.value;
						error = '';
					}}
					autocomplete="off"
					spellcheck="false"
				/>
				<button class="icon-btn" onclick={() => (showKey = !showKey)} title={showKey ? 'Hide' : 'Show'}>
					{showKey ? 'Hide' : 'Show'}
				</button>
			</div>

			<label class="api-label" for="api-model-select" style="margin-top: 18px;">Model</label>
			<ModelSelect
				id="api-model-select"
				value={modelDraft}
				onChange={(v) => (modelDraft = v)}
			/>

			{#if error}
				<p class="api-error">{error}</p>
			{/if}

			<div class="safety" style="margin-top: 22px;">
				<Icon name="shield" />
				<div>
					<strong>Your key stays in this browser.</strong> We never send it anywhere except OpenRouter.
				</div>
			</div>
		</div>

		<footer class="api-modal-foot">
			<button class="link-button" onclick={useDemo}>
				Use demo mode (scripted responses)
			</button>
			<button class="btn btn-primary btn-sm" onclick={save}>
				Save & continue <Icon name="arrow" class="btn-arrow" />
			</button>
		</footer>
	</div>
</div>

<style>
	:global(.api-modal) {
		background: var(--paper);
		border: 1px solid var(--rule-soft);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-card);
		max-width: 520px;
		width: calc(100% - 32px);
		max-height: calc(100vh - 64px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	:global(.api-modal-head) {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		padding: 24px 24px 12px;
	}
	:global(.api-modal-title) {
		display: flex;
		gap: 14px;
		align-items: center;
	}
	:global(.api-modal-icon) {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--paper-3);
		color: var(--ink-2);
	}
	:global(.api-modal-icon svg) {
		width: 18px;
		height: 18px;
	}
	:global(.api-modal-body) {
		padding: 12px 24px 8px;
		overflow-y: auto;
	}
	:global(.api-modal-foot) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 18px 24px 22px;
		border-top: 1px solid var(--rule-soft);
		background: var(--paper-2);
	}
	:global(.api-label) {
		display: block;
		font-family: var(--sans);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin: 0 0 6px;
	}
	:global(.api-key-row) {
		display: flex;
		gap: 8px;
	}
	:global(.api-key-row .field) {
		flex: 1;
	}
	:global(.api-error) {
		color: oklch(0.5 0.14 25);
		font-family: var(--sans);
		font-size: 13px;
		margin: 10px 0 0;
	}
	:global(.link-inline) {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--rule);
		text-underline-offset: 3px;
	}
	:global(.link-button) {
		background: none;
		border: 0;
		color: var(--ink-2);
		font-family: var(--sans);
		font-size: 13px;
		text-decoration: underline;
		text-decoration-color: var(--rule);
		text-underline-offset: 3px;
		cursor: pointer;
		padding: 6px 0;
	}
	:global(.link-button:hover) {
		color: var(--ink);
	}
</style>
