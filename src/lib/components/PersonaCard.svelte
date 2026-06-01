<script lang="ts">
  import Icon from "./Icon.svelte";
  import { PERSONA_META, type PersonaKind } from "$lib/data/personas";
  import { renderMarkdown } from "$lib/markdown";

  interface Props {
    kind: PersonaKind;
    body: string | null;
    thinking: string | null;
    isLoading: boolean;
    isStreaming: boolean;
    error?: string;
    isSelected: boolean;
    collapsed: boolean;
    isExpanded: boolean;
    onSelect: () => void;
    onUseAsFollowUp: () => void;
    onSendToNotepad: () => void;
    onExpand: () => void;
    onToggleCollapse: () => void;
    onRetry: () => void;
  }

  let {
    kind,
    body,
    thinking,
    isLoading,
    isStreaming,
    error,
    isSelected,
    collapsed,
    isExpanded,
    onSelect,
    onUseAsFollowUp,
    onSendToNotepad,
    onExpand,
    onToggleCollapse,
    onRetry,
  }: Props = $props();

  const meta = $derived(PERSONA_META[kind]);
  let showThinking = $state(false);
</script>

<div
  class={["persona-card", kind, { selected: isSelected, expanded: isExpanded }]}
>
  <div class="persona-head">
    <button
      class="persona-name persona-name-btn"
      onclick={onToggleCollapse}
      title={collapsed ? "Expand" : "Collapse"}
    >
      <span class="persona-glyph"><Icon name={meta.glyph} /></span>
      {meta.name}
    </button>
    <div class="persona-head-actions">
      {#if !isLoading && !error && !isStreaming}
        <button
          class="mini-btn"
          onclick={onSendToNotepad}
          title="Send to notepad"
        >
          <Icon name="copy" />
        </button>
      {/if}
      <button
        class="mini-btn"
        onclick={onExpand}
        title={isExpanded ? "Collapse" : "Open fullscreen"}
      >
        {#if isExpanded}
          <Icon name="close" />
        {:else}
          <Icon name="expand" />
        {/if}
      </button>
    </div>
  </div>

  {#if !collapsed}
    <div class="persona-body">
      {#if isLoading}
        <div class="typing-dots" aria-label={meta.name + " is thinking"}>
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
              <Icon name={showThinking ? "chevronUp" : "chevronDown"} />
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
      <div class="persona-foot">
        <button
          class={["helpful-btn", { active: isSelected }]}
          onclick={onSelect}
          aria-pressed={isSelected}
        >
          <Icon name="thumbsUp" />
          {isSelected ? "Most helpful" : "Mark helpful"}
        </button>
        <button class="persona-followup" onclick={onUseAsFollowUp}>
          <Icon name="reply" /> Reply
        </button>
      </div>
    {/if}
    {#if !isLoading && error}
      <div class="persona-foot">
        <button class="persona-followup" onclick={onRetry}>
          <Icon name="refresh" /> Retry
        </button>
      </div>
    {/if}
  {/if}
</div>
