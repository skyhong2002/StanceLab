<script lang="ts">
  import Icon from "./Icon.svelte";
  import {
    PERSONA_META,
    type PersonaKind,
    type Turn,
  } from "$lib/data/personas";
  import { renderMarkdown } from "$lib/markdown";

  interface Props {
    turn: Turn;
    persona: PersonaKind;
    onClose: () => void;
    onQuoteToNotepad: (p: PersonaKind, body: string) => void;
    onUseAsFollowUp: (p: PersonaKind, body: string) => void;
  }

  let { turn, persona, onClose, onQuoteToNotepad, onUseAsFollowUp }: Props =
    $props();

  const meta = $derived(PERSONA_META[persona]);
  const body = $derived(turn.responses?.[persona] ?? "");
  const thinking = $derived(turn.thinking?.[persona] ?? "");
  let showThinking = $state(false);
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
    class={["modal-card", persona]}
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
      <button class="icon-btn" onclick={onClose}
        ><Icon name="close" /> 關閉</button
      >
    </header>
    <div class="modal-body">
      <div class="modal-context">回覆：</div>
      <div class="turn-user" style="margin-bottom: 22px;">{turn.user}</div>
      <div class="chat-response" style="font-size: 18px; line-height: 1.65;">
        {@html renderMarkdown(body)}
      </div>
      {#if thinking}
        <div class="thinking-section" style="margin-top: 18px;">
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
    </div>
    <footer class="modal-foot">
      <button
        class="btn btn-ghost btn-sm"
        onclick={() => {
          onQuoteToNotepad(persona, body);
          onClose();
        }}
      >
        <Icon name="copy" /> 引用到記事本
      </button>
      <button
        class="btn btn-primary btn-sm"
        onclick={() => {
          onUseAsFollowUp(persona, body);
          onClose();
        }}
      >
        <Icon name="reply" /> 回覆這則
      </button>
    </footer>
  </div>
</div>
