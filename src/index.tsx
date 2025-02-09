import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import React from "react";
import pako from "pako";
import { V2Cards } from "./types/cardTypes.ts";
import { EncounterDays } from "./types/encounterTypes.ts";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}
const root = createRoot(rootElement);

function genDataFromLocalStorage(
  localStorageKey: string,
  importCall: Promise<any>
) {
  return new Promise((success) => {
    const storage = localStorage.getItem(localStorageKey);
    if (storage == null) {
      importCall.then((data) => {
        const compressed = JSON.stringify([
          ...pako.deflate(JSON.stringify(data))
        ]);
        localStorage.setItem(localStorageKey, compressed);
        success(data);
      });
    } else {
      const compressed = new Uint8Array(JSON.parse(storage));
      const data = JSON.parse(pako.inflate(compressed, { to: "string" }));
      success(data);
    }
  });
}
async function genCardsAndEncounters(): Promise<{
  Cards: V2Cards;
  Encounters: EncounterDays;
}> {
  const [Cards, Encounters] = await Promise.all([
    genDataFromLocalStorage("Cards", import("./json/v2_Cards.json")),
    genDataFromLocalStorage("Encounters", import("./json/encounterDays.json"))
  ]);
  return { Cards: Cards as V2Cards, Encounters: Encounters as EncounterDays };
}
const { Cards, Encounters } = await genCardsAndEncounters();

root.render(
  <StrictMode>
    <App Cards={Cards} Encounters={Encounters} />
  </StrictMode>
);
