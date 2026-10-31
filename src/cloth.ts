/**
 * THE CLOTHS A BOARD MAY BE LAID IN: the same five the whole family offers, and itsutsu.com's boards:
 * green, blue, red, black and wood. Each is the felt's colour, its deep edge and the ink written on it.
 * Given to a board as the `--nb-` variables `boardSvg` paints with. A board with no cloth keeps its own wood.
 *
 * @example
 * ```ts
 * import { NARABE_CLOTHS } from "@johnmorrisdotca/narabe";
 * console.log(Object.keys(NARABE_CLOTHS));
 * ```
 */
export const NARABE_CLOTHS = {
  green: { felt: "#2f5d4a", deep: "#1f4135", ink: "#f3efe4" },
  blue: { felt: "#2865a6", deep: "#1a4677", ink: "#f3efe4" },
  red: { felt: "#a3342e", deep: "#7a231f", ink: "#f3efe4" },
  black: { felt: "#2f3236", deep: "#1b1d20", ink: "#ece8dc" },
  wood: { felt: "#e2ba7a", deep: "#c4954f", ink: "#2b1d0e" },
} as const;

/** A cloth's name.
 *
 * @example
 * ```ts
 * import type { Cloth } from "@johnmorrisdotca/narabe";
 * const value: Cloth = "green";
 * console.log(value);
 * ```
 */
export type Cloth = keyof typeof NARABE_CLOTHS;

/** Whether a text names a cloth.
 *
 * @param text - Text to parse, validate or format.
 * @returns Whether a text names a cloth.
 *
 * @example
 * ```ts
 * import { isCloth } from "@johnmorrisdotca/narabe";
 * console.log(isCloth("green"), isCloth("unknown"));
 * ```
 */
export function isCloth(text: unknown): text is Cloth {
  return typeof text === "string" && Object.hasOwn(NARABE_CLOTHS, text);
}

/** A cloth as CSS variables; nothing for a name that is not a cloth, so the defaults stay.
 *
 * @param cloth - A built-in cloth name; an unknown name leaves the defaults.
 * @returns The CSS variables to set on the element, or an empty object.
 *
 * @example
 * ```ts
 * import { clothVars } from "@johnmorrisdotca/narabe";
 * console.log(clothVars("green"));
 * ```
 */
export function clothVars(cloth: string | undefined | null): Record<`--nb-${string}`, string> {
  if (!isCloth(cloth)) return {};
  const { felt, deep, ink } = NARABE_CLOTHS[cloth];
  return { "--nb-wood": felt, "--nb-wood-deep": deep, "--nb-line": ink, "--nb-cell-light": felt, "--nb-cell-dark": deep };
}
