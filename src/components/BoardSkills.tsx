"use client";
import type { BoardSkill, GameState } from "@/engine/Engine";
import { BoardSkillElement } from "@/components/BoardSkillElement";

export function BoardSkills({
  gameState,
  playerId,
}: {
  gameState: GameState;
  playerId: number;
}) {
  return (
    <div className="my-2 flex min-h-12 flex-wrap items-center gap-1">
      {gameState.players[playerId].board
        .filter((x): x is BoardSkill => x.card.$type === "TCardSkill")
        .map((boardSkill: BoardSkill, i: React.Key | null | undefined) => (
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
