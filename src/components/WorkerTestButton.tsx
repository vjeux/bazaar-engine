"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  initSimulationWorker,
  calculateWinrate,
} from "@/lib/workers/simulationService";
import { MonsterConfig, PlayerConfig } from "@/engine/GameState";
import { Cards } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { CARDS_VERSION } from "@/lib/constants";
import ValidSkillIds from "../../public/json/ValidSkillIds.json";
import ValidItemIds from "../../public/json/ValidItemIds.json";

export function WorkerTestButton() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter cards for valid names
  function filterValidCards(cards: Cards): Cards {
    const filteredCards = {
      ...cards,
      [CARDS_VERSION]: cards[CARDS_VERSION].filter((card) => {
        const cardId = card.Id;
        return ValidSkillIds.includes(cardId) || ValidItemIds.includes(cardId);
      }),
    };
    return filteredCards;
  }

  // Fetch JSON data directly
  async function fetchJSON<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  const initWorker = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Load JSON data directly (avoid using genCardsAndEncounters which has IndexedDB code)
      const cardsRaw = await fetchJSON<Cards>("/json/cards.json");
      const cards = filterValidCards(cardsRaw);
      const encounters = await fetchJSON<EncounterDays>(
        "/json/monsterEncounterDays.json",
      );

      // Initialize the worker
      await initSimulationWorker(cards, encounters);

      setIsInitializing(false);
    } catch (err) {
      setError(
        `Failed to initialize worker: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsInitializing(false);
    }
  };

  const runTest = async () => {
    try {
      setIsCalculating(true);
      setProgress(0);
      setResult(null);
      setError(null);

      // Simple test configs
      const enemyConfig: MonsterConfig = {
        type: "monster",
        name: "Pyro",
        day: 1,
      };

      const playerConfig: PlayerConfig = {
        type: "player",
        health: 2000,
        healthRegen: 0,
        income: 0,
        gold: 0,
        cards: [],
        skills: [],
      };

      // Calculate winrate with 20 simulations
      const winrate = await calculateWinrate(
        enemyConfig,
        playerConfig,
        20,
        (progress) => setProgress(progress),
      );

      setResult(winrate);
      setIsCalculating(false);
    } catch (err) {
      setError(
        `Calculation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsCalculating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded border p-4">
      <h3 className="text-lg font-semibold">Worker Test</h3>

      <div className="flex gap-2">
        <Button onClick={initWorker} disabled={isInitializing || isCalculating}>
          {isInitializing ? "Initializing..." : "Initialize Worker"}
        </Button>

        <Button onClick={runTest} disabled={isInitializing || isCalculating}>
          {isCalculating
            ? `Calculating (${Math.round(progress * 100)}%)`
            : "Test Calculation"}
        </Button>
      </div>

      {result !== null && (
        <div className="rounded bg-green-100 p-2 text-green-800">
          Winrate: {(result * 100).toFixed(1)}%
        </div>
      )}

      {error && (
        <div className="rounded bg-red-100 p-2 text-red-800">{error}</div>
      )}
    </div>
  );
}
