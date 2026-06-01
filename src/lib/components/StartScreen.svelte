<script lang="ts">
  import { Sparkles, ArrowRight } from "@lucide/svelte";
  import { FEELINGS } from "$lib/data/personas";

  interface Props {
    opinion: string;
    question: string;
    questionGenerating: boolean;
    confidence: number;
    feeling: string[];
    onOpinion: (v: string) => void;
    onQuestion: (v: string) => void;
    onConfidence: (v: number) => void;
    onFeeling: (v: string[]) => void;
    onGenerateQuestion: () => void;
    onBegin: () => void;
  }

  let {
    opinion,
    question,
    questionGenerating,
    confidence,
    feeling,
    onOpinion,
    onQuestion,
    onConfidence,
    onFeeling,
    onGenerateQuestion,
    onBegin,
  }: Props = $props();

  let textareaEl: HTMLTextAreaElement = $state()!;

  $effect(() => {
    textareaEl?.focus();
  });

  const ready = $derived(opinion.trim().length > 0);
  const questionSet = $derived(question.trim().length > 0);

  function toggleFeeling(f: string) {
    onFeeling(
      feeling.includes(f) ? feeling.filter((x) => x !== f) : [...feeling, f],
    );
  }
</script>

<div class="page" style="max-width: 760px;">
  <h1 class="display">你在想些什麼？</h1>
  <p class="lead" style="margin-bottom: 36px;">
    先寫下你的意見，即使它還粗糙、還沒理清也沒關係。三種不同的 AI
    聲音會協助你把它拆解開來，一個提問、一個整理、一個反駁，旁邊還有一塊記事本供你發揮。
  </p>

  <div style="margin-bottom: 28px;">
    <div class="field-head">
      <h2>你的意見</h2>
      <span class="muted text-sans" style="font-size: 12px;">必填</span>
    </div>
    <p class="muted text-sans" style="font-size: 13px; margin: 0 0 12px;">
      一句話或一段話都行，歡迎自相矛盾，把最真實的想法記錄下來就行。
    </p>
    <textarea
      bind:this={textareaEl}
      class="field"
      rows={5}
      placeholder="例如：我不認為課堂上應該禁用 AI，但我一直想到那些付不起付費版本的學生——而我對此沒有一個漂亮的答案。"
      value={opinion}
      oninput={(e) => onOpinion(e.currentTarget.value)}
    ></textarea>
    <div class="field-row">
      <span class="muted text-sans" style="font-size: 12px;">
        用你對朋友說話的方式寫下來。
      </span>
      <span class="field-counter">{opinion.length} 字</span>
    </div>
  </div>

  <div style="margin-bottom: 28px;">
    <div class="field-head">
      <h2>你正在糾結的問題</h2>
      <span class="muted text-sans" style="font-size: 12px;">
        選填 · 若你略過，我們會幫你建議一個
      </span>
    </div>
    <p class="muted text-sans" style="font-size: 13px; margin: 0 0 12px;">
      一個能讓對話保持聚焦的問題。如果你還沒有，我們會根據你的意見草擬一個，你可以修改或替換它。
    </p>
    <div class="question-field">
      <input
        type="text"
        class="field"
        placeholder="例如：大學課堂應該允許使用 AI 工具嗎？"
        value={question}
        oninput={(e) => onQuestion(e.currentTarget.value)}
      />
      <button
        type="button"
        class={["q-generate", { loading: questionGenerating }]}
        onclick={onGenerateQuestion}
        disabled={!opinion.trim() || questionGenerating}
        title="根據你的意見草擬一個問題"
      >
        {#if questionGenerating}
          <span class="typing-dots small"
            ><span></span><span></span><span></span></span
          >
          Suggesting
        {:else}
          <Sparkles />
          {questionSet ? "重寫" : "幫我建議一個"}
        {/if}
      </button>
    </div>
    <div class="muted text-sans" style="font-size: 12px; margin-top: 8px;">
      {questionSet
        ? "這會放在對話上方，作為你的定錨。"
        : "想留白嗎？沒問題——你開始時我們會幫你產生一個。"}
    </div>
  </div>

  <div style="margin-bottom: 24px;">
    <div class="field-head">
      <h2>這個想法有多堅定？</h2>
      <span class="muted text-sans" style="font-size: 12px;">
        我們會在最後悄悄再確認一次
      </span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      value={confidence}
      oninput={(e) => onConfidence(Number(e.currentTarget.value))}
      class="stance-slider"
      style="margin-top: 14px;"
    />
    <div class="stance-labels">
      <span>非常不確定</span>
      <span style="color: var(--ink); font-weight: 500;"
        >{confidence}% 確定</span
      >
      <span>相當確定</span>
    </div>
  </div>

  <div class="row-between" style="margin-top: 32px;">
    <span class="muted text-sans" style="font-size: 13px;">
      大約 10–15 分鐘。隨時都能回來。
    </span>
    <button
      class="btn btn-primary"
      disabled={!ready}
      onclick={onBegin}
      title={ready ? "" : "請先寫下你的意見"}
    >
      開始反思 <ArrowRight class="btn-arrow" />
    </button>
  </div>
</div>
