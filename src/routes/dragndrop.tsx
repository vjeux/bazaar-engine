import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"; // Import useState
import { genCardsAndEncounters } from "../lib/Data.ts";
import {
  getFlattenedEncounters,
  getInitialGameState,
  MonsterConfig,
  PlayerCardConfig,
  PlayerConfig,
  PlayerSkillConfig,
} from "../engine/GameState.ts";
import { run } from "../engine/Engine.ts";
import { SearchCardSkill } from "../components/SearchCardSkill.tsx";
import { ComboBox } from "@/components/ui/combobox.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

export const Route = createFileRoute("/dragndrop")({
  component: RouteComponent,
});

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

const encounters = getFlattenedEncounters(EncounterData);

function RouteComponent() {
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

  return (
    <div className="grid grid-cols-[1fr_auto] h-screen bg-gray-900 text-white p-4 gap-4">
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
        >
        </ComboBox>

        {/* Enemy Skills */}
        <div className="flex gap-1 h-12 items-center">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={`enemy-skill-${i}`}
              className="w-10 h-10 border border-gray-500 rounded-full bg-gray-600 flex items-center justify-center text-xs"
            >
              ES{i + 1}
            </div>
          ))}
        </div>

        {/* Enemy Health Bar */}
        <div className="relative w-full bg-gray-700 rounded h-6 border border-gray-600">
          <div className="bg-red-600 h-full rounded" style={{ width: "80%" }}>
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-sm">
            250
          </span>
          {" "}
        </div>

        {/* Cards Area */}
        <div className="flex-grow flex flex-col justify-center items-center gap-2 bg-gray-800 border border-gray-700 rounded p-4">
          {/* Top Row Cards */}
          <div className="flex gap-2 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`card-top-${i}`}
                className="w-16 h-24 border border-yellow-500 rounded bg-gray-600 flex items-center justify-center text-xs"
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
                className="w-16 h-24 border border-yellow-500 rounded bg-gray-600 flex items-center justify-center text-xs"
              >
                Card {i + 5}
              </div>
            ))}
          </div>
        </div>

        {/* Player Health Bar */}
        <div className="relative w-full bg-gray-700 rounded h-6 border border-gray-600">
          <div
            className="bg-green-600 h-full rounded"
            style={{ width: "100%" }}
          >
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-sm">
            2000
          </span>
          {" "}
        </div>

        {/* Player Skills */}
        <div className="flex gap-1 h-12 items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`player-skill-${i}`}
              className="w-10 h-10 border border-gray-500 rounded-full bg-gray-600 flex items-center justify-center text-xs"
            >
              PS{i + 1}
            </div>
          ))}
        </div>

        {/* Time Slider */}
        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            checked={autoScroll}
            onClick={() => setAutoScroll(!autoScroll)}
            id="autoAdvance"
          />

          <label htmlFor="autoAdvance" className="text-sm">Auto Advance</label>
          <Checkbox
            checked={autoReset}
            onClick={() => setAutoReset(!autoReset)}
            id="autoRestart"
          />
          <label htmlFor="autoRestart" className="text-sm">Auto Restart</label>
          <input
            type="range"
            min="0"
            max="324"
            defaultValue="0"
            className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
          />
          <span className="text-sm">Time: 0.0s</span>
          <span className="text-sm">Steps: 0/324</span>
        </div>
      </div>

      {/* Right Sidebar - Card and skill search */}
      <SearchCardSkill
        Cards={CardsData}
        onSelectCard={(card) =>
          setPlayerCards([
            ...playerCards,
            { name: card.Localization.Title.Text, tier: card.StartingTier },
          ])}
        onSelectSkill={(card) =>
          setPlayerSkills([
            ...playerSkills,
            { name: card.Localization.Title.Text, tier: card.StartingTier },
          ])}
      />
    </div>
  );
}
