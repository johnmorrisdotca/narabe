/**
 * A small seeded random number generator, so anything a game decides by
 * chance — where the dead squares fall, which pieces come next — is fixed by
 * the seed stored with the game and comes out the same on every replay.
 *
 * Mulberry32: fast, tiny, and good enough for a board game. The seed is a
 * 31-bit integer.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` distinct integers below `limit`, in draw order. */
export function drawDistinct(random: () => number, count: number, limit: number): number[] {
  const drawn: number[] = [];
  while (drawn.length < Math.min(count, limit)) {
    const candidate = Math.floor(random() * limit);
    if (!drawn.includes(candidate)) drawn.push(candidate);
  }
  return drawn;
}

/** A seed drawn from a unit roll, as `createGame` receives one. */
export function seedFromRoll(roll: number, range: number): number {
  return Math.floor(Math.max(0, Math.min(0.999999, roll)) * range);
}
