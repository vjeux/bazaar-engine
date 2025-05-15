import { Player } from "../Engine";
import {
  AbilityAction,
  AttributeType,
  Enchantments,
} from "../../types/cardTypes";
import { GameState, BoardCardID, getCardAttribute } from "./engine2";
import { BoardCard } from "../Engine";
import { Tier } from "@/types/shared";
import { PlayerCardConfig } from "../GameState";
import { GameEvents } from "./eventHandlers";

export interface CardConfig {
  cardId: string;
  tier?: Tier;
  enchantment?: keyof Enchantments;
  attributeOverrides?: Partial<Record<AttributeType, number>>;
}

/**
 * Command interface
 */
export interface Command {
  execute(gameState: GameState): void;
}

/**
 * List of commands to be executed
 */
class CommandList implements Command {
  private commands: Command[] = [];

  constructor(commands?: Command[]) {
    this.commands = commands ?? [];
  }

  addCommand(command: Command) {
    this.commands.push(command);
  }

  execute(gameState: GameState): void {
    this.commands.forEach((command) => command.execute(gameState));
  }
}

/**
 * Factory for creating commands based on action types
 */
export class CommandFactory {
  static createFromAction(
    action: AbilityAction,
    sourceCardID: BoardCardID,
    gameState: GameState,
  ): Command | null {
    switch (action.$type) {
      case "TActionPlayerDamage":
        // get damage attribute from source card
        const damage = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DamageAmount,
        );
        const targetPlayersIdx = getTargetPlayersIdx(action.Target);
        const commands = new CommandList();
        for (const targetPlayerIdx of targetPlayersIdx) {
          commands.addCommand(
            new DamagePlayerCommand(targetPlayerIdx, damage, sourceCardID),
          );
        }
        return commands;

      case "TActionPlayerHeal":
        // Logic to determine heal amount from the action
        return new HealPlayerCommand(targetPlayerID, 5, sourceCardID);

      // Add more case statements for other action types

      default:
        console.error(`Unhandled action type: ${action.$type}`);
        return null;
    }
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
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.playerID];

    // In a real implementation, this would call createBoardCardFromId from GameState.ts
    // For now, we're converting the config directly to a BoardCard with type casting
    const boardCard = this.cardConfig as unknown as BoardCard;

    // Add to the specified position or to the end
    const cardID = this.position >= 0 ? this.position : player.board.length;

    if (this.position >= 0 && this.position < player.board.length) {
      // Replace card at position
      player.board[this.position] = boardCard;
    } else {
      // Add to the end
      player.board.push(boardCard);
    }

    const boardCardID: BoardCardID = {
      playerIdx: this.playerID,
      cardIdx: cardID,
    };

    // Emit event that card was added
    gameState.eventBus.emit("card:added", {
      boardCardID,
      card: boardCard,
    });
  }
}

/**
 * Command to remove a card from the board and unregister its event listeners
 */
export class RemoveCardCommand implements Command {
  constructor(private boardCardID: BoardCardID) {}

  execute(gameState: GameState): void {
    const { playerIdx: playerID, cardIdx: cardID } = this.boardCardID;
    const player = gameState.players[playerID];

    if (cardID >= 0 && cardID < player.board.length) {
      // Remove the card
      player.board.splice(cardID, 1);

      // Emit event that card was removed
      gameState.eventBus.emit("card:removed", {
        boardCardID: this.boardCardID,
      });

      // Note: We might need to update all other card IDs since they've shifted
      // That's an implementation detail to consider
    }
  }
}

/**
 * Command to modify a card attribute
 */
export class ModifyCardAttributeCommand implements Command {
  constructor(
    private boardCardID: BoardCardID,
    private attribute: AttributeType | "tick",
    private value: number,
    private operation: "set" | "add" | "subtract" | "multiply" = "set",
  ) {}

