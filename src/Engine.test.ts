import { genCardsAndEncounters } from "./Data";
import { run } from "./Engine";
import { getFlattenedEncounters, getInitialGameState } from "./GameState";
import { expect, describe, test } from "vitest";

function getStateDiff(
  prev: any,
  curr: any,
  initialPath: string[] = []
): Record<string, any> {
  const diff: Record<string, any> = {};
  const stack: Array<{ prev: any; curr: any; path: string[] }> = [
    { prev, curr, path: initialPath }
  ];

  while (stack.length > 0) {
    const { prev, curr, path } = stack.pop()!;

    // Handle primitives and null cases
    if (
      typeof prev !== "object" ||
      typeof curr !== "object" ||
      prev == null ||
      curr == null
    ) {
      if (prev !== curr) {
        diff[path.join(".")] = curr;
      }
      continue;
    }

    // Process object properties
    for (const key in curr) {
      if (key === "card" || key === "tick") {
        continue;
      }
      stack.push({
        prev: prev[key],
        curr: curr[key],
        path: [...path, key]
      });
    }
    for (const key in prev) {
      if (key === "card" || key === "tick") {
        continue;
      }
      if (!(key in curr)) {
        stack.push({
          prev: prev[key],
          curr: curr[key],
          path: [...path, key]
        });
      }
    }
  }

  return diff;
}

describe("Engine encounters", async () => {
  const { Cards, Encounters } = await genCardsAndEncounters();

  getFlattenedEncounters(Encounters).forEach((encounter) => {
    test(`runs encounter "Day ${encounter.day} - ${encounter.name}" against empty board`, () => {
      console.log(encounter.day, encounter.name);
      const gameState = getInitialGameState(Cards, Encounters, [
        { type: "monster", name: encounter.name },
        { type: "player", health: 1000 }
      ]);

      let steps = [];
      try {
        steps = run(gameState);
      } catch (e) {
        steps = [{ error: "null" }, { error: (e as Error).message }];
      }

      const diffs: any[] = [];
      for (let i = 1; i < steps.length; i++) {
        const diff = getStateDiff(steps[i - 1], steps[i]);
        if (Object.keys(diff).length > 0) {
          diff.step = i;
          diffs.push(diff);
        }
      }

      expect(diffs).toMatchSnapshot();
    });
  });
});
