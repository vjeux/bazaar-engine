"use client";
import type {
  BoardCard,
  GameState as Engine2GameState,
  GameState,
} from "@/engine/engine2/engine2";
import { BoardSkillElement } from "@/components/BoardSkillElement";

interface BoardSkillsProps {
  gameState: GameState | Engine2GameState;
  playerId: number;
}

export function BoardSkills({ gameState, playerId }: BoardSkillsProps) {
  return (
    <div className="my-2 flex min-h-12 flex-wrap items-center gap-1">
      {gameState.players[playerId].board
        .filter((x): x is BoardCard => x.card.$type === "TCardSkill")
        .map((boardSkill: BoardCard, i: React.Key | null | undefined) => (
          <BoardSkillElement
            boardSkill={boardSkill}
            gameState={gameState}
            key={i}
            playerID={playerId}
            boardCardID={gameState.players[playerId].board.indexOf(boardSkill)}
          />
        ))}
    </div>
  );
}
