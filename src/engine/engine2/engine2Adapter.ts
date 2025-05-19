import { Engine2 } from "./engine2";
import { GameState as Engine2GameState } from "./engine2";
import { getInitialGameState } from "../GameState";
import { MonsterConfig, PlayerConfig } from "../GameState";
import { AttributeType, Cards } from "@/types/cardTypes";
import { EncounterDays } from "@/types/encounterTypes";
import { getCardAttribute } from "./getAttribute";

/**
 * Create a game state compatible with Engine2 from the parameters used by original getInitialGameState
 *
 * This function serves as a bridge between the original Engine and the new Engine2:
 * 1. It gets a basic GameState from the original getInitialGameState function
 * 2. Creates a temporary Engine2 instance that:
 *    - Adds the required eventBus property to the state
 *    - Sets up event handlers for abilities
 *    - Properly connects the eventBus with the gameState
 * 3. Returns a fully initialized Engine2 GameState
 *
 * By doing this, we get the convenience of the original state initialization
 * with all the additional features of Engine2.
 */
export function getInitialGameState2(
  cards: Cards,
  encounters: EncounterDays,
  configs: [MonsterConfig | PlayerConfig, PlayerConfig],
  randomSeed: number = 1,
): Engine2GameState {
  // First, get the initial game state from the original function
  const originalState = getInitialGameState(
    cards,
    encounters,
    configs,
    randomSeed,
  );

  // Create a temporary Engine2 instance to properly initialize
  // the eventBus and connect it to the gameState
  const engine = new Engine2(originalState as unknown as Engine2GameState);

  // Set all ammo values to their getCardAttribute AmmoMax values
  engine.getGameState().players.forEach((player, playerIdx) => {
    player.board.forEach((card, cardIdx) => {
      card.Ammo = getCardAttribute(
        engine.getGameState(),
        {
          playerIdx,
          cardIdx,
          location: "board",
        },
        AttributeType.AmmoMax,
      );
    });
  });

  // Return the properly initialized gameState with eventBus
  return engine.getGameState();
}

/**
 * Run a simulation using Engine2 instead of the original Engine
 *
 * This function is a drop-in replacement for the run function from Engine.ts.
 * It takes a properly initialized Engine2 GameState (including the eventBus),
 * creates an Engine2 instance, and runs the simulation for the specified number
 * of ticks.
 *
 * Key differences from the original run:
 * - Uses the command pattern for all game actions
 * - Utilizes the eventBus for event-driven ability triggers
 * - Provides proper encapsulation of game state
 * - Handles event priority more effectively
 *
 * @param initialState A properly initialized Engine2 GameState
 * @param maxTicks The maximum number of ticks to run the simulation for
 * @returns An array of GameState snapshots representing each tick of the simulation
 */
export function run(
  initialState: Engine2GameState,
  maxTicks?: number,
): Engine2GameState[] {
  // Create a new Engine2 instance with the initial state
  const engine = new Engine2(initialState);

  // Run the simulation
  return engine.run(maxTicks);
}

/**
 * Creates an initial game state and runs a simulation using Engine2
 *
 * This is a convenience function that combines getInitialGameState2 and run.
 * It handles the complete workflow of:
 * 1. Creating an initial game state based on the provided configs
 * 2. Initializing the Engine2-specific properties (like eventBus)
 * 3. Running the simulation
 *
 * Use this function when you want to quickly run a simulation without
 * manually creating the game state first.
 *
 * @param cards The cards data used to populate the game state
 * @param encounters The encounters data used to set up the monster
 * @param configs Configuration for the monster and player
 * @param randomSeed Seed for the random number generator for deterministic results
 * @param maxTicks Maximum number of ticks to run the simulation for
 * @returns An array of GameState snapshots representing each tick of the simulation
 */
export function runWithConfig(
  cards: Cards,
  encounters: EncounterDays,
  configs: [MonsterConfig, PlayerConfig],
  randomSeed: number = 1,
  maxTicks: number = 10000,
): Engine2GameState[] {
  // Create initial game state using our new adapter function
  const initialState = getInitialGameState2(
    cards,
    encounters,
    configs,
    randomSeed,
  );

  // Run simulation
  return run(initialState, maxTicks);
}
