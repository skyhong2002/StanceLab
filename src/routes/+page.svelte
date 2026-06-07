<script lang="ts">
  import { Key, RefreshCw, Settings, Upload } from "@lucide/svelte";
  import StartScreen from "$lib/components/StartScreen.svelte";
  import ConversationPane from "$lib/components/ConversationPane.svelte";
  import NotepadPane from "$lib/components/NotepadPane.svelte";
  import CompleteScreen from "$lib/components/CompleteScreen.svelte";
  import SettingsDrawer from "$lib/components/SettingsDrawer.svelte";
  import ApiKeyModal from "$lib/components/ApiKeyModal.svelte";
  import PersonaModal from "$lib/components/PersonaModal.svelte";
  import ImportModal from "$lib/components/ImportModal.svelte";

  import {
    PERSONA_META,
    PERSONAS,
    QUESTION_SUGGESTIONS,
    SCRIPTED_TURNS,
    SCRIPTED_STANDALONE,
    type InteractionMode,
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
  let postingDestination = $state("");
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
  let importModalOpen = $state(false);
  let composerEl = $state<HTMLTextAreaElement | null>(null);

  // resizable split between conversation and notepad panes
  let splitPct = $state(67);
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
    notepad = opinion;
    currentInput = question ? `${opinion}\n\n${question}` : opinion;
    step = "workspace";
  }

  function buildSystemPrompt(kind: PersonaKind): string {
    const base = settings.prompts[kind];
    const lines = [`Anchor question: ${question || "(none set yet)"}`];
    if (opinion)
      lines.push(
        `User's starting opinion (confidence ${confidence}%): ${opinion}`,
      );
    if (postingDestination.trim())
      lines.push(`User plans to post this to: ${postingDestination.trim()}`);
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
    const otherKinds = PERSONAS.filter((k) => k !== kind);
    for (const t of priorTurns) {
      let userContent = t.user;
      if (t.responses) {
        const otherResponses = otherKinds
          .filter((k) => t.responses?.[k])
          .map((k) => `- ${PERSONA_META[k].name}：${t.responses![k]}`);
        if (otherResponses.length > 0) {
          userContent += `\n\n其他觀點的回應：\n${otherResponses.join("\n")}`;
        }
      }
      messages.push({ role: "user", content: userContent });
      if (t.responses?.[kind]) {
        messages.push({ role: "assistant", content: t.responses[kind] });
      }
    }
    messages.push({ role: "user", content: userMsg });
    return messages;
  }

  function buildStandaloneMessages(
    priorTurns: Turn[],
    userMsg: string,
  ): ChatMessage[] {
    const lines = [`Anchor question: ${question || "(none set yet)"}`];
    if (opinion)
      lines.push(
        `User's starting opinion (confidence ${confidence}%): ${opinion}`,
      );
    if (postingDestination.trim())
      lines.push(`User plans to post this to: ${postingDestination.trim()}`);
    if (feeling.length)
      lines.push(`Feelings the user named: ${feeling.join(", ")}`);
    const systemContent = `${settings.standalonePrompt}\n\n${lines.join("\n")}`;
    const messages: ChatMessage[] = [
      { role: "system", content: systemContent },
    ];
    for (const t of priorTurns) {
      messages.push({ role: "user", content: t.user });
      if (t.standaloneResponse) {
        messages.push({ role: "assistant", content: t.standaloneResponse });
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

  async function streamStandalone(turnIdx: number, userMsg: string) {
    const priorTurns = turns.slice(0, turnIdx);
    const messages = buildStandaloneMessages(priorTurns, userMsg);
    let accumulated = "";

    turns = turns.map((t, i) =>
      i === turnIdx ? { ...t, standaloneStreaming: true } : t,
    );

    try {
      const fullText = await chatStream(messages, {
        maxTokens: 2000,
        temperature: 0.8,
        onChunk: (chunk) => {
          accumulated += chunk;
          const visible = streamingVisibleText(accumulated);
          turns = turns.map((t, i) =>
            i === turnIdx ? { ...t, standaloneResponse: visible } : t,
          );
        },
      });

      const parsed = parseThinkingResponse(fullText);
      turns = turns.map((t, i) =>
        i === turnIdx
          ? {
              ...t,
              standaloneResponse: parsed.response,
              standaloneThinking: parsed.thinking,
              standaloneStreaming: false,
            }
          : t,
      );
    } catch (err) {
      turns = turns.map((t, i) =>
        i === turnIdx
          ? {
              ...t,
              standaloneError: describeError(err),
              standaloneStreaming: false,
            }
          : t,
      );
    }
  }

  async function send() {
    if (!currentInput.trim()) return;
    const userMsg = currentInput.trim();
    currentInput = "";
    const turnIdx = turns.length;
    isThinking = true;

    if (settings.mode === "standalone") {
      const newTurn: Turn = {
        user: userMsg,
        responses: null,
        thinking: {},
      };
      turns = [...turns, newTurn];

      if (!settings.apiKey || settings.demoMode) {
        setTimeout(() => {
          const scripted =
            SCRIPTED_STANDALONE[
              Math.min(turnIdx, SCRIPTED_STANDALONE.length - 1)
            ];
          turns = turns.map((t, i) =>
            i === turnIdx
              ? {
                  ...t,
                  standaloneResponse: scripted.response,
                  standaloneThinking: scripted.thinking,
                }
              : t,
          );
          isThinking = false;
        }, 1400);
        return;
      }

      try {
        await streamStandalone(turnIdx, userMsg);
      } finally {
        isThinking = false;
      }
      return;
    }

    const newTurn: Turn = {
      user: userMsg,
      responses: null,
      thinking: {},
      errors: {},
      streaming: [...PERSONAS],
    };
    turns = [...turns, newTurn];

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

  async function retryStandalone(idx: number) {
    const t = turns[idx];
    if (!t) return;
    turns = turns.map((tt, i) => {
      if (i !== idx) return tt;
      return {
        ...tt,
        standaloneResponse: undefined,
        standaloneThinking: undefined,
        standaloneError: undefined,
        standaloneStreaming: true,
      };
    });
    isThinking = true;
    if (!settings.apiKey || settings.demoMode) {
      setTimeout(() => {
        const scripted =
          SCRIPTED_STANDALONE[Math.min(idx, SCRIPTED_STANDALONE.length - 1)];
        turns = turns.map((tt, i) =>
          i === idx
            ? {
                ...tt,
                standaloneResponse: scripted.response,
                standaloneThinking: scripted.thinking,
                standaloneStreaming: false,
              }
            : tt,
        );
        isThinking = false;
      }, 800);
      return;
    }
    try {
      await streamStandalone(idx, t.user);
    } finally {
      isThinking = false;
    }
  }

  function useAsFollowUp(persona: PersonaKind | null, body: string) {
    void body;
    const seed = persona
      ? `接續${PERSONA_META[persona].name}的觀點：`
      : "接續對話：";
    currentInput = seed;
    setTimeout(() => {
      if (composerEl) {
        composerEl.focus();
        composerEl.setSelectionRange(seed.length, seed.length);
      }
    }, 50);
  }

  function quoteToNotepad(persona: PersonaKind | null, text: string) {
    if (!text) return;
    const label = persona ? PERSONA_META[persona].name : "LLM 回答";
    const lead = notepad && !notepad.endsWith("\n\n") ? "\n\n" : "";
    const quoted = text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    notepad = `${notepad}${lead}— ${label} said:\n${quoted}\n\n`;
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
      mode: settings.mode,
      opinion,
      question,
      confidence,
      postingDestination,
      postConfidence,
      feeling,
      turns: turns.map((t) => ({
        user: t.user,
        responses: t.responses,
        thinking: t.thinking,
        standaloneResponse: t.standaloneResponse,
        standaloneThinking: t.standaloneThinking,
      })),
      prompts: settings.mode === "personas" ? settings.prompts : undefined,
      standalonePrompt:
        settings.mode === "standalone" ? settings.standalonePrompt : undefined,
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
    postingDestination = "";
    feeling = [];
    turns = [];
    notepad = "";
    postConfidence = null;
    isThinking = false;
    fullscreen = null;
    expandedPersona = null;
    currentInput = "";
  }

  function importSession(data: {
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
  }) {
    settings.mode = data.mode === "standalone" ? "standalone" : "personas";
    opinion = typeof data.opinion === "string" ? data.opinion : "";
    question = typeof data.question === "string" ? data.question : "";
    confidence = typeof data.confidence === "number" ? data.confidence : 50;
    postingDestination =
      typeof data.postingDestination === "string"
        ? data.postingDestination
        : "";
    feeling = Array.isArray(data.feeling) ? data.feeling : [];
    postConfidence =
      typeof data.postConfidence === "number" ? data.postConfidence : null;
    notepad = typeof data.notepad === "string" ? data.notepad : opinion;
    currentInput = "";
    isThinking = false;
    fullscreen = null;
    expandedPersona = null;

    turns = (Array.isArray(data.turns) ? data.turns : []).map((t: any) => ({
      user: t.user ?? "",
      responses: t.responses ?? null,
      thinking: t.thinking ?? null,
      standaloneResponse: t.standaloneResponse ?? undefined,
      standaloneThinking: t.standaloneThinking ?? undefined,
    }));

    questionGenerating = false;

    if (data.prompts && settings.mode === "personas") {
      settings.prompts = { ...settings.prompts, ...data.prompts };
    }
    if (data.standalonePrompt && settings.mode === "standalone") {
      settings.standalonePrompt = data.standalonePrompt;
    }
    if (
      data.apiProvider === "opencode-go" ||
      data.apiProvider === "openrouter"
    ) {
      settings.apiProvider = data.apiProvider;
    }
    if (typeof data.model === "string" && data.model) {
      settings.model = data.model;
    }

    step = "workspace";
    importModalOpen = false;
  }

  function openSettings(focus = false) {
    settingsFocusApi = focus;
    settingsOpen = true;
  }

  function handleModeChange(mode: InteractionMode) {
    settings.mode = mode;
    step = "start";
    opinion = "";
    question = "";
    questionGenerating = false;
    confidence = 50;
    postingDestination = "";
    feeling = [];
    turns = [];
    notepad = "";
    postConfidence = null;
    isThinking = false;
    fullscreen = null;
    expandedPersona = null;
    currentInput = "";
  }

  const keyStatus = $derived(
    settings.apiKey ? "ok" : settings.demoMode ? "demo" : "unset",
  );
</script>

<header class="topbar">
  <button class="brand" onclick={restart}>
    <span class="brand-mark"></span>
    StanceLab
  </button>

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
      <Key />
      <span class="status-dot"></span>
    </button>
    <button
      class="icon-btn"
      onclick={() => (importModalOpen = true)}
      title="Import session"
    >
      <Upload />
    </button>
    {#if step === "workspace" || step === "complete"}
      <button class="icon-btn" onclick={restart} title="Start a new session">
        <RefreshCw />
      </button>
    {/if}
    <button class="icon-btn" onclick={() => openSettings(false)}>
      <Settings /> Researcher
    </button>
  </div>
</header>

{#if step === "start"}
  <StartScreen
    {opinion}
    {question}
    {questionGenerating}
    {confidence}
    {postingDestination}
    {feeling}
    onOpinion={(v) => (opinion = v)}
    onQuestion={(v) => (question = v)}
    onConfidence={(v) => (confidence = v)}
    onPostingDestination={(v) => (postingDestination = v)}
    onFeeling={(v) => (feeling = v)}
    onGenerateQuestion={generateQuestion}
    onBegin={beginReflecting}
    onImport={() => (importModalOpen = true)}
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
      mode={settings.mode}
      {question}
      onQuestion={(v) => (question = v)}
      {turns}
      {currentInput}
      onCurrentInput={(v) => (currentInput = v)}
      onSend={send}
      {isThinking}
      onUseAsFollowUp={useAsFollowUp}
      onQuoteToNotepad={quoteToNotepad}
      onRetry={retryPersona}
      onRetryStandalone={retryStandalone}
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
      postingDestination={postingDestination.trim() || ""}
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

{#if settings.mode === "personas" && step === "workspace" && expandedPersona && turns[expandedPersona.t]?.responses}
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
  onImportSession={() => (importModalOpen = true)}
  onModeChange={handleModeChange}
/>

{#if apiModalOpen}
  <ApiKeyModal onClose={() => (apiModalOpen = false)} />
{/if}

{#if importModalOpen}
  <ImportModal
    onImport={importSession}
    onClose={() => (importModalOpen = false)}
  />
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
