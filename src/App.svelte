<script lang="ts">
  import Menu from './components/Menu.svelte';
  import Game from './components/Game.svelte';
  import type { Difficulty } from './lib/puzzle';

  let screen = $state<'menu' | 'game'>('menu');
  let difficulty = $state<Difficulty | null>(null);

  function start(d: Difficulty) {
    difficulty = d;
    screen = 'game';
  }
</script>

{#if screen === 'menu'}
  <Menu onStart={start} />
{:else if difficulty}
  {#key difficulty.key}
    <Game {difficulty} onExit={() => (screen = 'menu')} />
  {/key}
{/if}
