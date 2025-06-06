import { Ability, AttributeType, Priority } from "../../types/cardTypes";
import {
  GameState,
  CardLocationID,
  CardAttributeSnapshot,
  PlayerAttributeNumber,
} from "./engine2";
import { getCardAttribute, getPlayerAttribute } from "./getAttribute";
import { createBoardCardFromId, PlayerCardConfig } from "../GameState";
import {
  CardFiredEvent,
  CardItemUsedEvent,
  CardAttributeChangedEvent,
  CardAddedEvent,
  CardRemovedEvent,
  PlayerDamagedEvent,
  CardPerformedHealEvent,
  PlayerOverhealedEvent,
  PlayerLifestealHealEvent,
  PlayerAttributeChangedEvent,
  CardPerformedShieldEvent,
  CardPerformedPoisonEvent,
  CardPerformedBurnEvent,
  CardCrittedEvent,
  CardPerformedHasteEvent,
  CardPerformedSlowEvent,
  CardPerformedChargeEvent,
  CardPerformedRegenEvent,
  CardPerformedFreezeEvent,
  CardDisabledEvent,
  CardReloadedEvent,
  CardPerformedReloadEvent,
} from "./events";
import { GameEvent } from "./events";
import { getBoardCardByID } from "./targeting";
import { PLAYER_PLAYER_IDX } from "@/lib/constants";
import { genCardsAndEncounters } from "@/lib/Data";
import { createTriggerCheck } from "./createTriggerCheck";
import { triggerToEvent } from "./triggerToEvent";
import { createPrerequisitesCheck } from "./prereq";
import { CommandFactory } from "./CommandFactory";

const { Cards } = await genCardsAndEncounters();

/**
 * Helper function to convert player index to readable name
 */
export function playerName(playerIdx: number): string {
  return playerIdx === PLAYER_PLAYER_IDX ? "Player" : "Enemy";
}

/**
 * Command interface
 */
export interface Command {
  execute(gameState: GameState): void;
  toLogString?(): string;
}

/**
 * List of commands to be executed
 */
export class CommandList implements Command {
  private commands: Command[] = [];

  constructor(commands?: Command[]) {
    this.commands = commands ?? [];
  }

  addCommand(command: Command) {
    this.commands.push(command);
  }

  execute(gameState: GameState): void {
    this.commands.forEach((command) => {
      // Execute the command
      command.execute(gameState);
    });
  }

  toLogString(): string {
    return this.commands
      .map(
        (command) => command.toLogString?.() || `${command.constructor.name}`,
      )
      .join("\n");
  }
}

export class RegisterCardEventsCommand implements Command {
  constructor(private locationID: CardLocationID) {}

