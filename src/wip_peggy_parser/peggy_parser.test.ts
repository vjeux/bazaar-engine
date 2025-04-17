import { parse } from "./peggy.ts";
import { describe, expect, it } from "npm:vitest";
import { createColors } from "npm:colorette";
import apiItems from "../json/apiItems.json";
import { parseItem } from "../peggy";
import { genCardsAndEncounters } from "../Data";
import { Item } from "../types/apiItems";
import _ from "lodash";

const items: Item[] = apiItems.data;

const { yellow } = createColors({ useColor: true });

const { Cards } = await genCardsAndEncounters();
const CardsValues = Object.values(Cards);

describe("Peggy-generated tooltip parser", () => {
  // Track which tooltips don't match the parser's grammar
  const unmatchedTooltips = new Set<string>();
  const matchedTooltips = new Set<string>();
  const allTooltips = new Set<string>();

  // Process items one by one
  apiItems.data.forEach((item) => {
    if (item.unifiedTooltips && Array.isArray(item.unifiedTooltips)) {
      it(`${item.name} - parse tooltips`, () => {
        const itemUnmatchedTooltips: string[] = [];

        item.unifiedTooltips.forEach((tooltip) => {
          allTooltips.add(tooltip);

          try {
            // Try to parse the tooltip with the Peggy parser
            parse(tooltip, {
              item: item,
              abilityIndex: 0,
              auraIndex: 0,
            });
            matchedTooltips.add(tooltip);
          } catch (error) {
            unmatchedTooltips.add(tooltip);
            itemUnmatchedTooltips.push(tooltip);
            throw error;
          }
        });

        if (itemUnmatchedTooltips.length > 0) {
          console.log(
            `Item ${item.name} has ${itemUnmatchedTooltips.length} unmatched tooltips:`,
          );
          itemUnmatchedTooltips.forEach((tooltip) =>
            console.log(`- "${tooltip}"`)
          );
        }

        expect(itemUnmatchedTooltips.length).toBe(0);
      });
    }
  });

  it("should provide statistics about matched vs unmatched tooltips", () => {
    const matchedCount = matchedTooltips.size;
    const unmatchedCount = unmatchedTooltips.size;

    console.log(
      yellow(`
    Tooltip Parsing Statistics:
    - Total unique tooltips: ${allTooltips.size}
    - Matched: ${matchedCount} (${
        ((matchedCount / allTooltips.size) * 100).toFixed(2)
      }%)
    - Unmatched: ${unmatchedCount} (${
        ((unmatchedCount / allTooltips.size) * 100).toFixed(2)
      }%)
    `),
    );

    // We don't expect all tooltips to match initially since the parser is still being developed
    // This test just provides statistics rather than failing
    expect(true).toBe(true);
  });

  // Test specific tooltip examples that we expect to work with the current parser
  describe("should parse specific tooltip formats correctly", () => {
    it("parses stat tooltips with numbers in parentheses", () => {
      expect(() => parse("Cooldown (10/9/8) seconds", undefined)).not.toThrow();
    });

    it("parses plain stat tooltips", () => {
      expect(() => parse("Cooldown 10 seconds", undefined)).not.toThrow();
    });

    it("parses burn action tooltips with numbers in parentheses", () => {
      expect(() => parse("Burn (1/2/3).", undefined)).not.toThrow();
    });

    it("parses plain action tooltips", () => {
      expect(() => parse("Deal 50 damage.", undefined)).not.toThrow();
    });

    it("parses heal tooltips", () => {
      expect(() => parse("Heal 10.", undefined)).not.toThrow();
    });

    it("parses poison tooltips", () => {
      expect(() => parse("Poison 5.", undefined)).not.toThrow();
    });

    it("parses shield tooltips", () => {
      expect(() => parse("Shield 20.", undefined)).not.toThrow();
    });
  });
});

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
        "VFXConfig",
      ];
      const omittedAbilities = expectedCard?.Abilities
        ? _.mapValues(
          expectedCard.Abilities,
          (ability) => _.omit(ability, omitToplevelKeys),
        )
        : undefined;

      const omitTierKeys = ["BuyPrice", "SellPrice"];
      const omittedTiers = expectedCard?.Tiers
        ? _.mapValues(
          expectedCard.Tiers,
          (ti) => _.mapValues(ti, (tierInfo) => _.omit(tierInfo, omitTierKeys)),
        )
        : undefined;

      const omitTooltipKeys = ["Content.Key", "TooltipType", "Prerequisites"]; // TODO dont care about these for now
      const omittedTooltips = expectedCard?.Localization?.Tooltips
        ? _.map(
          expectedCard.Localization.Tooltips,
          (tooltip) => _.omit(tooltip, omitTooltipKeys),
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
          Version: expectedCard?.Version,
          Localization: {
            Title: {
              Text: item.name,
            },
            Tooltips: omittedTooltips,
          },
        }),
      );
    });
  });
});
