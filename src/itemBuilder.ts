import {
  TriggerType,
  ActiveIn,
  ActionType,
  Priority,
  Card,
  Version,
  Type,
  CardType,
  Ability,
  ValueType,
  Tiers
} from "./types/cardTypes";
import * as NITypes from "./types/items";

// A helper to extract a Size value from the item tags.
function extractSize(tags: NITypes.HowBazaarTag[]): NITypes.Size {
  const sizeTag = tags.find((tag) =>
    Object.values(NITypes.Size).includes(tag as NITypes.Size)
  );
  // Default to Small if no explicit size is found
  return (sizeTag as NITypes.Size) || "Small";
}

// A helper to extract a Hero from the tags (if any)
function extractHeroes(tags: NITypes.HowBazaarTag[]): NITypes.Hero[] {
  const heroes = tags.filter((tag) =>
    Object.values(NITypes.Hero).includes(tag as NITypes.Hero)
  );

  return heroes.length > 0 ? (heroes as NITypes.Hero[]) : [];
}

// A helper to filter the tags that are valid as Card Tags.
function extractCardTags(tags: NITypes.HowBazaarTag[]): string[] {
  const validTags = Object.values(NITypes.Tag);
  return tags.filter((tag) =>
    validTags.includes(tag as NITypes.Tag)
  ) as string[];
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
  return match[1].split("»").map((item) => item.trim());
}

/**
 * Parses a single string value to determine if it's a plain number,
 * a multiplier (ends with 'x'), or a percentage (ends with '%').
 */
function parseValueItem(item: string): ValueItem | null {
  // Remove any leading/trailing whitespace and optional leading '+' sign.
  let s = item.trim().replace(/^\+/, "");

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

function parseCooldown(
  cooldown: string | number | null
): number | null | ValueItem[] {
  if (cooldown === null) {
    return null;
  }
  if (typeof cooldown === "number") {
    return cooldown * 1000;
  }
  if (typeof cooldown === "string") {
    const parsedValues = parseExtractedValues(cooldown);
    if (parsedValues.length === 0) {
      return null;
    }
    // Multiply all values by 1000
    return parsedValues.map((vi) => {
      if (vi.type === "plain") {
        vi.value *= 1000;
      }
      return vi;
    });
  }
  throw new Error("Invalid cooldown value");
}

// A very simple parser for the tooltip text.
// For instance, if the text includes a phrase like "Deal X damage", we create a damage ability.
function parseTooltipForAbility(item: NITypes.Item): Ability | null {
  // Start by simply parsing the cooldown value/values
  const cooldownValues = parseCooldown(item.cooldown);
  console.log("CooldownValues", cooldownValues);

  // Now move onto abilities

  // Look for a line containing "deal" and "damage" (case insensitive).
  const damageLine = item.text.find((line) => /deal\s+.*damage/i.test(line));
  if (damageLine) {
    const damageValues = parseExtractedValues(damageLine);

    // Create the tiers
    const tiers: Partial<Tiers> = {};
    for (let i = 0; i < damageValues.length; i++) {
      const tier = Object.values(NITypes.Tier)[i];
      tiers[tier] = {
        Attributes: {
          CooldownMax:
            cooldownValues === null
              ? null
              : typeof cooldownValues === "number"
                ? cooldownValues
                : cooldownValues[i].value,
          DamageAmount: parseInt(damageValues[i].value.toString())
        },
        AbilityIds: ["0"],
        AuraIds: [],
        TooltipIds: [0]
      };
    }

    return {
      Id: "0",
      Trigger: {
        $type: TriggerType.TTriggerOnCardFired
      },
      ActiveIn: ActiveIn.HandOnly,
      Action: {
        $type: ActionType.TActionPlayerDamage
      },
      Tiers: tiers,
      Prerequisites: null,
      Priority: Priority.Medium,
      InternalName: item.name,
      InternalDescription: damageLine,
      MigrationData: "",
      VFXConfig: null,
      TranslationKey: "" // This could be generated or based on item name
    };
  }
  return null;
}

// A simple function to convert an item's enchantments (which are a mapping of enchantment type to text)
// into a structure for card enchantments. Here we simply store the text in the Localization.Description.
function parseEnchantments(item: NITypes.Item): { [key: string]: any } | null {
  const keys = Object.keys(item.enchants);
  if (keys.length === 0) return null;
  const enchants: { [key: string]: any } = {};
  for (const enchantKey of keys) {
    // For a real implementation you would build an Enchantment object
    enchants[enchantKey] = {
      // Placeholder: you could parse the string to determine attributes, abilities, etc.
      Localization: {
        Title: { Key: enchantKey, Text: enchantKey },
        Description: { Key: enchantKey, Text: item.enchants[enchantKey] },
        FlavorText: null,
        Tooltips: []
      },
      Attributes: {} as any,
      Abilities: {},
      Auras: {},
      Tags: [],
      HiddenTags: [],
      HasAbilities: false,
      HasAuras: false
    };
  }
  return enchants;
}

// A helper to determine hidden tags based on the item's tooltip text.
// For example, if a line mentions "damage", we add a "Damage" hidden tag.
function extractHiddenTags(item: Item): HiddenTag[] {
  const hidden: HiddenTag[] = [];
  if (item.text.some((line) => /damage/i.test(line))) {
    hidden.push("Damage" as HiddenTag);
  }
  // You can add further rules here (e.g., check for "shield", "heal", etc.)
  return hidden;
}

// Main parser function
export function parseItemToCard(item: NITypes.Item): Partial<Card> {
  // Determine size, heroes, and valid tags from the item tags
  const size = extractSize(item.tags);
  const heroes = extractHeroes(item.tags);
  const cardTags = extractCardTags(item.tags);
  const hiddenTags = extractHiddenTags(item);

  // Build an ability (if one is detected in the tooltip text)
  const ability = parseTooltipForAbility(item);
  const abilities = ability ? { "0": ability } : {};

  // Build localization using the item's name and tooltip text
  const localization = {
    Title: {
      Key: item.name,
      Text: item.name
    },
    Description: null,
    FlavorText: null,
    Tooltips: item.text.map((text) => ({
      Content: { Key: item.name, Text: text },
      TooltipType: "Active", // You might decide the type based on content
      Prerequisites: null
    }))
  };

  // Construct the Card object.
  // Many values here (like CardPackId, TranslationKey, etc.) are placeholders.
  const card: Partial<Card> = {
    $type: CardType.TCardItem,
    Abilities: abilities,
    Auras: {},
    Heroes: heroes,
    HiddenTags: hiddenTags,
    //Id: key, // Using the item key as a unique identifier
    InternalDescription: null,
    InternalName: item.name,
    Localization: localization,
    Size: size,
    StartingTier: item.tier,
    Tags: cardTags,
    TranslationKey: item.name, // Placeholder—could be generated differently
    Type: Type.Item,
    Version: Version.The100
    // Optional fields like Attributes, CombatantType, etc. can be added here as needed.
  };

  // Optionally parse and assign enchantments if present
  const enchants = parseEnchantments(item);
  if (enchants) {
    card.Enchantments = enchants;
  }

  return {
    $type: CardType.TCardItem
  } as Partial<Card>;

  return card;
}