  execute(gameState: GameState): void {
    const card = getBoardCardByID(gameState, this.locationID);
    Object.values(card.Abilities).forEach((ability: Ability) => {
      const eventClass = triggerToEvent(ability.Trigger);
      const triggerCheck = createTriggerCheck(ability, this.locationID);
      const prerequisiteCheck = createPrerequisitesCheck(
        ability,
        this.locationID,
      );

      // Create a combined test function that checks both prerequisites and trigger conditions
      const shouldReceiveEvent = (gs: GameState, event: GameEvent): boolean => {
        return prerequisiteCheck(gs, event) && triggerCheck(gs, event);
      };

      const eventHandler = (gs: GameState, event: GameEvent): void => {
        const command = CommandFactory.createFromAction(
          ability.Action,
          this.locationID,
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
      gameState.eventBus.on(
        eventClass,
        eventHandler,
        ability.Priority || Priority.Medium,
        shouldReceiveEvent,
      );
      // Store the eventclass and handler on the card so they can be unregistered later
      if (!card.registeredTriggers.has(eventClass)) {
        card.registeredTriggers.set(eventClass, []);
      }
      card.registeredTriggers.get(eventClass)!.push(eventHandler);
    });
  }
}

/**
 * Command to add a card to the board and register its event listeners
 */
export class AddCardCommand implements Command {
  constructor(
    private playerID: number,
    private cardConfig: PlayerCardConfig,
    private position: number = -1, // -1 means add to the end
    private location: "board" | "stash" = "board",
  ) {}

  execute(gameState: GameState) {
    const player = gameState.players[this.playerID];

    const boardCard = createBoardCardFromId(
      Cards,
      this.cardConfig.cardId,
      this.cardConfig.tier,
      this.cardConfig.enchantment,
      this.cardConfig.attributeOverrides,
    );

    // Add to the specified position or to the end
    const insertPosition =
      this.position >= 0 ? this.position : player.board.length;

    if (insertPosition >= player.board.length) {
      player.board.push(boardCard);
    } else {
      player.board.splice(insertPosition, 0, boardCard);
    }

    const locationID: CardLocationID = {
      playerIdx: this.playerID,
      cardIdx: insertPosition,
      location: this.location,
    };

    // Register all events assosciated with the card
    new RegisterCardEventsCommand(locationID).execute(gameState);

    // Emit event that card was added
    gameState.eventBus.emit(new CardAddedEvent(locationID, boardCard));
  }

  toLogString(): string {
    return `Add card to ${playerName(this.playerID)}'s board at position ${this.position}`;
  }
}

/**
 * Command to remove a card from the board and unregister its event listeners
 */
export class RemoveCardCommand implements Command {
  constructor(private locationID: CardLocationID) {}

  execute(gameState: GameState): void {
    const { playerIdx, cardIdx, location } = this.locationID;
    const player = gameState.players[playerIdx];

    if (cardIdx >= 0 && cardIdx < player[location].length) {
      // Unregister all events assosciated with the card
      const card = getBoardCardByID(gameState, this.locationID);
      card.registeredTriggers.forEach((handlers, eventClass) => {
        handlers.forEach((handler) => {
          gameState.eventBus.off(eventClass, handler);
        });
      });

      // Remove the card
      player[location].splice(cardIdx, 1);

      // Emit event that card was removed
      gameState.eventBus.emit(new CardRemovedEvent(this.locationID));
    } else {
      throw new Error(
        `Could not remove card. ${playerName(
          this.locationID.playerIdx,
        )} has ${player[location].length} cards in ${location} and card at index ${this.locationID.cardIdx} not found`,
      );
    }
  }

  toLogString(): string {
    return `Remove card from ${playerName(this.locationID.playerIdx)}'s board at position ${this.locationID.cardIdx}`;
  }
}

/**
 * Command to modify a card attribute
 */
export class ModifyCardAttributeCommand implements Command {
  constructor(
    private targetCardID: CardLocationID,
    private attribute: AttributeType | "tick",
    private value: number,
    private operation: "set" | "add" | "subtract" | "multiply" = "set",
  ) {}

  execute(gameState: GameState): void {
    const { playerIdx: playerID, cardIdx: cardID } = this.targetCardID;
    const card = gameState.players[playerID].board[cardID];

    // Initialize attribute draft if needed
    if (!card.attributeDraft) {
      card.attributeDraft = {};
    }

    // Get the current effective value (from draft if exists, otherwise from snapshot)
    let currentValue: number | undefined;

    if (this.attribute in card.attributeDraft) {
      // Value already exists in draft
      currentValue = card.attributeDraft[this.attribute];
    } else if (gameState.attributeSnapshots?.cards.has(card.uuid)) {
      // Get from snapshot
      const snapshot = gameState.attributeSnapshots.cards.get(card.uuid);
      currentValue = snapshot?.[this.attribute];
    } else {
      // Fallback to current value
      currentValue = card[this.attribute] as number;
    }

    // Calculate new value
    let newValue: number;
    switch (this.operation) {
      case "set":
        newValue = this.value;
        break;
      case "add":
        newValue = (currentValue || 0) + this.value;
        // Cap at AmmoMax
        if (
          this.attribute === "Ammo" &&
          card.AmmoMax &&
          newValue > card.AmmoMax
        ) {
          newValue = card.AmmoMax;
        }
        break;
      case "subtract":
        newValue = (currentValue || 0) - this.value;
        // Cap at 0 for attributes that should not be negative
        if (
          newValue < 0 &&
          (this.attribute === AttributeType.Ammo ||
            this.attribute === AttributeType.AmmoMax ||
            this.attribute === AttributeType.CooldownMax ||
            this.attribute === AttributeType.Freeze ||
            this.attribute === AttributeType.Slow ||
            this.attribute === AttributeType.Haste ||
            this.attribute === AttributeType.ChargeAmount ||
            this.attribute === AttributeType.ReloadAmount ||
            this.attribute === AttributeType.CritChance ||
            this.attribute === AttributeType.DamageAmount ||
            this.attribute === AttributeType.HealAmount ||
            this.attribute === "tick")
        ) {
          newValue = 0;
        }
        break;
      case "multiply":
        newValue = (currentValue || 0) * this.value;
        break;
    }

    // Update the draft
    card.attributeDraft[this.attribute] = newValue;

    // Emit event for attribute change
    gameState.eventBus.emit(
      new CardAttributeChangedEvent(
        this.targetCardID,
        this.attribute,
        currentValue || 0,
        newValue,
      ),
    );
  }

  toLogString(): string {
    const operation =
      this.operation === "set"
        ? "set"
        : this.operation === "add"
          ? "increased"
          : this.operation === "subtract"
            ? "decreased"
            : "multiplied";

    return `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${playerName(this.targetCardID.playerIdx)}'s card ${this.targetCardID.cardIdx} ${this.attribute} to ${this.value}`;
  }
}

/**
 * Command to modify a player attribute
 */
export class ModifyPlayerAttributeCommand implements Command {
  constructor(
    private playerIdx: number,
    private attribute: PlayerAttributeNumber,
    private operation: "set" | "add" | "subtract" | "multiply" = "set",
    private value: number,
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.playerIdx];

    if (!player.attributeDraft) {
      throw new Error("Player attribute draft not initialized");
    }

    // Get the current effective value (from draft if exists, otherwise from snapshot or current)
    let currentValue: number;

    if (this.attribute in player.attributeDraft) {
      // Value already exists in draft
      currentValue = player.attributeDraft[this.attribute] as number;
    } else if (gameState.attributeSnapshots?.players[this.playerIdx]) {
      // Get from snapshot
      const snapshot = gameState.attributeSnapshots.players[this.playerIdx];
      currentValue =
        snapshot[this.attribute] !== undefined
          ? (snapshot[this.attribute] as number)
          : player[this.attribute];
    } else {
      // Fallback to current value
      currentValue = player[this.attribute];
    }

    // Calculate new value
    let newValue: number;
    switch (this.operation) {
      case "set":
        newValue = this.value;
        break;
      case "add":
        newValue = currentValue + this.value;
        // Cap at max health
        if (this.attribute === "Health" && newValue > player.HealthMax) {
          newValue = player.HealthMax;
        }
        break;
      case "subtract":
        newValue = currentValue - this.value;
        // Cap at 0 for attributes that should not be negative
        if (
          newValue < 0 &&
          (this.attribute === "Health" ||
            this.attribute === "HealthMax" ||
            this.attribute === "HealthRegen" ||
            this.attribute === "Shield" ||
            this.attribute === "Burn" ||
            this.attribute === "Poison" ||
            this.attribute === "Gold" ||
            this.attribute === "Income")
        ) {
          newValue = 0;
        }
        break;
      case "multiply":
        newValue = currentValue * this.value;
        break;
    }

    // Update the draft
    player.attributeDraft[this.attribute] = newValue;

    // Only emit event if the value actually changed
    if (currentValue !== newValue) {
      // Emit event for attribute change
      gameState.eventBus.emit(
        new PlayerAttributeChangedEvent(
          this.playerIdx,
          this.attribute,
          currentValue,
          newValue,
        ),
      );
    }
  }

  toLogString(): string {
    const operation =
      this.operation === "set"
        ? "set"
        : this.operation === "add"
          ? "increased"
          : this.operation === "subtract"
            ? "decreased"
            : "multiplied";

    return `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${playerName(this.playerIdx)}'s ${this.attribute} to ${this.value}`;
  }
}

/**
 * Command to apply damage to a player
 *
 * Can have null source as Sandstorm damage is not from a card
 */
export class DamagePlayerCommand implements Command {
  constructor(
    private targetPlayerIdxs: number[],
    private amount: number,
    private sourceCardID: CardLocationID | null,
  ) {}

