import { parseTooltip, tooltipRegexBuilder, REGEX_LIST } from "../tooltipRegex";
import { describe, test, expect, it } from "vitest";
import { AttributeType } from "../types/cardTypes";
import { Item } from "../types/apiItems";
import { Size, Tier } from "../types/shared";
import { createColors } from "colorette";
import apiItems from "../json/apiItems.json";
import { ActionType } from "../types/cardTypes";

const { yellow } = createColors({ useColor: true });

// Create a mock item for testing
const mockItem: Item = {
  id: "test_item_id",
  name: "Test Item",
  size: Size.Small,
  startingTier: Tier.Bronze,
  heroes: [],
  tags: [],
  hiddenTags: [],
  unifiedTooltips: [],
  tiers: {
    [Tier.Bronze]: { tooltips: ["Cooldown 10"] },
    [Tier.Silver]: { tooltips: ["Cooldown 9"] },
    [Tier.Gold]: { tooltips: ["Cooldown 8"] },
    [Tier.Diamond]: { tooltips: [] },
    [Tier.Legendary]: { tooltips: [] }
  },
  enchantments: [],
  remarks: [],
  combatEncounters: []
};

describe("parseTooltip function", () => {
  test("handles burn tooltips and returns correct ability update flag", () => {
    const [card, shouldUpdateAbility] = parseTooltip(
      "Burn (1/2/3).",
      mockItem,
      0
    );

    // Check the card structure
    expect(card).toMatchObject({
      Abilities: {
        "0": {
          Action: {
            $type: ActionType.TActionPlayerBurnApply
          }
        }
      },
      Tiers: {
        [Tier.Bronze]: {
          Attributes: {
            [AttributeType.Burn]: 1
          }
        },
        [Tier.Silver]: {
          Attributes: {
            [AttributeType.Burn]: 2
          }
        },
        [Tier.Gold]: {
          Attributes: {
            [AttributeType.Burn]: 3
          }
        }
      }
    });

    // Should update ability for action tooltips
    expect(shouldUpdateAbility).toBe(true);
  });

  test("handles stat tooltips and returns correct ability update flag", () => {
    const [card, shouldUpdateAbility] = parseTooltip(
      "Cooldown (10/9/8) seconds",
      mockItem,
      0
    );

    // Check the card structure
    expect(card).toMatchObject({
      Tiers: {
        [Tier.Bronze]: {
          Attributes: {
            [AttributeType.CooldownMax]: 10
          }
        },
        [Tier.Silver]: {
          Attributes: {
            [AttributeType.CooldownMax]: 9
          }
        },
        [Tier.Gold]: {
          Attributes: {
            [AttributeType.CooldownMax]: 8
          }
        }
      }
    });

    // Should not update ability for stat tooltips
    expect(shouldUpdateAbility).toBe(false);
  });

  test("throws error for tooltips with no match", () => {
    expect(() => {
      parseTooltip("This doesn't match any pattern", mockItem);
    }).toThrow();
  });
});

describe("should have a regex pattern for every unified tooltip in apiItems", () => {
  // Track which tooltips don't have a match
  const unmatchedTooltips = new Set<string>();
  let totalTooltips = 0;

  // Process items one by one
  apiItems.data.forEach((item) => {
    if (item.unifiedTooltips && Array.isArray(item.unifiedTooltips)) {
      it(`should match all tooltips for - ${item.name}`, () => {
        const itemUnmatchedTooltips: string[] = [];

        item.unifiedTooltips.forEach((tooltip) => {
          totalTooltips++;

          // We need to use tooltipRegexBuilder with the regexParts from each pattern in REGEX_LIST
          const hasMatch = REGEX_LIST.some(({ regexParts }) => {
            const regex = tooltipRegexBuilder(regexParts);
            return regex.test(tooltip);
          });

          if (!hasMatch) {
            unmatchedTooltips.add(tooltip);
            itemUnmatchedTooltips.push(tooltip);
          }
        });

        if (itemUnmatchedTooltips.length > 0) {
          console.log(
            `Item ${item.name} has ${itemUnmatchedTooltips.length} unmatched tooltips:`
          );
          itemUnmatchedTooltips.forEach((tooltip) =>
            console.log(`- "${tooltip}"`)
          );
        }

        expect(itemUnmatchedTooltips.length).toBe(0);
      });
    }
  });

  it("should have no unmatched tooltips overall", () => {
    if (unmatchedTooltips.size > 0) {
      console.log(
        yellow(
          `Found ${unmatchedTooltips.size} unmatched tooltips out of ${totalTooltips} total.`
        )
      );
    }
    expect(unmatchedTooltips.size).toBe(0);
  });
});
