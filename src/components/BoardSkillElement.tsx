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
        style={{
          margin: 5,
          position: "relative",
          height: IMAGE_SIZE,
          width: IMAGE_SIZE,
        }}
      >
        {/* Image container */}
        <div
          style={{
            position: "absolute",
            top: IMAGE_SIZE * borderSize,
            left: IMAGE_SIZE * borderSize,
            right: IMAGE_SIZE * borderSize,
            bottom: IMAGE_SIZE * borderSize,
          }}
        >
          <img
            src={imgUrl}
            style={{
              borderRadius: "100%",
            }}
            height="100%"
            width="100%"
          />
        </div>
        {/* Frame image */}
        <img
          src={frameUrl}
          style={{ position: "absolute", top: 0, left: 0 }}
          width="100%"
          height="100%"
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
