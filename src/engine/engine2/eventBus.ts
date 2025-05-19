import {
  GameState,
  CardLocationID,
  LogEntry,
  cardLocationIdIsEqual,
  BoardCard,
} from "./engine2";
import * as Commands from "./commands";
import {
  Ability,
  AttributeType,
  Priority,
  TriggerType,
} from "../../types/cardTypes";
import { getTargetCards, getTargetPlayers } from "./targeting";
import {
  CardAttributeChangedEvent,
  CardCrittedEvent,
  CardFiredEvent,
  CardItemUsedEvent,
  CardPerformedBurnEvent,
  CardPerformedHasteEvent,
  CardPerformedHealEvent,
  CardPerformedPoisonEvent,
  CardPerformedRegenEvent,
  CardPerformedShieldEvent,
  CardReloadedEvent,
  GameEndedEvent,
  GameEvent,
  GameFightStartedEvent,
  GameTickEvent,
  NotImplementedEvent,
  PlayerAttributeChangedEvent,
  PlayerDiedEvent,
  PlayerOverhealedEvent,
  triggerToEventMap,
} from "./events";
import { getCardAttribute, getPlayerAttribute } from "./getAttribute";
import {
  ModifyCardAttributeCommand,
  FireCardCommand,
  SnapshotAttributesCommand,
  ApplyAttributeDraftsCommand,
} from "./commands";

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

export type EventHandler<T extends GameEvent = GameEvent> = (
  gameState: GameState,
  event: T,
) => void;

export type EventTester<T extends GameEvent = GameEvent> = (
  gameState: GameState,
  event: T,
) => boolean;

// Type that represents any GameEvent constructor
export type GameEventConstructor<T extends GameEvent = GameEvent> = {
  new (...args: never[]): T;
};

interface PrioritizedEventHandler<T extends GameEvent = GameEvent> {
  handler: EventHandler<T>;
  tester: EventTester<T> | null;
  priority: Priority;
}

export interface EventLogEntry {
  eventName: string;
  data: GameEvent;
  timestamp: number;
  step: number;
}

