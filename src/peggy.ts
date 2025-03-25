// Import tooltipParser.pegjs with its text content
import { readFileSync } from "fs";
import peggy, { ParserOptions, ParserTracer } from "peggy";
import { Item } from "./types/apiItems";
import { PartialDeep } from "type-fest";
import { Card, CardType, Tooltip, Type, Version } from "./types/cardTypes";
import _ from "lodash";

export const parser = peggy.generate(
  readFileSync("./src/tooltipParser.pegjs", "utf8")
);

interface CustomParserOptions {
  item: Item;
  abilityIndex: number;
  auraIndex: number;

  // Optional properties for the parser
  grammarSource?: any;
  startRule?: string;
  tracer?: ParserTracer;
}

export function parse(input: string, options?: CustomParserOptions) {
  return parser.parse(input, options);
}

// Define the default card structure
type DefaultCardRequired = {
  $type: CardType;
  Type: Type;
  Localization: {
    FlavorText: null;
    Tooltips: PartialDeep<Tooltip>[];
  };
};

// Combine required fields with the rest being partial
const DEFAULT_CARD: DefaultCardRequired &
  PartialDeep<Omit<Card, keyof DefaultCardRequired>> = {
  $type: CardType.TCardItem,
  Type: Type.Item,
  Localization: {
    FlavorText: null,
    Tooltips: []
  }
};

export function parseItem(item: Item): PartialDeep<Card> {
  let card = _.cloneDeep(DEFAULT_CARD);

  let abilityIndex = 0;
  let auraIndex = 0;

  // For each tooltip, parse it and merge the result into the card
  item.unifiedTooltips.forEach((tooltip) => {
    let parsedCard: PartialDeep<Card>;
    try {
      parsedCard = parse(tooltip, {
        item: item,
        abilityIndex: abilityIndex,
        auraIndex: auraIndex
      });
    } catch (error) {
      // If parsing fails, log the error and skip this tooltip
      console.error(
        `Peggy parser error for tooltip: "${tooltip}", error: "${error}"`
      );
      return;
    }
    // Merge the parsed card into the card object
    card = _.merge(card, parsedCard);

    // Replace tooltip parenthesis text with {ability.abilityIndex}
    const tooltip_ingame = tooltip.replace(
      /\(.*?\)/g,
      `{ability.${abilityIndex}}`
    );

    // If tooltip is cooldown, skip
    if (!tooltip.includes("Cooldown")) {
      // This is dumb, but typescript doesn't recognize the initialization above
      card.Localization.Tooltips.push({
        Content: {
          Text: tooltip_ingame
        }
      });
    }
    // Update abilityIndex and auraIndex
    abilityIndex = card.Abilities ? Object.keys(card.Abilities).length : 0;
    auraIndex = card.Auras ? Object.keys(card.Auras).length : 0;
  });

  // Append the rest of the stuff we know about the card
  card.Id = item.id;
  card.$type = CardType.TCardItem;
  card.Type = Type.Item;
  card.Heroes = item.heroes;
  card.Tags = item.tags;
  card.HiddenTags = item.hiddenTags;
  card.Size = item.size;
  card.StartingTier = item.startingTier;
  _.set(card, "Localization.Title.Text", item.name);

  // Cast the card to the expected return type to resolve type compatibility issues
  return card as PartialDeep<Card>;
}
