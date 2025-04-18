"use client";
import type { BoardSkill, GameState } from "@/engine/Engine";
import React from "react";
import { Tooltip } from "../../app/old/-App";

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
  const tier = boardSkill.tier;

  const IMAGE_SIZE = 60;
  const borderSize = 0.1;

  const localeText = card.Localization.Title.Text;
  const imgUrl = `https://www.howbazaar.gg/images/skills/${localeText.replace(
    /[ '\-&]/g,
    "",
  )}.avif`;

  const frameUrl = `https://www.bazaarplanner.com/images/fromBT/skill_tier_${tier.toLowerCase()}.png`;

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
        {/* Image container */}
        <div
          className="absolute rounded-full"
          style={{
            top: IMAGE_SIZE * borderSize,
            left: IMAGE_SIZE * borderSize,
            right: IMAGE_SIZE * borderSize,
            bottom: IMAGE_SIZE * borderSize,
          }}
        >
          <img src={imgUrl} className="h-full w-full rounded-full" />
        </div>
        {/* Frame image */}
        <img src={frameUrl} className="absolute top-0 left-0 h-full w-full" />
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
