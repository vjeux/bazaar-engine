import App from "./-App.tsx";
import { genCardsAndEncounters } from "@/lib/Data.ts";

const { Cards, Encounters } = await genCardsAndEncounters();

export default function Index() {
  return <App Cards={Cards} Encounters={Encounters} />;
}
