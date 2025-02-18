import { getDefaultTierBoardCard } from "../GameState";
import validObjectNames from "../json/ValidObjectNames.json";
import { describe, it } from "vitest";
import Cards from "../json/v2_Cards.json";
import { GameState, getTooltips } from "../Engine";
import { V2Cards } from "../types/cardTypes";

describe("Tooltip Generation Test", () => {
  it("should generate tooltips for all valid cards without errors", () => {
    validObjectNames.forEach((cardName) => {
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

      getTooltips(gameState, 0, 0);
    });
  });
});
