import {
  ActionType,
  AttributeType,
  CardType,
  TierInfo,
  Tiers,
  TriggerType,
  ValueType
} from "./types/cardTypes";
import { PartialDeep } from "type-fest";
import { Card } from "./types/cardTypes";
import { Item } from "./types/apiItems";
import { Tier, TierInt } from "./types/shared";
import _ from "lodash";

export interface RegexPartLiteral {
  literal: string;
  capture?: never;
  values?: never;
  number?: never;
  nested?: never;
  optional?: boolean;
}

export interface RegexPartCapture {
  capture: string;
  literal?: never;
  values?: string[];
  number?: boolean;
  nested?: never;
  optional?: boolean;
}

export interface RegexPartNested {
  nested: RegexPart[][];
  literal?: never;
  capture?: never;
  values?: never;
  number?: never;
  optional?: boolean;
}

export type RegexPart = RegexPartLiteral | RegexPartCapture | RegexPartNested;

export function tooltipRegexBuilder(parts: RegexPart[]): RegExp {
  // Helper to escape regex metacharacters in literal strings.
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Process a single part or a nested array of parts into a regex string
  function processRegexPart(part: RegexPart): string {
    let partRegex = "";

    if (part.literal) {
      // A literal piece is simply escaped.
      partRegex = escapeRegex(part.literal);
    } else if (part.capture) {
      let innerPattern = "";
      if (part.values && Array.isArray(part.values)) {
        // If allowed values are provided, join them with | (after escaping)
        innerPattern = "(?:" + part.values.map(escapeRegex).join("|") + ")";
      } else if (part.number) {
        // Use our number matcher
        innerPattern = numberPattern;
      } else {
        // If no specific pattern is provided, use a non-greedy wildcard. Matches multiple words.
        innerPattern = ".+?";
      }
      // Create a named capture group using the provided capture name.
      partRegex = `(?<${part.capture}>${innerPattern})`;
    } else if (part.nested) {
      // Handle nested patterns - each array in nested is an alternative pattern
      const nestedPatterns = part.nested.map((alternativeParts) => {
        // Process each part in this alternative and join them
        return alternativeParts
          .map((nestedPart) => processRegexPart(nestedPart))
          .join("");
      });
      // Join all alternatives with the OR operator
      partRegex = "(?:" + nestedPatterns.join("|") + ")";
    }

    // If the part is optional, wrap it with a non-capturing optional group
    if (part.optional) {
      partRegex = `(?:${partRegex})?`;
    }

    return partRegex;
  }

  // Pattern for matching a number token.
  // This will match either:
  //   - A parenthesized group: e.g., "(2/4/6/8)", "(+30%/+40%)", "(1x/2x)"
  //   - A standalone number: e.g., "42", "-3.14", "+30%", "1x"
  const numberPattern =
    "(?:\\((?:[+\\-]?\\d+(?:\\.\\d+)?(?:[x%])?(?:\\/[+\\-]?\\d+(?:\\.\\d+)?(?:[x%])?)+)\\)|[+\\-]?\\d+(?:\\.\\d+)?(?:[x%])?)";

  // Build the full regex string piece by piece.
  let regexStr = "^";
  for (const part of parts) {
    regexStr += processRegexPart(part);
  }
  regexStr += "$"; // End of string
  return new RegExp(regexStr, "i"); // Using case-insensitive flag
}

/**
 * Extracts numbers from the first pair of parentheses in the input string.
 * Supports numbers with an optional '+' sign, as well as values ending with 'x' or '%'.
 * Separators between values can be either '»' or '/'.
 *
 * @param input - The string to parse, e.g. "(+3x » 50% / 25)".
 * @returns An array of numbers extracted from the string.
 */
function parseNumbers(input: string): number[] {
  // Extract the content within the first pair of parentheses.
  const match = input.match(/\(\s*([^)]*?)\s*\)/);
  if (!match || !match[1]) {
    return [];
  }

  // Split the content by either '»' or '/' and process each item.
  return (
    match[1]
      .split(/[»/]/)
      .map((item) => {
        // Remove whitespace and an optional leading '+'.
        const s = item.trim().replace(/^\+/, "");

        // Check for multiplier values ending with 'x' (case-insensitive).
        const multiplierMatch = s.match(/^(\d+(?:\.\d+)?)x$/i);
        if (multiplierMatch) {
          return parseFloat(multiplierMatch[1]);
        }

        // Check for percentage values ending with '%'.
        const percentageMatch = s.match(/^(\d+(?:\.\d+)?)%$/);
        if (percentageMatch) {
          return parseFloat(percentageMatch[1]);
        }

        // Check for plain numbers.
        const numberMatch = s.match(/^(\d+(?:\.\d+)?)$/);
        if (numberMatch) {
          return parseFloat(numberMatch[1]);
        }

        // If none of the expected patterns match, return NaN.
        return NaN;
      })
      // Filter out any non-numeric results.
      .filter((num) => !isNaN(num))
  );
}

export enum ACTION {
  BURN = "burn",
  DEAL = "deal",
  HEAL = "heal",
  POISON = "poison",
  SHIELD = "shield"
}
export const ACTIONS = Object.values(ACTION);

