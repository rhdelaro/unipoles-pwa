<script lang="ts">
  import {
    generatePuzzle,
    canPlaceAt,
    isSolved,
    findHint,
    type Puzzle,
    type Difficulty,
  } from '../lib/puzzle';
  import {
    playPlace,
    playRemove,
    playError,
    playWin,
    playClick,
    playMark,
    isMuted,
    toggleMuted,
  } from '../lib/audio';
  import unipoleImg from '../assets/unipole.png';
  import metalImg from '../assets/metal.png';
  import { getBest, setBest, formatTime } from '../lib/storage';
  import WinModal from './WinModal.svelte';

  let { difficulty, onExit }: { difficulty: Difficulty; onExit: () => void } = $props();

  let puzzle = $state<Puzzle>(generatePuzzle(difficulty));
  let placed = $state<boolean[]>(new Array(puzzle.size * puzzle.size).fill(false));
  let marks = $state<boolean[]>(new Array(puzzle.size * puzzle.size).fill(false));
  let markMode = $state(false);
  let moves = $state(0);
  let hints = $state(0);
  let seconds = $state(0);
  let won = $state(false);
  let isRecord = $state(false);
  let shakeCell = $state(-1);
  let hintFlash = $state(-1);
  let muted = $state(isMuted());

  function freshBoard(p: Puzzle) {
    placed = new Array(p.size * p.size).fill(false);
    marks = new Array(p.size * p.size).fill(false);
  }

  function reset() {
    freshBoard(puzzle);
    moves = 0;
    hints = 0;
    seconds = 0;
    won = false;
    isRecord = false;
    markMode = false;
  }

  function newPuzzle() {
    playClick();
    puzzle = generatePuzzle(difficulty);
    reset();
  }

  $effect(() => {
    const t = window.setInterval(() => {
      if (!won) seconds++;
    }, 1000);
    return () => window.clearInterval(t);
  });

  const size = $derived(puzzle.size);
  const rows = $derived(Array.from({ length: size }, (_, r) => r));
  const cols = $derived(Array.from({ length: size }, (_, c) => c));

  const rowCounts = $derived(
    rows.map((r) => {
      let n = 0;
      for (let c = 0; c < size; c++) if (placed[r * size + c]) n++;
      return n;
    }),
  );
  const colCounts = $derived(
    cols.map((c) => {
      let n = 0;
      for (let r = 0; r < size; r++) if (placed[r * size + c]) n++;
      return n;
    }),
  );

  function shake(i: number) {
    shakeCell = i;
    window.setTimeout(() => {
      if (shakeCell === i) shakeCell = -1;
    }, 380);
  }

  // Win detection runs on *every* board change — placing, removing, or hint.
  // Previously it only ran after placing, so a solution completed by
  // removing the last wrong piece never registered and the timer kept going.
  $effect(() => {
    if (!won && isSolved(puzzle, placed)) {
      won = true;
      playWin();
      isRecord = setBest(difficulty.key, seconds);
    }
  });

  function tap(i: number) {
    if (won) return;
    if (puzzle.metals[i]) {
      shake(i);
      return;
    }
    if (markMode) {
      if (placed[i]) return;
      marks[i] = !marks[i];
      playMark();
      moves++;
      return;
    }
    if (placed[i]) {
      placed[i] = false;
      playRemove();
      moves++;
      return;
    }
    if (marks[i]) marks[i] = false;
    if (!canPlaceAt(puzzle, placed, i)) {
      playError();
      shake(i);
      return;
    }
    placed[i] = true;
    playPlace();
    moves++;
  }

  function useHint() {
    if (won) return;
    const h = findHint(puzzle, placed);
    if (h === undefined) return;
    placed[h] = true;
    marks[h] = false;
    hints++;
    moves++;
    hintFlash = h;
    window.setTimeout(() => {
      if (hintFlash === h) hintFlash = -1;
    }, 1000);
    playPlace();
  }

  function toggleMute() {
    muted = toggleMuted();
    if (!muted) playClick();
  }
</script>

<div class="screen">
  <div class="hud">
    <button class="icon-btn" onclick={onExit} aria-label="Back to menu">‹</button>
    <span class="diff-label">{difficulty.label}</span>
    <span class="spacer"></span>
    <div class="stat"><b>{formatTime(seconds)}</b><small>time</small></div>
    <div class="stat"><b>{moves}</b><small>moves</small></div>
    <button class="icon-btn" onclick={toggleMute} aria-label="Toggle sound">
      {muted ? '🔇' : '🔊'}
    </button>
  </div>

  <div class="board-wrap">
    <div class="board" style="grid-template-columns: auto repeat({size}, 1fr);">
      <div class="sums-row">
        <span class="sum"></span>
        {#each cols as c}
          {@const n = colCounts[c]}
          {@const target = puzzle.colSums[c]}
          <span class="sum" class:ok={n === target} class:over={n > target}>{target}</span>
        {/each}
      </div>
      {#each rows as r}
        {@const rn = rowCounts[r]}
        {@const rtarget = puzzle.rowSums[r]}
        <div class="brow">
          <span class="sum" class:ok={rn === rtarget} class:over={rn > rtarget}>{rtarget}</span>
          {#each cols as c}
            {@const i = r * size + c}
            {@const isMetal = puzzle.metals[i]}
            {@const isPlaced = placed[i]}
            <button
              class="cell"
              class:metal={isMetal}
              class:placed={isPlaced}
              class:hint-flash={hintFlash === i}
              class:shake={shakeCell === i}
              onclick={() => tap(i)}
              aria-label={isMetal ? 'metal' : isPlaced ? 'unipole — tap to remove' : 'empty cell'}
            >
              {#if isMetal}
                <img class="piece" src={metalImg} alt="" draggable="false" />
              {:else if isPlaced}
                <img class="piece" src={unipoleImg} alt="" draggable="false" />
              {:else if marks[i]}
                <span class="mark">✕</span>
              {/if}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <div class="toolbar">
    <button class="tool" class:active={markMode} onclick={() => { markMode = !markMode; playClick(); }}>
      ✕<small>mark</small>
    </button>
    <button class="tool" onclick={useHint}>💡<small>hint</small></button>
    <button
      class="tool"
      onclick={() => {
        playClick();
        reset();
      }}
    >
      ↺<small>restart</small>
    </button>
    <button class="tool" onclick={newPuzzle}>🎲<small>new</small></button>
  </div>
</div>

{#if won}
  <WinModal
    seconds={seconds}
    moves={moves}
    hints={hints}
    isRecord={isRecord}
    best={getBest(difficulty.key)}
    onReplay={() => {
      playClick();
      reset();
    }}
    onNew={newPuzzle}
    onMenu={onExit}
  />
{/if}
