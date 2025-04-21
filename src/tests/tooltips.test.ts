import { getInitialGameState } from "../engine/GameState";
import validItemNames from "../json/ValidItemNames.json";
import validSkillNames from "../json/ValidSkillNames.json";
import { getTooltips } from "../engine/Engine";
import { describe, expect, it } from "vitest";
import { genCardsAndEncounters } from "../lib/Data";
import { Tier } from "../types/shared";
import fs from "fs";
import { CARDS_VERSION } from "@/lib/constants";
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

if (false) {
  const tests = [...validItemNames, ...validSkillNames]
    .map((cardName) => {
      const card = Cards["0.1.9"].find(
        (card) => card.Localization.Title.Text === cardName,
      );
      if (!card) {
        throw new Error(`Card "${cardName}" not found`);
      }
      const cardToGenerate = removeSpecificKeys({
        Abilities: card.Abilities,
        Auras: card.Auras,
        Tiers: card.Tiers,
        Localization: card.Localization,
      });
      try {
        const tooltips = getTiers(card.StartingTier).map((tier) => {
          const extension = validItemNames.includes(cardName)
            ? { cards: [{ name: cardName, tier }] }
            : { skills: [{ name: cardName, tier }] };
          const gameState = getInitialGameState(Cards, Encounters, [
            { type: "player", health: 1000, ...extension },
            { type: "player", health: 1000 },
          ]);
          return getTooltips(gameState, 0, 0);
        });
        return { input: tooltips, output: cardToGenerate };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  fs.writeFileSync(
    "problem.json",
    JSON.stringify(
      {
        description:
          "You are building a program that takes tooltips of a card game and your goal is to generate the internal json representation of the card. You are going to be fed tooltips and cards one by one and your goal is to write a generalizable parser such that when seeing tooltips from cards it doesn't know, it will be able to generate the internal representation.",
        tests,
      },
      null,
      2,
    ),
  );

  function removeSpecificKeys(value: any): any {
    // Handle null/undefined
    if (value == null) {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => removeSpecificKeys(item));
    }

    // Handle objects
    if (typeof value === "object") {
      const newObj: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (
          ![
            "InternalName",
            "InternalDescription",
            "MigrationData",
            "VFXConfig",
            "TranslationKey",
            "CooldownMax",
            "BuyPrice",
            "SellPrice",
            "FlavorText",
            "Key",
            "Title",
          ].includes(key)
        ) {
          newObj[key] = removeSpecificKeys(val);
        }
      }
      return newObj;
    }

    // Return primitive values as-is
    return value;
  }
}
