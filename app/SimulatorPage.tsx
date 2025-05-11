"use client";
import { memo, useEffect } from "react";
import { useGameData } from "@/lib/Data.ts";
import type { FlattenedEncounter } from "@/types/encounterTypes.ts";
import { TICK_RATE } from "@/engine/Engine.ts";
import { SearchableCardSkillList } from "@/components/SearchableCardSkillList";
import { ComboBox } from "@/components/ui/combobox.tsx";
import { HealthBar } from "@/components/HealthBar.tsx";
import { Slider } from "@/components/ui/slider";
import { BoardSkills } from "@/components/BoardSkills";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoldIncomeDisplay } from "@/components/GoldIncomeDisplay";
import { useSimulatorStore } from "@/lib/simulatorStore";
import { Button } from "@/components/ui/button";
import CardDeck from "@/components/CardDeck";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoonLoader } from "react-spinners";

export default function SimulatorPage() {
  const {
    cardsData,
    flattenedEncounters,
    isLoading: isGameDataLoading,
    error: gameDataError,
  } = useGameData();

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

  if (isGameDataLoading) {
    return (
      <div className="flex h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] w-full grow flex-col items-center justify-center gap-2">
        <div>Loading...</div>
        <MoonLoader />
      </div>
    );
  }

  if (gameDataError) {
    return <div>Error loading game data: {gameDataError.message}</div>;
  }

  if (!cardsData || !flattenedEncounters) {
    return <div>Loading game assets...</div>;
  }

  return (
    <div className="bg-background text-foreground flex h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] w-full flex-row gap-4 p-4">
      {/* Main Game Area */}
      <div className="flex grow flex-col gap-2">
        <div className="flex gap-2">
          {/* Enemy Selection */}
          <EncounterSelector encounters={flattenedEncounters} />
          {/* Reset button */}
          <Button
            variant={"destructive"}
            className="hover:cursor-pointer"
            onClick={() => simulatorStoreActions.reset()}
          >
            Reset
          </Button>
        </div>

        {/* Time Slider */}
        <div className="mt-2 flex items-center gap-2">
          <BattleSpeedSelector />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoScroll ? "default" : "outline"}
                size="icon"
                onClick={() => simulatorStoreActions.setAutoScroll(!autoScroll)}
                className="h-8 w-8 hover:cursor-pointer"
              >
                {autoScroll ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{autoScroll ? "Pause" : "Play"}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoReset ? "default" : "outline"}
                size="icon"
                onClick={() => simulatorStoreActions.setAutoReset(!autoReset)}
                className="h-8 w-8 hover:cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Loop</p>
            </TooltipContent>
          </Tooltip>
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
      </div>
      {/* Right Sidebar - Card and skill search */}
      <SearchableCardSkillList Cards={cardsData} />
    </div>
  );
}

const BattleSpeedSelector = memo(function BattleSpeedSelector() {
  const handleBattleSpeedChange = useSimulatorStore(
    (state) => state.actions.setBattleSpeed,
  );
  return (
    <Select onValueChange={(val) => handleBattleSpeedChange(parseInt(val))}>
      <SelectTrigger className="hover:cursor-pointer">
        <SelectValue placeholder="1x" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1x</SelectItem>
        <SelectItem value="2">2×</SelectItem>
        <SelectItem value="3">3×</SelectItem>
        <SelectItem value="5">5×</SelectItem>
        <SelectItem value="10">10×</SelectItem>
      </SelectContent>
    </Select>
  );
});

const EncounterSelector = memo(function EncounterSelector({
  encounters,
}: {
  encounters: FlattenedEncounter[];
}) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const selectedEncounter = useSimulatorStore((state) => state.monsterConfig);
  return (
    <ComboBox
      items={encounters.map((encounter) => ({
        value: `${encounter.name}:${encounter.card.cardId}`,
        label:
          typeof encounter.day === "number"
            ? `Day ${encounter.day} - ${encounter.name}`
            : `Event ${encounter.name}`,
      }))}
      searchPlaceholder="Search encounters..."
      selectPlaceholder={
        selectedEncounter?.name && encounters.length > 0
          ? `Day ${encounters.find((e) => e.name === selectedEncounter.name && e.day === selectedEncounter.day)?.day ?? ""} - ${selectedEncounter.name}`
          : "Select encounter..."
      }
      onChange={(value) => {
        if (encounters.length === 0) return;
        const encounter = encounters.find(
          (encounter) => encounter.card.cardId === value.split(":")[1],
        );
        if (encounter) {
          simulatorStoreActions.setMonsterConfig({
            type: "monster",
            name: encounter.name,
            day: Number(encounter.day),
          });
        }
      }}
    />
  );
});

function stepCountToSeconds(stepCount: number) {
  return (stepCount * TICK_RATE) / 1000;
}
