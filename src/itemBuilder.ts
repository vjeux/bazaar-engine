import { PartialDeep } from "type-fest";
import { Item } from "./types/apiItems";
import {
  TriggerType,
  ActiveIn,
  ActionType,
  Priority,
  Card,
  Version,
  Type,
  CardType,
  Tiers,
  Ability
} from "./types/cardTypes";
import * as NITypes from "./types/items";
import { Tier, TierInt } from "./types/shared";
import { log } from "console";

/**
 * Filters an array of tags to only include valid enum values.
 * @param enumObj The enum object to filter against.
 * @param tags The array of tags to filter.
 * @returns An array of valid enum values.
 */
function filterForEnum<T extends Record<string, string>>(
  enumObj: T,
  tags: string[]
): T[keyof T][] {
  const validTags = new Set(Object.values(enumObj));
  return tags.filter((tag) => validTags.has(tag)) as T[keyof T][];
}

// Define the union type for the different kinds of values.
type ValueItem =
  | { type: "plain"; value: number }
  | { type: "multiplier"; value: number }
  | { type: "percentage"; value: number };

/**
 * Extracts the content within the first pair of parentheses and splits it by the arrow separator.
 * Assumes only one set of parentheses exists in the string.
 */
function extractValues(input: string): string[] {
  const match = input.match(/\(\s*([^)]*?)\s*\)/);
  if (!match || !match[1]) {
    return [];
  }
  // Support both » and / as separators
  return match[1].split(/[»/]/).map((item) => item.trim());
}

/**
 * Parses a single string value to determine if it's a plain number,
 * a multiplier (ends with 'x'), or a percentage (ends with '%').
 */
function parseValueItem(item: string): ValueItem | null {
  // Remove any leading/trailing whitespace and optional leading '+' sign.
  const s = item.trim().replace(/^\+/, "");

  // Check for multiplier values ending with 'x' (case-insensitive)
  const multiplierMatch = s.match(/^(\d+(?:\.\d+)?)x$/i);
  if (multiplierMatch) {
    return { type: "multiplier", value: parseFloat(multiplierMatch[1]) };
  }

  // Check for percentage values ending with '%'
  const percentageMatch = s.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentageMatch) {
    return { type: "percentage", value: parseFloat(percentageMatch[1]) };
  }

  // Check for plain numbers (digits with optional decimals)
  const numberMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (numberMatch) {
    return { type: "plain", value: parseFloat(numberMatch[1]) };
  }

  // If the pattern doesn't match any expected formats, return null.
  return null;
}

/**
 * Wrapper function that extracts the values from the string and converts them into typed items.
 */
function parseExtractedValues(input: string): ValueItem[] {
  const rawValues = extractValues(input);
  const parsed: ValueItem[] = [];
  for (const value of rawValues) {
    const parsedValue = parseValueItem(value);
    if (parsedValue !== null) {
      parsed.push(parsedValue);
    }
  }
  return parsed;
}

function parseCooldown(cooldown: string): number {
  // Check if "cooldown" in string
  if (!cooldown.includes("Cooldown")) {
    throw new Error(`No cooldown found in string: ${cooldown}`);
  }
  // Extract the single number from the cooldown string and convert to milliseconds
  const match = cooldown.match(/\d+(?:\.\d+)?/);
  if (!match) {
    throw new Error(`No number found in cooldown string: ${cooldown}`);
  }

  return parseFloat(match[0]) * 1000;
}

