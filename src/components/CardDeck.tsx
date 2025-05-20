"use client";
import { BoardCard } from "@/engine/engine2/engine2";
import { BoardCardElement } from "@/components/BoardCardElement";
import { useMemo } from "react";
import { useSimulatorStore } from "@/lib/simulatorStore";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import type { GameState as Engine2GameState } from "@/engine/engine2/engine2";
import { ENEMY_PLAYER_IDX } from "@/lib/constants";

interface CardDeckProps {
  gameState: Engine2GameState;
  playerId: number;
}

export default function CardDeck({ gameState, playerId }: CardDeckProps) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const player = gameState.players[playerId];
  const sensors = useSensors(useSensor(PointerSensor));

  const playerBoardCards = useMemo(
    () =>
      player.board.filter((x): x is BoardCard => x.card.$type === "TCardItem"),
    [player.board],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <div className="flex w-full items-center justify-center gap-2">
        <SortableContext
          items={playerBoardCards.map((x) => x.uuid)}
          strategy={horizontalListSortingStrategy}
        >
          {playerBoardCards.map((card, index) => (
            <BoardCardElement
              key={card.uuid}
              boardCard={card}
              gameState={gameState}
              playerIdx={playerId}
              boardCardIdx={index}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    console.log("handleDragEnd");

    if (active.id !== over?.id) {
      const oldIndex = playerBoardCards.findIndex((x) => x.uuid === active.id);
      const newIndex = playerBoardCards.findIndex((x) => x.uuid === over?.id);
      simulatorStoreActions.moveCard(
        oldIndex,
        newIndex,
        playerId === ENEMY_PLAYER_IDX,
      );
    }
  }
}
