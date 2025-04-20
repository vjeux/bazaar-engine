import { getTooltips } from "@/engine/Engine";
import { getInitialGameState } from "@/engine/GameState";
import { Card } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { Tier } from "@/types/shared";

export default function TooltipWithoutGameState({
  card,
}: {
  card: Card | null;
}) {
  if (!card) return null;

  const gameState = getInitialGameState(
    {
      "0.1.9": [card],
    },
    {} as EncounterDays,
    [
      {
        type: "player",
        health: 1000,
        cards: card
          ? [
              {
                name: card.Localization.Title.Text,
                tier: card?.StartingTier ?? Tier.Bronze,
              },
            ]
          : [],
      },
      { type: "player", health: 1000 },
    ],
  );

  const Title = card.Localization.Title.Text;

  return (
    <div className="bg-card border-border rounded border p-4">
      <div className="flex flex-col gap-1">
        <div className="font-bold">{Title}</div>
        {getTooltips(gameState, 0, 0).map((tooltip, index) => (
          <div key={"tooltip" + index} className="">
            {tooltip}
          </div>
        ))}
        <div className="text-muted-foreground text-sm">
          {[...card.Heroes, ...card.Tags, ...card.HiddenTags].join(", ")}
        </div>
      </div>
    </div>
  );
}