// Main parser function
export function parseItemToCard(item: Item): PartialDeep<Card> {
  // Determine size, heroes, and valid tags from the item tags
  const size = item.size;
  const heroes = item.heroes;
  const cardTags = item.tags;
  const hiddenTags = item.hiddenTags;
  const startingTier = item.startingTier;
  const tiersToCreate = getTierRange(item);

  console.log("item", item);

  // Start to create TierInfos
  const tiers: PartialDeep<Tiers> = {};
  // Create cooldowns
  tiersToCreate.forEach((tier) => {
    console.log("tier", tier);
    console.log(tiersToCreate);
    console.log("arg:", item.tiers[tier].tooltips[0]);
    const cooldown = parseCooldown(item.tiers[tier].tooltips[0]); // TODO: Assuming first tooltip always contains the cooldown

    // Create the TierInfo object
    tiers[tier] = {
      Attributes: {
        CooldownMax: cooldown
      }
    };
  });

  let card: PartialDeep<Card> = {
    $type: CardType.TCardItem,
    Abilities: undefined,
    Auras: undefined,
    Heroes: heroes,
    HiddenTags: hiddenTags,
    Id: item.id,
    InternalDescription: item.unifiedTooltips.join("\n"),
    InternalName: item.name,
    Localization: undefined,
    Size: size,
    StartingTier: startingTier,
    Tags: cardTags,
    Tiers: tiers,
    TranslationKey: undefined,
    Type: Type.Item,
    Version: Version.The100
  };

  card = addAbilities(card, item);

  // Add enchantments
  card.Enchantments = parseEnchantments(item);

  return card;
}

// A very simple parser for the tooltip text.
// For instance, if the text includes a phrase like "Deal X damage", we create a damage ability.
function addAbilities(card: PartialDeep<Card>, item: Item): PartialDeep<Card> {
  // For each unified tooltip, parse to add ability/aura
  item.unifiedTooltips.forEach((tooltip) => {
    card = addAbility(card, item, tooltip);
  });
  return card;
}

function addAbility(
  card: PartialDeep<Card>,
  item: Item,
  tooltip: string
): PartialDeep<Card> {
  // Get next ability index
  const nextAbilityIndex = card.Abilities?.length ?? 0;

  // Look for a line containing "deal" and "damage" (case insensitive).
  const damageLine = /deal\s+.*damage/i.test(tooltip);
  if (damageLine) {
    const damageValues = parseExtractedValues(tooltip);
    console.log("tooltip", tooltip);
    console.log("damageValues", damageValues);

    // For each tier, add the dmg value to the attributes
    getTierRange(item).forEach((tier, i) => {
      const damageValue = damageValues[i];
      // Add DamageAmount to TierInfo. Spread because of possible undefined properties
      card.Tiers = {
        ...card.Tiers,
        [tier]: {
          ...card.Tiers?.[tier],
          Attributes: {
            ...card.Tiers?.[tier]?.Attributes,
            DamageAmount: damageValue.value
          }
        }
      };
    });

    const ab: Ability = {
      Id: `${nextAbilityIndex}`,
      Trigger: {
        $type: TriggerType.TTriggerOnCardFired
      },
      ActiveIn: ActiveIn.HandOnly,
      Action: {
        $type: ActionType.TActionPlayerDamage
      },
      Prerequisites: null,
      Priority: Priority.Medium,
      InternalName: item.name,
      InternalDescription: tooltip,
      MigrationData: "",
      VFXConfig: null,
      TranslationKey: ""
    };

    card.Abilities = card.Abilities ?? {};

    // Add ability to card
    card.Abilities[`${nextAbilityIndex}`] = ab;
  }

  // TODO Add dummy aura for now
  card.Auras = {};

  return card;
}

// A simple function to convert an item's enchantments (which are a mapping of enchantment type to text)
// into a structure for card enchantments. Here we simply store the text in the Localization.Description.
function parseEnchantments(item: Item): { [key: string]: any } | null {
  // TODO: Implement enchantment parsing
  return null;
}

function extractLocalization(item: Item) {
  // TODO: Implement localization extraction
  return null;
}
function getTierRange(item: Item): Tier[] {
  const startingIndex = TierInt[item.startingTier];
  const tiers = Object.values(Tier);
  tiers.forEach((tier) => {
    console.log("tier", tier);
    console.log("indexed", item.tiers);
  });
  // Filter out all tiers where the item doesn't have a tooltip
  return tiers
    .slice(startingIndex)
    .filter((tier) => item.tiers[tier].tooltips.length > 0);
}
