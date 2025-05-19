import { getTooltips } from "@/engine/engine2/getTooltips";
import type { GameState as Engine2GameState } from "@/engine/engine2/engine2";
import { getInitialGameState } from "@/engine/GameState";
import { CARDS_VERSION } from "@/lib/constants";
import { AttributeType, Card } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { Tier } from "@/types/shared";
import { getCardAttribute } from "@/engine/engine2/getAttribute";

export default function CardTooltip({
  card,
  gameState,
  playerID = 0,
  boardCardID = 0,
}: {
  card: Card | null;
  gameState?: Engine2GameState;
  playerID?: number;
  boardCardID?: number;
}) {
  if (!card) return null;

  // If no gameState is provided, create an initial one
  const effectiveGameState =
    gameState ??
    getInitialGameState(
      {
        [CARDS_VERSION]: [card],
      },
      {} as EncounterDays,
      [
        {
          type: "player",
          health: 1000,
          cards: card
            ? [
                {
                  cardId: card.Id,
                  tier: card?.StartingTier ?? Tier.Bronze,
                },
              ]
            : [],
        },
        { type: "player", health: 1000 },
      ],
    );

  const Title = card.Localization.Title.Text;

  const Enchantment =
    gameState?.players[playerID].board[boardCardID].Enchantment;

  const CooldownMax = getCardAttribute(
    effectiveGameState,
    {
      playerIdx: playerID,
      cardIdx: boardCardID,
      location: "board",
    },
    AttributeType.CooldownMax,
  );

  const visibleTags = gameState
    ? getCardAttribute(
        effectiveGameState,
        {
          playerIdx: playerID,
          cardIdx: boardCardID,
          location: "board",
        },
        "tags",
      )
    : card.Tags;

  return (
    <div className="bg-card border-border rounded border p-4">
      <div className="flex flex-col gap-1">
        <div className="font-bold">
          {Enchantment ? `${Enchantment} ${Title}` : Title}
        </div>
        {CooldownMax !== undefined && (
          <div className="text-muted-foreground text-sm">
            <p>Cooldown: {CooldownMax / 1000}s</p>
          </div>
        )}
        {getTooltips(effectiveGameState, {
          playerIdx: playerID,
          cardIdx: boardCardID,
          location: "board",
        }).map((tooltip, index) => (
          <div key={"tooltip" + index} className="">
            {tooltip}
          </div>
        ))}
        <div className="text-muted-foreground text-sm">
          <p>{visibleTags.join(", ")}</p>
          <p className="italic">{card.HiddenTags.join(", ")}</p>
          <p className="italic">{card.Heroes.join(", ")}</p>
        </div>
      </div>
    </div>
  );
}
