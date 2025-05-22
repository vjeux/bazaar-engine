import validItemIds from "../../public/json/ValidItemIds.json";
import validSkillIds from "../../public/json/ValidSkillIds.json";
import { getInitialGameState2 } from "../engine/engine2/engine2Adapter";
import { describe, it } from "vitest";
import { genCardsAndEncounters } from "../lib/Data";
import { Tier } from "../types/shared";
import { CARDS_VERSION } from "../lib/constants";
import { getTooltips } from "@/engine/engine2/getTooltips";
const { Cards, Encounters } = await genCardsAndEncounters();

export function getTiers(startingTier: Tier): Tier[] {
  if (startingTier === Tier.Legendary) {
    return [Tier.Legendary];
  }
  if (startingTier === Tier.Bronze) {
    return [Tier.Bronze, Tier.Silver, Tier.Gold, Tier.Diamond];
  }
  if (startingTier === Tier.Silver) {
    return [Tier.Silver, Tier.Gold, Tier.Diamond];
  }
  if (startingTier === Tier.Gold) {
    return [Tier.Gold, Tier.Diamond];
  }
  if (startingTier === Tier.Diamond) {
    return [Tier.Diamond];
  }
  return [];
}

describe("Tooltips should not throw", () => {
  [...validItemIds, ...validSkillIds].forEach((cardId: string) => {
    const card = Cards[CARDS_VERSION].find((c) => c.Id === cardId);
    if (!card) {
      throw new Error(`Card "${cardId}" not found or it's Id is missing`);
    }
    const cardName = card.Localization.Title.Text;

    it(`Tooltip for "${cardName}" should not throw`, () => {
      getTiers(card.StartingTier).forEach((tier) => {
        const extension = validItemIds.includes(cardId)
          ? { cards: [{ cardId, tier }] }
          : { skills: [{ cardId, tier }] };
        const gameState = getInitialGameState2(Cards, Encounters, [
          { type: "player", health: 1000, ...extension },
          { type: "player", health: 1000 },
        ]);

        // This should not throw
        getTooltips(gameState, {
          playerIdx: 0,
          cardIdx: 0,
          location: "board",
        });
      });
    }, 5000);
  });
});
