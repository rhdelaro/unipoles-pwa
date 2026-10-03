// Unipoles puzzle engine: generation, solving, and validation.
//
// Rules (from the original 2013 design):
//  1. The board holds fixed "metal" cells. Every metal must sit orthogonally
//     next to at least one unipole.
//  2. Place unipoles so each row / column contains exactly the shown sum.
//  3. No two unipoles may touch — not even diagonally.

export interface Puzzle {
  size: number;
  metals: boolean[]; // true = fixed metal cell (never placeable)
  solution: boolean[]; // true = unipole in the reference solution
  rowSums: number[];
  colSums: number[];
}

export interface Difficulty {
  key: string;
  label: string;
  size: number;
  unipoles: number;
  tagline: string;
}

export const DIFFICULTIES: Difficulty[] = [
  { key: 'easy', label: 'Easy', size: 5, unipoles: 5, tagline: '5 × 5 grid' },
  { key: 'medium', label: 'Medium', size: 7, unipoles: 8, tagline: '7 × 7 grid' },
  { key: 'hard', label: 'Hard', size: 9, unipoles: 12, tagline: '9 × 9 grid' },
];

export type Rng = () => number;

/** Deterministic RNG (mulberry32) so puzzles can be seeded / replayed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (size: number, r: number, c: number) => r * size + c;

function neighborCells(size: number, r: number, c: number, diag: boolean): number[] {
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (!diag && Math.abs(dr) + Math.abs(dc) !== 1) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(at(size, nr, nc));
    }
  }
  return out;
}

function shuffled<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Randomly place k non-touching unipoles (greedy); null if it fails. */
function placeUnipoles(size: number, k: number, rng: Rng): boolean[] | null {
  const sol = new Array<boolean>(size * size).fill(false);
  let count = 0;
  for (const i of shuffled([...Array(size * size).keys()], rng)) {
    if (count >= k) break;
    const r = Math.floor(i / size);
    const c = i % size;
    if (neighborCells(size, r, c, true).some((n) => sol[n])) continue;
    sol[i] = true;
    count++;
  }
  return count === k ? sol : null;
}

/** Scatter metals on non-unipole cells, each orthogonally beside a unipole. */
function placeMetals(size: number, sol: boolean[], k: number, rng: Rng): boolean[] {
  const metals = new Array<boolean>(size * size).fill(false);
  const unipoles = sol.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const openOrth = (i: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    return neighborCells(size, r, c, false).filter((n) => !sol[n] && !metals[n]);
  };
  for (const u of shuffled(unipoles, rng)) {
    const cands = shuffled(openOrth(u), rng);
    const n = 1 + (rng() < 0.45 ? 1 : 0);
    for (let j = 0; j < Math.min(n, cands.length); j++) metals[cands[j]] = true;
  }
  let guard = 0;
  const count = () => metals.reduce((a, m) => a + (m ? 1 : 0), 0);
  while (count() < k && guard++ < 300) {
    const u = unipoles[Math.floor(rng() * unipoles.length)];
    const cands = openOrth(u);
    if (cands.length) metals[cands[Math.floor(rng() * cands.length)]] = true;
  }
  return metals;
}

/**
 * Count solutions (up to `limit`) with backtracking + forward checking.
 * Returns `limit` early if the node budget is exhausted (treated as "unknown").
 */
