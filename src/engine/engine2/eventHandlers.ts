import { Player } from "../Engine";
import { GameState, BoardCardID } from "./engine2";
import * as Commands from "./commands";
import {
  Ability,
  AbilityAction,
  AbilityPrerequisite,
  AttributeType,
  Priority,
} from "../../types/cardTypes";
import { createPrerequisitesCheck } from "./prereq";

/**
 * Define all game event types with their payload structures
 */

export interface GameEvents {
  // Game events
  "game:tick": { tick: number };
  "game:fightStarted": Record<string, never>;
  "game:ended": { winner: string };

  // Card events
  "card:fired": { boardCardID: BoardCardID; card: unknown };
  "card:attributeChanged": {
    boardCardID: BoardCardID;
    attribute: AttributeType | "tick";
    oldValue: number;
    newValue: number;
  };
  "card:added": {
    boardCardID: BoardCardID;
    card: unknown;
  };
  "card:removed": {
    boardCardID: BoardCardID;
  };

  // Player events
  "player:damaged": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:healed": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:overhealed": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:lifestealheal": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:attributeChanged": {
    playerIdx: number;
    attribute: string;
    oldValue: number;
    newValue: number;
  };
  "player:attributeChangeHandled": {
    playerIdx: number;
    attribute: string;
    oldValue: number;
    newValue: number;
  };
  "player:died": { playerID: number };
  "player:shieldApplied": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:poisonApplied": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
  "player:burnApplied": {
    playerIdx: number;
    amount: number;
    sourceCardID: BoardCardID | null;
  };
}

// Priority order mapping for sorting
const priorityOrder = {
  [Priority.Immediate]: 0,
  [Priority.Highest]: 1,
  [Priority.High]: 2,
  [Priority.Medium]: 3,
  [Priority.Low]: 4,
  [Priority.Lowest]: 5,
};

/**
 * Type-safe EventBus for game events
 */

export type EventHandler<T extends keyof GameEvents> = (
  gameState: GameState,
  data: GameEvents[T],
) => void;

// Type for the test function that determines if an event should be handled
export type EventTester<T extends keyof GameEvents> = (
  gameState: GameState,
  data: GameEvents[T],
) => boolean;

// Event listener with priority information and test function
interface PrioritizedEventHandler<T extends keyof GameEvents> {
  handler: EventHandler<T>;
  tester: EventTester<T> | null;
  priority: Priority;
}

export class EventBus {
  private listeners: {
    [K in keyof GameEvents]?: Array<PrioritizedEventHandler<K>>;
  } = {};
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Register a listener for a specific event with priority and test function
   */
  on<K extends keyof GameEvents>(
    eventName: K,
    callback: EventHandler<K>,
    priority: Priority = Priority.Medium,
    tester: EventTester<K> | null = null,
  ): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    // Create prioritized event handler
    const prioritizedHandler: PrioritizedEventHandler<K> = {
      handler: callback,
      tester,
      priority,
    };

    // Add to listeners array
    this.listeners[eventName]?.push(prioritizedHandler);