// Map action to AttributeType
const ACTION_TO_ATTRIBUTE: Record<string, AttributeType> = {
  [ACTION.BURN]: AttributeType.Burn,
  [ACTION.DEAL]: AttributeType.DamageAmount,
  [ACTION.HEAL]: AttributeType.HealAmount,
  [ACTION.POISON]: AttributeType.Poison,
  [ACTION.SHIELD]: AttributeType.Shield
};

const ACTION_TO_ACTIONTYPE: Record<string, ActionType> = {
  [ACTION.BURN]: ActionType.TActionPlayerBurnApply,
  [ACTION.DEAL]: ActionType.TActionPlayerDamage,
  [ACTION.HEAL]: ActionType.TActionPlayerHeal,
  [ACTION.POISON]: ActionType.TActionPlayerPoisonApply,
  [ACTION.SHIELD]: ActionType.TActionPlayerShieldApply
};

export interface TooltipMatch {
  regexParts: Array<RegexPart>;
  handler: (
    matched: Record<string, string>,
    item: Item,
    ability_number: number
  ) => PartialDeep<Card>;
}

function constructTierInfos(
  item: Item,
  attribute_type: AttributeType,
  values: string
): PartialDeep<Card> {
  const startingIndex = TierInt[item.startingTier];
  let tiers = Object.values(Tier);
  // Filter out all tiers where the item doesn't have a tooltip
  tiers = tiers
    .slice(startingIndex)
    .filter((tier) => item.tiers[tier].tooltips.length > 0);

  const tierValues = parseNumbers(values);

  // For every tier, create a TierInfo object
  const tierInfos: PartialDeep<Tiers> = {};
  tiers.forEach((tier, index) => {
    tierInfos[tier] = {
      Attributes: {
        [attribute_type]: tierValues[index]
      }
    };
  });

  // Return partial card object
  return {
    Tiers: tierInfos
  };
}

// Cooldown, Ammo
export enum STAT {
  AMMO = "ammo",
  COOLDOWN = "cooldown"
}
const STAT_TO_ATTRIBUTE: Record<string, AttributeType> = {
  [STAT.AMMO]: AttributeType.Ammo,
  [STAT.COOLDOWN]: AttributeType.CooldownMax
};
const STAT_TOOLTIP: TooltipMatch = {
  regexParts: [
    { capture: "stat", values: Object.values(STAT) },
    { literal: " " },
    { capture: "values", number: true },
    { capture: "remaining" }
  ],
  handler: (matched, item) => {
    const attributeType: AttributeType = STAT_TO_ATTRIBUTE[matched.stat];
    return constructTierInfos(item, attributeType, matched.values);
  }
};

const NORMAL_ACTION: TooltipMatch = {
  regexParts: [
    { capture: "action", values: ACTIONS },
    { literal: " " },
    { capture: "amount", number: true },
    { capture: "remaining" }
  ],
  handler: (matched, item, ability_number) => {
    // Start by constructing TierInfos
    const tier_card = constructTierInfos(
      item,
      ACTION_TO_ATTRIBUTE[matched.action],
      matched.amount
    );
    const ability_card: PartialDeep<Card> = {
      Abilities: {
        [ability_number]: {
          Action: {
            $type: ACTION_TO_ACTIONTYPE[matched.action]
          }
        }
      }
    };
    // Return lodash merged objects
    return _.merge(tier_card, ability_card);
  }
};

export const REGEX_LIST: TooltipMatch[] = [STAT_TOOLTIP, NORMAL_ACTION];

/**
 * Interface for parsed tooltip results
 */
export interface ParsedTooltip {
  [key: string]: string | ParsedTooltip;
}

/**
 * Parse a tooltip string, handling any nested reparsing
 * @param tooltip The tooltip string to parse
 * @param item The Item containing tier information
 * @param ability_number The current ability number
 * @returns A tuple containing [PartialDeep<Card>, boolean] where the boolean indicates
 *          whether the ability_number should be updated after this tooltip is processed
 * @throws Error if the tooltip doesn't match any regex pattern
 */
export function parseTooltip(
  tooltip: string,
  item: Item,
  ability_number: number = 0
): [PartialDeep<Card>, boolean] {
  // Convert to lowercase
  tooltip = tooltip.toLowerCase();
  // Try each regex pattern in order
  for (const { regexParts, handler } of REGEX_LIST) {
    const regex = tooltipRegexBuilder(regexParts);
    const match = regex.exec(tooltip);
    if (!match || !match.groups) continue;

    // We found a match, create an object with all captured groups
    const matched: Record<string, string> = {};

    // Copy all capture groups to the result
    for (const [key, value] of Object.entries(match.groups)) {
      if (value) {
        matched[key] = value;
      }
    }

    // Process the matched groups with the handler to get a Card object
    const card = handler(matched, item, ability_number);

    // Determine if we should update the ability number based on the matched pattern
    // STAT_TOOLTIP handlers don't update ability_number, others do
    const shouldUpdateAbilityNumber = !(regexParts === STAT_TOOLTIP.regexParts);

    return [card, shouldUpdateAbilityNumber];
  }

  // No match found, throw an error
  throw new Error(`Tooltip does not match any regex pattern "${tooltip}"`);
}