  execute(gameState: GameState): void {
    const { playerIdx: playerID, cardIdx: cardID } = this.boardCardID;
    const card = gameState.players[playerID].board[cardID];
    const oldValue = card[this.attribute] as number;
    let newValue: number;

    switch (this.operation) {
      case "set":
        newValue = this.value;
        break;
      case "add":
        newValue = (oldValue || 0) + this.value;
        break;
      case "subtract":
        newValue = (oldValue || 0) - this.value;
        break;
      case "multiply":
        newValue = (oldValue || 0) * this.value;
        break;
    }

    card[this.attribute] = newValue;

    // Emit event for attribute change
    gameState.eventBus.emit("card:attributeChanged", {
      boardCardID: this.boardCardID,
      attribute: this.attribute,
      oldValue,
      newValue,
    });
  }
}

/**
 * Command to modify a player attribute
 */
export class ModifyPlayerAttributeCommand implements Command {
  constructor(
    private playerIdx: number,
    private attribute: keyof {
      [K in keyof Player as Player[K] extends number ? K : never]: Player[K];
    }, // ensures player attribute being changed is a number
    private operation: "set" | "add" | "subtract" | "multiply" = "set",
    private value: number,
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.playerIdx];
    const oldValue = player[this.attribute];
    let newValue: number;

    switch (this.operation) {
      case "set":
        newValue = this.value;
        break;
      case "add":
        newValue = oldValue + this.value;
        break;
      case "subtract":
        newValue = oldValue - this.value;
        break;
      case "multiply":
        newValue = oldValue * this.value;
        break;
    }

    player[this.attribute] = newValue;

    // Emit event for attribute change
    gameState.eventBus.emit("player:attributeChanged", {
      playerIdx: this.playerIdx,
      attribute: this.attribute,
      oldValue,
      newValue,
    });
  }
}

/**
 * Command to apply damage to a player
 *
 * Can have null source as Sandstorm damage is not from a card
 */
export class DamagePlayerCommand implements Command {
  constructor(
    private targetPlayerIdx: number,
    private amount: number,
    private sourceCardID: BoardCardID | null,
  ) {}

  execute(gameState: GameState): void {
    const targetPlayer = gameState.players[this.targetPlayerIdx];
    const targetPlayerShield = targetPlayer.Shield;

    if (targetPlayerShield >= this.amount) {
      new ModifyPlayerAttributeCommand(
        this.targetPlayerIdx,
        "Shield",
        "subtract",
        this.amount,
      ).execute(gameState);
    } else {
      const remainingDamage = this.amount - targetPlayerShield;
      new ModifyPlayerAttributeCommand(
        this.targetPlayerIdx,
        "Shield",
        "set",
        0,
      ).execute(gameState);
      new ModifyPlayerAttributeCommand(
        this.targetPlayerIdx,
        "Health",
        "set",
        targetPlayer.Health - remainingDamage,
      ).execute(gameState);
    }

    // Delay events as we want to process them after the command is executed
    const delayedEvents: Array<{
      eventName: keyof GameEvents;
      eventData: GameEvents[keyof GameEvents];
    }> = [];

    // If lifesteal amount > 0, add health to source player, emit lifestealheal event
    if (
      this.sourceCardID &&
      getCardAttribute(gameState, this.sourceCardID, AttributeType.Lifesteal) >
        0
    ) {
      const lifestealPercent = getCardAttribute(
        gameState,
        this.sourceCardID,
        AttributeType.Lifesteal,
      );
      const sourcePlayer = gameState.players[this.sourceCardID.playerIdx];
      const sourcePlayerHealth = sourcePlayer.Health;
      const sourcePlayerHealthMax = sourcePlayer.HealthMax;
      const newSourcePlayerHealth = Math.min(
        sourcePlayerHealth + this.amount * (lifestealPercent / 100),
        sourcePlayerHealthMax,
      );
      new ModifyPlayerAttributeCommand(
        this.sourceCardID.playerIdx,
        "Health",
        "set",
        newSourcePlayerHealth,
      ).execute(gameState);
      delayedEvents.push({
        eventName: "player:lifestealheal",
        eventData: {
          playerIdx: this.sourceCardID.playerIdx,
          amount: this.amount * (lifestealPercent / 100),
          sourceCardID: this.sourceCardID,
        },
      });
    }

    if (this.sourceCardID) {
      // Emit damage event
      delayedEvents.push({
        eventName: "player:damaged",
        eventData: {
          playerIdx: this.targetPlayerIdx,
          amount: this.amount,
          sourceCardID: this.sourceCardID,
        },
      });
    }

    // Emit delayed events
    delayedEvents.forEach((event) => {
      gameState.eventBus.emit(event.eventName, event.eventData);
    });
  }
}

