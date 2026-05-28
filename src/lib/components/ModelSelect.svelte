<script lang="ts">
  import { untrack } from "svelte";
  import Icon from "./Icon.svelte";
  import {
    DEFAULT_MODEL_BY_PROVIDER,
    PROVIDER_LABEL,
    getModelOptions,
    getSuggestedModels,
    type ApiProviderId,
    type ModelOption,
  } from "$lib/stores/settings.svelte";

  interface Props {
    id?: string;
    apiProvider: ApiProviderId;
    value: string;
    onChange: (v: string) => void;
  }
  let { id, apiProvider, value, onChange }: Props = $props();

  let customMode = $state(
    untrack(
      () => value !== "" && !getSuggestedModels(apiProvider).includes(value),
    ),
  );
  let customDraft = $state(untrack(() => (customMode ? value : "")));
  let open = $state(false);
  let query = $state("");
  let highlighted = $state(0);

  $effect(() => {
    const isCustom =
      value !== "" && !getSuggestedModels(apiProvider).includes(value);
    customMode = isCustom;
    customDraft = isCustom ? value : "";
  });

  let triggerEl: HTMLButtonElement | undefined = $state();
  let menuEl: HTMLDivElement | undefined = $state();
  let searchEl: HTMLInputElement | undefined = $state();

  const providerModels = $derived<ModelOption[]>(getModelOptions(apiProvider));
  const suggestedModels = $derived<string[]>(getSuggestedModels(apiProvider));
  const currentMeta = $derived<ModelOption | undefined>(
    providerModels.find((m) => m.id === value),
  );

  const filtered = $derived<ModelOption[]>(
    query.trim()
      ? providerModels.filter((m) => {
          const q = query.trim().toLowerCase();
          return (
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            PROVIDER_LABEL[m.provider].toLowerCase().includes(q)
          );
        })
      : providerModels,
  );

  function openMenu() {
    open = true;
    query = "";
    highlighted = Math.max(
      0,
      providerModels.findIndex((m) => m.id === value),
    );
    queueMicrotask(() => searchEl?.focus());
  }

  function closeMenu() {
    open = false;
    query = "";
  }

  function pickModel(m: ModelOption) {
    onChange(m.id);
    closeMenu();
  }

  function enterCustom() {
    customMode = true;
    customDraft = value && !suggestedModels.includes(value) ? value : "";
    onChange(customDraft);
    closeMenu();
  }

  function leaveCustom() {
    customMode = false;
    onChange(DEFAULT_MODEL_BY_PROVIDER[apiProvider]);
  }

  function onTriggerKey(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openMenu();
    }
  }

  function onMenuKey(e: KeyboardEvent) {
    const total = filtered.length + 1; // +1 for custom row
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      triggerEl?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      highlighted = (highlighted + 1) % total;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlighted = (highlighted - 1 + total) % total;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted < filtered.length) pickModel(filtered[highlighted]);
      else enterCustom();
    }
  }

  function onDocClick(e: MouseEvent) {
    if (!open) return;
    const t = e.target as Node;
    if (menuEl?.contains(t) || triggerEl?.contains(t)) return;
    closeMenu();
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  });

  $effect(() => {
    // keep highlight valid as the filtered list changes
    if (highlighted > filtered.length) highlighted = 0;
  });
</script>

