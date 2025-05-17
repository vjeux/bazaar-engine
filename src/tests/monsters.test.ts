import { genCardsAndEncounters, getCardId } from "../lib/Data.ts";
import { run } from "../engine/engine2/engine2Adapter.ts";
import { getFlattenedEncounters } from "../engine/GameState.ts";
import { getInitialGameState2 } from "../engine/engine2/engine2Adapter.ts";
import { describe, expect, it, test } from "vitest";

type DiffObject = Record<string, unknown>;
type DiffWithStep = DiffObject & { step: number };

function getOptimizedDiff(
  prev: unknown,
  curr: unknown,
  ignoreKeys = new Set(["card", "tick"]),
  path: string[] = [],
): Record<string, unknown> {
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

  // At this point, prev and curr are known to be non-null objects
  const prevObj = prev as Record<string, unknown>;
  const currObj = curr as Record<string, unknown>;

  const differences: Record<string, unknown> = {};
  // Get the union of keys from both objects
  const keys = new Set([...Object.keys(prevObj), ...Object.keys(currObj)]);
  for (const key of keys) {
    if (ignoreKeys.has(key)) continue; // Skip ignored keys

    // Recurse for the current key; build a new path
    const subDiff = getOptimizedDiff(prevObj[key], currObj[key], ignoreKeys, [
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
    test(`Matches snapshot for "Day ${encounter.day} - ${encounter.name}"`, () => {
      const gameState = getInitialGameState2(Cards, Encounters, [
        { type: "monster", name: encounter.name, day: Number(encounter.day) },
        {
          type: "player",
          health: 2000,
          cards: [
            { cardId: getCardId("Silk Scarf", Cards) },
            { cardId: getCardId("Fang", Cards) },
            { cardId: getCardId("Bag of Jewels", Cards) },
          ],
        },
      ]);

      let steps = [];
      try {
        steps = run(gameState);
      } catch (e) {
        steps = [{ error: "null" }, { error: (e as Error).message }];
      }

      const diffs: DiffWithStep[] = [];
      for (let i = 1; i < steps.length; i++) {
        const diff: DiffObject = getOptimizedDiff(steps[i - 1], steps[i]);
        if (Object.keys(diff).length > 0) {
          const diffWithStep = diff as DiffWithStep;
          diffWithStep.step = i;
          diffs.push(diffWithStep);
        }
      }

      expect(diffs).toMatchSnapshot();
    });
  });
});

describe("Encounters should not throw", () => {
  getFlattenedEncounters(Encounters).forEach((encounter) => {
    it(`Encounter "Day ${encounter.day} - ${encounter.name}" should not throw`, () => {
      const gameState = getInitialGameState2(Cards, Encounters, [
        { type: "monster", name: encounter.name, day: Number(encounter.day) },
        {
          type: "player",
          health: 2000,
          cards: [
            { cardId: getCardId("Silk Scarf", Cards) },
            { cardId: getCardId("Fang", Cards) },
            { cardId: getCardId("Bag of Jewels", Cards) },
          ],
        },
      ]);

      // This should not throw
      run(gameState);
    });
  });
});
