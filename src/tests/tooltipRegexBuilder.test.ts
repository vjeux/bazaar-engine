import { describe, it, expect } from "vitest";
import { tooltipRegexBuilder } from "../abilityParser";

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
      { literal: "." }
    ]);

    const match = "Burn (2/3/4).".match(regex);
    expect(match?.groups?.action).toBe("Burn");
    expect(match?.groups?.amount).toBe("(2/3/4)");
  });
});
