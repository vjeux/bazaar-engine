import { getInitialGameState } from "../GameState";
import validItemNames from "../json/ValidItemNames.json";
import validSkillNames from "../json/ValidSkillNames.json";
import { getTooltips } from "../Engine";
import { expect, it } from "vitest";
import { genCardsAndEncounters } from "../Data";
import { Tier } from "../types/shared";

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

[...validItemNames, ...validSkillNames].forEach((cardName) => {
  it(`Generate tooltips for "${cardName}"`, () => {
    const card = Cards["0.1.9"].find(
      (card) => card.Localization.Title.Text === cardName
    );
    if (!card) {
      throw new Error(`Card "${cardName}" not found`);
    }
    getTiers(card.StartingTier).forEach((tier) => {
      try {
        const extension = validItemNames.includes(cardName)
          ? { cards: [{ name: cardName, tier }] }
          : { skills: [{ name: cardName, tier }] };
        const gameState = getInitialGameState(Cards, Encounters, [
          { type: "player", health: 1000, ...extension },
          { type: "player", health: 1000 }
        ]);
        expect({
          cardName,
          tier,
          tooltips: getTooltips(gameState, 0, 0)
        }).toMatchSnapshot();
      } catch (e) {
        expect({
          cardName,
          tier,
          error: (e as Error).message
        }).toMatchSnapshot();
      }
    });
  });
});
