import { createFileRoute } from "@tanstack/react-router";
import App from "./-App.tsx";
import { genCardsAndEncounters } from "../lib/Data.ts";

const { Cards, Encounters } = await genCardsAndEncounters();

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <App Cards={Cards} Encounters={Encounters} />;
}
