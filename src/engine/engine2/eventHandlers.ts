import { GameState, BoardCardID, LogEntry } from "./engine2";
import * as Commands from "./commands";
import { Ability, AttributeType, Priority } from "../../types/cardTypes";
import { createPrerequisitesCheck } from "./prereq";
import { playerName } from "./commands";

/**
 * Base Game Event class
 */
export abstract class GameEvent {
  abstract readonly type: string;
  readonly tick?: number;
  abstract getDescription(): string;
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
 * Game Events
 */
export class GameTickEvent extends GameEvent {
  readonly type = "game:tick";
  constructor(public readonly tick: number) {
    super();
  }

  getDescription(): string {
    return `Tick: ${this.tick}`;
  }
}

export class GameFightStartedEvent extends GameEvent {
  readonly type = "game:fightStarted";

  constructor() {
    super();
  }

  getDescription(): string {
    return "Fight started";
  }
}

export class GameEndedEvent extends GameEvent {
  readonly type = "game:ended";
  constructor(public readonly winner: string) {
    super();
  }

  getDescription(): string {
    return `Game ended - Winner: ${this.winner}`;
  }
}

/**
 * Card Events
 */
export class CardFiredEvent extends GameEvent {
  readonly type = "card:fired";
  constructor(public readonly sourceCardID: BoardCardID) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} was fired`;
  }
}

export class CardItemUsedEvent extends GameEvent {
  readonly type = "card:itemused";
  constructor(public readonly sourceCardID: BoardCardID) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} was used`;
  }
}

export class CardAttributeChangedEvent extends GameEvent {
  readonly type = "card:attributeChanged";
  constructor(
    public readonly boardCardID: BoardCardID,
    public readonly attribute: AttributeType | "tick",
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.boardCardID.playerIdx)}'s card ${this.boardCardID.cardIdx} ${this.attribute} changed from ${this.oldValue} to ${this.newValue}`;
  }
}

export class CardAddedEvent extends GameEvent {
  readonly type = "card:added";
  constructor(
    public readonly boardCardID: BoardCardID,
    public readonly card: unknown,
  ) {
    super();
  }

  getDescription(): string {
    return `Card added to ${playerName(this.boardCardID.playerIdx)}'s board at position ${this.boardCardID.cardIdx}`;
  }
}

export class CardRemovedEvent extends GameEvent {
  readonly type = "card:removed";
  constructor(public readonly boardCardID: BoardCardID) {
    super();
  }

  getDescription(): string {
    return `Card removed from ${playerName(this.boardCardID.playerIdx)}'s board at position ${this.boardCardID.cardIdx}`;
  }
}

/**
 * Player Events
 */
export class PlayerDamagedEvent extends GameEvent {
  readonly type = "player:damaged";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} took ${this.amount} damage`;
    }
    return `${playerName(this.playerIdx)} took ${this.amount} damage from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerHealedEvent extends GameEvent {
  readonly type = "player:healed";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} was healed for ${this.amount}`;
    }
    return `${playerName(this.playerIdx)} was healed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerOverhealedEvent extends GameEvent {
  readonly type = "player:overhealed";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} was overhealed for ${this.amount}`;
    }
    return `${playerName(this.playerIdx)} was overhealed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerLifestealHealEvent extends GameEvent {
  readonly type = "player:lifestealheal";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} healed ${this.amount} from lifesteal`;
    }
    return `${playerName(this.playerIdx)} healed ${this.amount} from lifesteal via ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerAttributeChangedEvent extends GameEvent {
  readonly type = "player:attributeChanged";
  constructor(
    public readonly playerIdx: number,
    public readonly attribute: string,
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.playerIdx)}'s ${this.attribute} changed from ${this.oldValue} to ${this.newValue}`;
  }
}

export class PlayerAttributeChangeHandledEvent extends GameEvent {
  readonly type = "player:attributeChangeHandled";
  constructor(
    public readonly playerIdx: number,
    public readonly attribute: string,
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.playerIdx)}'s ${this.attribute} change was handled`;
  }
}

