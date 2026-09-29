<script lang="ts">
  import { formatTime } from '../lib/storage';
  import { playClick } from '../lib/audio';

  let {
    seconds,
    moves,
    hints,
    isRecord,
    best,
    onReplay,
    onNew,
    onMenu,
  }: {
    seconds: number;
    moves: number;
    hints: number;
    isRecord: boolean;
    best: number | null;
    onReplay: () => void;
    onNew: () => void;
    onMenu: () => void;
  } = $props();

  const colors = ['#4de3ff', '#ffb347', '#4ade80', '#ff6b6b', '#c084fc', '#f9f871'];
  const confetti = Array.from({ length: 42 }, (_, i) => ({
    left: (i * 97) % 100,
    delay: ((i * 37) % 900) / 1000,
    dur: 2.4 + ((i * 53) % 1400) / 1000,
    color: colors[i % colors.length],
  }));
</script>

<div class="overlay">
  <div class="modal">
    {#each confetti as p}
      <span
        class="confetti"
        style="left: {p.left}%; animation-delay: {p.delay}s; animation-duration: {p.dur}s; background: {p.color};"
      ></span>
    {/each}
    <h2>SOLVED!</h2>
    {#if isRecord}
      <span class="record">★ NEW BEST TIME</span>
    {:else if best !== null}
      <span class="record" style="border-color: var(--line); color: var(--dim); background: transparent;">
        best {formatTime(best)}
      </span>
    {/if}
    <div class="stats">
      <div><b>{formatTime(seconds)}</b><small>time</small></div>
      <div><b>{moves}</b><small>moves</small></div>
      <div><b>{hints}</b><small>hints</small></div>
    </div>
    <div class="actions">
      <button
        class="primary-btn"
        onclick={() => {
          playClick();
          onNew();
        }}
      >
        Next puzzle
      </button>
      <button class="secondary-btn" onclick={onReplay}>Replay this one</button>
      <button class="secondary-btn" onclick={onMenu}>Menu</button>
    </div>
  </div>
</div>