    // Sort the listeners by priority (lower priority value = higher precedence)
    this.listeners[eventName]?.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }

  /**
   * Emit an event with data
   */
  emit<K extends keyof GameEvents>(eventName: K, data: GameEvents[K]): void {
    const eventListeners = this.listeners[eventName];
    if (eventListeners) {
      // Execute handlers in priority order (already sorted)
      for (const listener of eventListeners) {
        // Only call handler if there's no test function or if the test function returns true
        if (!listener.tester || listener.tester(this.gameState, data)) {
          listener.handler(this.gameState, data);
        }
      }
    }
  }

  /**
   * Remove a listener for a specific event
   */
  off<K extends keyof GameEvents>(
    eventName: K,
    callback: EventHandler<K>,
  ): void {
    const eventListeners = this.listeners[eventName];
    if (eventListeners) {
      const index = eventListeners.findIndex(
        (item) => item.handler === callback,
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

  /**
   * Update the gameState reference
   * This should be called whenever a new gameState is created
   */
  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }
}

/**
 * Create a BoardCardID
 */
function createBoardCardID(playerID: number, cardID: number): BoardCardID {
  return { playerIdx: playerID, cardIdx: cardID };
}

/**
 * Convert ability trigger to event name
 */
function triggerToEvent(trigger: { $type?: string }): keyof GameEvents {
  // Simple implementation - in a real system, this would be more complex
  if (!trigger || !trigger.$type) return "game:tick";

  switch (trigger.$type) {
    case "TTriggerOnCardFired":
      return "card:fired";
    case "TTriggerOnTick":
      return "game:tick";
    case "TTriggerOnFightStart":
      return "game:fightStarted";
    // Add more mappings as needed
    default:
      return "game:tick"; // Default fallback
  }
}

/**
 * Create a trigger check
 */
function createTriggerCheck(
  ability: Ability,
  boardCardID: BoardCardID,
): <T extends keyof GameEvents>(gs: GameState, e: GameEvents[T]) => boolean {
  return <T extends keyof GameEvents>(gs: GameState, e: GameEvents[T]) => {
    switch (ability.Trigger.$type) {
      case "TTriggerOnCardFired":
        // Check if the fired card was the correct one
        if ("boardCardID" in e) {
          const firedEvent = e as GameEvents["card:fired"];
          if (
            firedEvent.boardCardID.playerIdx === boardCardID.playerIdx &&
            firedEvent.boardCardID.cardIdx === boardCardID.cardIdx
          ) {
            return true;
          }
        }
        break;
    }

    return false;
  };
}

/**
 * Setup event handlers for the game engine
 *
 * Event handlers are mostly used for ability triggers
 */
export function setupEventHandlers(gameState: GameState): void {
  const eventBus = gameState.eventBus;

  // For each card, register the cards abilities to the event bus
  gameState.players.forEach((player, playerID) => {
    player.board.forEach((card, cardID) => {
      Object.values(card.Abilities).forEach((ability: Ability) => {
        const boardCardID = { playerIdx: playerID, cardIdx: cardID };

        const eventTrigger = triggerToEvent(ability.Trigger);
        const triggerCheck = createTriggerCheck(ability, boardCardID);
        const prerequisiteCheck = createPrerequisitesCheck(
          ability,
          boardCardID,
        );

        // Create a combined test function that checks both prerequisites and trigger conditions
        const shouldReceiveEvent = <T extends keyof GameEvents>(
          gs: GameState,
          data: GameEvents[T],
        ) => {
          return prerequisiteCheck(gs) && triggerCheck(gs, data);
        };

        const eventHandler = (gs: GameState) => {
          const command = Commands.CommandFactory.createFromAction(
            ability.Action,
            boardCardID,
            gs,
          );
          if (command) {
            command.execute(gs);
          }
        };

        // Register the event handler with the ability's priority and test function
        eventBus.on(
          eventTrigger,
          eventHandler,
          ability.Priority || Priority.Medium,
          shouldReceiveEvent,
        );
      });
    });
  });

  // Handle game tick events with Highest priority
  eventBus.on(
    "game:tick",
    (gameState, data) => {
      handleGameTick(gameState, data.tick);
    },
    Priority.Highest,
  );
}

/**
 * Handle game tick event
 *
 * This is effectively the main game loop
 */
function handleGameTick(gameState: GameState, tick: number): void {
  // Process card cooldowns
  processCardCooldowns(gameState);

  // Process poison and regen on 1000 tick intervals
  if (tick % 1000 === 0) {
    processPoisonAndRegen(gameState);
  }

  // Process burn on 500 tick intervals
  if (tick % 500 === 0) {
    processBurn(gameState);
  }

  // Process sandstorm damage
  processSandstorm(gameState);

  // Check for player deaths
  checkPlayerDeaths(gameState);
}

/**
 * Process poison and health regeneration
 */
function processPoisonAndRegen(gameState: GameState): void {
  gameState.players.forEach((player, playerID) => {
    // Process health regen
    if (player.HealthRegen > 0) {
      const health = player.Health;
      const healthMax = player.HealthMax;
      const nextHealth = Math.min(healthMax, health + player.HealthRegen);

      if (health !== nextHealth) {
        new Commands.ModifyPlayerAttributeCommand(
          playerID,
          "Health",
          "set",
          nextHealth,
        ).execute(gameState);
      }
    }

    // Process poison damage
    if (player.Poison > 0) {
      new Commands.DamagePlayerCommand(
        playerID,
        player.Poison,
        null, // System-caused damage
      ).execute(gameState);
    }
  });
}

/**
 * Process burn effects
 */
function processBurn(gameState: GameState): void {
  gameState.players.forEach((player, playerID) => {
    if (player.Burn > 0) {
      // Apply burn damage
      new Commands.DamagePlayerCommand(
        playerID,
        player.Burn / 2,
        null, // System-caused damage
      ).execute(gameState);

      // Reduce burn counter
      new Commands.ModifyPlayerAttributeCommand(
        playerID,
        "Burn",
        "set",
        player.Burn - 1,
      ).execute(gameState);
    }
  });
}

/**
 * Process card cooldowns and triggers
 */
function processCardCooldowns(gameState: GameState): void {
  const cardTriggers: BoardCardID[] = [];

  gameState.players.forEach((player, playerID) => {
    player.board.forEach((card, cardID) => {
      if (card.isDisabled || card.card.$type === "TCardSkill") {
        return;
      }

      // Skip cards without cooldown
      if (!("CooldownMax" in card)) {
        return;
      }

      const boardCardID = createBoardCardID(playerID, cardID);

      // Check if card is frozen
      const freeze = card[AttributeType.Freeze] as number | undefined;
      if (freeze && freeze > 0) {
        // Reduce freeze counter
        new Commands.ModifyCardAttributeCommand(
          boardCardID,
          AttributeType.Freeze,
          Math.max(0, freeze - 100),
          "set",
        ).execute(gameState);
        return; // Skip tick increment if frozen
      }

      // Calculate tick rate based on slow/haste
      let tickRate = 100; // TICK_RATE
      const slow = card[AttributeType.Slow] as number | undefined;
      if (slow && slow > 0) {
        tickRate /= 2;

        // Reduce slow counter
        new Commands.ModifyCardAttributeCommand(
          boardCardID,
          AttributeType.Slow,
          Math.max(0, slow - 100),
          "set",
        ).execute(gameState);
      }

      const haste = card[AttributeType.Haste] as number | undefined;
      if (haste && haste > 0) {
        tickRate *= 2;

        // Reduce haste counter
        new Commands.ModifyCardAttributeCommand(
          boardCardID,
          AttributeType.Haste,
          Math.max(0, haste - 100),
          "set",
        ).execute(gameState);
      }

      // Increment card tick
      const cooldownMax = card[AttributeType.CooldownMax] as number;
      const newTick = Math.min(card.tick + tickRate, cooldownMax);

      new Commands.ModifyCardAttributeCommand(
        boardCardID,
        "tick",
        newTick,
        "set",
      ).execute(gameState);

      // Check if card should trigger
      if (newTick === cooldownMax) {
        const ammo = card[AttributeType.Ammo] as number | undefined;
        const ammoMax = card[AttributeType.AmmoMax] as number | undefined;

        if (!ammoMax || (ammoMax && ammo === undefined) || (ammo && ammo > 0)) {
          cardTriggers.push(boardCardID);

          // Handle multicast
          if ("Multicast" in card && card.Multicast) {
            const MULTICAST_DELAY = 300;
            for (let i = 0; i < card.Multicast - 1; i++) {
              gameState.multicast.push({
                tick: gameState.tick + (i + 1) * MULTICAST_DELAY,
                playerID,
                boardCardID: cardID,
              });
            }
          }
        }
      }
    });
  });

  // Process delayed multicasts
  gameState.multicast = gameState.multicast.filter((multicast) => {
    if (multicast.tick <= gameState.tick) {
      cardTriggers.push(
        createBoardCardID(multicast.playerID, multicast.boardCardID),
      );
      return false;
    }
    return true;
  });

  // Trigger cards
  cardTriggers.forEach((boardCardID) => {
    const { playerIdx: playerID, cardIdx: cardID } = boardCardID;
    // Reduce ammo if needed
    const card = gameState.players[playerID].board[cardID];
    const ammoMax = card[AttributeType.AmmoMax] as number | undefined;

    if (ammoMax) {
      const ammo = card[AttributeType.Ammo] as number | undefined;
      new Commands.ModifyCardAttributeCommand(
        boardCardID,
        AttributeType.Ammo,
        ammo === undefined ? ammoMax - 1 : ammo - 1,
        "set",
      ).execute(gameState);
    }

    // Trigger the card
    new Commands.FireCardCommand(boardCardID).execute(gameState);
  });
}

/**
 * Process sandstorm damage
 */
function processSandstorm(gameState: GameState): void {
  // Sandstorm implementation
  const sandstormTick = gameState.tick - gameState.sandstormStartTick;
  if (sandstormTick < 0) return;

  // Calculate sandstorm damage based on ticks
  let sandstormDamage = 1;
  if (sandstormTick > 1000) {
    sandstormDamage += Math.floor((sandstormTick - 1000) / 100) * 2;
  }

  if (sandstormDamage > 0) {
    gameState.players.forEach((player, playerID) => {
      new Commands.DamagePlayerCommand(
        playerID,
        sandstormDamage,
        null, // System-caused damage
      ).execute(gameState);
    });
  }
}

/**
 * Check for player deaths
 */
function checkPlayerDeaths(gameState: GameState): void {
  let isPlaying = true;
  const eventBus = gameState.eventBus;

  gameState.players.forEach((player, playerID) => {
    if (player.Health <= 0) {
      isPlaying = false;
      eventBus.emit("player:died", { playerID });
    }
  });

  gameState.isPlaying = isPlaying;

  // Determine winner
  if (gameState.players[0].Health <= 0 && gameState.players[1].Health <= 0) {
    gameState.winner = "Draw";
    eventBus.emit("game:ended", { winner: "Draw" });
  } else if (gameState.players[0].Health <= 0) {
    gameState.winner = "Player";
    eventBus.emit("game:ended", { winner: "Player" });
  } else if (gameState.players[1].Health <= 0) {
    gameState.winner = "Enemy";
    eventBus.emit("game:ended", { winner: "Enemy" });
  }
}
