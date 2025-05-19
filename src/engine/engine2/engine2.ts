import { Multicast } from "../Engine";
import {
  Ability,
  Card,
  Aura,
  Tooltip,
  AttributeType,
  Enchantments,
} from "../../types/cardTypes";
import {
  EventBus,
  EventHandler,
  GameEventConstructor,
  processBurn,
  processPoisonAndRegen,
  setupEventHandlers,
} from "./eventBus";
import { GameFightStartedEvent, GameTickEvent } from "./events";
import {
  ApplyAttributeDraftsCommand,
  Command,
  SnapshotAttributesCommand,
} from "./commands";
import { RandomGenerator } from "pure-rand/types/RandomGenerator";
import { Hero, Tier } from "@/types/shared";

/**
 * Represents a unique identifier for a card in any location (board or stash)
 */
export type CardLocationID = {
  playerIdx: number;
  location: "board" | "stash";
  cardIdx: number;
};

/**
 * Represents a unique identifier for a card on the board
 */
export type BoardCardID = {
  playerIdx: number;
  cardIdx: number;
};

export function cardLocationIdIsEqual(
  a: CardLocationID,
  b: CardLocationID,
): boolean {
  return (
    a.playerIdx === b.playerIdx &&
    a.location === b.location &&
    a.cardIdx === b.cardIdx
  );
}

/**
 * Command log entry interface
 */
export interface CommandLogEntry {
  commandType: string;
  params: Record<string, unknown>;
  timestamp: number;
  step: number;
  description: string;
}

/**
 * Unified log entry for both commands and events
 */
export interface LogEntry {
  type: "command" | "event";
  name: string;
  description: string;
  data?: Record<string, unknown>;
  timestamp: number;
  step: number;
}

export interface CardConfig {
  cardId: string;
  tier?: Tier;
  enchantment?: keyof Enchantments;
  attributeOverrides?: Partial<Record<AttributeType, number>>;
}

/**
 * Type for card attribute snapshots and drafts
 */
export type CardAttributeSnapshot = {
  [key in AttributeType | "tick"]?: number;
} & {
  tags?: string[];
};

export type BoardCard = {
  [key in AttributeType]: number | undefined;
} & {
  card: Card;
  uuid: string; // Used to identify similar cards in drag and drop
  tick: number;
  tags: string[]; // visible tags on the card. Dynamic as certain auras can append tags.
  HiddenTags: string[];
  tier: Tier;
  Enchantment?: keyof Enchantments | null;
  isDisabled: boolean;
  Auras: { [key: string]: Aura };
  AbilityIds: string[];
  AuraIds: string[];
  TooltipIds: number[];
  Abilities: { [key: string]: Ability };
  Localization: {
    Title: {
      Text: string;
    };
    Tooltips: Tooltip[];
  };
  internalCommandQueue: Command[];
  internalCommandQueueCooldown: number;
  registeredTriggers: Map<GameEventConstructor, EventHandler[]>;
  // New field for attribute draft
  attributeDraft?: CardAttributeSnapshot;
};

/**
 * Type for player attribute snapshots and drafts
 */
export type PlayerAttributeSnapshot = {
  HealthMax?: number;
  Health?: number;
  HealthRegen?: number;
  Shield?: number;
  Burn?: number;
  Poison?: number;
  Gold?: number;
  Income?: number;
};

export interface Player {
  HealthMax: number;
  Health: number;
  HealthRegen: number;
  Shield: number;
  Burn: number;
  Poison: number;
  Gold: number;
  Income: number;
  Hero: Hero | (string & {});
  board: BoardCard[];
  stash: BoardCard[];
  // New field for attribute draft
  attributeDraft?: PlayerAttributeSnapshot;
}

/**
 * Extended GameState that includes EventBus
 */
export interface GameState {
  tick: number;
  step: number;
  isPlaying: boolean;
  players: Player[];
  multicast: Multicast[];
  randomGen: RandomGenerator;
  winner?: "Player" | "Enemy" | "Draw";
  sandstormStartTick: number;
  eventBus: EventBus;
  // Attribute snapshots for the current tick
  attributeSnapshots?: {
    players: PlayerAttributeSnapshot[];
    cards: Map<string, CardAttributeSnapshot>; // Keyed by card UUID
  };
  // Flag to indicate if this tick has been snapshotted
  isTickSnapshotted: boolean;
}

/**
 * Game Engine using EventBus and Command pattern
 */
export class Engine2 {
  private gameState: GameState;

  constructor(initialGameState: GameState) {
    // Create EventBus with reference to gameState
    const eventBus = new EventBus({} as GameState); // Temporary until gameState is created

    // Create a new GameState with EventBus
    this.gameState = {
      ...initialGameState,
      eventBus,
      step: 0,
      isTickSnapshotted: false,
    };

    // Update the EventBus reference to the real gameState
    eventBus.updateGameState(this.gameState);

    // Set up event handlers
    setupEventHandlers(this.gameState);
  }

  /**
   * Process a single game tick
   */
  processTick() {
    this.gameState.eventBus.emit(new GameTickEvent());
  }

  /**
   * Run the game for a specified number of steps
   */
  run(maxSteps: number = 10000): GameState[] {
    // Hacky fix for start of fight viper 0 tick poison damage
    if (this.gameState.tick === 0) {
      //snapshot attributes
      new SnapshotAttributesCommand().execute(this.gameState);
      this.gameState.eventBus.emit(new GameFightStartedEvent());
      // apply attribute drafts
      new ApplyAttributeDraftsCommand().execute(this.gameState);

      // process poison regen burn
      processPoisonAndRegen(this.gameState);
      processBurn(this.gameState);
      // apply attribute drafts
      new ApplyAttributeDraftsCommand().execute(this.gameState);
    }

    const steps: GameState[] = [this.createGameStateCopy()];

    try {
      for (let i = 0; i < maxSteps; i++) {
        // Process a tick
        this.gameState.step++;
        this.gameState.tick += 100;
        this.processTick();

        // Create a step copy with the current step index
        const stepCopy = this.createGameStateCopy();

        steps.push(stepCopy);

        // Check if game is still active
        if (steps.at(-1)?.isPlaying === false) {
          break;
        }
      }
    } catch (error) {
      console.log("Game state on error:", this.gameState);
      console.error("Error:", error);
      throw error;
    }

    return steps;
  }

  /**
   * Create a deep copy of the current game state
   */
  private createGameStateCopy(): GameState {
    // Create a new GameState with the same EventBus
    const copy = {
      ...this.gameState,
      players: this.gameState.players.map((player) => ({
        ...player,
        board: player.board.map((boardCard) => ({ ...boardCard })),
      })),
      multicast: [...this.gameState.multicast],
    };

    return copy;
  }

  /**
   * Get the current game state.
   */
  getGameState(): GameState {
    return this.gameState;
  }
}
export type PlayerAttributeNumber = keyof {
  [K in keyof Player as Player[K] extends number ? K : never]: Player[K];
};
