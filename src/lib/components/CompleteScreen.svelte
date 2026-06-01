<script lang="ts">
  import { Check, Copy, Download, ArrowLeft, RefreshCw } from "@lucide/svelte";

  interface Props {
    notepad: string;
    confidence: number;
    postConfidence: number | null;
    onPostConfidence: (v: number) => void;
    onExport: () => void;
    onExportSession: () => void;
    onRestart: () => void;
    onBack: () => void;
  }

  let {
    notepad,
    confidence,
    postConfidence,
    onPostConfidence,
    onExport,
    onExportSession,
    onRestart,
    onBack,
  }: Props = $props();

  let copied = $state(false);
  const moved = $derived(
    postConfidence !== null && Math.abs(postConfidence - confidence) >= 5,
  );
  const shownConfidence = $derived(
    postConfidence === null ? confidence : postConfidence,
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(notepad);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // ignore
    }
  }
</script>

<div class="page" style="max-width: 720px;">
  <h1 class="display" style="font-size: clamp(34px, 4vw, 48px);">做得好。</h1>
  <p class="lead" style="margin-bottom: 32px;">
    你寫下的內容是你的。留著它、之後再修改，或在另一個場合再次分享。現在重要的是接下來的對話。
  </p>

  <div class="paper-soft" style="margin-bottom: 24px;">
    <div
      class="muted text-sans"
      style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;"
    >
      你分享的內容
    </div>
    <div
      style="font-family: var(--serif); font-size: 16px; line-height: 1.6; color: var(--ink); white-space: pre-wrap;"
    >
      {notepad}
    </div>
  </div>

  <div class="row" style="gap: 10px; margin-bottom: 32px;">
    <button class="btn btn-ghost btn-sm" onclick={handleCopy}>
      {#if copied}
        <Check /> 已複製
      {:else}
        <Copy /> 複製
      {/if}
    </button>
    <button class="btn btn-ghost btn-sm" onclick={onExport}>
      <Download /> 儲存為文字檔
    </button>
    <button class="btn btn-ghost btn-sm" onclick={onExportSession}>
      <Download /> 匯出對話 JSON
    </button>
  </div>

  <div class="paper-soft" style="margin-bottom: 24px;">
    <h2 style="margin-bottom: 6px;">你現在的立場在哪？</h2>
    <p class="muted text-sans" style="font-size: 13px; margin: 0 0 18px;">
      你一開始是 <strong style="color: var(--ink);">{confidence}% 確定</strong
      >。沒有正確答案——這只是給你自己看的。
    </p>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      value={shownConfidence}
      oninput={(e) => onPostConfidence(Number(e.currentTarget.value))}
      class="stance-slider"
    />
    <div class="stance-labels">
      <span>比較不確定</span>
      <span style="color: var(--ink); font-weight: 500;"
        >{shownConfidence}%</span
      >
      <span>比較確定</span>
    </div>
    {#if moved && postConfidence !== null}
      <p
        style="margin-top: 12px; font-size: 14px; font-style: italic; color: var(--ink-2);"
      >
        你往{postConfidence > confidence ? "更確定" : "更不確定"}的方向移動了 {Math.abs(
          postConfidence - confidence,
        )} 個百分點。值得留意。
      </p>
    {/if}
  </div>

  <div class="row-between" style="margin-top: 16px;">
    <button class="btn btn-ghost" onclick={onBack}>
      <ArrowLeft class="btn-arrow" /> 回到我的記事本
    </button>
    <button class="btn btn-primary" onclick={onRestart}>
      <RefreshCw /> 開始新的對話
    </button>
  </div>
</div>