/**
 * Command to heal a player
 */
export class HealPlayerCommand implements Command {
  constructor(
    private targetPlayerID: number,
    private amount: number,
    private sourceCardID: BoardCardID | null,
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.targetPlayerID];
    const newHealth = Math.min(player.Health + this.amount, player.HealthMax);

    if (newHealth > player.Health) {
      new ModifyPlayerAttributeCommand(
        this.targetPlayerID,
        "Health",
        "set",
        newHealth,
      ).execute(gameState);

      // Emit heal event
      gameState.eventBus.emit("player:healed", {
        playerIdx: this.targetPlayerID,
        amount: this.amount,
        sourceCardID: this.sourceCardID,
      });
    } else {
      // Emit overheal event if player was already at max health
      gameState.eventBus.emit("player:overhealed", {
        playerIdx: this.targetPlayerID,
        amount: this.amount,
        sourceCardID: this.sourceCardID,
      });
    }
  }
}

/**
 * Command to trigger a card's ability
 */
export class TriggerCardCommand implements Command {
  constructor(private boardCardID: BoardCardID) {}

  execute(gameState: GameState): void {
    const { playerIdx: playerID, cardIdx: cardID } = this.boardCardID;
    const card = gameState.players[playerID].board[cardID];

    // Emit card trigger event
    gameState.eventBus.emit("card:triggered", {
      boardCardID: this.boardCardID,
      card,
    });

    // Reset the card's tick if it has a cooldown
    if ("CooldownMax" in card) {
      new ModifyCardAttributeCommand(this.boardCardID, "tick", 0).execute(
        gameState,
      );
    }
  }
}

/**
 * Command to apply shield to a player
 */
export class ApplyShieldCommand implements Command {
  constructor(
    private targetPlayerID: number,
    private amount: number,
    private sourceCardID: BoardCardID | null,
  ) {}

  execute(gameState: GameState): void {
    new ModifyPlayerAttributeCommand(
      this.targetPlayerID,
      "Shield",
      "add",
      this.amount,
    ).execute(gameState);

    // Emit shield applied event
    gameState.eventBus.emit("player:shieldApplied", {
      playerIdx: this.targetPlayerID,
      amount: this.amount,
      sourceCardID: this.sourceCardID,
    });
  }
}

/**
 * Command to apply poison to a player
 */
export class ApplyPoisonCommand implements Command {
  constructor(
    private targetPlayerID: number,
    private amount: number,
    private sourceCardID: BoardCardID | null,
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.targetPlayerID];

    new ModifyPlayerAttributeCommand(
      this.targetPlayerID,
      "Poison",
      "set",
      player.Poison + this.amount,
    ).execute(gameState);

    // Emit poison applied event
    gameState.eventBus.emit("player:poisonApplied", {
      playerIdx: this.targetPlayerID,
      amount: this.amount,
      sourceCardID: this.sourceCardID,
    });
  }
}

/**
 * Command to apply burn to a player
 */
export class ApplyBurnCommand implements Command {
  constructor(
    private targetPlayerID: number,
    private amount: number,
    private sourceCardID: BoardCardID | null,
  ) {}

  execute(gameState: GameState): void {
    new ModifyPlayerAttributeCommand(
      this.targetPlayerID,
      "Burn",
      "add",
      this.amount,
    ).execute(gameState);

    // Emit burn applied event
    gameState.eventBus.emit("player:burnApplied", {
      playerIdx: this.targetPlayerID,
      amount: this.amount,
      sourceCardID: this.sourceCardID,
    });
  }
}

/**
 * Command to process a game tick
 */
export class ProcessTickCommand implements Command {
  execute(gameState: GameState): void {
    // Increment the tick
    gameState.tick += 100;

    // Emit the tick event
    gameState.eventBus.emit("game:tick", {
      tick: gameState.tick,
    });
  }
}
