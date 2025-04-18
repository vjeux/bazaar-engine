"use client";
import { useEffect, useState } from "react"; // Import useState
import { genCardsAndEncounters } from "@/lib/Data.ts";
import {
  getFlattenedEncounters,
  getInitialGameState,
  MonsterConfig,
  PlayerCardConfig,
  PlayerConfig,
  PlayerSkillConfig,
} from "@/engine/GameState.ts";
import { run, TICK_RATE } from "@/engine/Engine.ts";
import { SearchCardSkill } from "@/components/SearchCardSkill.tsx";
import { ComboBox } from "@/components/ui/combobox.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { HealthBar } from "@/components/HealthBar.tsx"; // Import the new HealthBar component
import { Slider } from "@/components/ui/slider";

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

const encounters = getFlattenedEncounters(EncounterData);

export default function DragNDrop() {
  const [monsterConfig, setMonsterConfig] = useState<MonsterConfig | null>(
    null,
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

  // If you live reload with a step higher than the length, it would throw.
  const boundedStepCount = Math.min(steps.length - 1, stepCount);
  const currentGameState = steps[boundedStepCount]; // Get the game state for the current step

  useEffect(() => {
    if (!autoScroll) return;

    const interval = setInterval(() => {
      setStepCount((prev) =>
        prev >= steps.length - 1 ? (autoReset ? 0 : prev) : prev + 1,
      );
    }, 100);

    return () => clearInterval(interval);
  }, [autoScroll, autoReset]);

  return (
    <div className="bg-background text-foreground grid h-full grid-cols-[1fr_auto] gap-4 p-4">
      {/* Main Game Area */}
      <div className="flex flex-col gap-2">
        {/* Enemy Selection */}
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

        {/* Enemy Skills */}
        <div className="flex h-12 items-center gap-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={`enemy-skill-${i}`}
              className="border-border bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full border text-xs"
            >
              ES{i + 1}
            </div>
          ))}
        </div>

        {/* Enemy Health Bar*/}
        <HealthBar gameState={currentGameState} playerId={0} />

        {/* Cards Area */}
        <div className="bg-card border-border flex flex-grow flex-col items-center justify-center gap-2 rounded border p-4">
          {/* Top Row Cards */}
          <div className="mb-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`card-top-${i}`}
                className="border-primary bg-secondary text-secondary-foreground flex h-24 w-16 items-center justify-center rounded border text-xs"
              >
                Card {i + 1}
              </div>
            ))}
          </div>
          {/* Bottom Row Cards */}
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`card-bottom-${i}`}
                className="border-primary bg-secondary text-secondary-foreground flex h-24 w-16 items-center justify-center rounded border text-xs"
              >
                Card {i + 5}
              </div>
            ))}
          </div>
        </div>

        {/* Player Health Bar*/}
        <HealthBar gameState={currentGameState} playerId={1} />

        {/* Player Skills */}
        <div className="flex h-12 items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`player-skill-${i}`}
              className="border-border bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full border text-xs"
            >
              PS{i + 1}
            </div>
          ))}
        </div>

        {/* Time Slider */}
        <div className="mt-2 flex items-center gap-2">
          <Checkbox
            checked={autoScroll}
            onClick={() => setAutoScroll(!autoScroll)}
            id="autoAdvance"
          />

          <label htmlFor="autoAdvance" className="text-sm">
            Auto Advance
          </label>
          <Checkbox
            checked={autoReset}
            onClick={() => setAutoReset(!autoReset)}
            id="autoRestart"
          />
          <label htmlFor="autoRestart" className="text-sm">
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

          <span className="text-sm">
            Time: {stepCountToSeconds(boundedStepCount).toFixed(1)}s
          </span>
          <span className="text-sm">
            Steps: {boundedStepCount}/{steps.length - 1}
          </span>
        </div>
      </div>

      {/* Right Sidebar - Card and skill search */}
      <SearchCardSkill
        Cards={CardsData}
        onSelectCard={(card) =>
          setPlayerCards([
            ...playerCards,
            { name: card.Localization.Title.Text, tier: card.StartingTier },
          ])
        }
        onSelectSkill={(card) =>
          setPlayerSkills([
            ...playerSkills,
            { name: card.Localization.Title.Text, tier: card.StartingTier },
          ])
        }
      />
    </div>
  );
}

function stepCountToSeconds(stepCount: number) {
  return (stepCount * TICK_RATE) / 1000;
}
