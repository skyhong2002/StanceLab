<script lang="ts">
  import { Pencil, Maximize2, Minimize2, Check } from "@lucide/svelte";

  interface Props {
    notepad: string;
    onNotepad: (v: string) => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onComplete: () => void;
    postingDestination?: string;
  }

  let {
    notepad,
    onNotepad,
    isFullscreen,
    onToggleFullscreen,
    onComplete,
    postingDestination = "",
  }: Props = $props();
  const ready = $derived(notepad.trim().length > 0);
</script>

<section class={["pane", "pane-notepad", { fullscreen: isFullscreen }]}>
  <header class="pane-head">
    <div class="pane-title">
      <span class="pane-title-icon"><Pencil /></span>
      <div>
        <div class="pane-title-main">文章草稿</div>
        <div class="pane-title-sub">{postingDestination ? `預計發到 ${postingDestination} 的文章` : "預計對外發出的草稿"}</div>
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

  <div class="pane-body notepad-body">
    <textarea
      class="notepad-area"
      placeholder="開始草擬你真正要分享的貼文。你可以用每張卡片上的複製圖示，把對話中的句子貼過來，或自由書寫。沒有任何內容會自行離開這個頁面。"
      value={notepad}
      oninput={(e) => onNotepad(e.currentTarget.value)}
    ></textarea>
  </div>

  <footer class="notepad-foot">
    <button
      class="btn btn-primary btn-sm"
      onclick={onComplete}
      disabled={!ready}
      title={ready ? "標記為完成並繼續" : "請先寫點東西"}
    >
      <Check /> 完成
    </button>
  </footer>
</section>

<style>
  :global(.inline-icon) {
    vertical-align: -2px;
    width: 12px;
    height: 12px;
    display: inline-block;
  }
</style>
