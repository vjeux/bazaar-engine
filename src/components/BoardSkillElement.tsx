"use client";
import type { BoardCard } from "@/engine/Engine";
import type { GameState as Engine2GameState } from "@/engine/engine2/engine2";
import React from "react";
import FramedCardOrSkill from "./FramedCardOrSkill";
import CardTooltip from "./CardTooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import {
  useSimulatorStore,
  useEditingCardLocation,
} from "@/lib/simulatorStore";
import { PLAYER_PLAYER_IDX, ENEMY_PLAYER_IDX } from "@/lib/constants";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { CardType } from "@/types/cardTypes";
import { Tier } from "@/types/shared";
import { Settings } from "lucide-react";
import { CardLocationID } from "@/engine/engine2/engine2";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function BoardSkillElement({
  boardSkill,
  gameState,
  playerID,
  boardCardID,
}: {
  boardSkill: BoardCard;
  gameState: Engine2GameState;
  playerID: number;
  boardCardID: number;
}) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const editingCardLocation = useEditingCardLocation();

  const card = boardSkill.card;
  const IMAGE_SIZE = 60;

  const cardLocation: CardLocationID = {
    playerIdx: playerID,
    cardIdx: boardCardID,
    location: "board",
  };

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
          {/* Settings button */}
          <Dialog
            open={
              editingCardLocation?.location === "board" &&
              editingCardLocation?.playerIdx === playerID &&
              editingCardLocation?.cardIdx === boardCardID
            }
            onOpenChange={(value) => {
              simulatorStoreActions.setEditingCardLocation(
                value ? cardLocation : null,
              );
            }}
            defaultOpen={
              editingCardLocation?.location === "board" &&
              editingCardLocation?.playerIdx === playerID &&
              editingCardLocation?.cardIdx === boardCardID
            }
          >
            <DialogTrigger asChild>
              <div className="tooltip absolute top-0.5 right-0.5 z-10">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 p-0 hover:cursor-pointer"
                  onClick={() => {
                    simulatorStoreActions.setAutoScroll(false);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Edit {playerID === ENEMY_PLAYER_IDX ? "Enemy" : "Player"}{" "}
                  Skill
                </DialogTitle>
              </DialogHeader>
              <DialogDescription>Edit the tier of the skill.</DialogDescription>
              <div className="flex flex-col gap-2">
                {/* Tier Select */}
                <Label htmlFor="tier">Tier</Label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value: Tier) => {
                      const actualIndex = gameState.players[
                        playerID
                      ].board.findIndex((x) => x.uuid === boardSkill.uuid);
                      const lastCardIndex = gameState.players[
                        playerID
                      ].board.findLastIndex(
                        (x) => x.card.$type === CardType.TCardItem,
                      );
                      const skillIndex = actualIndex - lastCardIndex - 1;

                      simulatorStoreActions.setSkillTier(
                        skillIndex,
                        value,
                        playerID === ENEMY_PLAYER_IDX,
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={boardSkill.tier} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(card.Tiers ?? {}).map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* Remove button */}
          {(playerID === PLAYER_PLAYER_IDX ||
            playerID === ENEMY_PLAYER_IDX) && (
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

                  simulatorStoreActions.removeSkill(
                    skillIndex,
                    playerID === ENEMY_PLAYER_IDX,
                  );
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
