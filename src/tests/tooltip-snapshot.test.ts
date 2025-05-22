import { getInitialGameState2 } from "@/engine/engine2/engine2Adapter";
import { getTooltips } from "@/engine/engine2/getTooltips";
import { CARDS_VERSION } from "@/lib/constants";
import { describe, it, expect } from "vitest";
import validItemIds from "../../public/json/ValidItemIds.json";
import validSkillIds from "../../public/json/ValidSkillIds.json";
import { genCardsAndEncounters } from "@/lib/Data";
import { getTiers } from "./tooltips.test";

const { Cards, Encounters } = await genCardsAndEncounters();
describe("Tooltip snapshots", () => {
  [...validItemIds, ...validSkillIds].forEach((cardId: string) => {
    const card = Cards[CARDS_VERSION].find((c) => c.Id === cardId);
    const cardName = card?.Localization.Title.Text;
    if (!card || !cardName) {
      throw new Error(`Card "${cardId}" not found or it's Id is missing`);
    }
    it(`Snapshot equality for tooltips for "${cardName}"`, () => {
      getTiers(card.StartingTier).forEach((tier) => {
        try {
          const extension = validItemIds.includes(cardId)
            ? { cards: [{ cardId: cardId, tier }] }
            : { skills: [{ cardId: cardId, tier }] };
          const gameState = getInitialGameState2(Cards, Encounters, [
            { type: "player", health: 1000, ...extension },
            { type: "player", health: 1000 },
          ]);
          const tooltips = getTooltips(gameState, {
            playerIdx: 0,
            cardIdx: 0,
            location: "board",
          });
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
    }, 5000);
  });
});
