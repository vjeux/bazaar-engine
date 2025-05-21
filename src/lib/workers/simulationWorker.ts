import * as Comlink from "comlink";
import { Cards } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { Engine2 } from "@/engine/engine2/engine2";
import { getInitialGameState2 } from "@/engine/engine2/engine2Adapter";
import { MonsterConfig, PlayerConfig } from "@/engine/GameState";

/**
 * BattleSimulator class that runs battle simulations
 * This class is exposed to the main thread via Comlink
 */
class BattleSimulator {
  private cards: Cards;
  private encounters: EncounterDays;
  private initialized: boolean = false;

  constructor(cards: Cards, encounters: EncounterDays) {
    try {
      this.cards = cards;
      this.encounters = encounters;
      this.initialized = true;
      console.log("BattleSimulator initialized in worker");
    } catch (error) {
      console.error("Error initializing BattleSimulator:", error);
      throw error;
    }
  }

  /**
   * Run a single simulation and return if the player won
   * @param enemyConfig Enemy configuration
   * @param playerConfig Player configuration
   * @param seed Random seed for deterministic results
   * @returns true if player won, false if enemy won or draw
   */
  runSimulation(
    enemyConfig: MonsterConfig | PlayerConfig,
    playerConfig: PlayerConfig,
    seed: number,
  ): boolean {
    if (!this.initialized) {
      throw new Error("BattleSimulator not properly initialized");
    }

    try {
      // Create initial state
      const initialState = getInitialGameState2(
        this.cards,
        this.encounters,
        [enemyConfig, playerConfig],
        seed,
      );

      // Run simulation
      const engine = new Engine2(initialState);
      const steps = engine.run();

      // Check if player won
      const finalState = steps[steps.length - 1];
      return finalState.winner === "Player" || finalState.winner === "Draw";
    } catch (error) {
      console.error("Simulation error:", error);
      return false;
    }
  }

  /**
   * Run multiple simulations and return the winrate
   * @param enemyConfig Enemy configuration
   * @param playerConfig Player configuration
   * @param numSimulations Number of simulations to run
   * @returns Winrate as a number between 0 and 1
   */
  calculateWinrate(
    enemyConfig: MonsterConfig | PlayerConfig,
    playerConfig: PlayerConfig,
    numSimulations: number,
    progressCallback?: (progress: number) => void,
  ): number {
    if (!this.initialized) {
      throw new Error("BattleSimulator not properly initialized");
    }

    let wins = 0;
    const batchSize = 5; // Smaller batch size for more frequent progress updates

    try {
      // Run simulations in batches
      for (let i = 0; i < numSimulations; i += batchSize) {
        const endBatch = Math.min(i + batchSize, numSimulations);

        // Run a batch of simulations
        for (let seed = i; seed < endBatch; seed++) {
          if (this.runSimulation(enemyConfig, playerConfig, seed)) {
            wins++;
          }
        }

        // Report progress after each batch
        if (progressCallback) {
          progressCallback(endBatch / numSimulations);
        }
      }

      return wins / numSimulations;
    } catch (error) {
      console.error("Error calculating winrate:", error);
      throw error;
    }
  }
}

// Expose the BattleSimulator class with Comlink
Comlink.expose(BattleSimulator);
