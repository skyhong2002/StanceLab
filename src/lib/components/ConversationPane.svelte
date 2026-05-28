<script lang="ts">
  import Icon from "./Icon.svelte";
  import PersonaCard from "./PersonaCard.svelte";
  import QuestionBanner from "./QuestionBanner.svelte";
  import { PERSONAS, type PersonaKind, type Turn } from "$lib/data/personas";

  interface Props {
    question: string;
    onQuestion: (v: string) => void;
    turns: Turn[];
    currentInput: string;
    onCurrentInput: (v: string) => void;
    onSend: () => void;
    isThinking: boolean;
    onChooseHelpful: (idx: number, p: PersonaKind) => void;
    onUseAsFollowUp: (p: PersonaKind, body: string) => void;
    onQuoteToNotepad: (p: PersonaKind, body: string) => void;
    onRetry: (idx: number, p: PersonaKind) => void;
    expandedPersona: { t: number; p: PersonaKind } | null;
    onExpandPersona: (v: { t: number; p: PersonaKind } | null) => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    showPauseNudge: boolean;
    composerRef: (el: HTMLTextAreaElement | null) => void;
  }

  let {
    question,
    onQuestion,
    turns,
    currentInput,
    onCurrentInput,
    onSend,
    isThinking,
    onChooseHelpful,
    onUseAsFollowUp,
    onQuoteToNotepad,
    onRetry,
    expandedPersona,
    onExpandPersona,
    isFullscreen,
    onToggleFullscreen,
    showPauseNudge,
    composerRef,
  }: Props = $props();

  let bodyEl: HTMLElement | undefined = $state();
  let composerEl: HTMLTextAreaElement | undefined = $state();
  let collapsedMap = $state<Record<string, boolean>>({});

  $effect(() => {
    composerRef(composerEl ?? null);
  });

  $effect(() => {
    // re-run on turns growth, thinking toggle, or streaming content changes
    const scrollTrigger = turns
      .slice(-1)
      .map((t) => PERSONAS.map((p) => t.responses?.[p] ?? "").join(""))
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
    turns.filter(
      (t) => t.responses && (!t.streaming || t.streaming.length === 0),
    ).length,
  );
</script>

<section class={["pane", "pane-convo", { fullscreen: isFullscreen }]}>
  <header class="pane-head">
    <div class="pane-title">
      <span class="pane-title-icon"><Icon name="message" /></span>
      <div>
        <div class="pane-title-main">三種聲音</div>
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
        {#if isFullscreen}<Icon name="collapse" />{:else}<Icon
            name="expand"
          />{/if}
      </button>
    </div>
  </header>

  <QuestionBanner {question} {onQuestion} />

  <div class="pane-body" bind:this={bodyEl}>
    {#if turns.length === 0 && !isThinking}
      <div class="empty-convo">
        <div class="empty-convo-mark"><Icon name="spark" /></div>
        <h3>準備好了就開始。</h3>
        <p>
          你的意見已經在下方的輸入框裡了。修改它，或直接送出——三種聲音會同時回應。
        </p>
      </div>
    {/if}

    {#each turns as turn, idx (idx)}
      <div class="turn-block">
        <div class="turn-user">{turn.user}</div>
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
              isSelected={turn.helpful === p}
              onSelect={() => onChooseHelpful(idx, p)}
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
      </div>
    {/each}

    {#if showPauseNudge}
      <div class="pause-card">
        <Icon name="pause" />
        <div>你已經來回了好幾輪。別著急——你回來時，記事本都還會在這裡。</div>
      </div>
    {/if}
  </div>

  <div class="composer">
    <div class="composer-inner">
      <textarea
        placeholder={turns.length === 0
          ? "你的意見在這裡——修改它，或直接送出。"
          : "回覆你覺得最有幫助的那個聲音。"}
        value={currentInput}
        oninput={(e) => onCurrentInput(e.currentTarget.value)}
        onkeydown={onKey}
        rows={2}
        bind:this={composerEl}
      ></textarea>
      <div class="composer-row">
        <span class="composer-hint">
          <Icon name="message" />
          <span class="kbd">⌘</span> <span class="kbd">↵</span> · 三者皆回應
        </span>
        <button
          class="btn btn-primary btn-sm"
          disabled={!currentInput.trim() || isThinking}
          onclick={onSend}
        >
          {isThinking ? "思考中…" : "送出"}
          {#if !isThinking}<Icon name="arrow" class="btn-arrow" />{/if}
        </button>
      </div>
    </div>
  </div>
</section>
