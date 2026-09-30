import {
  FORBIDDEN_PATTERNS,
  LINE_RULES,
  VARIANT_SPECS,
} from "../constants.ts";
import type {
  ColourRules,
  ForbiddenPattern,
  GameSettings,
  Handicap,
  HandicapTerms,
  Stone,
} from "../types.ts";
import { hasHeadStart } from "./headStart.ts";

/**
 * The rules a colour plays under: the variant's spec for that colour, with the
 * handicap laid over it when the handicap belongs to that colour.
 *
 * A handicap can only make a colour's game harder. It adds forbidden shapes,
 * tightens the line rule, lengthens the line, cuts the stones per turn and
 * removes captures; it never loosens anything the variant already imposes.
 */
export function rulesFor(settings: GameSettings, stone: Stone): ColourRules {
  const spec = VARIANT_SPECS[settings.variant];
  const base: ColourRules = {
    lineRule: spec.lineRule[stone],
    forbidden: spec.forbidden[stone],
    captures: spec.captures,
    stonesPerTurn: spec.stonesPerTurn,
    winLength: settings.winLength,
    secondStoneExclusion: 0,
  };

  const handicap = settings.handicap;
  if (handicap.stone !== stone) return base;

  return {
    lineRule: tightest(base.lineRule, handicap),
    forbidden: withPatterns(base.forbidden, handicap),
    captures: base.captures && !handicap.noCaptures,
    stonesPerTurn: handicap.singleStone ? 1 : base.stonesPerTurn,
    winLength: base.winLength + (handicap.longerLine ? 1 : 0),
    secondStoneExclusion: handicap.secondStoneExclusion,
  };
}

/**
 * Whether any handicap is in force for anyone: harder rules for one colour, or
 * a head start for one.
 *
 * THE ONE PLACE THAT QUESTION IS ANSWERED, and a rating depends on it: a game
 * this is true of moves nobody's rating (`handicapRefusal`). The head start
 * joined here and in `HandicapTerms`, and was refused a rating without anybody
 * having to find the rating code.
 */
export function hasHandicap(settings: HandicapTerms): boolean {
  return settings.handicap.stone !== null || hasHeadStart(settings);
}

/**
 * WHICH KIND OF UNEVENNESS a game carries, for the pages that name it: harder
 * rules for one colour, a head start for one, or neither. Where both are set the
 * harder rules are named, being the one the handicap panel shows first. Null
 * exactly where `hasHandicap` is false.
 */
export function handicapKind(settings: HandicapTerms): "handicap" | "headStart" | null {
  if (settings.handicap.stone !== null) return "handicap";
  return hasHeadStart(settings) ? "headStart" : null;
}

/** Line rules from loosest to strictest, so a handicap can only move rightward. */
const LINE_RULE_ORDER = [LINE_RULES.atLeast, LINE_RULES.exact, LINE_RULES.exactOpen];

/**
 * Forbidding the overline only means something if an overline cannot win, so
 * that toggle implies exactly-five, as it does in renju.
 */
function tightest(current: ColourRules["lineRule"], handicap: Handicap) {
  const asked = handicap.openLine
    ? LINE_RULES.exactOpen
    : handicap.exactLine || handicap.overline
      ? LINE_RULES.exact
      : LINE_RULES.atLeast;
  return LINE_RULE_ORDER.indexOf(asked) > LINE_RULE_ORDER.indexOf(current)
    ? asked
    : current;
}

function withPatterns(
  current: readonly ForbiddenPattern[],
  handicap: Handicap,
): readonly ForbiddenPattern[] {
  const added: ForbiddenPattern[] = [];
  if (handicap.doubleThree) added.push(FORBIDDEN_PATTERNS.doubleThree);
  if (handicap.doubleFour) added.push(FORBIDDEN_PATTERNS.doubleFour);
  if (handicap.overline) added.push(FORBIDDEN_PATTERNS.overline);
  const merged = [...current];
  for (const pattern of added) if (!merged.includes(pattern)) merged.push(pattern);
  return merged;
}
