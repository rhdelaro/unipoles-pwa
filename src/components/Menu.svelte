<script lang="ts">
  import { DIFFICULTIES, type Difficulty } from '../lib/puzzle';
  import { getBest, formatTime } from '../lib/storage';
  import { playClick } from '../lib/audio';
  import unipoleImg from '../assets/unipole.png';
  import metalImg from '../assets/metal.png';

  let { onStart }: { onStart: (d: Difficulty) => void } = $props();

  let deferredPrompt = $state<any>(null);
  let showHowto = $state(false);

  $effect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  });

  async function install() {
    if (!deferredPrompt) return;
    playClick();
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }

  const dots = ['🟢', '🟡', '🔴'];
</script>

<div class="screen">
  <img class="logo" src={import.meta.env.BASE_URL + 'icons/icon-512.png'} alt="Unipoles logo" />
  <h1 class="title">UNIPOLES</h1>
  <p class="tagline">a magnetic logic puzzle</p>

  <div class="diff-list">
    {#each DIFFICULTIES as d, i}
      {@const best = getBest(d.key)}
      <button
        class="diff-card"
        onclick={() => {
          playClick();
          onStart(d);
        }}
      >
        <span class="diff-dot">{dots[i]}</span>
        <span class="diff-meta">
          <h3>{d.label}</h3>
          <p>{d.tagline}</p>
        </span>
        {#if best !== null}
          <span class="best">★ {formatTime(best)}</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if deferredPrompt}
    <button class="install-btn" onclick={install}>⬇ Install app</button>
  {/if}

  <div class="howto">
    <button
      class="howto-toggle"
      onclick={() => {
        showHowto = !showHowto;
        playClick();
      }}
      aria-expanded={showHowto}
    >
      How to play <span>{showHowto ? '−' : '+'}</span>
    </button>
    {#if showHowto}
      <div class="body">
        <ul>
          <li>Tap a cell to place a <b>unipole</b>. Tap it again to remove it.</li>
          <li>Every <b>metal</b> must sit next to at least one unipole (up, down, left, right).</li>
          <li>Each row and column must hold <b>exactly</b> the number shown beside it.</li>
          <li>Unipoles <b>repel</b> — no two may touch, not even diagonally.</li>
          <li>Use ✕ mode to mark cells you've ruled out. 💡 reveals a unipole when stuck.</li>
        </ul>
        <div class="legend">
          <span><img src={unipoleImg} alt="unipole" /> unipole</span>
          <span><img src={metalImg} alt="metal" /> metal</span>
        </div>
      </div>
    {/if}
  </div>

  <p class="credit">Reimagined from the 2013 original · LordHare</p>
</div>
