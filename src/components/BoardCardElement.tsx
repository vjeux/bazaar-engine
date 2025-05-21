"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import FramedCardOrSkill from "./FramedCardOrSkill";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { useSimulatorStore, useEditingCardIndex } from "@/lib/simulatorStore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CARD_HEIGHT, ENEMY_PLAYER_IDX } from "@/lib/constants";
import { AttributeType } from "@/types/cardTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { EnchantmentType, Tier } from "@/types/shared";
import CardTooltip from "./CardTooltip";
import { Button } from "./ui/button";
import { Bug, Settings, X } from "lucide-react";
import { BoardCard, CardLocationID, GameState } from "@/engine/engine2/engine2";
import { getCardAttributes } from "@/engine/engine2/getCardAttributes";

// Enchantment color mappings
const ENCHANTMENT_COLORS: Record<EnchantmentType, string> = {
  [EnchantmentType.Obsidian]: "bg-purple-900 text-purple-100",
  [EnchantmentType.Shielded]: "bg-yellow-500 text-yellow-100",
  [EnchantmentType.Fiery]:
    "bg-gradient-to-r from-red-600 to-orange-500 text-orange-100",
  [EnchantmentType.Deadly]: "bg-red-700 text-red-100",
  [EnchantmentType.Heavy]: "bg-amber-700 text-amber-100",
  [EnchantmentType.Icy]: "bg-blue-300 text-blue-900",
  [EnchantmentType.Radiant]: "bg-yellow-300 text-yellow-900",
  [EnchantmentType.Restorative]: "bg-emerald-400 text-emerald-900",
  [EnchantmentType.Toxic]: "bg-green-600 text-green-100",
  [EnchantmentType.Turbo]:
    "bg-gradient-to-r from-blue-500 to-cyan-400 text-cyan-100",
  [EnchantmentType.Golden]: "bg-amber-400 text-amber-900",
  [EnchantmentType.Shiny]:
    "bg-gradient-to-r from-pink-400 to-indigo-400 text-white",
};

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
  const editingCardIndex = useEditingCardIndex();

  const [cardConfig, setCardConfig] = useState<
    Partial<{
      attributeOverrides: Partial<Record<AttributeType, number>>;
      enchantment: EnchantmentType;
      tier: Tier;
    }>
  >({});

  // Initialize card config with all attributes defined in the card
  React.useEffect(() => {
    Object.values(AttributeType)
      .filter((attr) => {
        return boardCard[attr] != undefined;
      })
      .forEach((attr) => {
        setCardConfig((prev) => ({
          ...prev,
          attributeOverrides: {
            ...prev.attributeOverrides,
            [attr]: boardCard[attr],
          },
        }));
      });
    setCardConfig((prev) => ({
      ...prev,
      enchantment: boardCard.Enchantment ?? undefined,
      tier: boardCard.tier ?? undefined,
    }));
  }, [boardCard]);

  const {
    attributes: dragAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isSorting,
  } = useSortable({
    id: boardCard.uuid,
  });

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

  // Get all card attributes at once instead of individual calls
  const cardLocation: CardLocationID = {
    playerIdx,
    cardIdx: boardCardIdx,
    location: "board",
  };

  const cardAttributes = getCardAttributes(gameState, cardLocation);

  // Destructure the attributes we need for rendering
  const {
    DamageAmount,
    HealAmount,
    BurnApplyAmount,
    PoisonApplyAmount,
    ShieldApplyAmount,
    Freeze,
    Slow,
    Haste,
    CritChance,
    SellPrice,
    Multicast,
    AmmoMax,
    Ammo,
    CooldownMax,
    Lifesteal,
  } = cardAttributes;

  return (
    <div>
      <Tooltip placement="bottom" open={isSorting ? false : undefined}>
        <TooltipTrigger>
          <div className={cn("tooltipContainer relative hover:cursor-grab")}>
            {/* Settings button */}
            {!isSorting && (
              <Dialog
                open={editingCardIndex === boardCardIdx}
                onOpenChange={(value) => {
                  if (!value) {
                    // Save changes when closing the dialog
                    const overrides = {} as Record<AttributeType, number>;
                    for (const attr of Object.keys(
                      cardConfig.attributeOverrides ?? {},
                    )) {
                      if (
                        typeof cardConfig.attributeOverrides?.[
                          attr as keyof typeof cardConfig.attributeOverrides
                        ] === "number"
                      ) {
                        overrides[attr as AttributeType] = cardConfig
                          .attributeOverrides?.[
                          attr as keyof typeof cardConfig.attributeOverrides
                        ] as number;
                      }
                    }
                    simulatorStoreActions.setCardAttributeOverrides(
                      boardCardIdx,
                      overrides,
                      playerIdx === ENEMY_PLAYER_IDX,
                    );
                  }
                  simulatorStoreActions.setEditingCardIndex(
                    value ? boardCardIdx : null,
                  );
                }}
                defaultOpen={editingCardIndex === boardCardIdx}
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
                      Edit {playerIdx === ENEMY_PLAYER_IDX ? "Enemy" : "Player"}{" "}
                      Card
                    </DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    NOTE: <br />
                    These are the BASE attributes, i.e. not taking into account
                    the buffs from other cards.
                  </DialogDescription>
                  <div className="flex flex-col gap-2">
                    {/* Enchantment */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="enchantment">Enchantment</Label>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value: EnchantmentType) => {
                            simulatorStoreActions.setCardEnchantment(
                              boardCardIdx,
                              value,
                              playerIdx === ENEMY_PLAYER_IDX,
                            );
                            simulatorStoreActions.setEditingCardIndex(
                              boardCardIdx,
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                boardCard.Enchantment ?? "Select Enchantment"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(card.Enchantments ?? [])
                              .toSorted()
                              .map((enchantment) => (
                                <SelectItem
                                  key={enchantment}
                                  value={enchantment}
                                >
                                  {enchantment}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="flex items-center text-xs text-gray-500">
                          The attributes will get reset when changing
                          enchantment.
                        </p>
                      </div>
                      {/* Tier Select */}
                      <Label htmlFor="tier">Tier</Label>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value: Tier) => {
                            simulatorStoreActions.setCardTier(
                              boardCardIdx,
                              value,
                              playerIdx === ENEMY_PLAYER_IDX,
                            );
                            simulatorStoreActions.setEditingCardIndex(
                              boardCardIdx,
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={boardCard.tier} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(card.Tiers ?? {}).map((tier) => (
                              <SelectItem key={tier} value={tier}>
                                {tier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="flex items-center text-xs text-gray-500">
                          The attributes will get reset when changing tier.
                        </p>
                      </div>
                    </div>
                    {Object.keys(cardConfig.attributeOverrides ?? [])
                      .filter((attr) => attr != "Enchantment")
                      .map((attr) => {
                        return (
                          <div key={attr} className="flex flex-col gap-2">
                            <Label htmlFor={attr}>{attr}</Label>
                            <Input
                              key={attr}
                              type={
                                typeof cardConfig.attributeOverrides?.[
                                  attr as keyof typeof cardConfig.attributeOverrides
                                ] === "number"
                                  ? "number"
                                  : typeof cardConfig.attributeOverrides?.[
                                        attr as keyof typeof cardConfig.attributeOverrides
                                      ] === "boolean"
                                    ? "checkbox"
                                    : "text"
                              }
                              value={
                                cardConfig.attributeOverrides?.[
                                  attr as keyof typeof cardConfig.attributeOverrides
                                ]
                              }
                              onChange={(e) => {
                                setCardConfig((prev) => ({
                                  ...prev,
                                  attributeOverrides: {
                                    ...prev.attributeOverrides,
                                    [attr]:
                                      typeof prev.attributeOverrides?.[
                                        attr as keyof typeof prev.attributeOverrides
                                      ] === "number"
                                        ? Number(e.target.value)
                                        : typeof prev.attributeOverrides?.[
                                              attr as keyof typeof prev.attributeOverrides
                                            ] === "boolean"
                                          ? e.target.checked
                                          : e.target.value,
                                  },
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Remove button */}
            {!isSorting && (
              <div className="tooltip absolute top-0.5 left-0.5 z-50">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 p-0 hover:cursor-pointer"
                  onClick={() =>
                    simulatorStoreActions.removeCard(
                      boardCardIdx,
                      playerIdx === ENEMY_PLAYER_IDX,
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {/* Debug button */}
            {!isSorting && process.env.NODE_ENV === "development" && (
              <div className="tooltip absolute right-0.5 bottom-0.5 z-50">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 p-0 hover:cursor-pointer"
                  onClick={() => {
                    console.log("boardCard", boardCard);
                    console.log(
                      "getCardAttributes",
                      getCardAttributes(gameState, {
                        playerIdx,
                        cardIdx: boardCardIdx,
                        location: "board",
                      }),
                    );
                  }}
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </div>
            )}
            {/* Card container */}
            <div
              ref={setNodeRef}
              style={style}
              {...dragAttributes}
              {...listeners}
            >
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
                {CooldownMax != null && CooldownMax > 0 ? (
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
                        boardCard.tick / CooldownMax > 0.5
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
                  {Freeze != null && Freeze > 0 ? (
                    <div className="bg-opacity-50 m-0.5 rounded-[5px] bg-gray-800 p-[2px_5px]">
                      ❄️ {(Freeze / 1000).toFixed(1)}
                    </div>
                  ) : null}
                  {Slow != null && Slow > 0 ? (
                    <div className="bg-opacity-50 m-0.5 rounded-[5px] bg-gray-800 p-[2px_5px]">
                      🐌 {(Slow / 1000).toFixed(1)}
                    </div>
                  ) : null}
                  {Haste != null && Haste > 0 ? (
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
                  {boardCard.Enchantment && (
                    <div
                      className={cn(
                        "m-[0_2px] rounded-[5px] p-[2px_5px]",
                        boardCard.Enchantment in ENCHANTMENT_COLORS
                          ? ENCHANTMENT_COLORS[boardCard.Enchantment]
                          : "bg-gray-500 text-white",
                      )}
                    >
                      {boardCard.Enchantment}
                    </div>
                  )}
                  {DamageAmount !== undefined && (
                    <div
                      className={cn(
                        "m-[0_2px] rounded-[5px] p-[2px_5px] text-white",
                        Lifesteal && Lifesteal > 0
                          ? "bg-gradient-to-br from-purple-700 to-red-600"
                          : "bg-red-600",
                      )}
                    >
                      {parseFloat(DamageAmount?.toFixed(1))}
                    </div>
                  )}
                  {HealAmount !== undefined && (
                    <div className="m-[0_2px] rounded-[5px] bg-lime-500 p-[2px_5px] text-white">
                      {parseFloat(HealAmount?.toFixed(1))}
                    </div>
                  )}
                  {BurnApplyAmount !== undefined && (
                    <div className="m-[0_2px] rounded-[5px] bg-orange-500 p-[2px_5px] text-white">
                      {parseFloat(BurnApplyAmount?.toFixed(1))}
                    </div>
                  )}
                  {PoisonApplyAmount !== undefined && (
                    <div className="m-[0_2px] rounded-[5px] bg-purple-600 p-[2px_5px] text-white">
                      {parseFloat(PoisonApplyAmount?.toFixed(1))}
                    </div>
                  )}
                  {ShieldApplyAmount !== undefined && (
                    <div className="m-[0_2px] rounded-[5px] bg-yellow-400 p-[2px_5px]">
                      {parseFloat(ShieldApplyAmount?.toFixed(1))}
                    </div>
                  )}
                </div>
                {CritChance != null && CritChance > 0 && (
                  <div className="absolute top-6 left-0 rounded-[5px] bg-red-600 p-[1px_3px] text-[9pt] text-white">
                    🎯 {parseFloat(CritChance?.toFixed(1)) + "%"}
                  </div>
                )}
                {SellPrice !== undefined && (
                  <div className="absolute bottom-1 left-0 rounded-[5px] bg-orange-500 p-[1px_3px] text-[9pt] text-white">
                    💰 {parseFloat(SellPrice?.toFixed(1))}
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
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <CardTooltip
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
