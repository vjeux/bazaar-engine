import { describe, it, expect, test } from "vitest";
import { tooltipRegexBuilder, REGEX_LIST } from "../tooltipRegex";

describe("tooltipRegexBuilder", () => {
  it("should build a regex that matches literal parts", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Hello" },
      { literal: " " },
      { literal: "World" }
    ]);

    expect("Hello World").toMatch(regex);
    expect("Hello  World").not.toMatch(regex);
    expect("HelloWorld").not.toMatch(regex);
  });

  it("should build a regex with capture groups", () => {
    const regex = tooltipRegexBuilder([
      { capture: "greeting" },
      { literal: " " },
      { capture: "subject" }
    ]);

    const match = "Hello World".match(regex);
    expect(match?.groups).toBeDefined();
    expect(match?.groups?.greeting).toBe("Hello");
    expect(match?.groups?.subject).toBe("World");
  });

  it("should restrict capture groups to specified values", () => {
    const regex = tooltipRegexBuilder([
      { capture: "action", values: ["heal", "damage", "draw"] },
      { literal: " " },
      { capture: "amount", number: true }
    ]);

    expect("heal 5").toMatch(regex);
    expect("damage 3").toMatch(regex);
    expect("draw 2").toMatch(regex);
    expect("burn 1").not.toMatch(regex);

    const match = "heal 5".match(regex);
    expect(match?.groups?.action).toBe("heal");
    expect(match?.groups?.amount).toBe("5");
  });

  it("should handle number captures properly", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Deal " },
      { capture: "amount", number: true },
      { literal: " damage" }
    ]);

    expect("Deal 5 damage").toMatch(regex);
    expect("Deal (2/4/6) damage").toMatch(regex);
    expect("Deal +30% damage").toMatch(regex);
    expect("Deal 1x damage").toMatch(regex);

    const match1 = "Deal 5 damage".match(regex);
    expect(match1?.groups?.amount).toBe("5");

    const match2 = "Deal (2/4/6) damage".match(regex);
    expect(match2?.groups?.amount).toBe("(2/4/6)");

    const match3 = "Deal +30% damage".match(regex);
    expect(match3?.groups?.amount).toBe("+30%");
  });

  it("should handle complex patterns", () => {
    const regex = tooltipRegexBuilder([
      {
        capture: "trigger",
        values: ["When you", "At the start of", "The first time"]
      },
      { literal: " " },
      { capture: "condition" },
      { literal: ", " },
      { capture: "action" },
      { literal: " " },
      { capture: "value", number: true },
      { capture: "remaining" }
    ]);

    const match = "When you Burn, charge this 2 second(s).".match(regex);
    expect(match?.groups).toBeDefined();
    expect(match?.groups?.trigger).toBe("When you");
    expect(match?.groups?.condition).toBe("Burn");
    expect(match?.groups?.action).toBe("charge this");
    expect(match?.groups?.value).toBe("2");
  });

  it("should escape regex special characters in literals", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Deal +50% damage" },
      { literal: " (special)" }
    ]);

    expect("Deal +50% damage (special)").toMatch(regex);
    expect("Deal +50% damage special").not.toMatch(regex);
  });

  it("Should parse: Burn (2/3/4).", () => {
    const regex = tooltipRegexBuilder([
      { capture: "action", values: ["Burn"] },
      { literal: " " },
      { capture: "amount", number: true },
      { capture: "remaining" }
    ]);

    const match = "Burn (2/3/4).".match(regex);
    expect(match?.groups?.action).toBe("Burn");
    expect(match?.groups?.amount).toBe("(2/3/4)");
    expect(match?.groups?.remaining).toBe(".");
  });

  it("should handle nested patterns - first option", () => {
    const regex = tooltipRegexBuilder([
      { capture: "trigger", values: ["At the start of "] },
      { capture: "eachx", values: ["each fight, ", "each day, "] },
      {
        nested: [
          [
            { capture: "eachAction", values: ["get"] },
            { literal: " " },
            { capture: "eachAmount", number: true },
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
    ]);

    const match = "At the start of each fight, get 2 Gold".match(regex);
    expect(match).not.toBeNull();
    expect(match?.groups?.trigger).toBe("At the start of ");
    expect(match?.groups?.eachx).toBe("each fight, ");
    expect(match?.groups?.eachAction).toBe("get");
    expect(match?.groups?.eachAmount).toBe("2");
    expect(match?.groups?.getType).toBe("Gold");
    expect(match?.groups?.permGain).toBeUndefined();
    expect(match?.groups?.permGainStat).toBeUndefined();
  });

  it("should handle nested patterns - second option", () => {
    const regex = tooltipRegexBuilder([
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
    ]);

    const match =
      "At the start of each day, permanently gain 5 Max Health".match(regex);
    expect(match).not.toBeNull();
    expect(match?.groups?.trigger).toBe("At the start of ");
    expect(match?.groups?.eachx).toBe("each day, ");
    expect(match?.groups?.eachAction).toBeUndefined();
    expect(match?.groups?.getType).toBeUndefined();
    expect(match?.groups?.permGain).toBe("permanently gain");
    expect(match?.groups?.permGainAmount).toBe("5");
    expect(match?.groups?.permGainStat).toBe("Max Health");
  });

  it("should handle optional nested patterns", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Deal " },
      { capture: "amount", number: true },
      { literal: " damage" },
      {
        nested: [
          [
            { literal: " and " },
            { capture: "secondAction", values: ["heal"] },
            { literal: " " },
            { capture: "thirdAmount", number: true }
          ],
          [
            { literal: " to " },
            { capture: "target", values: ["all enemies", "a random enemy"] }
          ]
        ],
        optional: true
      },
      { literal: "." }
    ]);

    // Test with first nested option
    const match1 = "Deal (10/15/20) damage and heal 5.".match(regex);
    expect(match1).not.toBeNull();
    expect(match1?.groups?.amount).toBe("(10/15/20)");
    expect(match1?.groups?.secondAction).toBe("heal");
    expect(match1?.groups?.thirdAmount).toBe("5");
    expect(match1?.groups?.target).toBeUndefined();

    // Test with second nested option
    const match2 = "Deal 30 damage to all enemies.".match(regex);
    expect(match2).not.toBeNull();
    expect(match2?.groups?.amount).toBe("30");
    expect(match2?.groups?.secondAction).toBeUndefined();
    expect(match2?.groups?.thirdAmount).toBeUndefined();
    expect(match2?.groups?.target).toBe("all enemies");

    // Test without the optional nested part
    const match3 = "Deal 10 damage.".match(regex);
    expect(match3).not.toBeNull();
    expect(match3?.groups?.amount).toBe("10");
    expect(match3?.groups?.secondAction).toBeUndefined();
    expect(match3?.groups?.target).toBeUndefined();
  });
});