  execute(gameState: GameState): void {
    const damagedPlayers: number[] = [];

    this.targetPlayerIdxs.forEach((targetPlayerIdx) => {
      const targetPlayerShield = getPlayerAttribute(
        gameState,
        targetPlayerIdx,
        "Shield",
      );

      if (targetPlayerShield >= this.amount) {
        new ModifyPlayerAttributeCommand(
          targetPlayerIdx,
          "Shield",
          "subtract",
          this.amount,
        ).execute(gameState);
      } else {
        const remainingDamage = this.amount - targetPlayerShield;
        new ModifyPlayerAttributeCommand(
          targetPlayerIdx,
          "Shield",
          "subtract",
          targetPlayerShield,
        ).execute(gameState);
        new ModifyPlayerAttributeCommand(
          targetPlayerIdx,
          "Health",
          "subtract",
          remainingDamage,
        ).execute(gameState);
      }

      damagedPlayers.push(targetPlayerIdx);
    });

    // Delay events as we want to process them after the command is executed
    const delayedEvents: Array<GameEvent> = [];

    // If lifesteal amount > 0, add health to source player, emit lifestealheal event
    if (
      this.sourceCardID &&
      (getCardAttribute(
        gameState,
        this.sourceCardID,
        AttributeType.Lifesteal,
      ) ?? 0) > 0
    ) {
      const lifestealPercent =
        getCardAttribute(
          gameState,
          this.sourceCardID,
          AttributeType.Lifesteal,
        ) ?? 0;
      let lifestealAmount =
        this.amount * damagedPlayers.length * (lifestealPercent / 100); // Doesnt really make sense when we target multiple players.

      // Make sure we dont add more than to the max health
      const maxHealth = getPlayerAttribute(
        gameState,
        this.sourceCardID.playerIdx,
        "HealthMax",
      );
      const currentHealth = getPlayerAttribute(
        gameState,
        this.sourceCardID.playerIdx,
        "Health",
      );
      if (lifestealAmount > maxHealth - currentHealth) {
        lifestealAmount = maxHealth - currentHealth;
      }

      // Use add operation instead of calculating and setting
      new ModifyPlayerAttributeCommand(
        this.sourceCardID.playerIdx,
        "Health",
        "add",
        lifestealAmount,
      ).execute(gameState);

      delayedEvents.push(
        new PlayerLifestealHealEvent(
          this.sourceCardID.playerIdx,
          lifestealAmount,
          this.sourceCardID,
        ),
      );
    }

    if (damagedPlayers.length > 0) {
      delayedEvents.push(
        new PlayerDamagedEvent(damagedPlayers, this.amount, this.sourceCardID),
      );
    }

    // Emit delayed events
    delayedEvents.forEach((event) => {
      gameState.eventBus.emit(event);
    });
  }

