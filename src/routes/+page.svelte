<script lang="ts">
  import { onMount } from "svelte";

  const destination = "https://stancelab.observe.tw/";

  onMount(() => {
    window.location.replace(destination);
  });
</script>

<svelte:head>
  <title>StanceLab — 轉址中</title>
  <meta http-equiv="refresh" content={`0;url=${destination}`} />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href={destination} />
</svelte:head>

<main>
  <p>正在前往 StanceLab…</p>
  <p>
    如果沒有自動跳轉，請<a href={destination}>開啟新版 StanceLab</a>。
  </p>
</main>
