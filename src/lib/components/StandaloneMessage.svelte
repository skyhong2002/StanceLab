<script lang="ts">
  import {
    Bot,
    ChevronUp,
    ChevronDown,
    FilePlus,
    Reply,
    RefreshCw,
  } from "@lucide/svelte";
  import { renderMarkdown } from "$lib/markdown";

  interface Props {
    body: string | null;
    thinking: string | null;
    isLoading: boolean;
    isStreaming: boolean;
    error?: string;
    onSendToNotepad: () => void;
    onUseAsFollowUp: () => void;
    onRetry: () => void;
  }

  let {
    body,
    thinking,
    isLoading,
    isStreaming,
    error,
    onSendToNotepad,
    onUseAsFollowUp,
    onRetry,
  }: Props = $props();

  let showThinking = $state(false);
</script>

<div class="standalone-card">
  <div class="standalone-head">
    <span class="standalone-name">
      <span class="standalone-glyph"><Bot /></span>
      LLM 回答
    </span>
  </div>

  <div class="standalone-body">
    {#if isLoading}
      <div class="typing-dots" aria-label="LLM is thinking">
        <span></span><span></span><span></span>
      </div>
    {:else if error}
      <p style="color: var(--ink-2);">
        <strong>Couldn't reach the model.</strong><br />
        <span class="muted text-sans" style="font-size: 12px;">{error}</span>
      </p>
    {:else if body}
      <div class="chat-response">
        {@html renderMarkdown(body)}
      </div>
      {#if isStreaming}
        <span class="streaming-cursor">▍</span>
      {/if}
      {#if thinking}
        <div class="thinking-section">
          <button
            class="thinking-toggle"
            onclick={() => (showThinking = !showThinking)}
          >
            {#if showThinking}<ChevronUp />{:else}<ChevronDown />{/if}
            {showThinking ? "隱藏思考過程" : "查看思考過程"}
          </button>
          {#if showThinking}
            <div class="thinking-content">
              {thinking}
            </div>
          {/if}
        </div>
      {/if}
    {:else if isStreaming}
      <span class="streaming-cursor">▍</span>
    {/if}
  </div>

  {#if !isLoading && !error && !isStreaming}
    <div class="standalone-foot">
      <button class="notebook-btn" title="Add to notebook" onclick={onSendToNotepad}>
        <FilePlus />
      </button>
      <button class="persona-followup" title="Reply" onclick={onUseAsFollowUp}>
        <Reply />
      </button>
    </div>
  {/if}
  {#if !isLoading && error}
    <div class="standalone-foot">
      <button class="persona-followup" title="Retry" onclick={onRetry}>
        <RefreshCw />
      </button>
    </div>
  {/if}
</div>
