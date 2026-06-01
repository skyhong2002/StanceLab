<script lang="ts">
  import {
    MessageSquare,
    Maximize2,
    Minimize2,
    Sparkles,
    ArrowRight,
  } from "@lucide/svelte";
  import PersonaCard from "./PersonaCard.svelte";
  import StandaloneMessage from "./StandaloneMessage.svelte";
  import QuestionBanner from "./QuestionBanner.svelte";
  import {
    PERSONAS,
    type InteractionMode,
    type PersonaKind,
    type Turn,
  } from "$lib/data/personas";

  interface Props {
    mode: InteractionMode;
    question: string;
    onQuestion: (v: string) => void;
    turns: Turn[];
    currentInput: string;
    onCurrentInput: (v: string) => void;
    onSend: () => void;
    isThinking: boolean;
    onUseAsFollowUp: (p: PersonaKind | null, body: string) => void;
    onQuoteToNotepad: (p: PersonaKind | null, body: string) => void;
    onRetry: (idx: number, p: PersonaKind) => void;
    onRetryStandalone: (idx: number) => void;
    expandedPersona: { t: number; p: PersonaKind } | null;
    onExpandPersona: (v: { t: number; p: PersonaKind } | null) => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    composerRef: (el: HTMLTextAreaElement | null) => void;
  }

  let {
    mode,
    question,
    onQuestion,
    turns,
    currentInput,
    onCurrentInput,
    onSend,
    isThinking,
    onUseAsFollowUp,
    onQuoteToNotepad,
    onRetry,
    onRetryStandalone,
    expandedPersona,
    onExpandPersona,
    isFullscreen,
    onToggleFullscreen,
    composerRef,
  }: Props = $props();

  let bodyEl: HTMLElement | undefined = $state();
  let composerEl: HTMLTextAreaElement | undefined = $state();
  let collapsedMap = $state<Record<string, boolean>>({});

  $effect(() => {
    composerRef(composerEl ?? null);
  });

  $effect(() => {
    const scrollTrigger =
      mode === "personas"
        ? turns
            .slice(-1)
            .map((t) => PERSONAS.map((p) => t.responses?.[p] ?? "").join(""))
            .join("")
        : turns
            .slice(-1)
            .map((t) => t.standaloneResponse ?? "")
            .join("");
    void scrollTrigger;
    void turns.length;
    void isThinking;
    if (bodyEl) {
      bodyEl.scrollTo({ top: bodyEl.scrollHeight, behavior: "smooth" });
    }
  });

  function isCollapsed(i: number, p: PersonaKind) {
    return !!collapsedMap[`${i}-${p}`];
  }
  function toggleCollapse(i: number, p: PersonaKind) {
    const key = `${i}-${p}`;
    collapsedMap = { ...collapsedMap, [key]: !collapsedMap[key] };
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (currentInput.trim()) onSend();
    }
  }

  const completedExchanges = $derived(
    turns.filter((t) =>
      mode === "personas"
        ? t.responses && (!t.streaming || t.streaming.length === 0)
        : !!t.standaloneResponse && !t.standaloneStreaming,
    ).length,
  );
</script>

<section class={["pane", "pane-convo", { fullscreen: isFullscreen }]}>
  <header class="pane-head">
    <div class="pane-title">
      <span class="pane-title-icon"><MessageSquare /></span>
      <div>
        <div class="pane-title-main">
          {mode === "personas" ? "三種聲音" : "對話"}
        </div>
        <div class="pane-title-sub">
          {completedExchanges} 次往返
        </div>
      </div>
    </div>
    <div class="pane-actions">
      <button
        class="mini-btn"
        onclick={onToggleFullscreen}
        title={isFullscreen ? "恢復分割檢視" : "將此面板全螢幕"}
      >
        {#if isFullscreen}<Minimize2 />{:else}<Maximize2 />{/if}
      </button>
    </div>
  </header>

  <QuestionBanner {question} {onQuestion} />

  <div class="pane-body" bind:this={bodyEl}>
    {#if turns.length === 0 && !isThinking}
      <div class="empty-convo">
        <div class="empty-convo-mark"><Sparkles /></div>
        {#if mode === "personas"}
          <h3>準備好了就開始。</h3>
          <p>
            你的意見已經在下方的輸入框裡了。修改它，或直接送出——三種聲音會同時回應。
          </p>
        {:else}
          <h3>準備好了就開始。</h3>
          <p>
            你的意見已經在下方的輸入框裡了。修改它，或直接送出——對話夥伴會回應你。
          </p>
        {/if}
      </div>
    {/if}

    {#each turns as turn, idx (idx)}
      <div class="turn-block">
        <div class="turn-user">{turn.user}</div>
        {#if mode === "personas"}
          <div class="persona-grid">
            {#each PERSONAS as p (p)}
              {@const body = turn.responses?.[p] ?? null}
              {@const thinking = turn.thinking?.[p] ?? null}
              {@const err = turn.errors?.[p]}
              {@const loading = !turn.responses && !err}
              {@const streaming =
                !loading && !err && !!turn.streaming?.includes(p)}
              <PersonaCard
                kind={p}
                {body}
                {thinking}
                isLoading={loading}
                isStreaming={streaming}
                error={err}
                onUseAsFollowUp={() => onUseAsFollowUp(p, body ?? "")}
                onSendToNotepad={() => onQuoteToNotepad(p, body ?? "")}
                onExpand={() =>
                  onExpandPersona(
                    expandedPersona &&
                      expandedPersona.t === idx &&
                      expandedPersona.p === p
                      ? null
                      : { t: idx, p },
                  )}
                collapsed={isCollapsed(idx, p)}
                onToggleCollapse={() => toggleCollapse(idx, p)}
                isExpanded={false}
                onRetry={() => onRetry(idx, p)}
              />
            {/each}
          </div>
        {:else}
          <div class="standalone-grid">
            <StandaloneMessage
              body={turn.standaloneResponse ?? null}
              thinking={turn.standaloneThinking ?? null}
              isLoading={!turn.standaloneResponse && !turn.standaloneError}
              isStreaming={!!turn.standaloneStreaming}
              error={turn.standaloneError}
              onSendToNotepad={() =>
                onQuoteToNotepad(null, turn.standaloneResponse ?? "")}
              onUseAsFollowUp={() =>
                onUseAsFollowUp(null, turn.standaloneResponse ?? "")}
              onRetry={() => onRetryStandalone(idx)}
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="composer">
    <div class="composer-inner">
      <textarea
        placeholder={turns.length === 0
          ? "你的意見在這裡——修改它，或直接送出。"
          : mode === "personas"
            ? "回覆你覺得最有幫助的那個聲音。"
            : "繼續對話。"}
        value={currentInput}
        oninput={(e) => onCurrentInput(e.currentTarget.value)}
        onkeydown={onKey}
        rows={2}
        bind:this={composerEl}
      ></textarea>
      <div class="composer-row">
        <span class="composer-hint">
          <MessageSquare />
          <span class="kbd">⌘</span> <span class="kbd">↵</span>
          {#if mode === "personas"}· 三者皆回應{:else}· 送出{/if}
        </span>
        <button
          class="btn btn-primary btn-sm"
          disabled={!currentInput.trim() || isThinking}
          onclick={onSend}
        >
          {isThinking ? "思考中…" : "送出"}
          {#if !isThinking}<ArrowRight class="btn-arrow" />{/if}
        </button>
      </div>
    </div>
  </div>
</section>
