import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"; // Import useState

export const Route = createFileRoute("/dragndrop")({
  component: RouteComponent,
});

// Placeholder data
const enemies = ["Giant Mosquito", "Slime", "Goblin"];
const items = [
  "Abacus",
  "Agility Boots",
  "Alpha Ray",
  "Amber",
  "Ambergris",
  "Anchor",
  "Angry Balloon Bot",
  "Antimatter Chamber",
  "Apropos Chapeau",
  "Arbalest",
  "Arc Blaster",
  "Arken's Ring",
  "Armored Core",
  "Astrolabe",
  "Athanor",
  "Atlas Stone",
  "Atlatl",
];

function RouteComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-[1fr_auto] h-screen bg-gray-900 text-white p-4 gap-4">
      {/* Main Game Area */}
      <div className="flex flex-col gap-2">
        {/* Enemy Selection */}
        <div className="flex items-center gap-2">
          <select className="bg-gray-700 border border-gray-600 rounded p-1">
            {enemies.map((enemy) => (
              <option key={enemy} value={enemy}>{enemy}</option>
            ))}
          </select>
        </div>

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
          <input type="checkbox" id="autoAdvance" />
          <label htmlFor="autoAdvance" className="text-sm">Auto Advance</label>
          <input type="checkbox" id="autoRestart" />
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

      {/* Right Sidebar - Items */}
      <div className="w-64 flex flex-col gap-2 bg-gray-800 p-3 rounded border border-gray-700">
        <h2 className="text-lg font-semibold mb-2">Cards & Skills</h2>
        <input
          type="text"
          placeholder="Search cards & skills..."
          className="bg-gray-700 border border-gray-600 rounded p-1 mb-2 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex-grow overflow-y-auto space-y-1 pr-1">
          {filteredItems.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 p-1 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer text-sm"
            >
              <div className="w-8 h-10 border border-gray-500 rounded bg-gray-600 flex items-center justify-center text-[8px]">
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