describe("tooltipRegexBuilder with optional parts", () => {
  test("supports optional literals", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Shield equal to " },
      { capture: "amount", number: true },
      { literal: " times", optional: true },
      { literal: " " },
      { capture: "reference" }
    ]);

    // Test with "times" present
    {
      const match = regex.exec("Shield equal to (1/2/3/4) times your Income.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(1/2/3/4)",
        reference: "your Income."
      });
    }

    // Test without "times" present
    {
      const match = regex.exec(
        "Shield equal to (1x/2x) the value of the adjacent items."
      );
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(1x/2x)",
        reference: "the value of the adjacent items."
      });
    }
  });

  test("supports optional captures", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Deal " },
      { capture: "amount", number: true },
      { literal: " damage" },
      { capture: "modifier", optional: true },
      { literal: "." }
    ]);

    // Test without the optional capture
    {
      const match = regex.exec("Deal (10/20/30) damage.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(10/20/30)"
      });
      expect(match?.groups?.modifier).toBeUndefined();
    }

    // Test with the optional capture
    {
      const match = regex.exec("Deal (10/20/30) damage to all enemies.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(10/20/30)",
        modifier: " to all enemies"
      });
    }
  });

  test("can chain multiple optional parts", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Deal " },
      { capture: "amount", number: true },
      { literal: " damage", optional: true },
      { literal: " and ", optional: true },
      { literal: "apply ", optional: true },
      { capture: "effect", optional: true },
      { literal: "." }
    ]);

    // Test with some optional parts
    {
      const match = regex.exec(
        "Deal (10/20/30) damage and apply Burn (2/4/6)."
      );
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(10/20/30)",
        effect: "Burn (2/4/6)"
      });
    }

    // Test with fewer optional parts
    {
      const match = regex.exec("Deal (10/20/30) damage.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(10/20/30)"
      });
      expect(match?.groups?.effect).toBeUndefined();
    }

    // Test with different combination
    {
      const match = regex.exec("Deal (10/20/30) and apply Weakness.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(10/20/30)",
        effect: "Weakness"
      });
    }
  });

  test("handles edge cases with optional parts", () => {
    const regex = tooltipRegexBuilder([
      { literal: "Start with " },
      { capture: "amount", number: true, optional: true },
      { literal: " ", optional: true },
      { capture: "item" },
      { literal: "." }
    ]);

    // Test with all parts present
    {
      const match = regex.exec("Start with (2/3/4) Gold.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        amount: "(2/3/4)",
        item: "Gold"
      });
    }

    // Test with optional parts missing
    {
      const match = regex.exec("Start with Energy.");
      expect(match).not.toBeNull();
      expect(match?.groups).toMatchObject({
        item: "Energy"
      });
      expect(match?.groups?.amount).toBeUndefined();
    }
  });
});