  toLogString(): string {
    if (this.targetPlayerIdxs.length === 1) {
      if (!this.sourceCardID) {
        return `Dealt ${this.amount} damage to ${playerName(this.targetPlayerIdxs[0])}`;
      }
      return `Dealt ${this.amount} damage to ${playerName(this.targetPlayerIdxs[0])} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    if (!this.sourceCardID) {
      return `Dealt ${this.amount} damage to ${this.targetPlayerIdxs.length} players`;
    }
    return `Dealt ${this.amount} damage to ${this.targetPlayerIdxs.length} players from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

/**
 * Command to heal a player
 */
export class HealPlayerCommand implements Command {
  constructor(
    private targetPlayerIDs: number[],
    private amount: number,
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    const overhealed: number[] = [];
    const healed: number[] = [];
    const partialOverhealed: number[] = [];

    // Process each target player
    this.targetPlayerIDs.forEach((targetPlayerID) => {
      const player = gameState.players[targetPlayerID];
      const currentHealth = player.Health;
      const maxHealth = player.HealthMax;

      // Check if player is at max health
      if (currentHealth >= maxHealth) {
        // Already at max health, complete overheal
        overhealed.push(targetPlayerID);
      } else if (currentHealth + this.amount > maxHealth) {
        // Heal would exceed max health, partial overheal

        new ModifyPlayerAttributeCommand(
          targetPlayerID,
          "Health",
          "add",
          this.amount,
        ).execute(gameState);

        healed.push(targetPlayerID);
        partialOverhealed.push(targetPlayerID);
      } else {
        // Normal heal, not reaching max health
        new ModifyPlayerAttributeCommand(
          targetPlayerID,
          "Health",
          "add",
          this.amount,
        ).execute(gameState);

        healed.push(targetPlayerID);
      }
    });

    if (healed.length > 0) {
      gameState.eventBus.emit(
        new CardPerformedHealEvent(healed, this.amount, this.sourceCardID),
      );
    }

    const allOverhealed = [...overhealed, ...partialOverhealed];
    if (allOverhealed.length > 0) {
      gameState.eventBus.emit(
        new PlayerOverhealedEvent(
          allOverhealed,
          this.amount,
          this.sourceCardID,
        ),
      );
    }
  }

  toLogString(): string {
    if (this.targetPlayerIDs.length === 1) {
      return `Healed ${playerName(this.targetPlayerIDs[0])} for ${this.amount} health from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Healed ${this.targetPlayerIDs.length} players for ${this.amount} health from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class ApplyRegenCommand implements Command {
  constructor(
    private targetPlayerIDs: number[],
    private amount: number,
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    this.targetPlayerIDs.forEach((targetPlayerID) => {
      new ModifyPlayerAttributeCommand(
        targetPlayerID,
        "HealthRegen",
        "add",
        this.amount,
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedRegenEvent(
        this.sourceCardID,
        this.targetPlayerIDs,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetPlayerIDs.length === 1) {
      return `Applied ${this.amount} regen to ${playerName(this.targetPlayerIDs[0])} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} regen to ${this.targetPlayerIDs.length} players from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class FireCardCommand implements Command {
  constructor(private locationID: CardLocationID) {}

  execute(gameState: GameState): void {
    // Emit card fired event
    gameState.eventBus.emit(new CardFiredEvent(this.locationID));

    // Emit card:itemused event
    gameState.eventBus.emit(new CardItemUsedEvent(this.locationID));
  }

  toLogString(): string {
    return `Fired ${playerName(this.locationID.playerIdx)}'s card ${this.locationID.cardIdx}`;
  }
}

/**
 * Command to apply shield to a player
 */
export class ApplyShieldCommand implements Command {
  constructor(
    private targetPlayerIDs: number[],
    private amount: number,
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    this.targetPlayerIDs.forEach((targetPlayerID) => {
      new ModifyPlayerAttributeCommand(
        targetPlayerID,
        "Shield",
        "add",
        this.amount,
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedShieldEvent(
        this.targetPlayerIDs,
        this.sourceCardID,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetPlayerIDs.length === 1) {
      return `Applied ${this.amount} shield to ${playerName(this.targetPlayerIDs[0])} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} shield to ${this.targetPlayerIDs.length} players from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

/**
 * Command to apply poison to a player
 */
export class ApplyPoisonCommand implements Command {
  constructor(
    private targetPlayerIDs: number[],
    private amount: number,
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    this.targetPlayerIDs.forEach((targetPlayerID) => {
      new ModifyPlayerAttributeCommand(
        targetPlayerID,
        "Poison",
        "add",
        this.amount,
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedPoisonEvent(
        this.targetPlayerIDs,
        this.sourceCardID,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetPlayerIDs.length === 1) {
      return `Applied ${this.amount} poison to ${playerName(this.targetPlayerIDs[0])} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} poison to ${this.targetPlayerIDs.length} players from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

/**
 * Command to apply burn to a player
 */
export class ApplyBurnCommand implements Command {
  constructor(
    private targetPlayerIDs: number[],
    private amount: number,
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    this.targetPlayerIDs.forEach((targetPlayerID) => {
      new ModifyPlayerAttributeCommand(
        targetPlayerID,
        "Burn",
        "add",
        this.amount,
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedBurnEvent(
        this.targetPlayerIDs,
        this.sourceCardID,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetPlayerIDs.length === 1) {
      return `Applied ${this.amount} burn to ${playerName(this.targetPlayerIDs[0])} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} burn to ${this.targetPlayerIDs.length} players from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

/**
 * Command to apply haste to a card
 */
export class ApplyHasteCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardIDs: CardLocationID[],
    private amount: number,
  ) {}

  execute(gameState: GameState): void {
    this.targetCardIDs.forEach((targetCardID) => {
      new ModifyCardAttributeCommand(
        targetCardID,
        AttributeType.Haste,
        this.amount,
        "add",
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedHasteEvent(
        this.sourceCardID,
        this.targetCardIDs,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetCardIDs.length === 1) {
      const targetCard = this.targetCardIDs[0];
      return `Applied ${this.amount} haste to ${playerName(targetCard.playerIdx)}'s card ${targetCard.cardIdx} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} haste to ${this.targetCardIDs.length} cards from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class ApplySlowCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardIDs: CardLocationID[],
    private amount: number,
  ) {}

  execute(gameState: GameState): void {
    this.targetCardIDs.forEach((targetCardID) => {
      new ModifyCardAttributeCommand(
        targetCardID,
        AttributeType.Slow,
        this.amount,
        "add",
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedSlowEvent(
        this.sourceCardID,
        this.targetCardIDs,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetCardIDs.length === 1) {
      const targetCard = this.targetCardIDs[0];
      return `Applied ${this.amount} slow to ${playerName(targetCard.playerIdx)}'s card ${targetCard.cardIdx} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} slow to ${this.targetCardIDs.length} cards from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class ApplyFreezeCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardIDs: CardLocationID[],
    private amount: number,
  ) {}

  execute(gameState: GameState): void {
    this.targetCardIDs.forEach((targetCardID) => {
      new ModifyCardAttributeCommand(
        targetCardID,
        AttributeType.Freeze,
        this.amount,
        "add",
      ).execute(gameState);
    });

    gameState.eventBus.emit(
      new CardPerformedFreezeEvent(
        this.sourceCardID,
        this.targetCardIDs,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetCardIDs.length === 1) {
      const targetCard = this.targetCardIDs[0];
      return `Applied ${this.amount} freeze to ${playerName(targetCard.playerIdx)}'s card ${targetCard.cardIdx} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }
    return `Applied ${this.amount} freeze to ${this.targetCardIDs.length} cards from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

/**
 * Command to take snapshots of the current attributes
 */
export class SnapshotAttributesCommand implements Command {
  execute(gameState: GameState): void {
    // Skip if already snapshotted this tick
    if (gameState.isTickSnapshotted) {
      return;
    }

    // Initialize snapshot storage
    gameState.attributeSnapshots = {
      players: [],
      cards: new Map(),
    };

    // Snapshot player attributes
    gameState.players.forEach((player, playerIdx) => {
      // Store player attribute snapshot
      gameState.attributeSnapshots!.players[playerIdx] = {
        HealthMax: player.HealthMax,
        Health: player.Health,
        HealthRegen: player.HealthRegen,
        Shield: player.Shield,
        Burn: player.Burn,
        Poison: player.Poison,
        Gold: player.Gold,
        Income: player.Income,
      };

      // Set player attribute drafts to snapshot values
      player.attributeDraft = {
        HealthMax: player.HealthMax,
        Health: player.Health,
        HealthRegen: player.HealthRegen,
        Shield: player.Shield,
        Burn: player.Burn,
        Poison: player.Poison,
        Gold: player.Gold,
        Income: player.Income,
      };

      // Snapshot card attributes
      player.board.forEach((card) => {
        // Store card attribute snapshot
        const cardSnapshot: CardAttributeSnapshot = {};

        // Snapshot all numeric attributes
        Object.values(AttributeType).forEach((attr) => {
          if (card[attr] !== undefined) {
            cardSnapshot[attr] = card[attr] as number;
          }
        });

        // Snapshot tick and tags
        cardSnapshot.tick = card.tick;
        cardSnapshot.tags = [...card.tags];

        // Store in the snapshots map
        gameState.attributeSnapshots!.cards.set(card.uuid, cardSnapshot);

        // Set card attribute draft to snapshot values
        card.attributeDraft = {
          ...cardSnapshot,
        };
      });
    });

    // Mark tick as snapshotted
    gameState.isTickSnapshotted = true;
  }

  toLogString(): string {
    return "Snapshot attributes for the current tick";
  }
}

/**
 * Command to apply all attribute drafts
 */
export class ApplyAttributeDraftsCommand implements Command {
  execute(gameState: GameState): void {
    // Apply player attribute drafts
    gameState.players.forEach((player) => {
      if (player.attributeDraft) {
        Object.entries(player.attributeDraft).forEach(([attribute, value]) => {
          if (value !== undefined) {
            // Type-safe assignment with two-step casting
            (player as unknown as Record<string, unknown>)[attribute] = value;
          }
        });
      }
    });

    // Apply card attribute drafts
    gameState.players.forEach((player) => {
      player.board.forEach((card) => {
        if (card.attributeDraft) {
          // Apply numeric attributes
          Object.entries(card.attributeDraft).forEach(([attribute, value]) => {
            if (attribute !== "tags" && value !== undefined) {
              // Type-safe assignment with two-step casting
              (card as unknown as Record<string, unknown>)[attribute] = value;
            }
          });

          // Apply tags if they exist
          if (card.attributeDraft.tags) {
            card.tags = [...card.attributeDraft.tags];
          }
        }
      });
    });

    // Reset tick snapshot flag
    gameState.isTickSnapshotted = false;
  }

  toLogString(): string {
    return "Apply attribute drafts for the next tick";
  }
}

/**
 * Command to disable cards
 */
export class DisableCardCommand implements Command {
  constructor(private locationIDs: CardLocationID[]) {}

  execute(gameState: GameState): void {
    this.locationIDs.forEach((locationID) => {
      const { playerIdx, cardIdx } = locationID;
      gameState.players[playerIdx].board[cardIdx].isDisabled = true;
    });

    gameState.eventBus.emit(new CardDisabledEvent(this.locationIDs));
  }

  toLogString(): string {
    if (this.locationIDs.length === 1) {
      const locationID = this.locationIDs[0];
      return `Disabled ${playerName(locationID.playerIdx)}'s card ${locationID.cardIdx}`;
    }
    return `Disabled ${this.locationIDs.length} cards`;
  }
}

/**
 * Command to reload cards' ammo
 */
export class ReloadCardCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardIDs: CardLocationID[],
    private reloadAmount: number,
  ) {}

  execute(gameState: GameState): void {
    const reloadedCards: CardLocationID[] = [];

    this.targetCardIDs.forEach((targetCardID) => {
      const currentAmmo = getCardAttribute(
        gameState,
        targetCardID,
        AttributeType.Ammo,
      );
      const ammoMax = getCardAttribute(
        gameState,
        targetCardID,
        AttributeType.AmmoMax,
      );

      // If the card has no ammo or ammo max, don't do anything
      if (currentAmmo === undefined || ammoMax === undefined) {
        return;
      }

      // Only reload if we're not at max ammo already
      if (currentAmmo < ammoMax) {
        // Use add operation instead of calculating and setting
        new ModifyCardAttributeCommand(
          targetCardID,
          AttributeType.Ammo,
          this.reloadAmount,
          "add",
        ).execute(gameState);

        reloadedCards.push(targetCardID);
      }
    });

    if (reloadedCards.length > 0) {
      gameState.eventBus.emit(
        new CardPerformedReloadEvent(this.sourceCardID, reloadedCards),
      );
    }
    reloadedCards.forEach((targetCardID) => {
      gameState.eventBus.emit(new CardReloadedEvent(targetCardID));
    });
  }

  toLogString(): string {
    if (this.targetCardIDs.length === 1) {
      const targetCard = this.targetCardIDs[0];
      return `Reloaded ${playerName(targetCard.playerIdx)}'s card ${targetCard.cardIdx} with ${this.reloadAmount} ammo`;
    }
    return `Reloaded ${this.targetCardIDs.length} cards with ${this.reloadAmount} ammo`;
  }
}

/**
 * Command to charge a card (advance its cooldown)
 */
export class ChargeCardCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardIDs: CardLocationID[],
    private chargeAmount: number,
  ) {}

  execute(gameState: GameState): void {
    this.targetCardIDs.forEach((targetCardID) => {
      const cooldownMax = getCardAttribute(
        gameState,
        targetCardID,
        AttributeType.CooldownMax,
      );

      // If the card has no cooldown max, don't do anything
      if (cooldownMax === undefined) {
        return;
      }

      if (this.chargeAmount !== 0) {
        new ModifyCardAttributeCommand(
          targetCardID,
          "tick",
          this.chargeAmount,
          "add",
        ).execute(gameState);
      }
    });

    gameState.eventBus.emit(
      new CardPerformedChargeEvent(
        this.sourceCardID,
        this.targetCardIDs,
        this.chargeAmount,
      ),
    );
  }

  toLogString(): string {
    if (this.targetCardIDs.length === 1) {
      const targetCard = this.targetCardIDs[0];
      return `Charged ${playerName(targetCard.playerIdx)}'s card ${targetCard.cardIdx} by ${this.chargeAmount}`;
    }
    return `Charged ${this.targetCardIDs.length} cards by ${this.chargeAmount}`;
  }
}

/**
 * Command to begin sandstorm
 */
export class BeginSandstormCommand implements Command {
  execute(gameState: GameState): void {
    gameState.sandstormStartTick = gameState.tick;
  }

  toLogString(): string {
    return "Started sandstorm";
  }
}

/**
 * Command for system-level operations
 */
export class SystemCommand implements Command {
  constructor(private description: string) {}

  execute(_: GameState): void {
    // This is just a marker command for logging purposes
  }

  toLogString(): string {
    return this.description;
  }
}

/**
 * Command to emit a critical hit event
 */
export class EmitCritEventCommand implements Command {
  constructor(private sourceCardID: CardLocationID) {}

  execute(gameState: GameState): void {
    // Emit crit event
    gameState.eventBus.emit(new CardCrittedEvent(this.sourceCardID));
  }

  toLogString(): string {
    return `Critical hit by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}
