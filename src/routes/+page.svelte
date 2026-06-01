<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import StartScreen from "$lib/components/StartScreen.svelte";
  import ConversationPane from "$lib/components/ConversationPane.svelte";
  import NotepadPane from "$lib/components/NotepadPane.svelte";
  import CompleteScreen from "$lib/components/CompleteScreen.svelte";
  import SettingsDrawer from "$lib/components/SettingsDrawer.svelte";
  import ApiKeyModal from "$lib/components/ApiKeyModal.svelte";
  import PersonaModal from "$lib/components/PersonaModal.svelte";

  import {
    PERSONA_META,
    PERSONAS,
    QUESTION_SUGGESTIONS,
    SCRIPTED_TURNS,
    type PersonaKind,
    type Turn,
  } from "$lib/data/personas";
  import { settings } from "$lib/stores/settings.svelte";
  import {
    chatStream,
    streamingVisibleText,
    suggestQuestion,
    parseThinkingResponse,
    OpenRouterError,
    type ChatMessage,
  } from "$lib/openrouter";

  type Step = "start" | "workspace" | "complete";
  type FullscreenPane = null | "convo" | "notepad";

  let step = $state<Step>("start");

  // start state
  let opinion = $state("");
  let question = $state("");
  let questionGenerating = $state(false);
  let confidence = $state(50);
  let feeling = $state<string[]>([]);

  // workspace state
  let turns = $state<Turn[]>([]);
  let currentInput = $state("");
  let isThinking = $state(false);
  // notepad
  let notepad = $state("");
  let postConfidence = $state<number | null>(null);

  // ui
  let fullscreen = $state<FullscreenPane>(null);
  let expandedPersona = $state<{ t: number; p: PersonaKind } | null>(null);
  let settingsOpen = $state(false);
  let settingsFocusApi = $state(false);
  let apiModalOpen = $state(false);
  let composerEl = $state<HTMLTextAreaElement | null>(null);

  // resizable split between conversation and notepad panes
  let splitPct = $state(50);
  let dragging = $state(false);
  let workspaceEl = $state<HTMLDivElement | null>(null);

  function onDividerDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDividerMove(e: PointerEvent) {
    if (!dragging || !workspaceEl) return;
    const rect = workspaceEl.getBoundingClientRect();
    const padding = 14;
    const usable = rect.width - padding * 2;
    if (usable <= 0) return;
    const local = e.clientX - rect.left - padding;
    const pct = (local / usable) * 100;
    splitPct = Math.max(20, Math.min(80, pct));
  }
  function onDividerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId))
      el.releasePointerCapture(e.pointerId);
  }

  // Open the BYOK modal on first run (no key, not in demo mode)
  $effect(() => {
    if (!settings.apiKey && !settings.demoMode && step === "start") {
      apiModalOpen = true;
    }
  });

  function fallbackQuestion() {
    return QUESTION_SUGGESTIONS[
      Math.floor(Math.random() * QUESTION_SUGGESTIONS.length)
    ];
  }

  async function generateQuestion() {
    if (!opinion.trim() || questionGenerating) return;
    questionGenerating = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      if (settings.apiKey && !settings.demoMode) {
        const out = await suggestQuestion(opinion, controller.signal);
        const cleaned = out.trim();
        question =
          cleaned && cleaned.length < 200 ? cleaned : fallbackQuestion();
      } else {
        await new Promise((r) => setTimeout(r, 700));
        question = fallbackQuestion();
      }
    } catch {
      question = fallbackQuestion();
    } finally {
      window.clearTimeout(timeout);
      questionGenerating = false;
    }
  }

  async function beginReflecting() {
    if (!question.trim()) {
      await generateQuestion();
    }
    currentInput = opinion;
    step = "workspace";
  }

  function buildSystemPrompt(kind: PersonaKind): string {
    const base = settings.prompts[kind];
    const lines = [`Anchor question: ${question || "(none set yet)"}`];
    if (opinion)
      lines.push(
        `User's starting opinion (confidence ${confidence}%): ${opinion}`,
      );
    if (feeling.length)
      lines.push(`Feelings the user named: ${feeling.join(", ")}`);
    return `${base}\n\n${lines.join("\n")}`;
  }

  function buildMessages(
    kind: PersonaKind,
    priorTurns: Turn[],
    userMsg: string,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(kind) },
    ];
    for (const t of priorTurns) {
      messages.push({ role: "user", content: t.user });
      if (t.responses?.[kind]) {
        messages.push({ role: "assistant", content: t.responses[kind] });
      }
    }
    messages.push({ role: "user", content: userMsg });
    return messages;
  }

  function describeError(reason: unknown): string {
    if (reason instanceof OpenRouterError) {
      return reason.status
        ? `${reason.status}: ${reason.message}`
        : reason.message;
    }
    if (reason instanceof Error) return reason.message;
    return String(reason);
  }

  async function streamPersona(
    turnIdx: number,
    kind: PersonaKind,
    userMsg: string,
  ) {
    const priorTurns = turns.slice(0, turnIdx);
    const messages = buildMessages(kind, priorTurns, userMsg);
    let accumulated = "";

    // Ensure responses object exists so onChunk can write to it
    const existing = turns[turnIdx];
    if (!existing.responses) {
      turns[turnIdx] = {
        ...existing,
        responses: {} as Record<PersonaKind, string>,
      };
    }

    try {
      const fullText = await chatStream(messages, {
        maxTokens: 2000,
        temperature: 0.8,
        onChunk: (chunk) => {
          accumulated += chunk;
          const visible = streamingVisibleText(accumulated);
          const t = turns[turnIdx];
          if (t.responses) {
            t.responses[kind] = visible;
          }
        },
      });

      const parsed = parseThinkingResponse(fullText);
      const t = turns[turnIdx];
      if (t.responses) {
        t.responses[kind] = parsed.response;
      }
      t.thinking = { ...(t.thinking ?? {}), [kind]: parsed.thinking };
      t.streaming = (t.streaming ?? []).filter((k) => k !== kind);
    } catch (err) {
      const t = turns[turnIdx];
      t.errors = { ...(t.errors ?? {}), [kind]: describeError(err) };
      t.streaming = (t.streaming ?? []).filter((k) => k !== kind);
    }
  }

  async function send() {
    if (!currentInput.trim()) return;
    const userMsg = currentInput.trim();
    currentInput = "";
    const turnIdx = turns.length;
    const newTurn: Turn = {
      user: userMsg,
      responses: null,
      thinking: {},
      helpful: null,
      errors: {},
      streaming: [...PERSONAS],
    };
    turns = [...turns, newTurn];
    isThinking = true;

    if (!settings.apiKey || settings.demoMode) {
      setTimeout(() => {
        const scripted =
          SCRIPTED_TURNS[Math.min(turnIdx, SCRIPTED_TURNS.length - 1)];
        const responses: Record<PersonaKind, string> = {
          interviewer: scripted.interviewer.response,
          mentor: scripted.mentor.response,
          opponent: scripted.opponent.response,
        };
        const thinking: Partial<Record<PersonaKind, string>> = {
          interviewer: scripted.interviewer.thinking,
          mentor: scripted.mentor.thinking,
          opponent: scripted.opponent.thinking,
        };
        turns = turns.map((t, i) =>
          i === turnIdx ? { ...t, responses, thinking, streaming: [] } : t,
        );
        isThinking = false;
      }, 1400);
      return;
    }

    try {
      await Promise.allSettled(
        PERSONAS.map((k) => streamPersona(turnIdx, k, userMsg)),
      );
    } finally {
      isThinking = false;
    }
  }

  async function retryPersona(idx: number, p: PersonaKind) {
    const t = turns[idx];
    if (!t) return;
    turns = turns.map((tt, i) => {
      if (i !== idx) return tt;
      const responses = { ...(tt.responses ?? {}) } as Partial<
        Record<PersonaKind, string>
      >;
      delete responses[p];
      const thinking = { ...(tt.thinking ?? {}) };
      delete thinking[p];
      const errors = { ...(tt.errors ?? {}) };
      delete errors[p];
      const stillHasResponses = Object.keys(responses).length > 0;
      const streaming = [...(tt.streaming ?? []).filter((k) => k !== p), p];
      return {
        ...tt,
        responses: stillHasResponses
          ? (responses as Record<PersonaKind, string>)
          : ({} as Record<PersonaKind, string>),
        thinking: Object.keys(thinking).length > 0 ? thinking : {},
        errors,
        streaming,
      };
    });
    isThinking = true;
    if (!settings.apiKey || settings.demoMode) {
      setTimeout(() => {
        const scripted =
          SCRIPTED_TURNS[Math.min(idx, SCRIPTED_TURNS.length - 1)];
        turns = turns.map((tt, i) => {
          if (i !== idx) return tt;
          const responses = {
            ...(tt.responses ?? {}),
          } as Partial<Record<PersonaKind, string>>;
          responses[p] = scripted[p].response;
          const thinking = { ...(tt.thinking ?? {}) };
          thinking[p] = scripted[p].thinking;
          const streaming = (tt.streaming ?? []).filter((k) => k !== p);
          return {
            ...tt,
            responses: responses as Record<PersonaKind, string>,
            thinking,
            streaming,
          };
        });
        isThinking = false;
      }, 800);
      return;
    }
    try {
      await streamPersona(idx, p, t.user);
    } finally {
      isThinking = false;
    }
  }

  function chooseHelpful(idx: number, p: PersonaKind) {
    turns = turns.map((t, i) =>
      i === idx ? { ...t, helpful: t.helpful === p ? null : p } : t,
    );
  }

  function useAsFollowUp(persona: PersonaKind, body: string) {
    void body;
    const seed = `接續${PERSONA_META[persona].name}的觀點：`;
    currentInput = seed;
    setTimeout(() => {
      if (composerEl) {
        composerEl.focus();
        composerEl.setSelectionRange(seed.length, seed.length);
      }
    }, 50);
  }

  function quoteToNotepad(persona: PersonaKind, text: string) {
    if (!text) return;
    const meta = PERSONA_META[persona];
    const lead = notepad && !notepad.endsWith("\n\n") ? "\n\n" : "";
    const quoted = text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    notepad = `${notepad}${lead}— ${meta.name} said:\n${quoted}\n\n`;
  }

  function exportText() {
    const blob = new Blob([notepad], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stancelab-post.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportSession() {
    const data = {
      opinion,
      question,
      confidence,
      postConfidence,
      feeling,
      turns: turns.map((t) => ({
        user: t.user,
        responses: t.responses,
        thinking: t.thinking,
        helpful: t.helpful,
      })),
      prompts: settings.prompts,
      apiProvider: settings.apiProvider,
      model: settings.model,
      notepad,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stancelab-session.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function restart() {
    step = "start";
    opinion = "";
    question = "";
    questionGenerating = false;
    confidence = 50;
    feeling = [];
    turns = [];
    notepad = "";
    postConfidence = null;
    isThinking = false;
    fullscreen = null;
    expandedPersona = null;
    currentInput = "";
  }

  function openSettings(focus = false) {
    settingsFocusApi = focus;
    settingsOpen = true;
  }

  const keyStatus = $derived(
    settings.apiKey ? "ok" : settings.demoMode ? "demo" : "unset",
  );
</script>

<header class="topbar">
  <div class="brand">
    <span class="brand-mark"></span>
    StanceLab
  </div>

  <div class="topbar-actions">
    <button
      class="icon-btn key-status"
      data-status={keyStatus}
      onclick={() => {
        if (keyStatus === "unset") apiModalOpen = true;
        else openSettings(true);
      }}
      title={keyStatus === "ok"
        ? "API key set"
        : keyStatus === "demo"
          ? "Demo mode (no key)"
          : "Add your API key"}
    >
      <Icon name="key" />
      <span class="status-dot"></span>
    </button>
    {#if step === "workspace" || step === "complete"}
      <button class="icon-btn" onclick={restart} title="Start a new session">
        <Icon name="refresh" />
      </button>
    {/if}
    <button class="icon-btn" onclick={() => openSettings(false)}>
      <Icon name="settings" /> Researcher
    </button>
  </div>
</header>

{#if step === "start"}
  <StartScreen
    {opinion}
    {question}
    {questionGenerating}
    {confidence}
    {feeling}
    onOpinion={(v) => (opinion = v)}
    onQuestion={(v) => (question = v)}
    onConfidence={(v) => (confidence = v)}
    onFeeling={(v) => (feeling = v)}
    onGenerateQuestion={generateQuestion}
    onBegin={beginReflecting}
  />
{:else if step === "workspace"}
  <div
    class={[
      "workspace",
      fullscreen ? `fs-${fullscreen}` : "",
      dragging ? "dragging" : "",
    ]}
    style="--split: {splitPct}%"
    bind:this={workspaceEl}
  >
    <ConversationPane
      {question}
      onQuestion={(v) => (question = v)}
      {turns}
      {currentInput}
      onCurrentInput={(v) => (currentInput = v)}
      onSend={send}
      {isThinking}
      onChooseHelpful={chooseHelpful}
      onUseAsFollowUp={useAsFollowUp}
      onQuoteToNotepad={quoteToNotepad}
      onRetry={retryPersona}
      {expandedPersona}
      onExpandPersona={(v) => (expandedPersona = v)}
      isFullscreen={fullscreen === "convo"}
      onToggleFullscreen={() =>
        (fullscreen = fullscreen === "convo" ? null : "convo")}
      composerRef={(el) => (composerEl = el)}
    />
    {#if !fullscreen}
      <div
        class="workspace-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
        onpointerdown={onDividerDown}
        onpointermove={onDividerMove}
        onpointerup={onDividerUp}
        onpointercancel={onDividerUp}
      ></div>
    {/if}
    <NotepadPane
      {notepad}
      onNotepad={(v) => (notepad = v)}
      isFullscreen={fullscreen === "notepad"}
      onToggleFullscreen={() =>
        (fullscreen = fullscreen === "notepad" ? null : "notepad")}
      onComplete={() => (step = "complete")}
    />
  </div>
{:else if step === "complete"}
  <CompleteScreen
    {notepad}
    {confidence}
    {postConfidence}
    onPostConfidence={(v) => (postConfidence = v)}
    onExport={exportText}
    onExportSession={exportSession}
    onRestart={restart}
    onBack={() => (step = "workspace")}
  />
{/if}

{#if step === "workspace" && expandedPersona && turns[expandedPersona.t]?.responses}
  <PersonaModal
    turn={turns[expandedPersona.t]}
    persona={expandedPersona.p}
    onClose={() => (expandedPersona = null)}
    onQuoteToNotepad={quoteToNotepad}
    onUseAsFollowUp={useAsFollowUp}
  />
{/if}

<SettingsDrawer
  open={settingsOpen}
  focusApi={settingsFocusApi}
  onClose={() => (settingsOpen = false)}
  onExportSession={exportSession}
/>

{#if apiModalOpen}
  <ApiKeyModal onClose={() => (apiModalOpen = false)} />
{/if}

<style>
  :global(.key-status) {
    position: relative;
  }
  :global(.key-status .status-dot) {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    margin-left: 4px;
    background: var(--rule);
  }
  :global(.key-status[data-status="ok"] .status-dot) {
    background: oklch(0.72 0.13 150);
  }
  :global(.key-status[data-status="demo"] .status-dot) {
    background: oklch(0.78 0.13 75);
  }
</style>
