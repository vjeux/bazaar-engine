import { parse } from "../peggy";
import { describe, expect, it } from "vitest";
import { createColors } from "colorette";
import apiItems from "../json/items.json";
import { parseItem } from "../peggy";
import { genCardsAndEncounters } from "../Data";
import { Item } from "../types/apiItems";
import _ from "lodash";

const items: Item[] = apiItems.data as Item[];

const { yellow } = createColors({ useColor: true });

const { Cards } = await genCardsAndEncounters();
const CardsValues = Object.values(Cards["0.1.9"]);

describe("should build all partial cards correctly", () => {
  // For each item, parse it, build it and check equality
  items.forEach((item) => {
    it(`${item.name}- parse to card`, () => {
      const parsedCard = parseItem(item);

      const expectedCard = CardsValues.find((c) => c.Id === item.id);

      expect(parsedCard).toBeDefined();

      // Check that the card object matches the expected structure from Cards
      // We don't need to check every field, just the ones that are important

      // Omit fields that are not needed for functional parity
      const omitToplevelKeys = [
        "InternalDescription",
        "InternalName",
        "MigrationData",
        "Priority", // TODO - Figure out some way to handle priority
        "TranslationKey",
        "VFXConfig"
      ];
      const omittedAbilities = expectedCard?.Abilities
        ? _.mapValues(expectedCard.Abilities, (ability) =>
            _.omit(ability, omitToplevelKeys)
          )
        : undefined;

      const omitTierKeys = ["BuyPrice", "SellPrice"];
      const omittedTiers = expectedCard?.Tiers
        ? _.mapValues(expectedCard.Tiers, (ti) =>
            _.mapValues(ti, (tierInfo) => _.omit(tierInfo, omitTierKeys))
          )
        : undefined;

      const omitTooltipKeys = ["Content.Key", "TooltipType", "Prerequisites"]; // TODO dont care about these for now
      const omittedTooltips = expectedCard?.Localization?.Tooltips
        ? _.map(expectedCard.Localization.Tooltips, (tooltip) =>
            _.omit(tooltip, omitTooltipKeys)
          )
        : undefined;

      expect(parsedCard).toEqual(
        expect.objectContaining({
          $type: expectedCard?.$type,
          Abilities: omittedAbilities,
          Auras: expectedCard?.Auras,
          Tags: expectedCard?.Tags,
          Tiers: omittedTiers,
          Heroes: expectedCard?.Heroes,
          Id: expectedCard?.Id,
          Type: expectedCard?.Type,
          Size: expectedCard?.Size,
          StartingTier: expectedCard?.StartingTier,
          HiddenTags: expectedCard?.HiddenTags,
          Localization: {
            FlavorText: null,
            Title: {
              Text: item.name
            },
            Tooltips: omittedTooltips
          }
        })
      );
    });
  });
});
