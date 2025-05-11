import { getInitialGameState } from "../engine/GameState";
import validItemNames from "../../public/json/ValidItemNames.json";
import validSkillNames from "../../public/json/ValidSkillNames.json";
import { getTooltips } from "../engine/Engine";
import { describe, expect, it } from "vitest";
import { genCardsAndEncounters } from "../lib/Data";
import { Tier } from "../types/shared";
import { CARDS_VERSION } from "../lib/constants";
const { Cards, Encounters } = await genCardsAndEncounters();

function getTiers(startingTier: Tier): Tier[] {
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
  [...validItemNames, ...validSkillNames].forEach((cardName: string) => {
    it(`Tooltip for "${cardName}" should not throw`, () => {
      const card = Cards[CARDS_VERSION].find(
        (card) => card.Localization.Title.Text === cardName,
      );
      const cardId = card?.Id;
      if (!card || !cardId) {
        throw new Error(`Card "${cardName}" not found or it's Id is missing`);
      }
      getTiers(card.StartingTier).forEach((tier) => {
        const extension = validItemNames.includes(cardName)
          ? { cards: [{ cardId, tier }] }
          : { skills: [{ cardId, tier }] };
        const gameState = getInitialGameState(Cards, Encounters, [
          { type: "player", health: 1000, ...extension },
          { type: "player", health: 1000 },
        ]);

        // This should not throw
        expect(() => {
          getTooltips(gameState, 0, 0);
        }).not.toThrow();
      });
    });
  });
});

describe("Tooltip snapshots", () => {
  [...validItemNames, ...validSkillNames].forEach((cardName: string) => {
    it(`Snapshot equality for tooltips for "${cardName}"`, () => {
      const card = Cards[CARDS_VERSION].find(
        (card) => card.Localization.Title.Text === cardName,
      );
      const cardId = card?.Id;
      if (!card || !cardId) {
        throw new Error(`Card "${cardName}" not found or it's Id is missing`);
      }
      getTiers(card.StartingTier).forEach((tier) => {
        try {
          const extension = validItemNames.includes(cardName)
            ? { cards: [{ cardId: cardId, tier }] }
            : { skills: [{ cardId: cardId, tier }] };
          const gameState = getInitialGameState(Cards, Encounters, [
            { type: "player", health: 1000, ...extension },
            { type: "player", health: 1000 },
          ]);
          const tooltips = getTooltips(gameState, 0, 0);
          expect({
            cardName,
            tier,
            tooltips,
          }).toMatchSnapshot();
        } catch (error) {
          expect({
            cardName,
            tier,
            error: (error as Error).message,
          }).toMatchSnapshot();
        }
      });
    });
  });
});