{#if customMode}
  <input
    {id}
    class="field"
    type="text"
    placeholder="e.g. anthropic/claude-3.5-haiku"
    value={customDraft}
    oninput={(e) => {
      customDraft = e.currentTarget.value;
      onChange(customDraft);
    }}
    spellcheck="false"
    autocomplete="off"
  />
  <button class="link-button" onclick={leaveCustom} type="button">
    ← Pick from suggested
  </button>
{:else}
  <div class="model-select">
    <button
      {id}
      type="button"
      class="model-trigger"
      class:open
      bind:this={triggerEl}
      onclick={() => (open ? closeMenu() : openMenu())}
      onkeydown={onTriggerKey}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      {#if currentMeta}
        <span class="model-badge model-badge-{currentMeta.provider}">
          {PROVIDER_LABEL[currentMeta.provider]}
        </span>
        <span class="model-trigger-main">
          <span class="model-trigger-name">{currentMeta.name}</span>
          <span class="model-trigger-id">{currentMeta.id}</span>
        </span>
      {:else}
        <span class="model-badge model-badge-custom">Custom</span>
        <span class="model-trigger-main">
          <span class="model-trigger-name">{value || "Choose a model…"}</span>
          <span class="model-trigger-id">
            {apiProvider === "openrouter"
              ? "OpenRouter model ID"
              : "OpenCode Go chat model ID"}
          </span>
        </span>
      {/if}
      <svg
        class="model-chevron"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </button>

    {#if open}
      <div
        class="model-menu"
        bind:this={menuEl}
        onkeydown={onMenuKey}
        role="listbox"
        tabindex="-1"
      >
        <div class="model-search-row">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
          <input
            bind:this={searchEl}
            class="model-search"
            type="text"
            placeholder="Search models…"
            value={query}
            oninput={(e) => {
              query = e.currentTarget.value;
              highlighted = 0;
            }}
            spellcheck="false"
            autocomplete="off"
          />
        </div>

        <ul class="model-list">
          {#each filtered as m, i (m.id)}
            <li>
              <button
                type="button"
                class="model-option"
                class:active={value === m.id}
                class:highlighted={highlighted === i}
                onclick={() => pickModel(m)}
                onmouseenter={() => (highlighted = i)}
                role="option"
                aria-selected={value === m.id}
              >
                <span class="model-badge model-badge-{m.provider}">
                  {PROVIDER_LABEL[m.provider]}
                </span>
                <span class="model-option-body">
                  <span class="model-option-row">
                    <span class="model-option-name">{m.name}</span>
                    <span class="model-option-tier model-option-tier-{m.tier}">
                      {m.tier}
                    </span>
                  </span>
                  <span class="model-option-blurb">{m.blurb}</span>
                  <span class="model-option-id">{m.id}</span>
                </span>
                {#if value === m.id}
                  <span class="model-option-check"><Icon name="check" /></span>
                {/if}
              </button>
            </li>
          {/each}
          {#if filtered.length === 0}
            <li class="model-empty">
              No matches. Try a different search, or use a custom ID.
            </li>
          {/if}
          <li>
            <button
              type="button"
              class="model-option model-option-custom"
              class:highlighted={highlighted === filtered.length}
              onclick={enterCustom}
              onmouseenter={() => (highlighted = filtered.length)}
              role="option"
              aria-selected="false"
            >
              <span class="model-badge model-badge-custom">Custom</span>
              <span class="model-option-body">
                <span class="model-option-name">Use a custom model ID…</span>
                <span class="model-option-blurb">
                  Paste any {apiProvider === "openrouter"
                    ? "OpenRouter"
                    : "OpenCode Go chat"} model identifier.
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    {/if}
  </div>
{/if}

<style>
  .model-select {
    position: relative;
  }

  .model-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: var(--r);
    padding: 12px 14px;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s;
  }
  .model-trigger:hover {
    background: var(--paper-2);
    border-color: oklch(0.78 0.03 70);
  }
  .model-trigger:focus-visible {
    outline: none;
    border-color: oklch(0.7 0.04 60);
    box-shadow: 0 0 0 3px oklch(0.85 0.05 65 / 0.3);
  }
  .model-trigger.open {
    border-color: oklch(0.7 0.04 60);
    background: var(--paper-2);
    box-shadow: 0 0 0 3px oklch(0.85 0.05 65 / 0.25);
  }

  .model-trigger-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    gap: 1px;
  }
  .model-trigger-name {
    font-family: var(--serif);
    font-size: 16px;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .model-trigger-id {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-3);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .model-chevron {
    width: 14px;
    height: 14px;
    color: var(--ink-3);
    flex-shrink: 0;
    transition: transform 0.2s;
  }
  .model-trigger.open .model-chevron {
    transform: rotate(180deg);
    color: var(--ink-2);
  }

  .model-badge {
    font-family: var(--sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 100px;
    border: 1px solid var(--badge-rule, var(--rule));
    background: var(--badge-bg, var(--paper-3));
    color: var(--badge-fg, var(--ink-2));
    white-space: nowrap;
    flex-shrink: 0;
  }
  .model-badge-anthropic {
    --badge-bg: oklch(0.95 0.04 40);
    --badge-rule: oklch(0.82 0.06 40);
    --badge-fg: oklch(0.4 0.08 40);
  }
  .model-badge-openai {
    --badge-bg: oklch(0.95 0.035 165);
    --badge-rule: oklch(0.82 0.055 165);
    --badge-fg: oklch(0.38 0.07 165);
  }
  .model-badge-google {
    --badge-bg: oklch(0.95 0.035 240);
    --badge-rule: oklch(0.82 0.055 240);
    --badge-fg: oklch(0.4 0.08 240);
  }
  .model-badge-opencode {
    --badge-bg: oklch(0.95 0.035 300);
    --badge-rule: oklch(0.82 0.055 300);
    --badge-fg: oklch(0.4 0.08 300);
  }
  .model-badge-custom {
    --badge-bg: var(--paper-3);
    --badge-rule: var(--rule);
    --badge-fg: var(--ink-3);
  }

  .model-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: var(--r);
    box-shadow: var(--shadow-card);
    z-index: 200;
    overflow: hidden;
    animation: fadeUp 0.15s ease both;
  }

  .model-search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--rule-soft);
    background: var(--paper-2);
  }
  .model-search-row svg {
    width: 13px;
    height: 13px;
    color: var(--ink-3);
    flex-shrink: 0;
  }
  .model-search {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--sans);
    font-size: 13px;
    color: var(--ink);
  }
  .model-search::placeholder {
    color: var(--ink-3);
    font-style: italic;
  }

  .model-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 320px;
    overflow-y: auto;
  }
  .model-list li + li {
    margin-top: 2px;
  }

  .model-option {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--r-sm);
    padding: 10px 12px;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .model-option.highlighted {
    background: var(--paper-3);
    border-color: var(--rule-soft);
  }
  .model-option.active {
    background: oklch(0.97 0.025 65);
    border-color: oklch(0.84 0.05 65);
  }
  .model-option.active.highlighted {
    background: oklch(0.95 0.035 65);
  }

  .model-option-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .model-option-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .model-option-name {
    font-family: var(--serif);
    font-size: 15px;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.25;
  }
  .model-option-tier {
    font-family: var(--sans);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .model-option-tier-flagship {
    color: oklch(0.45 0.08 60);
  }
  .model-option-tier-fast {
    color: oklch(0.45 0.08 165);
  }
  .model-option-tier-balanced {
    color: oklch(0.45 0.08 240);
  }
  .model-option-blurb {
    font-family: var(--sans);
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.4;
  }
  .model-option-id {
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--ink-3);
    margin-top: 1px;
  }
  .model-option-check {
    flex-shrink: 0;
    color: oklch(0.5 0.1 65);
    margin-top: 2px;
  }
  .model-option-check :global(svg) {
    width: 14px;
    height: 14px;
  }

  .model-option-custom {
    border-top: 1px dashed var(--rule);
    border-radius: 0 0 var(--r-sm) var(--r-sm);
    margin-top: 4px;
    padding-top: 12px;
  }
  .model-option-custom.highlighted {
    border-top-style: dashed;
  }

  .model-empty {
    padding: 14px 12px;
    font-family: var(--sans);
    font-size: 12px;
    color: var(--ink-3);
    font-style: italic;
    text-align: center;
  }
</style>
