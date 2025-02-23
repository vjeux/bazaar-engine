import { getInitialGameState } from "../GameState";
import validObjectNames from "../json/ValidObjectNames.json";
import validSkillNames from "../json/ValidSkillNames.json";
import { getTooltips } from "../Engine";
import { expect, it } from "vitest";
import { genCardsAndEncounters } from "../Data";

const { Cards, Encounters } = await genCardsAndEncounters();

[...validObjectNames, ...validSkillNames].forEach((cardName) => {
  it(`Generate tooltips for "${cardName}"`, () => {
    try {
      const extension = validObjectNames.includes(cardName)
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
