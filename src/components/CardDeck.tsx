import { BoardCard } from "@/engine/Engine.ts";
import { BoardCardElement } from "@/components/BoardCardElement";
import { GameState } from "@/engine/Engine.ts";

interface CardDeckProps {
  gameState: GameState;
  playerId: number;
}

export const CardDeck: React.FC<CardDeckProps> = ({ gameState, playerId }) => {
  const player = gameState.players[playerId];

  if (!player) return null;

  return (
    <div className="flex w-full items-center justify-center gap-2">
      {player.board
        .filter((x): x is BoardCard => x.card.$type === "TCardItem")
        .map((card, i) => (
          <BoardCardElement
            boardCard={card}
            gameState={gameState}
            key={i}
            playerID={playerId}
            boardCardID={i}
          />
        ))}
    </div>
  );
};
