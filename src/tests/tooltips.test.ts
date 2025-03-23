import { getInitialGameState } from "../GameState";
import validItemNames from "../json/ValidItemNames.json";
import validSkillNames from "../json/ValidSkillNames.json";
import { getTooltips } from "../Engine";
import { expect, it } from "vitest";
import { genCardsAndEncounters } from "../Data";

const { Cards, Encounters } = await genCardsAndEncounters();

[...validItemNames, ...validSkillNames].forEach((cardName) => {
  it(`Generate tooltips for "${cardName}"`, () => {
    try {
      const extension = validItemNames.includes(cardName)
        ? { cards: [{ name: cardName }] }
        : { skills: [{ name: cardName }] };
      const gameState = getInitialGameState(Cards, Encounters, [
        { type: "player", health: 1000, ...extension },
        { type: "player", health: 1000 }
      ]);
      expect({
        cardName,
        tooltips: getTooltips(gameState, 0, 0)
      }).toMatchSnapshot();
    } catch (e) {
      expect({
        cardName,
        error: (e as Error).message
      }).toMatchSnapshot();
    }
  });
});
