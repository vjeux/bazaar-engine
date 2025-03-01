import { CardType, TriggerType } from "./types/cardTypes";

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

export const ACTIONS = ["Burn", "Cooldown", "Deal", "Heal", "Poison", "Shield"];

export const STAT = ["Ammo"];

export const RECURSIVE = "reparse";

export const REF_ACTION = ["Shield equal to"];
export const REFERENCE = [
  "this item's value.",
  "your Income.",
  "the value of the adjacent items."
];

// Regex patterns for parsing unified tooltips.
// Capture group named "reparse" will indicate that that section should be sent back in again for parsing.
// This is useful for nested tooltips, e.g., "At the start of each fight, reparse: Burn (2/3/4)."
export const REGEX_LIST = [
  // Burn (1/2/3).
  // Cooldown 5 seconds
  // Deal (12/18/24/30) damage.
  // Heal 20.
  // Poison (3/6/9/12).
  // Shield (40/60/80).
  tooltipRegexBuilder([
    { capture: "action", values: ACTIONS },
    { literal: " " },
    { capture: "amount", number: true },
    { capture: "remaining" }
  ]),
  // At the start of
  tooltipRegexBuilder([
    { capture: "trigger", values: ["At the start of "] },
    { capture: "eachx", values: ["each fight, ", "each day, "] },
    { capture: RECURSIVE }
  ]),
  // Ammo 2
  tooltipRegexBuilder([
    { capture: "stat", values: STAT },
    { literal: " " },
    { capture: "amount", number: true }
  ]),

  // Shield equal to (1/2/3/4) times your Income.
  // Shield equal to (1x/2x) the value of the adjacent items.
  tooltipRegexBuilder([
    { capture: "action", values: REF_ACTION },
    { literal: " " },
    { capture: "amount", number: true },
    { literal: " times", optional: true },
    { literal: " " },
    { capture: "reference", values: REFERENCE }
  ]),
  // Adjacent Potions have +1 Ammo.
  // Adjacent Toys have +1 Multicast.
  // Adjacent Weapons have (+5/+10/+20/+40) damage.
  // Adjacent items have (+1/+2/+3/+4) Max Ammo.
  // Adjacent items have (+10%/+15%/+20%/+25%) Crit Chance.
  // Adjacent items have (+15%/+30%/+50%) Crit Chance.
  // Adjacent items have (+20%/+30%/+40%/+50%) Crit Chance.
  // Adjacent items have (+25%/+50%) Crit Chance.
  // Adjacent items have (+3%/+6%/+9%/+12%) Crit chance.
  // Adjacent items have +1 ammo.
  tooltipRegexBuilder([
    { literal: "Adjacent " },
    { capture: "target" },
    { literal: " " },
    { capture: "action", values: ["have"] },
    { capture: RECURSIVE }
  ]),
  tooltipRegexBuilder([
    { capture: "value", number: true },
    { literal: " " },
    { capture: "stat", values: STAT },
    { literal: "." }
  ]),
  // Adjacent Vehicles have their cooldowns reduced by (5%/10%/15%/20%).
  // Adjacent items have their cooldown reduced by (10%/15%/20%/25%).
  // Adjacent items have their cooldowns reduced by (6%/9%/12%/15%).
  // Adjacent items have bonus damage, heal, or shield equal to their Crit Chance.

  // Adjacent weapons (+3/+6/+9/+12) damage for the fight.
  // Adjacent weapons gain (10/15/20/25) Damage for the fight.
  // Adjacent weapons gain (3/6/9/12) damage for the fight.
  // Adjacent items gain (+10%/+15%/+20%) crit chance for the fight.
  // Adjacent items gain (2%/4%/6%/8%) Crit Chance for the fight.
  // Adjacent items gain (2%/4%/6%/8%) Crit chance for the fight.
  // Adjacent Weapons gain (5/10) Damage for the fight.
  // Adjacent Shield items (+2/+4/+6/+8) Shield for the fight.
  // Adjacent Shield items gain (10/15/20/25) Shield for the fight.
  // Adjacent Shield items gain (3/6/9/12) Shield for the fight.
  // Adjacent Shield items gain (5/10) Shield for the fight.
  // Adjacent Heal items gain (10/15/20/25) Heal for the fight.
  //   tooltipRegexBuilder([])

  // Example using nested patterns:
  // At the start of each fight/day, either get X or permanently gain Y
  tooltipRegexBuilder([
    { capture: "trigger", values: ["At the start of "] },
    { capture: "eachx", values: ["each fight, ", "each day, "] },
    {
      nested: [
        [
          { capture: "eachAction", values: ["get"] },
          { literal: " " },
          { capture: "amount", number: true },
          { literal: " " },
          { capture: "getType" }
        ],
        [
          { capture: "permGain", values: ["permanently gain"] },
          { literal: " " },
          { capture: "permGainAmount", number: true },
          { literal: " " },
          { capture: "permGainStat", values: ["Max Health"] }
        ]
      ]
    }
  ])
];

/**
 * Interface for parsed tooltip results
 */
export interface ParsedTooltip {
  [key: string]: string | ParsedTooltip;
}

/**
 * Parse a tooltip string, handling any nested reparsing
 * @param tooltip The tooltip string to parse
 * @returns An object containing all captured groups, with reparsed content nested
 * @throws Error if the tooltip doesn't match any regex pattern
 */
export function parseTooltip(
  tooltip: string,
  path: string = "root"
): ParsedTooltip {
  // Try each regex pattern in order
  for (const regex of REGEX_LIST) {
    const match = regex.exec(tooltip);
    if (!match || !match.groups) continue;

    // We found a match, process the capture groups
    const result: ParsedTooltip = {};

    // Copy all capture groups to the result
    for (const [key, value] of Object.entries(match.groups)) {
      if (key === RECURSIVE && value) {
        // This is a reparse instruction, recursively parse the content
        const nestedPath = `${path}.${key}`;
        try {
          const reparsedResult = parseTooltip(value.trim(), nestedPath);
          result[key] = reparsedResult;
        } catch (error) {
          // If reparsing failed, include path information in the error
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed at ${nestedPath}: ${errorMessage}\nOriginal content: "${value}"`
          );
        }
      } else if (value) {
        // Regular capture group
        result[key] = value;
      }
    }

    return result;
  }

  // No match found, throw an error
  throw new Error(
    `Tooltip does not match any regex pattern at ${path}: "${tooltip}"`
  );
}
