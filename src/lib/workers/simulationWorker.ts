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
  private activeCalculationId: string | null = null;

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
   * Set the active calculation ID
   */
  async setActiveCalculation(calculationId: string) {
    console.log(`Setting active calculation to ${calculationId}`);
    this.activeCalculationId = calculationId;
  }

  /**
   * Cancel the current calculation
   */
  async cancelCalculation() {
    console.log(`Cancelling calculation ${this.activeCalculationId}`);
    this.activeCalculationId = null;
  }

  /**
   * Run a single simulation and return if the player won
   * @param enemyConfig Enemy configuration
   * @param playerConfig Player configuration
   * @param seed Random seed for deterministic results
   * @returns true if player won, false if enemy won or draw
   */
  async runSimulation(
    enemyConfig: MonsterConfig | PlayerConfig,
    playerConfig: PlayerConfig,
    seed: number,
  ): Promise<boolean> {
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
   * @param calculationId Unique ID for this calculation
   * @param progressCallback Callback to report progress
   * @returns Winrate as a number between 0 and 1
   */
  async calculateWinrate(
    enemyConfig: MonsterConfig | PlayerConfig,
    playerConfig: PlayerConfig,
    numSimulations: number,
    calculationId: string,
    progressCallback?: (progress: number) => void,
  ): Promise<number> {
    if (!this.initialized) {
      throw new Error("BattleSimulator not properly initialized");
    }

    // Set this as the active calculation
    await this.setActiveCalculation(calculationId);

    let wins = 0;
    const batchSize = 1; // Smaller batch size for more frequent progress updates
    let totalRun = 0;

    try {
      // Run simulations in batches
      for (let i = 0; i < numSimulations; i += batchSize) {
        // Check if this calculation is still active
        if (this.activeCalculationId !== calculationId) {
          console.log(
            `Calculation ${calculationId} was canceled, stopping early`,
          );
          break;
        }

        const endBatch = Math.min(i + batchSize, numSimulations);

        // Run a batch of simulations
        for (let seed = i; seed < endBatch; seed++) {
          const result = await this.runSimulation(
            enemyConfig,
            playerConfig,
            seed,
          );
          if (result) {
            wins++;
          }
          totalRun++;
        }

        // Report progress after each batch
        if (progressCallback) {
          progressCallback(endBatch / numSimulations);
        }

        // Add small delay between batches to allow for cancellation to be processed
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // If we didn't run all simulations due to cancellation, calculate based on what we have
      return totalRun > 0 ? wins / totalRun : 0;
    } catch (error) {
      console.error("Error calculating winrate:", error);
      throw error;
    }
  }
}

// Expose the BattleSimulator class with Comlink
Comlink.expose(BattleSimulator);