export class EventBus {
  // Store listeners by event class constructor
  private listeners: Map<
    GameEventConstructor,
    Array<PrioritizedEventHandler<GameEvent>>
  > = new Map();
  private gameState: GameState;
  private unifiedLog: Array<LogEntry> = [];

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.listeners = new Map();
    this.unifiedLog = [];
  }

  /**
   * Register a listener for a specific event with priority and test function
   */
  on<T extends GameEvent>(
    eventClass: GameEventConstructor<T>,
    callback: EventHandler<T>,
    priority: Priority = Priority.Medium,
    tester: EventTester<T> | null = null,
  ): void {
    if (!this.listeners.has(eventClass)) {
      this.listeners.set(eventClass, []);
    }

    // Create prioritized event handler
    const prioritizedHandler: PrioritizedEventHandler<T> = {
      handler: callback,
      tester,
      priority,
    };

    // Add to listeners array
    const eventListeners = this.listeners.get(eventClass);
    if (eventListeners) {
      eventListeners.push(
        prioritizedHandler as PrioritizedEventHandler<GameEvent>,
      );

      // Sort the listeners by priority (lower priority value = higher precedence)
      eventListeners.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );
    }
  }

  /**
   * Emit an event instance
   */
  emit<T extends GameEvent>(event: T): void {
    // Find the matching constructor for this event instance
    const eventClass = Object.getPrototypeOf(event)
      .constructor as GameEventConstructor<T>;
    const eventListeners = this.listeners.get(eventClass);

    // Get the step from the gameState
    const step = this.gameState.step;

    // Add to unified log
    this.unifiedLog.push({
      type: "event",
      name: event.type,
      description: event.getDescription(),
      data: event as unknown as Record<string, unknown>,
      timestamp: Date.now(),
      step: step,
    });

    if (eventListeners) {
      // Execute handlers in priority order (already sorted)
      for (const listener of eventListeners) {
        // Only call handler if there's no test function or if the test function returns true
        if (!listener.tester || listener.tester(this.gameState, event)) {
          (listener.handler as EventHandler<T>)(this.gameState, event);
        }
      }
    }
  }

  /**
   * Type-safe method to create and emit an event in one step
   *
   * @example
   * eventBus.emitEvent(GameTickEvent, 100); // Creates and emits a GameTickEvent with tick 100
   */
  emitEvent<T extends GameEvent, Args extends unknown[]>(
    eventClass: { new (...args: Args): T },
    ...args: Args
  ): T {
    const event = new eventClass(...args);
    this.emit(event);
    return event;
  }

  /**
   * Remove a listener for a specific event
   */
  off<T extends GameEvent>(
    eventClass: GameEventConstructor<T>,
    callback: EventHandler<T>,
  ): void {
    const eventListeners = this.listeners.get(eventClass);
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
    this.listeners.clear();
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

  /**
   * Check if there are any listeners registered for a specific event type
   */
  hasListenersFor<T extends GameEvent>(
    eventClass: GameEventConstructor<T>,
  ): boolean {
    const listeners = this.listeners.get(eventClass);
    return !!listeners && listeners.length > 0;
  }

  /**
   * Get all event types that have registered listeners
   */
  getRegisteredEventTypes(): GameEventConstructor[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Clear all listeners for a specific event type
   */
  clearEventType<T extends GameEvent>(
    eventClass: GameEventConstructor<T>,
  ): void {
    this.listeners.delete(eventClass);
  }
}

/**
 * Convert ability trigger to event class constructor
 */
export function triggerToEvent(trigger: {
  $type: TriggerType;
}): GameEventConstructor<GameEvent> {
  const triggerType = trigger?.$type || "";
  const eventClass = triggerToEventMap[triggerType];

  if (!eventClass) {
    console.warn(`Unhandled trigger type: ${triggerType}`);
    throw new Error(`Unhandled trigger type: ${triggerType}`);
    return NotImplementedEvent;
  }

  return eventClass;
}

function checkSubjectAndTargetIfDefined(
  gs: GameState,
  ability: Ability,
  checkIfTriggeringID: CardLocationID,
  eventSourceID: CardLocationID,
  e: GameEvent,
  targetType: "player" | "card" | null,
) {
  if (!ability.Trigger.Subject) {
    console.warn(
      `Ability ${ability.InternalName} has no subject, skipping trigger check`,
    );
    return false;
  }
  // Check subjects include source card
  const subjects = getTargetCards(
    gs,
    ability.Trigger.Subject,
    checkIfTriggeringID,
    e,
  );
  // if no subjects is source card return false
  if (
    !subjects.some((subject) => cardLocationIdIsEqual(subject, eventSourceID))
  ) {
    return false;
  }

  if (ability.Trigger.Target && targetType) {
    if (targetType === "player") {
      // Check if target player is same as ability target
      const targetPlayers = getTargetPlayers(
        gs,
        ability.Trigger.Target,
        checkIfTriggeringID,
        e,
      );

      return targetPlayers.some(
        (playerIdx) => playerIdx === checkIfTriggeringID.playerIdx,
      );
    } else if (targetType === "card") {
      const targetCards = getTargetCards(
        gs,
        ability.Trigger.Target,
        checkIfTriggeringID,
        e,
      );

      return targetCards.some((card) =>
        cardLocationIdIsEqual(card, eventSourceID),
      );
    }
  }
  return true;
}

/**
 * Create a trigger check function for an ability
 */
export function createTriggerCheck(
  ability: Ability,
  locationID: CardLocationID,
): (gs: GameState, e: GameEvent) => boolean {
  const triggerType = ability.Trigger.$type || "";

  const checker = (gs: GameState, e: GameEvent): boolean => {
    switch (triggerType) {
      case TriggerType.TTriggerOnCardFired: {
        if (e instanceof CardFiredEvent) {
          return (
            e.sourceCardID.playerIdx === locationID.playerIdx &&
            e.sourceCardID.cardIdx === locationID.cardIdx
          );
        }
        return false;
      }
      case TriggerType.TTriggerOnFightStarted: {
        return e instanceof GameFightStartedEvent;
      }
      case TriggerType.TTriggerOnItemUsed: {
        if (e instanceof CardItemUsedEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            null,
          );
        }
        return false;
      }
      case TriggerType.TTriggerOnCardCritted: {
        if (e instanceof CardCrittedEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            null,
          );
        }
        return false;
      }
      // TODO implement  "PreviousValue": null, "CurrentValue": null, "Source": null, see Ramrod's ability 1
      case TriggerType.TTriggerOnCardAttributeChanged: {
        if (e instanceof CardAttributeChangedEvent) {
          if (!ability.Trigger.Subject) {
            console.warn(
              `Ability ${ability.InternalName} has no subject, skipping trigger check`,
            );
            return false;
          }
          // Check subjects include source card
          const subjects = getTargetCards(
            gs,
            ability.Trigger.Subject,
            locationID,
            e,
          );
          return subjects.some((subject) => {
            if (cardLocationIdIsEqual(subject, e.modifiedLocationID)) {
              if (
                e.attribute === ability.Trigger.AttributeChanged &&
                ((ability.Trigger.ChangeType === "Gain" &&
                  e.newValue > e.oldValue) ||
                  (ability.Trigger.ChangeType === "Loss" &&
                    e.newValue < e.oldValue))
              ) {
                return true;
              }
            }
            return false;
          });
        }
      }
      case TriggerType.TTriggerOnFightEnded: {
        return e instanceof GameEndedEvent;
      }
      case TriggerType.TTriggerOnCardPerformedHeal: {
        if (e instanceof CardPerformedHealEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "player",
          );
        }
        return false;
      }
      case TriggerType.TTriggerOnCardPerformedBurn: {
        if (e instanceof CardPerformedBurnEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "player",
          );
        }
        return false;
      }

      case TriggerType.TTriggerOnCardPerformedShield: {
        if (e instanceof CardPerformedShieldEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "player",
          );
        }
        return false;
      }
      case TriggerType.TTriggerOnCardPerformedPoison: {
        if (e instanceof CardPerformedPoisonEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "player",
          );
        }
        return false;
      }

      case TriggerType.TTriggerOnPlayerAttributeChanged: {
        if (e instanceof PlayerAttributeChangedEvent) {
          if (!ability.Trigger.Subject) {
            console.warn(
              `Ability ${ability.InternalName} has no subject, skipping trigger check`,
            );
            return false;
          }
          // Check if subjects include source player
          const subjects = getTargetPlayers(
            gs,
            ability.Trigger.Subject,
            locationID,
          );
          // TODO: implement Trigger.Source
          // Check if attribute that changed was the one specified in the trigger and change type is the same as the trigger
          if (
            e.attribute === ability.Trigger.AttributeChanged &&
            ((ability.Trigger.ChangeType === "Gain" &&
              e.newValue > e.oldValue) ||
              (ability.Trigger.ChangeType === "Loss" &&
                e.newValue < e.oldValue))
          ) {
            return subjects.some((subject) => subject === e.playerIdx);
          }
          return false;
        }
      }

      case TriggerType.TTriggerOnPlayerDied: {
        if (e instanceof PlayerDiedEvent) {
          if (!ability.Trigger.Subject) {
            console.warn(
              `Ability ${ability.InternalName} has no subject, skipping trigger check`,
            );
            return false;
          }
          // Check if subjects include source player
          const subjects = getTargetPlayers(
            gs,
            ability.Trigger.Subject,
            locationID,
          );
          return subjects.some((subject) => subject === e.playerIdx);
        }
        return false;
      }

      case TriggerType.TTriggerOnCardPerformedOverHeal: {
        if (e instanceof PlayerOverhealedEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "player",
          );
        }
      }
      case TriggerType.TTriggerOnCardPerformedRegen: {
        if (e instanceof CardPerformedRegenEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "player",
          );
        }
      }

      case TriggerType.TTriggerOnCardReloaded: {
        if (e instanceof CardReloadedEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "card",
          );
        }
        return false;
      }
      case TriggerType.TTriggerOnCardPerformedHaste: {
        if (e instanceof CardPerformedHasteEvent) {
          return checkSubjectAndTargetIfDefined(
            gs,
            ability,
            locationID,
            e.sourceCardID,
            e,
            "card",
          );
        }
        return false;
      }
      default: {
        console.warn(
          `Unhandled trigger type: ${triggerType} for ability ${ability.InternalName}`,
        );
        throw new Error(
          `Unhandled trigger type: ${triggerType} for ability ${ability.InternalName}`,
        );
      }
    }
  };

  return checker;
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
      new Commands.RegisterCardEventsCommand({
        playerIdx: playerID,
        cardIdx: cardID,
        location: "board",
      }).execute(gameState);
    });
  });

  // Handle game tick events with Highest priority
  eventBus.on(
    GameTickEvent,
    (gameState, _event) => {
      handleGameTick(gameState);
    },
    Priority.Highest,
  );
}

