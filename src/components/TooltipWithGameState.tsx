import { getTooltips } from "@/engine/Engine";
import { GameState } from "@/engine/GameState";
import { Card } from "@/types/cardTypes";

export default function TooltipWithGameState({
  card,
  gameState,
  playerID = 0,
  boardCardID = 0,
}: {
  card: Card | null;
  gameState: GameState;
  playerID?: number;
  boardCardID?: number;
}) {
  if (!card) return null;

  const Title = card.Localization.Title.Text;

  return (
    <div className="bg-card border-border rounded border p-4">
      <div className="flex flex-col gap-1">
        <div className="font-bold">{Title}</div>
        {getTooltips(gameState, playerID, boardCardID).map((tooltip, index) => (
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
