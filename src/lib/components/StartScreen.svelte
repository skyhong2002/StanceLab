<script lang="ts">
  import Icon from "./Icon.svelte";
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

  const ready = $derived(opinion.trim().length > 0);
  const questionSet = $derived(question.trim().length > 0);

  function toggleFeeling(f: string) {
    onFeeling(
      feeling.includes(f) ? feeling.filter((x) => x !== f) : [...feeling, f],
    );
  }
</script>

<div class="page" style="max-width: 760px;">
  <p class="eyebrow">A small, quiet space to think before you post</p>
  <h1 class="display">What's on your mind?</h1>
  <p class="lead" style="margin-bottom: 36px;">
    Write your opinion first, even if it's rough or unresolved. Three different
    AI voices will help you pull it apart — one asks, one organizes, one pushes
    back — and a notepad next to them is yours to work in. You decide what gets
    shared.
  </p>

  <div style="margin-bottom: 28px;">
    <div class="field-head">
      <h2>Your opinion</h2>
      <span class="muted text-sans" style="font-size: 12px;">required</span>
    </div>
    <p class="muted text-sans" style="font-size: 13px; margin: 0 0 12px;">
      A sentence or a paragraph. Contradictions welcome — don't smooth them out.
    </p>
    <textarea
      class="field"
      rows={5}
      placeholder="e.g. I don't think AI should be banned in classes, but I keep thinking about students who can't afford a paid model — and I don't have a clean answer for that."
      value={opinion}
      oninput={(e) => onOpinion(e.currentTarget.value)}
      autofocus
    ></textarea>
    <div class="field-row">
      <span class="muted text-sans" style="font-size: 12px;">
        Write the way you'd say it to a friend.
      </span>
      <span class="field-counter">{opinion.length} chars</span>
    </div>
  </div>

  <div style="margin-bottom: 28px;">
    <div class="field-head">
      <h2>The question you're wrestling with</h2>
      <span class="muted text-sans" style="font-size: 12px;">
        optional · we'll suggest one if you skip it
      </span>
    </div>
    <p class="muted text-sans" style="font-size: 13px; margin: 0 0 12px;">
      A single question to keep the conversation pointed. If you don't have one
      yet, we'll draft one from your opinion — you can edit or replace it.
    </p>
    <div class="question-field">
      <input
        type="text"
        class="field"
        placeholder={'e.g. "Should AI tools be allowed in undergraduate classrooms?"'}
        value={question}
        oninput={(e) => onQuestion(e.currentTarget.value)}
      />
      <button
        type="button"
        class={["q-generate", { loading: questionGenerating }]}
        onclick={onGenerateQuestion}
        disabled={!opinion.trim() || questionGenerating}
        title="Draft a question from your opinion"
      >
        {#if questionGenerating}
          <span class="typing-dots small"
            ><span></span><span></span><span></span></span
          >
        {:else}
          <Icon name="spark" />
          {questionSet ? "Rewrite" : "Suggest one"}
        {/if}
      </button>
    </div>
    <div class="muted text-sans" style="font-size: 12px; margin-top: 8px;">
      {questionSet
        ? "This will sit above the conversation as your anchor."
        : "Leaving this blank? That's fine — we'll generate one when you begin."}
    </div>
  </div>

  <div style="margin-bottom: 24px;">
    <div class="field-head">
      <h2>How firm does that feel?</h2>
      <span class="muted text-sans" style="font-size: 12px;">
        we'll quietly check in again at the end
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
      <span>Really not sure</span>
      <span style="color: var(--ink); font-weight: 500;"
        >{confidence}% confident</span
      >
      <span>Quite sure</span>
    </div>
  </div>

  <div style="margin-bottom: 28px;">
    <div class="field-head">
      <h2>And how does it feel to think about?</h2>
      <span class="muted text-sans" style="font-size: 12px;"
        >optional · pick any that fit</span
      >
    </div>
    <div class="feeling-chips" style="margin-top: 10px;">
      {#each FEELINGS as f (f)}
        <button
          class={["feeling-chip", { active: feeling.includes(f) }]}
          onclick={() => toggleFeeling(f)}
        >
          {f}
        </button>
      {/each}
    </div>
  </div>

  <div class="safety" style="margin-top: 28px;">
    <Icon name="shield" />
    <div>
      <strong>This stays with you.</strong> Nothing is posted automatically. You decide
      what — if anything — leaves this page. You can pause or quit any time.
    </div>
  </div>

  <div class="row-between" style="margin-top: 32px;">
    <span class="muted text-sans" style="font-size: 13px;">
      ~10–15 minutes. Come back any time.
    </span>
    <button
      class="btn btn-primary"
      disabled={!ready}
      onclick={onBegin}
      title={ready ? "" : "Write your opinion first"}
    >
      Begin reflecting <Icon name="arrow" class="btn-arrow" />
    </button>
  </div>
</div>
