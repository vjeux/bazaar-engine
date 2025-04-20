import { genCardsAndEncounters } from "../lib/Data.ts";
import { run } from "../engine/Engine.ts";
import {
  getFlattenedEncounters,
  getInitialGameState,
} from "../engine/GameState.ts";
import { describe, expect, it, test } from "vitest";

function getOptimizedDiff(
  prev: any,
  curr: any,
  ignoreKeys = new Set(["card", "tick"]),
  path: string[] = [],
): Record<string, any> {
  // If both values are strictly equal, no diff
  if (prev === curr) return {};

  // If either value is not an object (or is null), record the change
  if (
    typeof prev !== "object" ||
    prev === null ||
    typeof curr !== "object" ||
    curr === null
  ) {
    return { [path.join(".")]: curr };
  }

  const differences: Record<string, any> = {};
  // Get the union of keys from both objects
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const key of keys) {
    if (ignoreKeys.has(key)) continue; // Skip ignored keys

    // Recurse for the current key; build a new path
    const subDiff = getOptimizedDiff(prev[key], curr[key], ignoreKeys, [
      ...path,
      key,
    ]);
    // Merge any differences found
    Object.assign(differences, subDiff);
  }
  return differences;
}

const { Cards, Encounters } = await genCardsAndEncounters();

describe("Encounter snapshots should match", () => {
  getFlattenedEncounters(Encounters).forEach((encounter) => {
    test(`Runs encounter "Day ${encounter.day} - ${encounter.name}"`, () => {
      const gameState = getInitialGameState(Cards, Encounters, [
        { type: "monster", name: encounter.name },
        {
          type: "player",
          health: 2000,
          cards: [
            { name: "Silk Scarf" },
            { name: "Fang" },
            { name: "Bag of Jewels" },
          ],
        },
      ]);

      let steps = [];
      try {
        steps = run(gameState);
      } catch (e) {
        steps = [{ error: "null" }, { error: (e as Error).message }];
      }

      const diffs: any[] = [];
      for (let i = 1; i < steps.length; i++) {
        const diff = getOptimizedDiff(steps[i - 1], steps[i]);
        if (Object.keys(diff).length > 0) {
          diff.step = i;
          diffs.push(diff);
        }
      }

      expect(diffs).toMatchSnapshot();
    });
  });
});

describe("Encounters should not throw", () => {
  getFlattenedEncounters(Encounters).forEach((encounter) => {
    it(`Encounter "Day ${encounter.day} - ${encounter.name}" should not throw`, () => {
      const gameState = getInitialGameState(Cards, Encounters, [
        { type: "monster", name: encounter.name },
        {
          type: "player",
          health: 2000,
          cards: [
            { name: "Silk Scarf" },
            { name: "Fang" },
            { name: "Bag of Jewels" },
          ],
        },
      ]);

      // This should not throw
      expect(() => {
        run(gameState);
      }).not.toThrow();
    });
  });
});
