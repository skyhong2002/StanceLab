<script lang="ts">
  import { X, RefreshCw, Download } from "@lucide/svelte";
  import ModelSelect from "./ModelSelect.svelte";
  import {
    PERSONA_META,
    PERSONAS,
    DEFAULT_PROMPTS,
    DEFAULT_STANDALONE_PROMPT,
    type InteractionMode,
  } from "$lib/data/personas";
  import {
    API_PROVIDERS,
    DEFAULT_MODEL_BY_PROVIDER,
    settings,
    clearKey,
    resetPrompts,
    resetStandalonePrompt,
    type ApiProviderId,
  } from "$lib/stores/settings.svelte";
  import { testConnection } from "$lib/openrouter";

  interface Props {
    open: boolean;
    focusApi?: boolean;
    onClose: () => void;
    onExportSession: () => void;
    onModeChange: (mode: InteractionMode) => void;
  }
  let {
    open,
    focusApi = false,
    onClose,
    onExportSession,
    onModeChange,
  }: Props = $props();

  let showKey = $state(false);
  let testing = $state(false);
  let testResult = $state<"" | "ok" | string>("");
  let apiSectionEl: HTMLElement | undefined = $state();
  const providerMeta = $derived(
    API_PROVIDERS.find((p) => p.id === settings.apiProvider) ??
      API_PROVIDERS[0],
  );

  $effect(() => {
    if (open && focusApi && apiSectionEl) {
      apiSectionEl.scrollIntoView({ block: "start" });
    }
  });

  async function runTest() {
    testing = true;
    testResult = "";
    try {
      await testConnection();
      testResult = "ok";
    } catch (e: unknown) {
      testResult = e instanceof Error ? e.message : "failed";
    } finally {
      testing = false;
    }
  }

  function chooseApiProvider(id: ApiProviderId) {
    settings.apiProvider = id;
    settings.model = DEFAULT_MODEL_BY_PROVIDER[id];
    settings.apiKey = "";
    settings.demoMode = false;
    testResult = "";
  }
</script>

