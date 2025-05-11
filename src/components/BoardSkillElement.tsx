"use client";
import type { BoardCard, GameState } from "@/engine/Engine";
import React from "react";
import FramedCardOrSkill from "./FramedCardOrSkill";
import TooltipWithGameState from "./TooltipWithGameState";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";

export function BoardSkillElement({
  boardSkill,
  gameState,
  playerID,
  boardCardID,
}: {
  boardSkill: BoardCard;
  gameState: GameState;
  playerID: number;
  boardCardID: number;
}) {
  const card = boardSkill.card;
  const IMAGE_SIZE = 60;

  return (
    <Tooltip placement="bottom">
      <TooltipTrigger>
        <div
          className="tooltipContainer"
          onClick={() => {
            console.log(boardSkill);
          }}
        >
          <FramedCardOrSkill
            card={card}
            skillSize={IMAGE_SIZE}
            tier={boardSkill.tier}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <TooltipWithGameState
          card={boardSkill.card}
          gameState={gameState}
          playerID={playerID}
          boardCardID={boardCardID}
        />
      </TooltipContent>
    </Tooltip>
  );
}
