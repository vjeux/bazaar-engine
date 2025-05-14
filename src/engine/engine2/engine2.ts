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
 * Define all game event types with their payload structures
 */
export interface GameEvents {
  // Game events
  "game:tick": { tick: number };
  "game:fightStarted": Record<string, never>;
  "game:ended": { winner: string };

  // Card events
  "card:triggered": { boardCardID: BoardCardID; card: unknown };
  "card:attributeChanged": {
    boardCardID: BoardCardID;
    attribute: AttributeType | "tick";
    oldValue: number;
    newValue: number;
  };

  // Player events
  "player:damaged": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:healed": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:overhealed": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:attributeChanged": {
    playerID: number;
    attribute: string;
    oldValue: number;
    newValue: number;
  };
  "player:attributeChangeHandled": {
    playerID: number;
    attribute: string;
    oldValue: number;
    newValue: number;
  };
  "player:died": { playerID: number };
  "player:shieldApplied": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:poisonApplied": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:burnApplied": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:healHandled": {
    playerID: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
}

/**
 * Type-safe EventBus for game events
 */
export class EventBus {
  private listeners: {
    [K in keyof GameEvents]?: Array<(data: GameEvents[K]) => void>;
  } = {};

  /**
   * Register a listener for a specific event
   */
  on<K extends keyof GameEvents>(
    eventName: K,
    callback: (data: GameEvents[K]) => void,
  ): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]?.push(
      callback as (data: GameEvents[keyof GameEvents]) => void,
    );
  }

  /**
   * Emit an event with data
   */
  emit<K extends keyof GameEvents>(eventName: K, data: GameEvents[K]): void {
    const eventListeners = this.listeners[eventName];
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(data);
      }
    }
  }

  /**
   * Remove a listener for a specific event
   */
  off<K extends keyof GameEvents>(
    eventName: K,
    callback: (data: GameEvents[K]) => void,
  ): void {
    const eventListeners = this.listeners[eventName];
    if (eventListeners) {
      const index = eventListeners.indexOf(
        callback as (data: GameEvents[keyof GameEvents]) => void,
      );
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners = {};
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
