// Import tooltipParser.pegjs with its text content
import { readFileSync } from "fs";
import peggy from "peggy";
import { Item } from "./types/apiItems";
import { PartialDeep } from "type-fest";
import { Card, Version } from "./types/cardTypes";
import _ from "lodash";

export const parser = peggy.generate(
  readFileSync("./src/tooltipParser.pegjs", "utf8")
);

export function parse(input: string, options?: any) {
  return parser.parse(input, options);
}

export function parseItem(item: Item): PartialDeep<Card> {
  let card: PartialDeep<Card> = {};

  let abilityIndex = 0;
  let auraIndex = 0;

  // For each tooltip, parse it and merge the result into the card
  item.unifiedTooltips.forEach((tooltip) => {
    const parsedCard = parse(tooltip, {
      item: item,
      abilityIndex: abilityIndex,
      auraIndex: auraIndex
    });
    // Merge the parsed card into the card object
    card = _.merge(card, parsedCard);
    // Update abilityIndex and auraIndex
    abilityIndex = card.Abilities ? Object.keys(card.Abilities).length : 0;
    auraIndex = card.Auras ? Object.keys(card.Auras).length : 0;
  });

  // Append the rest of the stuff we know about the card
  card.Id = item.id;
  card.Heroes = item.heroes;
  card.Tags = item.tags;
  card.HiddenTags = item.hiddenTags;
  card.Size = item.size;
  card.StartingTier = item.startingTier;
  card.Version = Version.The100;
  _.set(card, "Localization.Title.Text", item.name);

  return card;
}