{#if open}
  <button class="drawer-backdrop" aria-label="Close settings" onclick={onClose}
  ></button>
  <aside class="drawer">
    <div class="drawer-head">
      <strong style="font-family: var(--serif); font-size: 18px;"
        >Researcher settings</strong
      >
      <button class="icon-btn" onclick={onClose}><X /> Close</button>
    </div>
    <div class="drawer-body">
      <div class="drawer-section">
        <h3>Interaction mode</h3>
        <p class="muted text-sans" style="font-size: 13px; margin: 0 0 14px;">
          Switching mode will reset the current conversation.
        </p>
        <div
          class="mode-toggle"
          role="radiogroup"
          aria-label="Interaction mode"
        >
          <button
            type="button"
            class:active={settings.mode === "personas"}
            onclick={() => {
              if (settings.mode !== "personas") onModeChange("personas");
            }}
            role="radio"
            aria-checked={settings.mode === "personas"}
          >
            <strong>Three personas</strong>
            <span>Interviewer, Mentor, Opponent</span>
          </button>
          <button
            type="button"
            class:active={settings.mode === "standalone"}
            onclick={() => {
              if (settings.mode !== "standalone") onModeChange("standalone");
            }}
            role="radio"
            aria-checked={settings.mode === "standalone"}
          >
            <strong>Standalone LLM</strong>
            <span>Single conversational partner</span>
          </button>
        </div>
      </div>

      <div class="drawer-section" bind:this={apiSectionEl}>
        <h3>API access</h3>
        <p class="muted text-sans" style="font-size: 13px; margin: 0 0 14px;">
          Bring your own provider key. Stored only in this browser. Cleared on
          Clear key.
          {#if settings.apiProvider === "opencode-go"}
            OpenCode Go calls are forwarded through this app because its API
            does not accept browser-direct requests.
          {/if}
        </p>

        <div class="api-label">Provider</div>
        <div
          class="provider-toggle"
          role="radiogroup"
          aria-label="API provider"
        >
          {#each API_PROVIDERS as provider (provider.id)}
            <button
              type="button"
              class:active={settings.apiProvider === provider.id}
              onclick={() => chooseApiProvider(provider.id)}
              role="radio"
              aria-checked={settings.apiProvider === provider.id}
            >
              <strong>{provider.name}</strong>
              <span>{provider.help}</span>
            </button>
          {/each}
        </div>

        <label class="api-label" for="drawer-key" style="margin-top: 14px;"
          >{providerMeta.keyLabel}</label
        >
        <div class="api-key-row">
          <input
            id="drawer-key"
            class="field"
            type={showKey ? "text" : "password"}
            placeholder={providerMeta.keyPlaceholder}
            value={settings.apiKey}
            oninput={(e) => {
              settings.apiKey = e.currentTarget.value;
              settings.demoMode = false;
              testResult = "";
            }}
            autocomplete="off"
            spellcheck="false"
          />
          <button class="icon-btn" onclick={() => (showKey = !showKey)}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>

        <label class="api-label" for="drawer-model" style="margin-top: 14px;"
          >Model</label
        >
        <ModelSelect
          id="drawer-model"
          apiProvider={settings.apiProvider}
          value={settings.model}
          onChange={(v) => (settings.model = v)}
        />

        <div class="row" style="gap: 8px; margin-top: 14px;">
          <button
            class="btn btn-ghost btn-sm"
            onclick={runTest}
            disabled={!settings.apiKey || testing}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            onclick={clearKey}
            disabled={!settings.apiKey}
          >
            Clear key
          </button>
          <label
            class="row"
            style="gap: 8px; align-items: center; margin-left: auto;"
          >
            <input
              type="checkbox"
              checked={settings.demoMode}
              onchange={(e) => (settings.demoMode = e.currentTarget.checked)}
            />
            <span class="muted text-sans" style="font-size: 13px;"
              >Demo mode</span
            >
          </label>
        </div>

        {#if testResult === "ok"}
          <p class="api-success">✓ Connected successfully.</p>
        {:else if testResult}
          <p class="api-error">{testResult}</p>
        {/if}
      </div>

      {#if settings.mode === "personas"}
        <div class="drawer-section">
          <h3>Persona prompts</h3>
          <p class="muted text-sans" style="font-size: 13px; margin: 0 0 14px;">
            Edit each persona's behavior independently. Changes apply on the
            next message.
          </p>
          {#each PERSONAS as p (p)}
            {@const meta = PERSONA_META[p]}
            <div style="margin-bottom: 16px;">
              <div class="prompt-label">
                <strong>
                  <span
                    style="width: 10px; height: 10px; border-radius: 50%; background: var({meta.var}); display: inline-block;"
                  ></span>
                  {meta.name}
                </strong>
                <button
                  class="icon-btn"
                  onclick={() =>
                    (settings.prompts = {
                      ...settings.prompts,
                      [p]: DEFAULT_PROMPTS[p],
                    })}
                  style="font-size: 12px;"
                >
                  <RefreshCw /> Reset
                </button>
              </div>
              <textarea
                class="prompt-edit"
                value={settings.prompts[p]}
                oninput={(e) =>
                  (settings.prompts = {
                    ...settings.prompts,
                    [p]: e.currentTarget.value,
                  })}
              ></textarea>
            </div>
          {/each}
          <button class="btn btn-ghost btn-sm" onclick={resetPrompts}>
            <RefreshCw /> Reset all prompts
          </button>
        </div>
      {:else}
        <div class="drawer-section">
          <h3>Standalone prompt</h3>
          <p class="muted text-sans" style="font-size: 13px; margin: 0 0 14px;">
            Edit the LLM's system prompt. Changes apply on the next message.
          </p>
          <div style="margin-bottom: 16px;">
            <div class="prompt-label">
              <strong>System prompt</strong>
              <button
                class="icon-btn"
                onclick={resetStandalonePrompt}
                style="font-size: 12px;"
              >
                <RefreshCw /> Reset
              </button>
            </div>
            <textarea
              class="prompt-edit"
              value={settings.standalonePrompt}
              oninput={(e) =>
                (settings.standalonePrompt = e.currentTarget.value)}
            ></textarea>
          </div>
        </div>
      {/if}

      <div class="drawer-section">
        <h3>Session export</h3>
        <button class="btn btn-ghost" onclick={onExportSession}>
          <Download /> Download session JSON
        </button>
        <p class="muted text-sans" style="font-size: 12px; margin-top: 8px;">
          Includes opinion, question, turns, notepad — never the API key.
        </p>
      </div>
    </div>
  </aside>
{/if}

<style>
  :global(.drawer-backdrop) {
    appearance: none;
    border: 0;
    padding: 0;
    cursor: default;
  }
  :global(.api-success) {
    color: oklch(0.5 0.12 150);
    font-family: var(--sans);
    font-size: 13px;
    margin: 10px 0 0;
  }
</style>
