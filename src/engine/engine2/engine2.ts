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
  GameEvents,
  setupEventHandlers,
} from "./eventHandlers";
import { ProcessTickCommand } from "./commands";
import { RandomGenerator } from "pure-rand/types/RandomGenerator";
import { Hero, Tier } from "@/types/shared";
import { getTargetCards } from "./targeting";
import { getActionValue } from "./getActionValue";

/**
 * Represents a unique identifier for a board card
 */
export type BoardCardID = {
  playerIdx: number;
  cardIdx: number;
};

export interface CardConfig {
  cardId: string;
  tier?: Tier;
  enchantment?: keyof Enchantments;
  attributeOverrides?: Partial<Record<AttributeType, number>>;
}

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
  internalCommandQueuetick: number;
  eventBusCallbacks: EventHandler<keyof GameEvents>[];
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
  Hero: Hero;
  board: BoardCard[];
}

/**
 * Extended GameState that includes EventBus
 */
export interface GameState {
  tick: number;
  isPlaying: boolean;
  players: Player[];
  multicast: Multicast[];
  randomGen: RandomGenerator;
  winner?: "Player" | "Enemy" | "Draw";
  sandstormStartTick: number;
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

  constructor(initialGameState: GameState) {
    // Create EventBus with reference to gameState
    const eventBus = new EventBus({} as GameState); // Temporary until gameState is created

    // Create a new GameState with EventBus
    this.gameState = {
      ...initialGameState,
      eventBus,
    };

    // Update the EventBus reference to the real gameState
    eventBus.updateGameState(this.gameState);

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
  processTick() {
    // Queue tick processing command
    this.queueCommand(new ProcessTickCommand());

    // Execute all commands
    this.executeCommands();
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
      this.processTick();
      steps.push(this.createGameStateCopy());

      // Check if game is still active
      if (steps.at(-1)?.isPlaying === false) {
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
   *
   * Will return a copy of the current game state.
   */
  getGameState(): GameState {
    return this.createGameStateCopy();
  }
}

/**
 * Get attribute value from a card with all aura modifications applied
 */
export function getCardAttribute(
  gameState: GameState,
  cardID: BoardCardID,
  attribute: "tags",
): string[];
export function getCardAttribute(
  gameState: GameState,
  cardID: BoardCardID,
  attribute: AttributeType,
): number;
export function getCardAttribute(
  gameState: GameState,
  cardID: BoardCardID,
  attribute: AttributeType | "tags",
): number | string[] {
  const card = gameState.players[cardID.playerIdx].board[cardID.cardIdx];

  // Special handling for tags
  if (attribute === "tags") {
    const tags: Set<string> = new Set(card.tags || []);

    // Apply auras that add tags
    gameState.players.forEach((player, playerIdx) => {
      player.board.forEach((boardCard, cardIdx) => {
        // Skip if card has no auras
        if (!boardCard.Auras || Object.keys(boardCard.Auras).length === 0) {
          return;
        }

        // Check each aura on the card
        Object.values(boardCard.Auras).forEach((aura) => {
          // Skip if not a tag-adding aura
          if (aura.Action.$type !== "TAuraActionCardAddTagsBySource") {
            return;
          }

          const auraSourceCardID: BoardCardID = { playerIdx, cardIdx };

          // Check if the aura targets our card
          const targetCards = getTargetCards(
            gameState,
            aura.Action.Target,
            auraSourceCardID,
            {} as GameEvents[keyof GameEvents],
          );

          // Check if our card is among the targets
          const isTargeted = targetCards.some(
            (target: BoardCardID) =>
              target.playerIdx === cardID.playerIdx &&
              target.cardIdx === cardID.cardIdx,
          );

          if (isTargeted) {
            // Get tags from source cards
            const sourceCards = getTargetCards(
              gameState,
              aura.Action.Source,
              auraSourceCardID,
              {} as GameEvents[keyof GameEvents],
            );

            // Add tags from each source card
            sourceCards.forEach((sourceCard) => {
              const sourceTags =
                gameState.players[sourceCard.playerIdx].board[
                  sourceCard.cardIdx
                ].tags || [];
              sourceTags.forEach((tag) => tags.add(tag));
            });
          }
        });
      });
    });

    return Array.from(tags);
  }

  // Handle numeric attributes with aura modifications
  let value = (card[attribute] as number) || 0;

  // Apply aura effects
  gameState.players.forEach((player, playerIdx) => {
    player.board.forEach((boardCard, cardIdx) => {
      // Skip if card has no auras
      if (!boardCard.Auras || Object.keys(boardCard.Auras).length === 0) {
        return;
      }

      // Check each aura on the card
      Object.values(boardCard.Auras).forEach((aura) => {
        // Skip if not attribute modification aura
        if (
          aura.Action.$type !== "TAuraActionCardModifyAttribute" ||
          aura.Action.AttributeType !== attribute
        ) {
          return;
        }

        // Check if the aura targets our card
        const auraSourceCardID: BoardCardID = { playerIdx, cardIdx };
        const targetCards = getTargetCards(
          gameState,
          aura.Action.Target,
          auraSourceCardID,
          {} as GameEvents[keyof GameEvents],
        );

        // Check if our card is among the targets
        const isTargeted = targetCards.some(
          (target: BoardCardID) =>
            target.playerIdx === cardID.playerIdx &&
            target.cardIdx === cardID.cardIdx,
        );

        if (isTargeted) {
          // Get the value to apply from the aura
          const actionValue = getActionValue(
            gameState,
            aura.Action.Value,
            auraSourceCardID,
            {} as GameEvents[keyof GameEvents],
          );

          // Apply the modification based on operation type
          switch (aura.Action.Operation) {
            case "Add":
              value += actionValue;
              break;
            case "Multiply":
              value *= actionValue;
              break;
            case "Subtract":
              value -= actionValue;
              break;
          }
        }
      });
    });
  });

  return value;
}
