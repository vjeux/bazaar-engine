import { Player } from "../Engine";
import { AbilityAction, AttributeType } from "../../types/cardTypes";
import { GameState, BoardCardID } from "./engine2";

/**
 * Command interface
 */
export interface Command {
  execute(gameState: GameState): void;
}

/**
 * Factory for creating commands based on action types
 */
export class CommandFactory {
  static createFromAction(
    action: AbilityAction,
    sourceCardID: BoardCardID,
    targetPlayerID: number,
  ): Command | null {
    switch (action.$type) {
      case "TActionPlayerDamage":
        // This is a simplified example - real implementation would determine damage from ability
        return new DamagePlayerCommand(targetPlayerID, 10, sourceCardID);

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
    const { playerID, cardID } = this.boardCardID;
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
    private playerID: number,
    private attribute: keyof Player,
    private value: number,
    private operation: "set" | "add" | "subtract" | "multiply" = "set",
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.playerID];
    const oldValue = player[this.attribute] as number;
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

    // Using type assertion to handle the attribute update
    (player[this.attribute] as unknown) = newValue;

    // Emit event for attribute change
    gameState.eventBus.emit("player:attributeChanged", {
      playerID: this.playerID,
      attribute: this.attribute,
      oldValue,
      newValue,
    });
  }
}

/**
 * Command to apply damage to a player
 */
export class DamagePlayerCommand implements Command {
  constructor(
    private targetPlayerID: number,
    private amount: number,
    private sourceCardID: BoardCardID | null,
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.targetPlayerID];
    const shield = player.Shield;

    if (shield >= this.amount) {
      new ModifyPlayerAttributeCommand(
        this.targetPlayerID,
        "Shield",
        shield - this.amount,
        "set",
      ).execute(gameState);
    } else {
      const remainingDamage = this.amount - shield;
      new ModifyPlayerAttributeCommand(
        this.targetPlayerID,
        "Shield",
        0,
        "set",
      ).execute(gameState);
      new ModifyPlayerAttributeCommand(
        this.targetPlayerID,
        "Health",
        player.Health - remainingDamage,
        "set",
      ).execute(gameState);
    }

    // Emit damage event
    gameState.eventBus.emit("player:damaged", {
      playerID: this.targetPlayerID,
      amount: this.amount,
      sourceCardID: this.sourceCardID,
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
        newHealth,
        "set",
      ).execute(gameState);

      // Emit heal event
      gameState.eventBus.emit("player:healed", {
        playerID: this.targetPlayerID,
        amount: this.amount,
        sourceCardID: this.sourceCardID,
      });
    } else {
      // Emit overheal event if player was already at max health
      gameState.eventBus.emit("player:overhealed", {
        playerID: this.targetPlayerID,
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
    const { playerID, cardID } = this.boardCardID;
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
    const player = gameState.players[this.targetPlayerID];

    new ModifyPlayerAttributeCommand(
      this.targetPlayerID,
      "Shield",
      player.Shield + this.amount,
      "set",
    ).execute(gameState);

    // Emit shield applied event
    gameState.eventBus.emit("player:shieldApplied", {
      playerID: this.targetPlayerID,
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
      player.Poison + this.amount,
      "set",
    ).execute(gameState);

    // Emit poison applied event
    gameState.eventBus.emit("player:poisonApplied", {
      playerID: this.targetPlayerID,
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
    const player = gameState.players[this.targetPlayerID];

    new ModifyPlayerAttributeCommand(
      this.targetPlayerID,
      "Burn",
      player.Burn + this.amount,
      "set",
    ).execute(gameState);

    // Emit burn applied event
    gameState.eventBus.emit("player:burnApplied", {
      playerID: this.targetPlayerID,
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
