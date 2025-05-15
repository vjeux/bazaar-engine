import { getFlattenedEncounters } from "../engine/GameState";
import { getInitialGameState2, run } from "../engine/engine2Adapter";
import { genCardsAndEncounters } from "../lib/Data";
import { CARDS_VERSION } from "../lib/constants";
import validItemIds from "../../public/json/ValidItemIds.json";
import validSkillIds from "../../public/json/ValidSkillIds.json"; // Re-added for skill tests
import { describe, expect, it } from "vitest";
import type { PlayerConfig, MonsterConfig } from "../engine/GameState"; // Assuming these types are available or adjust
import { Card } from "@/types/cardTypes"; // CardType is no longer needed for the primary filter

const { Cards, Encounters } = await genCardsAndEncounters();

describe("Single card battle simulations (Items and Skills)", () => {
  const flattenedEncounters = getFlattenedEncounters(Encounters);

  if (flattenedEncounters.length === 0) {
    it("Skipping all card battle simulations: No encounters available", () => {
      expect.fail("No encounters available to run battle simulations.");
    });
    return; // Stop further tests in this describe block if no encounters
  }
  const firstEncounter = flattenedEncounters[0];

  const cardsForCurrentVersion: Card[] | undefined = Cards[CARDS_VERSION];

  if (!cardsForCurrentVersion || cardsForCurrentVersion.length === 0) {
    it(`Skipping all card battle simulations: No cards for version ${CARDS_VERSION}`, () => {
      expect.fail(`No cards found for CARDS_VERSION: ${CARDS_VERSION}`);
    });
    return; // Stop further tests if no cards for the version
  }

  cardsForCurrentVersion.forEach((card) => {
    const currentCard = card as Card;
    const cardId = currentCard.Id;
    const cardTitle = currentCard.Localization.Title.Text;

    if (validItemIds.some((id) => id === cardId)) {
      it(`Battle with item "${cardTitle}" (Tier: ${currentCard.StartingTier}) should not throw`, () => {
        if (!currentCard.Id) {
          throw new Error(`Card "${cardTitle}" (Item) is missing an Id.`);
        }

        // Player configuration is now simplified as we know it's an item
        const playerEntityConfig: PlayerConfig = {
          type: "player" as const,
          health: 1000,
          cards: [{ cardId: currentCard.Id, tier: currentCard.StartingTier }],
          skills: [],
        };

        const monsterEntityConfig: MonsterConfig = {
          type: "monster" as const,
          name: firstEncounter.name,
          day: Number(firstEncounter.day),
        };

        const gameState = getInitialGameState2(Cards, Encounters, [
          monsterEntityConfig,
          playerEntityConfig,
        ]);

        expect(() => {
          run(gameState);
        }).not.toThrow();
      });
    } else if (validSkillIds.some((id) => id === cardId)) {
      it(`Battle with skill "${cardTitle}" (Tier: ${currentCard.StartingTier}) should not throw`, () => {
        if (!currentCard.Id) {
          throw new Error(`Card "${cardTitle}" (Skill) is missing an Id.`);
        }

        const playerEntityConfig: PlayerConfig = {
          type: "player" as const,
          health: 1000,
          cards: [],
          skills: [{ cardId: currentCard.Id, tier: currentCard.StartingTier }],
        };

        const monsterEntityConfig: MonsterConfig = {
          type: "monster" as const,
          name: firstEncounter.name,
          day: Number(firstEncounter.day),
        };

        const gameState = getInitialGameState2(Cards, Encounters, [
          monsterEntityConfig,
          playerEntityConfig,
        ]);

        expect(() => {
          run(gameState);
        }).not.toThrow();
      });
    }
  });
});
