"use client";
import {
  type BoardCard,
  type GameState,
  getCardAttribute,
} from "@/engine/Engine";
import React from "react";
import { cn } from "@/lib/utils";
import FramedCardOrSkill from "./FramedCardOrSkill";
import TooltipWithGameState from "./TooltipWithGameState";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { useSimulatorStore } from "@/lib/simulatorStore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const CARD_HEIGHT = 180;

export function BoardCardElement({
  boardCard,
  gameState,
  playerIdx,
  boardCardIdx,
}: {
  boardCard: BoardCard;
  gameState: GameState;
  playerIdx: number;
  boardCardIdx: number;
}) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: boardCard.uuid, disabled: playerIdx === 0 });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const card = boardCard.card;
  const cardWidth =
    card.Size === "Small"
      ? CARD_HEIGHT / 2
      : card.Size === "Medium"
        ? CARD_HEIGHT
        : CARD_HEIGHT * 1.5;

  const paddingTop = 0.06;
  const paddingLeft = 0.03;
  const paddingBottom = 0.1;
  const paddingRight = 0.04;

  const DamageAmount = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "DamageAmount",
  );
  const HealAmount = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "HealAmount",
  );
  const BurnApplyAmount = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "BurnApplyAmount",
  );
  const PoisonApplyAmount = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "PoisonApplyAmount",
  );
  const ShieldApplyAmount = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "ShieldApplyAmount",
  );
  const Freeze = getCardAttribute(gameState, playerIdx, boardCardIdx, "Freeze");
  const Slow = getCardAttribute(gameState, playerIdx, boardCardIdx, "Slow");
  const Haste = getCardAttribute(gameState, playerIdx, boardCardIdx, "Haste");
  const CritChance = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "CritChance",
  );
  const SellPrice = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "SellPrice",
  );
  const Multicast = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "Multicast",
  );
  const AmmoMax = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "AmmoMax",
  );
  const Ammo = getCardAttribute(gameState, playerIdx, boardCardIdx, "Ammo");
  const CooldownMax = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "CooldownMax",
  );
  const Lifesteal = getCardAttribute(
    gameState,
    playerIdx,
    boardCardIdx,
    "Lifesteal",
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Tooltip placement="bottom">
        <TooltipTrigger>
          <div
            className={cn(
              "tooltipContainer relative",
              playerIdx === 1 && "hover:cursor-grab",
            )}
          >
            {/* Settings button */}
            <div className="tooltip absolute top-0.5 right-0.5 z-10">
              <button type="button">⚙️</button>
            </div>
            {/* Remove button */}
            {playerIdx == 1 && (
              <div className="tooltip absolute top-0.5 left-0.5 z-50">
                <button
                  type="button"
                  className="hover:cursor-pointer"
                  onClick={() =>
                    simulatorStoreActions.removePlayerCard(boardCardIdx)
                  }
                >
                  ❌
                </button>
              </div>
            )}
            {/* Card container */}
            <div
              className={cn(
                "relative m-[5px] mt-[5px]",
                boardCard.isDisabled ? "opacity-10" : "opacity-100",
              )}
              style={{
                height: CARD_HEIGHT,
                width: cardWidth,
              }}
            >
              <FramedCardOrSkill
                card={card}
                cardHeight={CARD_HEIGHT}
                tier={boardCard.tier}
              />
              {/* Cooldown Indicator */}
              {CooldownMax > 0 ? (
                <div
                  className="absolute box-border h-0.5 border-t-2 border-white text-right text-[8pt] text-white"
                  style={{
                    left: CARD_HEIGHT * paddingLeft,
                    right: CARD_HEIGHT * paddingRight,
                    bottom:
                      CARD_HEIGHT * paddingBottom +
                      (boardCard.tick / CooldownMax) *
                        (CARD_HEIGHT -
                          CARD_HEIGHT * (paddingTop + paddingBottom) -
                          2),
                  }}
                >
                  <span
                    className={cn(
                      "absolute right-0.5 inline-block",
                      boardCard.tick / boardCard.CooldownMax > 0.5
                        ? "top-0.5"
                        : "bottom-[3px]",
                    )}
                  >
                    {(boardCard.tick / 1000).toFixed(1)} /{" "}
                    {(CooldownMax / 1000).toFixed(1)}
                  </span>
                </div>
              ) : null}
              {/* Status effects container */}
              <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col whitespace-pre-wrap text-white">
                {Freeze > 0 ? (
                  <div className="bg-opacity-50 m-0.5 rounded-[5px] bg-gray-800 p-[2px_5px]">
                    ❄️ {(Freeze / 1000).toFixed(1)}
                  </div>
                ) : null}
                {Slow > 0 ? (
                  <div className="bg-opacity-50 m-0.5 rounded-[5px] bg-gray-800 p-[2px_5px]">
                    🐌 {(Slow / 1000).toFixed(1)}
                  </div>
                ) : null}
                {Haste > 0 ? (
                  <div className="bg-opacity-50 m-0.5 rounded-[5px] bg-gray-800 p-[2px_5px]">
                    ⏱️ {(Haste / 1000).toFixed(1)}
                  </div>
                ) : null}
              </div>
              {/* Amount container */}
              <div
                className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2"
                style={{
                  top: (CARD_HEIGHT * paddingTop) / 2,
                }}
              >
                {DamageAmount !== undefined && (
                  <div
                    className={cn(
                      "m-[0_2px] rounded-[5px] p-[2px_5px] text-white",
                      Lifesteal > 0
                        ? "bg-gradient-to-br from-purple-700 to-red-600"
                        : "bg-red-600",
                    )}
                  >
                    {DamageAmount}
                  </div>
                )}
                {HealAmount !== undefined && (
                  <div className="m-[0_2px] rounded-[5px] bg-lime-500 p-[2px_5px] text-white">
                    {HealAmount}
                  </div>
                )}
                {BurnApplyAmount !== undefined && (
                  <div className="m-[0_2px] rounded-[5px] bg-orange-500 p-[2px_5px] text-white">
                    {BurnApplyAmount}
                  </div>
                )}
                {PoisonApplyAmount !== undefined && (
                  <div className="m-[0_2px] rounded-[5px] bg-purple-600 p-[2px_5px] text-white">
                    {PoisonApplyAmount}
                  </div>
                )}
                {ShieldApplyAmount !== undefined && (
                  <div className="m-[0_2px] rounded-[5px] bg-yellow-400 p-[2px_5px]">
                    {ShieldApplyAmount}
                  </div>
                )}
              </div>
              {CritChance > 0 && (
                <div className="absolute top-6 left-0 rounded-[5px] bg-red-600 p-[1px_3px] text-[9pt] text-white">
                  🎯 {CritChance + "%"}
                </div>
              )}
              {SellPrice !== undefined && (
                <div className="absolute bottom-1 left-0 rounded-[5px] bg-orange-500 p-[1px_3px] text-[9pt] text-white">
                  💰 {SellPrice}
                </div>
              )}
              {Multicast !== undefined && Multicast > 1 && (
                <div className="bg-opacity-40 absolute top-5 left-1/2 -translate-x-1/2 rounded-[5px] bg-black p-[1px_3px] text-[9pt] text-white">
                  x{Multicast}
                </div>
              )}
              {AmmoMax !== undefined && (
                <div className="absolute bottom-[22px] left-1/2 flex -translate-x-1/2 rounded-[5px] bg-gray-500 p-[2px_5px]">
                  {AmmoMax > 5 ? (
                    <div className="text-[8pt] text-orange-400">
                      {Ammo === undefined ? AmmoMax : Ammo}/{AmmoMax}&nbsp;
                      <div className="m-[1px] inline-block h-1 w-1 rounded-full border border-orange-400 bg-orange-400" />
                    </div>
                  ) : (
                    [...new Array(AmmoMax)].map((_, i) => {
                      return (
                        // Ammo indicator
                        <div
                          key={"ammo" + i}
                          className={cn(
                            "m-[1px] h-1 w-1 rounded-full border border-orange-400",
                            (Ammo === undefined ? AmmoMax : Ammo) > i
                              ? "bg-orange-400"
                              : "bg-transparent",
                          )}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <TooltipWithGameState
            card={boardCard.card}
            gameState={gameState}
            playerID={playerIdx}
            boardCardID={boardCardIdx}
          />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