export class PlayerDiedEvent extends GameEvent {
  readonly type = "player:died";
  constructor(public readonly playerID: number) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.playerID)} died`;
  }
}

export class PlayerShieldAppliedEvent extends GameEvent {
  readonly type = "player:shieldApplied";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} gained ${this.amount} shield`;
    }
    return `${playerName(this.playerIdx)} gained ${this.amount} shield from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerPoisonAppliedEvent extends GameEvent {
  readonly type = "player:poisonApplied";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} was poisoned for ${this.amount}`;
    }
    return `${playerName(this.playerIdx)} was poisoned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerBurnAppliedEvent extends GameEvent {
  readonly type = "player:burnApplied";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: BoardCardID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} was burned for ${this.amount}`;
    }
    return `${playerName(this.playerIdx)} was burned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

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
 * Create a BoardCardID
 */
function createBoardCardID(playerID: number, cardID: number): BoardCardID {
  return { playerIdx: playerID, cardIdx: cardID };
}

/**
 * Map of trigger types to event constructors
 */
const triggerToEventMap: Record<string, GameEventConstructor<GameEvent>> = {
  TTriggerOnCardFired: CardFiredEvent as GameEventConstructor<GameEvent>,
  TTriggerOnTick: GameTickEvent as GameEventConstructor<GameEvent>,
  TTriggerOnFightStart:
    GameFightStartedEvent as GameEventConstructor<GameEvent>,
  // Add more mappings as needed
};

/**
 * Convert ability trigger to event class constructor
 */
function triggerToEvent(trigger: {
  $type?: string;
}): GameEventConstructor<GameEvent> {
  const triggerType = trigger?.$type || "";
  return triggerToEventMap[triggerType];
}

/**
 * Map of trigger type to checker functions
 */
type TriggerCheckFn = (
  boardCardID: BoardCardID,
  gs: GameState,
  e: GameEvent,
) => boolean;

const triggerCheckers: Record<string, TriggerCheckFn> = {
  TTriggerOnCardFired: (boardCardID, _gs, e) => {
    if (e instanceof CardFiredEvent) {
      return (
        e.sourceCardID.playerIdx === boardCardID.playerIdx &&
        e.sourceCardID.cardIdx === boardCardID.cardIdx
      );
    }
    return false;
  },
  TTriggerOnTick: (_boardCardID, _gs, e) => {
    return e instanceof GameTickEvent;
  },
  TTriggerOnFightStart: (_boardCardID, _gs, e) => {
    return e instanceof GameFightStartedEvent;
  },
  // Add more trigger checkers as needed
};

/**
 * Create a trigger check function for an ability
 */
function createTriggerCheck(
  ability: Ability,
  boardCardID: BoardCardID,
): (gs: GameState, e: GameEvent) => boolean {
  const triggerType = ability.Trigger.$type || "";
  const checker = triggerCheckers[triggerType];

  if (!checker) {
    console.warn(
      `Unhandled trigger type: ${triggerType} for ability ${ability.InternalName}`,
    );

    // Default to a function that always returns false
    return () => false;
  }

  // Return a function that calls the appropriate checker with the boardCardID
  return (gs: GameState, e: GameEvent) => checker(boardCardID, gs, e);
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

        const eventClass = triggerToEvent(ability.Trigger);
        const triggerCheck = createTriggerCheck(ability, boardCardID);
        const prerequisiteCheck = createPrerequisitesCheck(
          ability,
          boardCardID,
        );

        // Create a combined test function that checks both prerequisites and trigger conditions
        const shouldReceiveEvent = (
          gs: GameState,
          event: GameEvent,
        ): boolean => {
          return prerequisiteCheck(gs, event) && triggerCheck(gs, event);
        };

        const eventHandler = (gs: GameState, event: GameEvent): void => {
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
          eventClass,
          eventHandler,
          ability.Priority || Priority.Medium,
          shouldReceiveEvent,
        );
      });
    });
  });

  // Handle game tick events with Highest priority
  eventBus.on(
    GameTickEvent,
    (gameState, event) => {
      // No need to check instanceof since we're using typed handlers
      handleGameTick(gameState, event.tick);
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

      eventBus.emit(new PlayerDiedEvent(playerID));
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

    eventBus.emit(new GameEndedEvent("Draw"));
  } else if (gameState.players[0].Health <= 0) {
    gameState.winner = "Player";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended - Player wins"),
    );

    eventBus.emit(new GameEndedEvent("Player"));
  } else if (gameState.players[1].Health <= 0) {
    gameState.winner = "Enemy";

    // Log game end
    eventBus.addCommandToLog(
      new Commands.SystemCommand("Game ended - Enemy wins"),
    );

    eventBus.emit(new GameEndedEvent("Enemy"));
  }
}
