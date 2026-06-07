<script lang="ts">
  import { Upload, X, ArrowRight } from "@lucide/svelte";
  import {
    PROVIDER_LABEL,
    type ApiProviderId,
  } from "$lib/stores/settings.svelte";
  import type { InteractionMode } from "$lib/data/personas";

  interface SessionData {
    mode?: string;
    opinion?: string;
    question?: string;
    confidence?: number;
    postingDestination?: string;
    postConfidence?: number | null;
    feeling?: string[];
    turns?: unknown[];
    prompts?: Record<string, string>;
    standalonePrompt?: string;
    apiProvider?: string;
    model?: string;
    notepad?: string;
    timestamp?: string;
  }

  interface Props {
    onImport: (data: SessionData) => void;
    onClose: () => void;
  }

  let { onImport, onClose }: Props = $props();

  let parsed: SessionData | null = $state(null);
  let fileName = $state("");
  let error = $state("");
  let dragging = $state(false);

  function validate(data: unknown): {
    valid: boolean;
    data?: SessionData;
    err?: string;
  } {
    if (!data || typeof data !== "object") {
      return { valid: false, err: "Not a valid JSON object." };
    }
    const d = data as SessionData;
    if (d.mode !== "personas" && d.mode !== "standalone") {
      return {
        valid: false,
        err: 'Missing or invalid "mode" — must be "personas" or "standalone".',
      };
    }
    if (typeof d.opinion !== "string" || !d.opinion.trim()) {
      return { valid: false, err: 'Missing or empty "opinion" field.' };
    }
    if (!Array.isArray(d.turns) || d.turns.length === 0) {
      return { valid: false, err: 'Missing or empty "turns" array.' };
    }
    return { valid: true, data: d };
  }

  function handleFile(file: File) {
    error = "";
    parsed = null;
    fileName = "";
    if (!file.name.endsWith(".json")) {
      error = "Please select a .json file.";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        const result = validate(raw);
        if (result.valid && result.data) {
          parsed = result.data;
          fileName = file.name;
        } else {
          error = result.err ?? "Unknown validation error.";
        }
      } catch {
        error = "Could not parse JSON. Check the file and try again.";
      }
    };
    reader.readAsText(file);
  }

  function onFileInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.[0]) handleFile(input.files[0]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function onDragLeave() {
    dragging = false;
  }

  const truncatedOpinion = $derived.by(() => {
    const p = parsed;
    if (!p) return "";
    return p.opinion && p.opinion.length > 120
      ? p.opinion.slice(0, 120) + "…"
      : (p.opinion ?? "");
  });

  const modeLabel = $derived.by(() => {
    const m = parsed?.mode;
    if (m === "personas") return "Three personas";
    if (m === "standalone") return "Standalone LLM";
    return "";
  });

  const turnCount = $derived.by(() => {
    const p = parsed;
    return p?.turns?.length ?? 0;
  });

  const providerLabel = $derived.by(() => {
    const p = parsed?.apiProvider;
    if (!p) return "";
    return (PROVIDER_LABEL as Record<string, string>)[p] ?? p;
  });

  const formattedDate = $derived.by(() => {
    const ts = parsed?.timestamp;
    if (!ts) return "";
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  });
</script>

<div
  class="modal-backdrop"
  role="button"
  tabindex="-1"
  onclick={onClose}
  onkeydown={(e) => {
    if (e.key === "Escape") onClose();
  }}
>
  <div
    class="api-modal"
    role="dialog"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <header class="api-modal-head">
      <div class="api-modal-title">
        <span class="api-modal-icon"><Upload /></span>
        <div>
          <div class="pane-title-main">Import session</div>
          <div class="pane-title-sub">
            Load a previously exported session to review or continue.
          </div>
        </div>
      </div>
      <button class="icon-btn" onclick={onClose} title="Close"><X /></button>
    </header>

    <div class="api-modal-body">
      {#if !parsed}
        <label
          class={["drop-zone", { dragging }]}
          ondrop={onDrop}
          ondragover={onDragOver}
          ondragleave={onDragLeave}
        >
          <input
            type="file"
            accept=".json"
            onchange={onFileInput}
            class="drop-input"
          />
          <Upload />
          <div>
            <strong>Choose a JSON file</strong>
            <span>or drag and drop here</span>
          </div>
        </label>
        {#if error}
          <p class="api-error">{error}</p>
        {/if}
      {:else}
        <div class="import-preview">
          <div class="import-preview-row">
            <span class="import-label">Mode</span>
            <span class="import-value">{modeLabel}</span>
          </div>
          <div class="import-preview-row">
            <span class="import-label">Opinion</span>
            <span class="import-value">{truncatedOpinion}</span>
          </div>
          {#if parsed.question}
            <div class="import-preview-row">
              <span class="import-label">Question</span>
              <span class="import-value"
                >{parsed.question.length > 80
                  ? parsed.question.slice(0, 80) + "…"
                  : parsed.question}</span
              >
            </div>
          {/if}
          <div class="import-preview-row">
            <span class="import-label">Turns</span>
            <span class="import-value"
              >{turnCount} exchange{turnCount !== 1 ? "s" : ""}</span
            >
          </div>
          <div class="import-preview-row">
            <span class="import-label">Confidence</span>
            <span class="import-value">{parsed.confidence}%</span>
          </div>
          {#if parsed.model || providerLabel}
            <div class="import-preview-row">
              <span class="import-label">Model</span>
              <span class="import-value"
                >{providerLabel}{parsed.model ? ` / ${parsed.model}` : ""}</span
              >
            </div>
          {/if}
          {#if formattedDate}
            <div class="import-preview-row">
              <span class="import-label">Date</span>
              <span class="import-value">{formattedDate}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <footer class="api-modal-foot">
      {#if parsed}
        <button
          class="link-button"
          onclick={() => {
            parsed = null;
            fileName = "";
            error = "";
          }}
        >
          Choose different file
        </button>
        <button
          class="btn btn-primary btn-sm"
          onclick={() => onImport(parsed!)}
        >
          Import session <ArrowRight class="btn-arrow" />
        </button>
      {:else}
        <button class="link-button" onclick={onClose}>Cancel</button>
      {/if}
    </footer>
  </div>
</div>

<style>
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 2px dashed var(--rule);
    border-radius: var(--r);
    padding: 40px 20px;
    cursor: pointer;
    transition: all 0.15s;
    background: var(--paper-2);
    text-align: center;
  }
  .drop-zone:hover,
  .drop-zone.dragging {
    border-color: oklch(0.7 0.06 65);
    background: oklch(0.97 0.025 65);
  }
  .drop-zone :global(svg) {
    width: 28px;
    height: 28px;
    color: var(--ink-3);
  }
  .drop-zone strong {
    font-family: var(--sans);
    font-size: 14px;
    color: var(--ink);
  }
  .drop-zone span {
    display: block;
    font-family: var(--sans);
    font-size: 12px;
    color: var(--ink-3);
  }
  .drop-input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    pointer-events: none;
  }
  .drop-zone {
    position: relative;
  }
  .import-preview {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .import-preview-row {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }
  .import-label {
    font-family: var(--sans);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
    min-width: 80px;
    flex-shrink: 0;
  }
  .import-value {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.4;
    min-width: 0;
  }
</style>
