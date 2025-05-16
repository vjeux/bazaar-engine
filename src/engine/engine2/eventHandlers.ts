import { GameState, BoardCardID, LogEntry } from "./engine2";
import * as Commands from "./commands";
import { Ability, AttributeType, Priority } from "../../types/cardTypes";
import { createPrerequisitesCheck } from "./prereq";
import { playerName } from "./commands";

/**
 * Define all game event types with their payload structures
 */

export interface GameEvents {
  // Game events
  "game:tick": { tick: number };
  "game:fightStarted": Record<string, never>;
  "game:ended": { winner: string };

  // Card events
  "card:fired": { sourceCardID: BoardCardID };
  "card:itemused": { sourceCardID: BoardCardID };
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

export interface EventLogEntry {
  eventName: keyof GameEvents;
  data: GameEvents[keyof GameEvents];
  timestamp: number;
  step: number;
}

export class EventBus {
  private listeners: {
    [K in keyof GameEvents]?: Array<PrioritizedEventHandler<K>>;
  } = {};
  private gameState: GameState;
  private unifiedLog: Array<LogEntry> = [];

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.listeners = {};
    this.unifiedLog = [];
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
  emit<K extends keyof GameEvents>(
    eventName: K,
    eventData: GameEvents[K],
  ): void {
    const eventListeners = this.listeners[eventName];

    // Get the step from the gameState
    const step = this.gameState.step;

    // Add to unified log
    this.unifiedLog.push({
      type: "event",
      name: eventName as string,
      description: this.getEventDescription(eventName, eventData),
      data: eventData as Record<string, unknown>,
      timestamp: Date.now(),
      step: step,
    });

    if (eventListeners) {
      // Execute handlers in priority order (already sorted)
      for (const listener of eventListeners) {
        // Only call handler if there's no test function or if the test function returns true
        if (!listener.tester || listener.tester(this.gameState, eventData)) {
          listener.handler(this.gameState, eventData);
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
   * Get a human-readable description of an event
   */
  private getEventDescription<K extends keyof GameEvents>(
    eventName: K,
    eventData: GameEvents[K],
  ): string {
    // Create readable descriptions based on event type
    switch (eventName) {
      case "game:tick":
        return `Tick: ${(eventData as GameEvents["game:tick"]).tick}`;
      case "game:fightStarted":
        return "Fight started";
      case "game:ended":
        return `Game ended - Winner: ${(eventData as GameEvents["game:ended"]).winner}`;
      case "card:fired":
        const { sourceCardID } = eventData as GameEvents["card:fired"];
        return `${playerName(sourceCardID.playerIdx)}'s card ${sourceCardID.cardIdx} was fired`;
      case "player:damaged":
        const damageData = eventData as GameEvents["player:damaged"];
        if (!damageData.sourceCardID) {
          return `${playerName(damageData.playerIdx)} took ${damageData.amount} damage`;
        }
        return `${playerName(damageData.playerIdx)} took ${damageData.amount} damage from ${playerName(damageData.sourceCardID.playerIdx)}'s card ${damageData.sourceCardID.cardIdx}`;
      case "player:healed":
        const healData = eventData as GameEvents["player:healed"];
        if (!healData.sourceCardID) {
          return `${playerName(healData.playerIdx)} was healed for ${healData.amount}`;
        }
        return `${playerName(healData.playerIdx)} was healed for ${healData.amount} by ${playerName(healData.sourceCardID.playerIdx)}'s card ${healData.sourceCardID.cardIdx}`;
      case "player:shieldApplied":
        const shieldData = eventData as GameEvents["player:shieldApplied"];
        if (!shieldData.sourceCardID) {
          return `${playerName(shieldData.playerIdx)} gained ${shieldData.amount} shield`;
        }
        return `${playerName(shieldData.playerIdx)} gained ${shieldData.amount} shield from ${playerName(shieldData.sourceCardID.playerIdx)}'s card ${shieldData.sourceCardID.cardIdx}`;
      case "player:poisonApplied":
        const poisonData = eventData as GameEvents["player:poisonApplied"];
        if (!poisonData.sourceCardID) {
          return `${playerName(poisonData.playerIdx)} was poisoned for ${poisonData.amount}`;
        }
        return `${playerName(poisonData.playerIdx)} was poisoned for ${poisonData.amount} by ${playerName(poisonData.sourceCardID.playerIdx)}'s card ${poisonData.sourceCardID.cardIdx}`;
      case "player:burnApplied":
        const burnData = eventData as GameEvents["player:burnApplied"];
        if (!burnData.sourceCardID) {
          return `${playerName(burnData.playerIdx)} was burned for ${burnData.amount}`;
        }
        return `${playerName(burnData.playerIdx)} was burned for ${burnData.amount} by ${playerName(burnData.sourceCardID.playerIdx)}'s card ${burnData.sourceCardID.cardIdx}`;
      case "player:attributeChanged":
        const attrData = eventData as GameEvents["player:attributeChanged"];
        return `${playerName(attrData.playerIdx)}'s ${attrData.attribute} changed from ${attrData.oldValue} to ${attrData.newValue}`;
      case "card:attributeChanged":
        const cardAttrData = eventData as GameEvents["card:attributeChanged"];
        return `${playerName(cardAttrData.boardCardID.playerIdx)}'s card ${cardAttrData.boardCardID.cardIdx} ${cardAttrData.attribute} changed from ${cardAttrData.oldValue} to ${cardAttrData.newValue}`;
      default:
        return `${eventName}`;
    }
  }

  /**
   * Add a command entry to the unified log
   */
  addCommandToLog(command: Commands.Command): void {
    this.unifiedLog.push({
      type: "command",
      name: command.constructor.name,
      description:
        command.toLogString?.() || `${command.constructor.name} executed`,
      data: this.getCommandParams(command),
      timestamp: Date.now(),
      step: this.gameState.step,
    });
  }

  /**
   * Extract parameters from a command instance
   */
  private getCommandParams(command: Commands.Command): Record<string, unknown> {
    // Extract command parameters by filtering out methods and converting to plain object
    const params: Record<string, unknown> = {};
    Object.entries(command).forEach(([key, value]) => {
      if (typeof value !== "function" && key.startsWith("_") === false) {
        params[key] = value;
      }
    });
    return params;
  }

  /**
   * Returns a copy of the unified log for a specific step.
   */
  getUnifiedLog(step?: number): Array<LogEntry> {
    if (step !== undefined) {
      return JSON.parse(
        JSON.stringify(this.unifiedLog.filter((entry) => entry.step === step)),
      );
    }
    return JSON.parse(JSON.stringify(this.unifiedLog));
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
        if ("sourceCardID" in e) {
          const firedEvent = e as GameEvents["card:fired"];
          if (
            firedEvent.sourceCardID.playerIdx === boardCardID.playerIdx &&
            firedEvent.sourceCardID.cardIdx === boardCardID.cardIdx
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
          eventData: GameEvents[T],
        ) => {
          return (
            prerequisiteCheck(gs, eventData) && triggerCheck(gs, eventData)
          );
        };

        const eventHandler = (
          gs: GameState,
          event: GameEvents[keyof GameEvents],
        ) => {
          const command = Commands.CommandFactory.createFromAction(
            ability.Action,
            boardCardID,
            gs,
            event,
          );
          if (command) {
            // Log the command before execution
            gs.eventBus.addCommandToLog(command);

            // Execute the command
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
  // Process poison and regen on 1000 tick intervals
  if (tick % 1000 === 0) {
    // Log operation
    gameState.eventBus.addCommandToLog(
      new Commands.SystemCommand("Process poison and regeneration"),
    );
    processPoisonAndRegen(gameState);
  }

  // Process burn on 500 tick intervals
  if (tick % 500 === 0) {
    // Log operation
    gameState.eventBus.addCommandToLog(
      new Commands.SystemCommand("Process burn damage"),
    );
    processBurn(gameState);
  }

  // Process card cooldowns
  gameState.eventBus.addCommandToLog(
    new Commands.SystemCommand("Process card cooldowns"),
  );
  processCardCooldowns(gameState);

  // Process sandstorm damage
  const sandstormTick = gameState.tick - gameState.sandstormStartTick;
  if (sandstormTick >= 0) {
    gameState.eventBus.addCommandToLog(
      new Commands.SystemCommand("Process sandstorm damage"),
    );
    processSandstorm(gameState);
  }

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
        // Log specific player regen
        gameState.eventBus.addCommandToLog(
          new Commands.SystemCommand(
            `Player ${playerID} regenerates ${player.HealthRegen} health`,
          ),
        );

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
      // Log specific player poison damage
      gameState.eventBus.addCommandToLog(
        new Commands.SystemCommand(
          `Player ${playerID} takes ${player.Poison} poison damage`,
        ),
      );

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
      const burnDamage = player.Burn / 2;

      // Log specific player burn damage
      gameState.eventBus.addCommandToLog(
        new Commands.SystemCommand(
          `Player ${playerID} takes ${burnDamage} burn damage`,
        ),
      );

      // Apply burn damage
      new Commands.DamagePlayerCommand(
        playerID,
        burnDamage,
        null, // System-caused damage
      ).execute(gameState);

      // Reduce burn counter
      gameState.eventBus.addCommandToLog(
        new Commands.SystemCommand(
          `Player ${playerID} burn reduced from ${player.Burn} to ${player.Burn - 1}`,
        ),
      );

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
      if (newTick >= cooldownMax) {
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
  // Start at 1 damage
  let sandstormDamage = 1;

  // Increase by 2 every tick after the first 10 ticks (1000 ms)
  // This matches the original implementation where damage increases after 9 ticks
  const ticksAfterStart = Math.floor(sandstormTick / 100); // Convert to 0.1 second ticks
  if (ticksAfterStart > 9) {
    sandstormDamage += (ticksAfterStart - 9) * 2;
  }

  if (sandstormDamage > 0) {
    // Log sandstorm damage amount
    gameState.eventBus.addCommandToLog(
      new Commands.SystemCommand(
        `Sandstorm damage: ${sandstormDamage} (tick ${ticksAfterStart})`,
      ),
    );

    gameState.players.forEach((player, playerID) => {
      // Log specific player sandstorm damage
      gameState.eventBus.addCommandToLog(
        new Commands.SystemCommand(
          `Player ${playerID} takes ${sandstormDamage} sandstorm damage`,
        ),
      );

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

      // Log player death
      eventBus.addCommandToLog(
        new Commands.SystemCommand(`Player ${playerID} has died`),
      );

      eventBus.emit("player:died", { playerID });
    }
  });

  gameState.isPlaying = isPlaying;

  // Determine winner
  if (gameState.players[0].Health <= 0 && gameState.players[1].Health <= 0) {
    gameState.winner = "Draw";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended in a draw"),
    );

    eventBus.emit("game:ended", { winner: "Draw" });
  } else if (gameState.players[0].Health <= 0) {
    gameState.winner = "Player";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended - Player wins"),
    );

    eventBus.emit("game:ended", { winner: "Player" });
  } else if (gameState.players[1].Health <= 0) {
    gameState.winner = "Enemy";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended - Enemy wins"),
    );

    eventBus.emit("game:ended", { winner: "Enemy" });
  }
}
