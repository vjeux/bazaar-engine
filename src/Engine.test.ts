import { genCardsAndEncounters } from "./Data";
import { run } from "./Engine";
import { getFlattenedEncounters, getInitialGameState } from "./GameState";
import { expect, describe, test } from "vitest";

function getStateDiff(
  prev: any,
  curr: any,
  path: string[] = []
): Record<string, any> {
  const diff: Record<string, any> = {};

  if (typeof prev !== "object" || typeof curr !== "object") {
    if (prev !== curr) {
      diff[path.join(".")] = curr;
    }
    return diff;
  }

  if (prev === null || curr === null) {
    if (prev !== curr) {
      diff[path.join(".")] = curr;
    }
    return diff;
  }

  const prevKeys = Object.keys(prev);
  const currKeys = Object.keys(curr);
  const allKeys = new Set([...prevKeys, ...currKeys]);
  allKeys.delete("card");
  allKeys.delete("tick");

  for (const key of allKeys) {
    if (!(key in prev)) {
      diff[path.concat(key).join(".")] = curr[key];
    } else if (!(key in curr)) {
      diff[path.concat(key).join(".")] = undefined;
    } else {
      const valueDiff = getStateDiff(prev[key], curr[key], path.concat(key));
      Object.assign(diff, valueDiff);
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
