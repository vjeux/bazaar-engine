import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { genCardsAndEncounters } from "./Data";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}
const root = createRoot(rootElement);

const { Cards, Encounters } = await genCardsAndEncounters();

root.render(
  <StrictMode>
    <App Cards={Cards} Encounters={Encounters} />
  </StrictMode>
);
