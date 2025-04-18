import { BoardCard, getTooltips } from "@/engine/Engine";
import { getInitialGameState } from "@/engine/GameState";
import { Card, Cards } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { Tier } from "@/types/shared";

export default function TooltipWithoutGameState({
  Cards,
  card,
  tier,
}: {
  card: Card | null;
  Cards: Cards;
  tier: Tier;
}) {
  if (!card) return null;

  const gameState = getInitialGameState(Cards, {} as EncounterDays, [
    {
      type: "player",
      health: 1000,
      cards: card
        ? [
            {
              name: card.Localization.Title.Text,
              tier,
            },
          ]
        : [],
    },
    { type: "player", health: 1000 },
  ]);

  const Title = card.Localization.Title.Text;

  return (
    <div className="flex flex-col gap-1">
      <div className="font-bold">{Title}</div>

      {getTooltips(gameState, 0, 0).map((tooltip, index) => (
        <div key={"tooltip" + index} className="text-sm">
          {tooltip}
        </div>
      ))}
      <div>{[...card.Heroes, ...card.Tags, ...card.HiddenTags].join(", ")}</div>
    </div>
  );
}
