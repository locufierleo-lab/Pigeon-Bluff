export type SeededRandom = () => number;

export function seedFromString(gameCode: string): number {
  let hash = 2166136261;
  for (let i = 0; i < gameCode.length; i += 1) {
    hash ^= gameCode.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): SeededRandom {
  let currentSeed = seed >>> 0;

  return () => {
    currentSeed += 0x6d2b79f5;
    let t = currentSeed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(gameCode: string): SeededRandom {
  return mulberry32(seedFromString(gameCode));
}

export function deterministicShuffle<T>(items: T[], gameCode: string): T[] {
  const random = createSeededRandom(gameCode);
  const next = [...items];

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}
