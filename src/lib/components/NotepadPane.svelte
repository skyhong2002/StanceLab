<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    notepad: string;
    onNotepad: (v: string) => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onComplete: () => void;
  }

  let {
    notepad,
    onNotepad,
    isFullscreen,
    onToggleFullscreen,
    onComplete,
  }: Props = $props();
  const ready = $derived(notepad.trim().length > 0);
</script>

<section class={["pane", "pane-notepad", { fullscreen: isFullscreen }]}>
  <header class="pane-head">
    <div class="pane-title">
      <span class="pane-title-icon"><Icon name="edit" /></span>
      <div>
        <div class="pane-title-main">你的記事本</div>
        <div class="pane-title-sub">一個安靜地寫下你要分享內容的地方</div>
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

  <div class="pane-body notepad-body">
    <textarea
      class="notepad-area"
      placeholder="開始草擬你真正要分享的貼文。你可以用每張卡片上的複製圖示，把對話中的句子貼過來，或自由書寫。沒有任何內容會自行離開這個頁面。"
      value={notepad}
      oninput={(e) => onNotepad(e.currentTarget.value)}
    ></textarea>
  </div>

  <footer class="notepad-foot">
    <span class="muted text-sans" style="font-size: 12px;">
      <Icon name="shield" class="inline-icon" /> 沒有任何內容會自行離開
    </span>
    <button
      class="btn btn-primary btn-sm"
      onclick={onComplete}
      disabled={!ready}
      title={ready ? "標記為完成並繼續" : "請先寫點東西"}
    >
      <Icon name="check" /> 完成
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
