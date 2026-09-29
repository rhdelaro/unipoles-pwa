// Best-time persistence (localStorage).

const key = (diffKey: string) => `unipoles-best-${diffKey}`;

export function getBest(diffKey: string): number | null {
  try {
    const raw = localStorage.getItem(key(diffKey));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/** Returns true when the new time is a record. */
export function setBest(diffKey: string, seconds: number): boolean {
  const prev = getBest(diffKey);
  if (prev !== null && prev <= seconds) return false;
  try {
    localStorage.setItem(key(diffKey), String(seconds));
  } catch {
    /* ignore */
  }
  return true;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
