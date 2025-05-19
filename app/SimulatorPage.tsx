"use client";
import { memo, useEffect } from "react";
import { useGameData } from "@/lib/Data.ts";
import type { FlattenedEncounter } from "@/types/encounterTypes.ts";
import { TICK_RATE } from "@/engine/engine2/constants";
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
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoonLoader } from "react-spinners";
import SandstormParticles from "../src/components/SandStormParticles";
import { ENEMY_PLAYER_IDX, PLAYER_PLAYER_IDX } from "@/lib/constants";
import { PlayerStatsDialog } from "../src/components/PlayerStatsDialog";
import WinrateCalculator from "@/components/WinrateCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventLog } from "@/components/EventLog";

// Memoized version of SandstormParticles to prevent re-renders
const MemoizedSandstormParticles = memo(SandstormParticles);

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"destructive"}
                className="hover:cursor-pointer"
                onClick={() => simulatorStoreActions.reset()}
              >
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>WARNING: Resets everything</p>
            </TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <WinrateCalculator />
          </div>
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
          <BoardSkills
            gameState={currentGameState}
            playerId={ENEMY_PLAYER_IDX}
          />
          <div className="flex items-center gap-2">
            <GoldIncomeDisplay
              gameState={currentGameState}
              playerId={ENEMY_PLAYER_IDX}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    simulatorStoreActions.clearPlayerBoard(ENEMY_PLAYER_IDX)
                  }
                  className="h-8 w-8 hover:cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear Enemy Board</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {/* Enemy Health Bar*/}
        <HealthBar gameState={currentGameState} playerId={ENEMY_PLAYER_IDX} />

        {/* Cards Area */}
        <div className="bg-card border-border relative grid grid-rows-[190px_190px] items-center justify-center gap-2 rounded border p-2">
          <CardDeck gameState={currentGameState} playerId={ENEMY_PLAYER_IDX} />
          <CardDeck gameState={currentGameState} playerId={PLAYER_PLAYER_IDX} />

          {currentGameState.tick > currentGameState.sandstormStartTick &&
            currentGameState.isPlaying && <MemoizedSandstormParticles />}

          {process.env.NODE_ENV === "development" && (
            <div className="absolute top-0 right-0 z-50">
              <button
                className="hover:cursor-pointer"
                onClick={() => console.log(currentGameState)}
              >
                🐛
              </button>
            </div>
          )}
        </div>
        {/* Player Health Bar*/}
        <HealthBar gameState={currentGameState} playerId={PLAYER_PLAYER_IDX} />
        {/* Player Skills and Gold/Income */}
        <div className="flex justify-between">
          <BoardSkills
            gameState={currentGameState}
            playerId={PLAYER_PLAYER_IDX}
          />
          <div className="flex items-center gap-2">
            <GoldIncomeDisplay
              gameState={currentGameState}
              playerId={PLAYER_PLAYER_IDX}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    simulatorStoreActions.clearPlayerBoard(PLAYER_PLAYER_IDX)
                  }
                  className="h-8 w-8 hover:cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear Board</p>
              </TooltipContent>
            </Tooltip>
            <PlayerStatsDialog />
          </div>
        </div>
      </div>
      {/* Right Sidebar - Tabs for Cards/Skills and Event Log */}
      <div className="flex h-[calc(100dvh-90px)] w-96 flex-col">
        <Tabs defaultValue="cards" className="flex h-full w-full flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="cards" className="flex-grow">
              Cards & Skills
            </TabsTrigger>
            <TabsTrigger value="events" className="flex-grow">
              Debug Log
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cards" className="h-[calc(100%-45px)]">
            <SearchableCardSkillList Cards={cardsData} />
          </TabsContent>
          <TabsContent
            value="events"
            className="h-[calc(100%-45px)] overflow-hidden"
          >
            <EventLog />
          </TabsContent>
        </Tabs>
      </div>
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
      selectPlaceholder={"Select encounter..."}
      onChange={(value) => {
        if (encounters.length === 0) return;
        const encounter = encounters.find(
          (encounter) => encounter.card.cardId === value.split(":")[1],
        );
        if (encounter) {
          simulatorStoreActions.setEnemyFromMonster({
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
