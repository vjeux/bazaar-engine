import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import pako from "pako";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

function genDataFromLocalStorage(localStorageKey, importCall) {
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
      const compressed = new Uint8Array(
        JSON.parse(localStorage.getItem(localStorageKey))
      );
      const data = JSON.parse(pako.inflate(compressed, { to: "string" }));
      success(data);
    }
  });
}

async function genCardsAndEncounters() {
  const [Cards, Encounters] = await Promise.all([
    genDataFromLocalStorage("Cards", import("./json/v2_Cards.json")),
    genDataFromLocalStorage("Encounters", import("./json/encounterDays.json"))
  ]);

  return { Cards, Encounters };
}

const { Cards, Encounters } = await genCardsAndEncounters();
root.render(
  <StrictMode>
    <App Cards={Cards} Encounters={Encounters} />
  </StrictMode>
);
