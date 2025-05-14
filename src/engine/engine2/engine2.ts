import { GameState as OriginalGameState } from "../Engine";
import { AttributeType } from "../../types/cardTypes";
import { setupEventHandlers } from "./eventHandlers";
import { ProcessTickCommand } from "./commands";

/**
 * Represents a unique identifier for a board card
 */
export type BoardCardID = {
  playerID: number;
  cardID: number;
};

/**
 * Event data type for EventBus
 */
export interface EventData {
  [key: string]: unknown;
}

/**
 * EventBus for game events
 */
export class EventBus {
  private listeners: Map<string, Array<(data: EventData) => void>> = new Map();

  /**
   * Register a listener for a specific event
   */
  on(eventName: string, callback: (data: EventData) => void): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(callback);
  }

  /**
   * Emit an event with data
   */
  emit(eventName: string, data: EventData): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(data);
      }
    }
  }

  /**
   * Remove a listener for a specific event
   */
  off(eventName: string, callback: (data: EventData) => void): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Extended GameState that includes EventBus
 */
export interface GameState extends OriginalGameState {
  eventBus: EventBus;
}

/**
 * Command interface
 */
export interface Command {
  execute(gameState: GameState): void;
}

/**
 * Game Engine using EventBus and Command pattern
 */
export class Engine2 {
  private gameState: GameState;
  private commandQueue: Command[] = [];

  constructor(initialGameState: OriginalGameState) {
    // Create a new GameState with EventBus
    this.gameState = {
      ...initialGameState,
      eventBus: new EventBus(),
    };

    // Set up event handlers
    setupEventHandlers(this.gameState);
  }

  /**
   * Queue a command to be executed
   */
  queueCommand(command: Command): void {
    this.commandQueue.push(command);
  }

  /**
   * Execute all queued commands
   */
  executeCommands(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) {
        command.execute(this.gameState);
      }
    }
  }

  /**
   * Process a single game tick
   */
  processTick(): GameState {
    // Queue tick processing command
    this.queueCommand(new ProcessTickCommand());

    // Execute all commands
    this.executeCommands();

    // Return the updated game state
    return this.createGameStateCopy();
  }

  /**
   * Run the game for a specified number of ticks
   */
  run(maxTicks: number = Infinity): GameState[] {
    const steps: GameState[] = [this.createGameStateCopy()];

    // Emit fight started event on first tick
    if (this.gameState.tick === 0) {
      this.gameState.eventBus.emit("game:fightStarted", {});
    }

    for (let i = 0; i < maxTicks; i++) {
      // Process a tick
      const updatedState = this.processTick();
      steps.push(updatedState);

      // Check if game is still active
      if (!this.gameState.isPlaying) {
        break;
      }
    }

    return steps;
  }

  /**
   * Create a deep copy of the current game state
   */
  private createGameStateCopy(): GameState {
    // Create a new GameState with the same EventBus
    return {
      ...this.gameState,
      players: this.gameState.players.map((player) => ({
        ...player,
        board: player.board.map((boardCard) => ({ ...boardCard })),
      })),
      multicast: [...this.gameState.multicast],
    };
  }

  /**
   * Get the current game state
   */
  getGameState(): GameState {
    return this.createGameStateCopy();
  }
}

/**
 * Get attribute value from a card
 */
export function getCardAttribute(
  gameState: GameState,
  cardID: BoardCardID,
  attribute: AttributeType,
): number {
  const card = gameState.players[cardID.playerID].board[cardID.cardID];
  return (card[attribute] as number) || 0;
}
