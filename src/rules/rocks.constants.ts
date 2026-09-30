/**
 * How the rocks of an obstacle game are laid out.
 *
 * `scattered` draws every rock anywhere on the board from the game's seed, as
 * Obstacle Five always has. `garden` draws a quarter of them in one corner of
 * the board and turns that corner through the other three, so the board looks
 * the same from every side — a rock garden rather than a spill. Neither colour
 * can be handed a better board by a layout that is the same all the way round.
 */
export const ROCK_PLACEMENTS = {
  scattered: "scattered",
  garden: "garden",
} as const;
