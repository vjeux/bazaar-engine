import { getDefaultTierBoardCard } from "../GameState";
import validObjectNames from "../json/ValidObjectNames.json";
import Cards from "../json/v2_Cards.json";
import { GameState, getTooltips } from "../Engine";
import { V2Cards } from "../types/cardTypes";
import { expect, it } from "vitest";

validObjectNames.forEach((cardName) => {
  it(`Generate tooltips for "${cardName}"`, () => {
    try {
      const gameState: GameState = {
        tick: 0,
        isPlaying: true,
        players: [
          {
            HealthMax: 100,
            Health: 100,
            HealthRegen: 0,
            Shield: 0,
            Burn: 0,
            Poison: 0,
            Gold: 0,
            Income: 0,
            board: [getDefaultTierBoardCard(Cards as V2Cards, cardName)] // Use first available tier
          }
        ],
        multicast: [],
        getRand: () => 0.5
      };
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
