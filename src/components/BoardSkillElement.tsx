"use client";
import type { BoardSkill, GameState } from "@/engine/Engine";
import React from "react";
import { Tooltip } from "../../app/old/-App";
import FramedCardOrSkill from "./FramedCardOrSkill";

export function BoardSkillElement({
  boardSkill,
  gameState,
  playerID,
  boardCardID,
}: {
  boardSkill: BoardSkill;
  gameState: GameState;
  playerID: number;
  boardCardID: number;
}) {
  const card = boardSkill.card;
  const IMAGE_SIZE = 60;

  return (
    <div
      className="tooltipContainer"
      onClick={() => {
        console.log(boardSkill);
      }}
    >
      {/* Skill container */}
      <div
        className="relative m-[5px]"
        style={{
          height: IMAGE_SIZE,
          width: IMAGE_SIZE,
        }}
      >
        <FramedCardOrSkill
          card={card}
          skillSize={IMAGE_SIZE}
          tier={boardSkill.tier}
        />
      </div>
      <Tooltip
        boardCard={boardSkill}
        gameState={gameState}
        playerID={playerID}
        boardCardID={boardCardID}
      />
    </div>
  );
}
