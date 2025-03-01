import { parseTooltip, tooltipRegexBuilder, REGEX_LIST } from "../tooltipRegex";
import { describe, test, expect, vi } from "vitest";
import * as tooltipRegexModule from "../tooltipRegex";
import apiItems from "../json/apiItems.json";
import { describe, it, expect } from "vitest";
import { createColors } from "colorette";

const { yellow } = createColors({ useColor: true });

describe("parseTooltip function", () => {
  test("handles simple tooltips", () => {
    const result = parseTooltip("Burn (1/2/3).");
    expect(result).toEqual({
      action: "Burn",
      amount: "(1/2/3)",
      remaining: "."
    });
  });

  test("throws error for tooltips with no match", () => {
    expect(() => {
      parseTooltip("This doesn't match any pattern");
    }).toThrow();
  });

  test("handles tooltips with reparse sections", () => {
    const result = parseTooltip("At the start of each fight, Burn (2/3/4).");

    expect(result).toEqual({
      eachx: "each fight, ",
      reparse: {
        action: "Burn",
        amount: "(2/3/4)",
        remaining: "."
      },
      trigger: "At the start of "
    });
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
          const hasMatch = REGEX_LIST.some((regex) => regex.test(tooltip));
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
