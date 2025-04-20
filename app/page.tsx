"use client";
import { memo, useCallback, useEffect, useState } from "react"; // Import useState
import { genCardsAndEncounters } from "@/lib/Data.ts";
import {
  getFlattenedEncounters,
  getInitialGameState,
  MonsterConfig,
  MonsterConfigSchema,
  PlayerCardConfig,
  PlayerConfig,
  PlayerSkillConfig,
} from "@/engine/GameState.ts";
import { run, TICK_RATE } from "@/engine/Engine.ts";
import { SearchableCardSkillList } from "@/components/SearchableCardSkillList";
import { ComboBox } from "@/components/ui/combobox.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { HealthBar } from "@/components/HealthBar.tsx"; // Import the new HealthBar component
import { Slider } from "@/components/ui/slider";
import { parseAsJson, useQueryState } from "nuqs";
import { BoardSkills } from "@/components/BoardSkills";
import { CardDeck } from "@/components/CardDeck"; // Import the new CardDeck component
import { Card } from "@/types/cardTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoldIncomeDisplay } from "@/components/GoldIncomeDisplay";

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

const encounters = getFlattenedEncounters(EncounterData);

export default function DragNDrop() {
  const [monsterConfig, setMonsterConfig] = useQueryState(
    "monster",
    parseAsJson<MonsterConfig>((p) => MonsterConfigSchema.parse(p)),
  );
  const [playerCards, setPlayerCards] = useState<PlayerCardConfig[]>([]);
  const [playerSkills, setPlayerSkills] = useState<PlayerSkillConfig[]>([]);
  const playerConfig = {
    type: "player",
    health: 2000,
    healthRegen: 0,
    cards: playerCards,
    skills: playerSkills,
  } as PlayerConfig;

  const initialGameState = getInitialGameState(CardsData, EncounterData, [
    monsterConfig ?? { type: "player", health: 3500 },
    playerConfig,
  ]);
  const steps = run(initialGameState, 100000);

  const [stepCount, setStepCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoReset, setAutoReset] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState(1);

  // If you live reload with a step higher than the length, it would throw.
  const boundedStepCount = Math.min(steps.length - 1, stepCount);
  const currentGameState = steps[boundedStepCount]; // Get the game state for the current step

  useEffect(() => {
    if (!autoScroll) return;

    const interval = setInterval(() => {
      setStepCount((prev) =>
        prev >= steps.length - 1 ? (autoReset ? 0 : prev) : prev + 1,
      );
    }, 100 / battleSpeed);

    return () => clearInterval(interval);
  }, [autoScroll, autoReset, steps.length, battleSpeed]);

  const addPlayerCard = useCallback(
    (card: Card): void =>
      setPlayerCards((playercards) => [
        ...playercards,
        { name: card.Localization.Title.Text, tier: card.StartingTier },
      ]),
    [],
  );

  const addPlayerSkill = useCallback(
    (card: Card): void =>
      setPlayerSkills((playerSkills) => [
        ...playerSkills,
        { name: card.Localization.Title.Text, tier: card.StartingTier },
      ]),
    [],
  );

  const handleBattleSpeedChange = useCallback(
    (value: string) => setBattleSpeed(parseInt(value)),
    [],
  );

  return (
    <div className="bg-background text-foreground flex h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] w-full flex-row gap-4 p-4">
      {/* Main Game Area */}
      <div className="flex grow flex-col gap-2">
        {/* Enemy Selection */}
        <EncounterSelector setMonsterConfig={setMonsterConfig} />

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
          <BattleSpeedSelector
            handleBattleSpeedChange={handleBattleSpeedChange}
          />
          <Checkbox
            checked={autoScroll}
            onClick={() => setAutoScroll(!autoScroll)}
            id="autoAdvance"
          />

          <label htmlFor="autoAdvance" className="text-sm text-nowrap">
            Auto Advance
          </label>
          <Checkbox
            checked={autoReset}
            onClick={() => setAutoReset(!autoReset)}
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
              setStepCount(value);
            }}
          />

          <span className="w-28 text-sm text-nowrap">
            Time: {stepCountToSeconds(boundedStepCount).toFixed(1)}s
          </span>
          <span className="w-42 text-sm text-nowrap">
            Steps: {boundedStepCount}/{steps.length - 1}
          </span>
        </div>
      </div>

      {/* Right Sidebar - Card and skill search */}
      <SearchableCardSkillList
        Cards={CardsData}
        onSelectCard={addPlayerCard}
        onSelectSkill={addPlayerSkill}
      />
    </div>
  );
}

const BattleSpeedSelector = memo(function BattleSpeedSelector({
  handleBattleSpeedChange,
}: {
  handleBattleSpeedChange: (value: string) => void;
}) {
  return (
    <Select onValueChange={handleBattleSpeedChange}>
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

const EncounterSelector = memo(function EncounterSelector({
  setMonsterConfig,
}: {
  setMonsterConfig: (monsterConfig: MonsterConfig) => void;
}) {
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
          setMonsterConfig({
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
