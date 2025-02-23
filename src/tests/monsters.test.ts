import { genCardsAndEncounters } from "../Data";
import { run } from "../Engine";
import { getFlattenedEncounters, getInitialGameState } from "../GameState";
import { expect, test } from "vitest";

function getOptimizedDiff(
  prev: any,
  curr: any,
  ignoreKeys = new Set(["card", "tick"]),
  path: string[] = []
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
      key
    ]);
    // Merge any differences found
    Object.assign(differences, subDiff);
  }
  return differences;
}

const { Cards, Encounters } = await genCardsAndEncounters();

getFlattenedEncounters(Encounters).forEach((encounter) => {
  test(`Runs encounter "Day ${encounter.day} - ${encounter.name}" against empty board`, () => {
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
      const diff = getOptimizedDiff(steps[i - 1], steps[i]);
      if (Object.keys(diff).length > 0) {
        diff.step = i;
        diffs.push(diff);
      }
    }

    expect(diffs).toMatchSnapshot();
  });
});
