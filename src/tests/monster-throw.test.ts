import { run } from "@/engine/engine2/engine2Adapter";
import { getInitialGameState2 } from "@/engine/engine2/engine2Adapter";
import {
  getFlattenedEncounters,
  getCardId,
  genCardsAndEncounters,
} from "@/lib/Data";
import { describe, test } from "vitest";
const { Cards, Encounters } = await genCardsAndEncounters();

describe("Encounters should not throw", () => {
  getFlattenedEncounters(Encounters).forEach((encounter) => {
    test(`Encounter "Day ${encounter.day} - ${encounter.name}" should not throw`, () => {
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
    }, 5000); // 5 second timeout
  });
});
