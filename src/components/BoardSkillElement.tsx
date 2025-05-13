"use client";
import type { BoardCard, GameState } from "@/engine/Engine";
import React from "react";
import FramedCardOrSkill from "./FramedCardOrSkill";
import CardTooltip from "./CardTooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { useSimulatorStore } from "@/lib/simulatorStore";
import { PLAYER_PLAYER_IDX } from "@/lib/constants";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { CardType } from "@/types/cardTypes";

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
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);

  const card = boardSkill.card;
  const IMAGE_SIZE = 60;

  return (
    <Tooltip placement="bottom">
      <TooltipTrigger>
        <div
          className="tooltipContainer relative"
          onClick={() => {
            if (process.env.NODE_ENV === "development") {
              console.log(boardSkill);
            }
          }}
        >
          <FramedCardOrSkill
            card={card}
            skillSize={IMAGE_SIZE}
            tier={boardSkill.tier}
          />
          {/* Remove button */}
          {playerID == PLAYER_PLAYER_IDX && (
            <div className="tooltip absolute top-0.5 left-0.5 z-50">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 p-0 hover:cursor-pointer"
                onClick={() => {
                  const actualIndex = gameState.players[
                    playerID
                  ].board.findIndex((x) => x.uuid === boardSkill.uuid);
                  const lastCardIndex = gameState.players[
                    playerID
                  ].board.findLastIndex(
                    (x) => x.card.$type === CardType.TCardItem,
                  );
                  const skillIndex = actualIndex - lastCardIndex - 1;
                  simulatorStoreActions.removePlayerSkill(skillIndex);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <CardTooltip
          card={boardSkill.card}
          gameState={gameState}
          playerID={playerID}
          boardCardID={boardCardID}
        />
      </TooltipContent>
    </Tooltip>
  );
}
