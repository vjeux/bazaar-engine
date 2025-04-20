"use client";
import { memo, useEffect } from "react";
import { genCardsAndEncounters } from "@/lib/Data.ts";
import { getFlattenedEncounters } from "@/engine/GameState.ts";
import { TICK_RATE } from "@/engine/Engine.ts";
import { SearchableCardSkillList } from "@/components/SearchableCardSkillList";
import { ComboBox } from "@/components/ui/combobox.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { HealthBar } from "@/components/HealthBar.tsx";
import { Slider } from "@/components/ui/slider";
import { BoardSkills } from "@/components/BoardSkills";
import { CardDeck } from "@/components/CardDeck";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoldIncomeDisplay } from "@/components/GoldIncomeDisplay";
import { useSimulatorStore } from "@/lib/simulatorStore";

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

const encounters = getFlattenedEncounters(EncounterData);

export default function DragNDrop() {
  const steps = useSimulatorStore((state) => state.steps);
  const autoScroll = useSimulatorStore((state) => state.autoScroll);
  const autoReset = useSimulatorStore((state) => state.autoReset);
  const battleSpeed = useSimulatorStore((state) => state.battleSpeed);
  const stepCount = useSimulatorStore((state) => state.stepCount);
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);

  // If you live reload with a step higher than the length, it would throw.
  const boundedStepCount = Math.min(steps.length - 1, stepCount);
  const currentGameState = steps[boundedStepCount];

  useEffect(() => {
    if (!autoScroll) return;

    const interval = setInterval(() => {
      simulatorStoreActions.setStepCount(
        stepCount >= steps.length - 1
          ? autoReset
            ? 0
            : stepCount
          : stepCount + 1,
      );
    }, 100 / battleSpeed);

    return () => clearInterval(interval);
  }, [
    autoScroll,
    autoReset,
    steps.length,
    battleSpeed,
    simulatorStoreActions,
    stepCount,
  ]);

  return (
    <div className="bg-background text-foreground flex h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] w-full flex-row gap-4 p-4">
      {/* Main Game Area */}
      <div className="flex grow flex-col gap-2">
        {/* Enemy Selection */}
        <EncounterSelector />

        {/* Enemy Skills and Gold/Income */}
        <div className="flex justify-between">
          <BoardSkills gameState={currentGameState} playerId={0} />
          <GoldIncomeDisplay gameState={currentGameState} playerId={0} />
        </div>

        {/* Enemy Health Bar*/}
        <HealthBar gameState={currentGameState} playerId={0} />

        {/* Cards Area */}
        <div className="bg-card border-border grid grid-rows-[190px_190px] items-center justify-center gap-2 rounded border p-4">
          <CardDeck gameState={currentGameState} playerId={0} />
          <CardDeck gameState={currentGameState} playerId={1} />
        </div>

        {/* Player Health Bar*/}
        <HealthBar gameState={currentGameState} playerId={1} />

        {/* Player Skills and Gold/Income */}
        <div className="flex justify-between">
          <BoardSkills gameState={currentGameState} playerId={1} />
          <GoldIncomeDisplay gameState={currentGameState} playerId={1} />
        </div>

        {/* Time Slider */}
        <div className="mt-2 flex items-center gap-2">
          <BattleSpeedSelector />
          <Checkbox
            checked={autoScroll}
            onClick={() => simulatorStoreActions.setAutoScroll(!autoScroll)}
            id="autoAdvance"
          />

          <label htmlFor="autoAdvance" className="text-sm text-nowrap">
            Auto Advance
          </label>
          <Checkbox
            checked={autoReset}
            onClick={() => simulatorStoreActions.setAutoReset(!autoReset)}
            id="autoRestart"
          />
          <label htmlFor="autoRestart" className="text-sm text-nowrap">
            Auto Restart
          </label>
          <Slider
            defaultValue={[0]}
            min={0}
            max={steps.length - 1}
            value={[boundedStepCount]}
            onValueChange={([value]) => {
              simulatorStoreActions.setStepCount(value);
            }}
          />

          <span className="w-28 text-sm text-nowrap">
            Time: {stepCountToSeconds(boundedStepCount).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Right Sidebar - Card and skill search */}
      <SearchableCardSkillList Cards={CardsData} />
    </div>
  );
}

const BattleSpeedSelector = memo(function BattleSpeedSelector() {
  const handleBattleSpeedChange = useSimulatorStore(
    (state) => state.actions.setBattleSpeed,
  );
  return (
    <Select onValueChange={(val) => handleBattleSpeedChange(parseInt(val))}>
      <SelectTrigger>
        <SelectValue placeholder="Battle Speed" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1×</SelectItem>
        <SelectItem value="2">2×</SelectItem>
        <SelectItem value="3">3×</SelectItem>
        <SelectItem value="5">5×</SelectItem>
        <SelectItem value="10">10×</SelectItem>
      </SelectContent>
    </Select>
  );
});

const EncounterSelector = memo(function EncounterSelector() {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  return (
    <ComboBox
      items={encounters.map((encounter) => ({
        value: encounter.card.cardId,
        label: encounter.name,
      }))}
      searchPlaceholder="Search encounters..."
      selectPlaceholder="Select encounter..."
      onChange={(monsterId) => {
        const encounter = encounters.find(
          (encounter) => encounter.card.cardId === monsterId,
        );
        if (encounter) {
          simulatorStoreActions.setMonsterConfig({
            type: "monster",
            name: encounter.name,
          });
        }
      }}
    />
  );
});

function stepCountToSeconds(stepCount: number) {
  return (stepCount * TICK_RATE) / 1000;
}