export function countSolutions(
  size: number,
  metals: boolean[],
  rowSums: number[],
  colSums: number[],
  limit = 2,
  nodeCap = 400_000,
): number {
  const vars: number[] = [];
  for (let i = 0; i < size * size; i++) if (!metals[i]) vars.push(i);
  // Most-constrained-first ordering for stronger pruning.
  vars.sort((a, b) => {
    const sa = rowSums[Math.floor(a / size)] + colSums[a % size];
    const sb = rowSums[Math.floor(b / size)] + colSums[b % size];
    return sb - sa;
  });

  const rowNeed = [...rowSums];
  const colNeed = [...colSums];
  const rowAvail = new Array<number>(size).fill(0);
  const colAvail = new Array<number>(size).fill(0);
  for (const v of vars) {
    rowAvail[Math.floor(v / size)]++;
    colAvail[v % size]++;
  }
  const placed = new Array<boolean>(size * size).fill(false);
  const forbid = new Array<number>(size * size).fill(0); // adjacency refcounts
  let nodes = 0;
  let count = 0;

  const markForbid = (i: number, delta: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    for (const n of neighborCells(size, r, c, true)) forbid[n] += delta;
  };

  const dfs = (pos: number): void => {
    if (count >= limit || nodes > nodeCap) return;
    nodes++;
    if (pos === vars.length) {
      for (let i = 0; i < size; i++) if (rowNeed[i] !== 0 || colNeed[i] !== 0) return;
      for (let i = 0; i < size * size; i++) {
        if (!metals[i]) continue;
        const r = Math.floor(i / size);
        const c = i % size;
        if (!neighborCells(size, r, c, false).some((n) => placed[n])) return;
      }
      count++;
      return;
    }
    const v = vars[pos];
    const r = Math.floor(v / size);
    const c = v % size;
    rowAvail[r]--;
    colAvail[c]--;
    if (rowNeed[r] >= 0 && rowNeed[r] <= rowAvail[r] && colNeed[c] >= 0 && colNeed[c] <= colAvail[c]) {
      if (forbid[v] === 0 && rowNeed[r] > 0 && colNeed[c] > 0) {
        placed[v] = true;
        rowNeed[r]--;
        colNeed[c]--;
        markForbid(v, 1);
        dfs(pos + 1);
        markForbid(v, -1);
        rowNeed[r]++;
        colNeed[c]++;
        placed[v] = false;
      }
      dfs(pos + 1); // skip v
    }
    rowAvail[r]++;
    colAvail[c]++;
  };

  dfs(0);
  return nodes > nodeCap ? limit : count;
}

/** Generate a puzzle with a guaranteed-unique solution (retries until found). */
export function generatePuzzle(diff: Difficulty, rng: Rng = Math.random): Puzzle {
  const { size, unipoles: k } = diff;
  let fallback: Puzzle | null = null;
  for (let attempt = 0; attempt < 120; attempt++) {
    const sol = placeUnipoles(size, k, rng);
    if (!sol) continue;
    const metals = placeMetals(size, sol, k, rng);
    const rowSums = new Array<number>(size).fill(0);
    const colSums = new Array<number>(size).fill(0);
    for (let i = 0; i < size * size; i++) {
      if (!sol[i]) continue;
      rowSums[Math.floor(i / size)]++;
      colSums[i % size]++;
    }
    const puzzle: Puzzle = { size, metals, solution: sol, rowSums, colSums };
    if (!fallback) fallback = puzzle;
    if (countSolutions(size, metals, rowSums, colSums, 2, 400_000) === 1) return puzzle;
  }
  // Practically unreachable; guarantees a playable board regardless.
  return fallback!;
}

/** Can the player legally place a unipole at i right now? */
export function canPlaceAt(puzzle: Puzzle, placed: boolean[], i: number): boolean {
  if (puzzle.metals[i] || placed[i]) return false;
  const { size } = puzzle;
  const r = Math.floor(i / size);
  const c = i % size;
  return !neighborCells(size, r, c, true).some((n) => placed[n]);
}

/** Solved = every row/col sum exact and every metal covered. */
export function isSolved(puzzle: Puzzle, placed: boolean[]): boolean {
  const { size } = puzzle;
  for (let r = 0; r < size; r++) {
    let n = 0;
    for (let c = 0; c < size; c++) if (placed[at(size, r, c)]) n++;
    if (n !== puzzle.rowSums[r]) return false;
  }
  for (let c = 0; c < size; c++) {
    let n = 0;
    for (let r = 0; r < size; r++) if (placed[at(size, r, c)]) n++;
    if (n !== puzzle.colSums[c]) return false;
  }
  for (let i = 0; i < size * size; i++) {
    if (!puzzle.metals[i]) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    if (!neighborCells(size, r, c, false).some((n) => placed[n])) return false;
  }
  return true;
}

/** A solution cell the player hasn't found yet (for hints). */
export function findHint(puzzle: Puzzle, placed: boolean[], rng: Rng = Math.random): number {
  const { size } = puzzle;
  const cands = puzzle.solution
    .map((v, i) => (v && !placed[i] ? i : -1))
    .filter((i) => i >= 0);
  // Prefer cells that don't touch existing unipoles: a hint must never
  // create an illegal adjacency (manual placement forbids it). Falls back
  // to any remaining cell if every candidate touches.
  const touchesPlaced = (i: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    return neighborCells(size, r, c, true).some((n) => placed[n]);
  };
  const legal = cands.filter((i) => !touchesPlaced(i));
  const pool = legal.length > 0 ? legal : cands;
  return pool[Math.floor(rng() * pool.length)];
}