/**
 * Handle game tick event
 *
 * This is effectively the main game loop
 */
function handleGameTick(gameState: GameState): void {
  // Take a snapshot of the current attributes at the start of the tick
  new SnapshotAttributesCommand().execute(gameState);

  // Process poison and regen on 1000 tick intervals
  if (gameState.tick % 1000 === 0) {
    // Log operation
    gameState.eventBus.addCommandToLog(
      new Commands.SystemCommand("Process poison and regeneration"),
    );
    processPoisonAndRegen(gameState);
  }

  // Process burn on 500 tick intervals
  if (gameState.tick % 500 === 0) {
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

  // Apply drafted attribute changes at the end of the tick
  new ApplyAttributeDraftsCommand().execute(gameState);
}

/**
 * Process poison and health regeneration
 */
export function processPoisonAndRegen(gameState: GameState): void {
  gameState.players.forEach((player, playerID) => {
    // Process poison damage
    const poison = getPlayerAttribute(gameState, playerID, "Poison");
    if (poison > 0) {
      // Log specific player poison damage
      gameState.eventBus.addCommandToLog(
        new Commands.SystemCommand(
          `Player ${playerID} takes ${poison} poison damage`,
        ),
      );

      new Commands.DamagePlayerCommand(
        playerID,
        poison,
        null, // System-caused damage
      ).execute(gameState);
    }

    // Process health regen
    const healthRegen = getPlayerAttribute(gameState, playerID, "HealthRegen");
    if (healthRegen > 0) {
      const health = getPlayerAttribute(gameState, playerID, "Health");
      const healthMax = getPlayerAttribute(gameState, playerID, "HealthMax");
      const nextHealth = Math.min(healthMax, health + healthRegen);

      if (health !== nextHealth) {
        // Log specific player regen
        gameState.eventBus.addCommandToLog(
          new Commands.SystemCommand(
            `Player ${playerID} regenerates ${healthRegen} health`,
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
  });
}

/**
 * Process burn effects
 */
export function processBurn(gameState: GameState): void {
  gameState.players.forEach((player, playerID) => {
    const burn = getPlayerAttribute(gameState, playerID, "Burn");
    if (burn > 0) {
      const burnDamage = burn / 2;

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
          `Player ${playerID} burn reduced from ${burn} to ${burn - 1}`,
        ),
      );

      new Commands.ModifyPlayerAttributeCommand(
        playerID,
        "Burn",
        "subtract",
        1,
      ).execute(gameState);
    }
  });
}

/**
 * Process card cooldowns and triggers
 */
function processCardCooldowns(gameState: GameState): void {
  // Set to track processed card UUIDs
  const processedCardUUIDs = new Set<string>();

  // Process all cards currently on the board
  gameState.players.forEach((player, playerID) => {
    // Create a copy of the board to iterate over as it might change during processing
    const boardCards = [...player.board];

    boardCards.forEach((card, cardID) => {
      processCard(gameState, playerID, cardID, card, processedCardUUIDs);
    });
  });

  // Process any newly added cards that weren't processed in the first pass
  let newCardsProcessed = true;

  // Continue until no new cards are processed
  while (newCardsProcessed) {
    newCardsProcessed = false;

    gameState.players.forEach((player, playerID) => {
      player.board.forEach((card, cardID) => {
        // If we process a new card, flag to keep the loop going
        if (
          processCard(gameState, playerID, cardID, card, processedCardUUIDs)
        ) {
          newCardsProcessed = true;
        }
      });
    });
  }
}

/**
 * Helper function to process a single card
 * @returns true if a new card was processed, false otherwise
 */
function processCard(
  gameState: GameState,
  playerID: number,
  cardID: number,
  card: BoardCard,
  processedCardUUIDs: Set<string>,
): boolean {
  // Skip if already processed, disabled, or a skill card
  if (
    processedCardUUIDs.has(card.uuid) ||
    card.isDisabled ||
    card.card.$type === "TCardSkill"
  ) {
    return false;
  }

  // Skip cards without cooldown
  if (card.CooldownMax === undefined) {
    return false;
  }

  // Add to processed set
  processedCardUUIDs.add(card.uuid);

  const locationID: CardLocationID = {
    playerIdx: playerID,
    cardIdx: cardID,
    location: "board",
  };

  // Check if card still exists (might have been removed)
  if (cardID >= gameState.players[playerID].board.length) {
    return false;
  }

  // Process status effects (freeze, slow, haste)
  let tickRate = 100; // TICK_RATE

  // Check if card is frozen
  const freeze = getCardAttribute(gameState, locationID, AttributeType.Freeze);
  if (freeze && freeze > 0) {
    new ModifyCardAttributeCommand(
      locationID,
      AttributeType.Freeze,
      Math.min(freeze, 100), // Don't subtract more than we have
      "subtract",
    ).execute(gameState);
    return true; // Card was processed, but skip tick increment if frozen
  }

  // Process slow effect
  const slow = getCardAttribute(gameState, locationID, AttributeType.Slow);
  if (slow && slow > 0) {
    // Reduce slow counter - use subtract instead of set
    new ModifyCardAttributeCommand(
      locationID,
      AttributeType.Slow,
      Math.min(slow, 100), // Don't subtract more than we have
      "subtract",
    ).execute(gameState);
    tickRate /= 2;
  }

  // Process haste effect
  const haste = getCardAttribute(gameState, locationID, AttributeType.Haste);
  if (haste && haste > 0) {
    // Reduce haste counter - use subtract instead of set
    new ModifyCardAttributeCommand(
      locationID,
      AttributeType.Haste,
      Math.min(haste, 100), // Don't subtract more than we have
      "subtract",
    ).execute(gameState);
    tickRate *= 2;
  }

  // Increment card tick
  const cooldownMax = getCardAttribute(
    gameState,
    locationID,
    AttributeType.CooldownMax,
  );

  if (!cooldownMax) {
    throw new Error(
      "getCardAttribtue CooldownMax returned undefined when base card CooldownMax was defined",
    );
  }

  // For non-AttributeType values, access directly or from draft/snapshot
  let currentTick = 0;
  if (card.attributeDraft?.tick !== undefined) {
    currentTick = card.attributeDraft.tick;
  } else if (gameState.attributeSnapshots?.cards.has(card.uuid)) {
    const snapshot = gameState.attributeSnapshots.cards.get(card.uuid);
    currentTick = snapshot?.tick ?? 0;
  } else {
    currentTick = card.tick;
  }

  let tickToAdd = tickRate;

  // Stop gaining tick if card has no ammo
  const ammo = getCardAttribute(gameState, locationID, AttributeType.Ammo);
  if (ammo !== undefined && ammo <= 0) {
    // Cap at cooldownMax if no ammo
    const tickToReachMax = Math.max(0, cooldownMax - currentTick);
    tickToAdd = Math.min(tickRate, tickToReachMax);
  }

  // Use add operation for incrementing tick
  new ModifyCardAttributeCommand(locationID, "tick", tickToAdd, "add").execute(
    gameState,
  );

  // Recompute the new tick value for checking cooldown trigger
  const updatedTick = currentTick + tickToAdd;

  // Check if card should trigger
  if (updatedTick >= cooldownMax) {
    const ammo = getCardAttribute(gameState, locationID, AttributeType.Ammo);
    const ammoMax = getCardAttribute(
      gameState,
      locationID,
      AttributeType.AmmoMax,
    );

    if (!ammoMax || (ammoMax && ammo === undefined) || (ammo && ammo > 0)) {
      // Handle multicast - access directly instead of via getCardAttribute
      const multicast = card.Multicast || 0;
      if (multicast) {
        const MULTICAST_DELAY = 300;
        for (let i = 0; i < multicast - 1; i++) {
          gameState.multicast.push({
            tick: gameState.tick + (i + 1) * MULTICAST_DELAY,
            playerID,
            boardCardID: cardID,
          });
        }
      }

      // Reduce ammo if needed
      if (ammoMax) {
        // Use subtract instead of set
        new ModifyCardAttributeCommand(
          locationID,
          AttributeType.Ammo,
          1, // Reduce by 1
          "subtract",
        ).execute(gameState);
      }

      // Immediately fire the card
      new FireCardCommand(locationID).execute(gameState);

      // Reset the card's tick if it has a cooldown
      // To allow for overcharging an item, we remove the cooldown max instead of setting the tick to 0
      if ("CooldownMax" in card) {
        new Commands.ModifyCardAttributeCommand(
          locationID,
          "tick",
          cooldownMax,
          "subtract",
        ).execute(gameState);
      }
    }
  }

  return true; // Card was processed
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
    if (getPlayerAttribute(gameState, playerID, "Health") <= 0) {
      isPlaying = false;

      // Log player death
      eventBus.addCommandToLog(
        new Commands.SystemCommand(`Player ${playerID} has died`),
      );

      eventBus.emit(new PlayerDiedEvent(playerID));
    }
  });

  gameState.isPlaying = isPlaying;

  // Determine winner
  if (
    getPlayerAttribute(gameState, 0, "Health") <= 0 &&
    getPlayerAttribute(gameState, 1, "Health") <= 0
  ) {
    gameState.winner = "Draw";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended in a draw"),
    );

    eventBus.emit(new GameEndedEvent("Draw"));
  } else if (getPlayerAttribute(gameState, 0, "Health") <= 0) {
    gameState.winner = "Player";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended - Player wins"),
    );

    eventBus.emit(new GameEndedEvent("Player"));
  } else if (getPlayerAttribute(gameState, 1, "Health") <= 0) {
    gameState.winner = "Enemy";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended - Enemy wins"),
    );

    eventBus.emit(new GameEndedEvent("Enemy"));
  }
}
