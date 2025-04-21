import pako from "pako";
import type { Cards } from "../types/cardTypes.ts";
import type { EncounterDays } from "../types/encounterTypes.ts";
import { CARDS_VERSION } from "./constants.ts";

function genDataFromLocalStorage(
  localStorageKey: string,
  importCall: Promise<any>,
) {
  return new Promise((success) => {
    if (typeof localStorage === "undefined") {
      importCall.then((module) => {
        success(module.default);
      });
    } else {
      const storage = localStorage.getItem(localStorageKey);
      if (storage == null) {
        importCall.then((module) => {
          const data = module.default;
          const compressed = JSON.stringify([
            ...pako.deflate(JSON.stringify(data)),
          ]);
          try {
            localStorage.setItem(localStorageKey, compressed);
          } catch (_e) {
            // Ignore quota errors
          }
          success(data);
        });
      } else {
        const compressed = new Uint8Array(JSON.parse(storage));
        const data = JSON.parse(pako.inflate(compressed, { to: "string" }));
        success(data);
      }
    }
  });
}

export async function genCardsAndEncounters(): Promise<{
  Cards: Cards;
  Encounters: EncounterDays;
}> {
  const [Cards, Encounters] = await Promise.all([
    // https://cdn.playthebazaar.com/bazaardesigndataprod/cards.json
    genDataFromLocalStorage("Cards", import("../json/cards.json")),
    // https://www.howbazaar.gg/api/monsterEncounterDays
    genDataFromLocalStorage(
      "Encounters",
      import("../json/monsterEncounterDays.json"),
    ),
  ]);
  return { Cards: Cards as Cards, Encounters: Encounters as EncounterDays };
}

export function getCardId(cardName: string, Cards: Cards): string {
  const card = Cards[CARDS_VERSION].find(
    (card) => card.Localization.Title.Text === cardName,
  );
  if (!card) {
    throw new Error(`Card "${cardName}" not found`);
  }
  return card.Id;
}
