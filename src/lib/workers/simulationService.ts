import * as Comlink from "comlink";
import { Cards } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { MonsterConfig, PlayerConfig } from "@/engine/GameState";

// Type for the Comlink-wrapped BattleSimulator
type BattleSimulatorType = {
  runSimulation: (
    enemyConfig: MonsterConfig | PlayerConfig,
    playerConfig: PlayerConfig,
    seed: number,
  ) => Promise<boolean>;

  calculateWinrate: (
    enemyConfig: MonsterConfig | PlayerConfig,
    playerConfig: PlayerConfig,
    numSimulations: number,
    progressCallback?: (progress: number) => void,
  ) => Promise<number>;

  [Comlink.releaseProxy]: () => void;
};

let simulatorProxy: BattleSimulatorType | null = null;
let isInitializing = false;
let initPromise: Promise<BattleSimulatorType> | null = null;

/**
 * Initialize the simulation worker with card and encounter data
 * This should be called before any simulations are run
 */
export async function initSimulationWorker(
  cards: Cards,
  encounters: EncounterDays,
): Promise<void> {
  if (isInitializing) {
    await initPromise;
    return;
  }

  isInitializing = true;

  try {
    // Create the worker
    const worker = new Worker(
      new URL("./simulationWorker.ts", import.meta.url),
      { type: "module" },
    );

    // Wrap it with Comlink
    const BattleSimulator =
      Comlink.wrap<
        new (cards: Cards, encounters: EncounterDays) => BattleSimulatorType
      >(worker);

    // Create an instance with the provided cards and encounters data
    initPromise = new BattleSimulator(cards, encounters);
    simulatorProxy = await initPromise;

    console.log("Simulation worker initialized successfully");
  } catch (error) {
    console.error("Failed to initialize simulation worker:", error);
    simulatorProxy = null;
    throw error;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

/**
 * Run a single simulation and return if the player won
 */
export async function runSimulation(
  enemyConfig: MonsterConfig | PlayerConfig,
  playerConfig: PlayerConfig,
  seed: number,
): Promise<boolean> {
  if (!simulatorProxy) {
    throw new Error(
      "Simulation worker not initialized. Call initSimulationWorker first.",
    );
  }

  return simulatorProxy.runSimulation(enemyConfig, playerConfig, seed);
}

/**
 * Calculate winrate by running multiple simulations
 */
export async function calculateWinrate(
  enemyConfig: MonsterConfig | PlayerConfig,
  playerConfig: PlayerConfig,
  numSimulations: number,
  onProgress?: (progress: number) => void,
): Promise<number> {
  if (!simulatorProxy) {
    throw new Error(
      "Simulation worker not initialized. Call initSimulationWorker first.",
    );
  }

  // Create a Comlink proxy for the progress callback
  const progressCallback = onProgress ? Comlink.proxy(onProgress) : undefined;

  try {
    return await simulatorProxy.calculateWinrate(
      enemyConfig,
      playerConfig,
      numSimulations,
      progressCallback,
    );
  } finally {
    // Release the proxy when done to avoid memory leaks
    if (progressCallback) {
      // Cast to unknown first for safety
      const proxy = progressCallback as unknown;
      try {
        // Now we can safely access the releaseProxy method
        if (typeof proxy === "object" && proxy !== null) {
          // Use a type guard to avoid TypeScript errors
          const proxyWithRelease = proxy as { [key: symbol]: () => void };
          if (Comlink.releaseProxy in proxyWithRelease) {
            proxyWithRelease[Comlink.releaseProxy]();
          }
        }
      } catch (e) {
        // Ignore errors during cleanup
        console.warn("Error releasing proxy:", e);
      }
    }
  }
}

/**
 * Clean up the worker when no longer needed
 */
export function disposeSimulationWorker(): void {
  if (simulatorProxy) {
    simulatorProxy[Comlink.releaseProxy]();
    simulatorProxy = null;
  }
}
