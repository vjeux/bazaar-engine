import { Player } from "../Engine";
import {
  AbilityAction,
  ActionType,
  AttributeType,
} from "../../types/cardTypes";
import { GameState, BoardCardID, getCardAttribute, BoardCard } from "./engine2";
import { PlayerCardConfig } from "../GameState";
import {
  GameEvent,
  CardFiredEvent,
  CardItemUsedEvent,
  CardAttributeChangedEvent,
  CardAddedEvent,
  CardRemovedEvent,
  PlayerDamagedEvent,
  PlayerHealedEvent,
  PlayerOverhealedEvent,
  PlayerLifestealHealEvent,
  PlayerAttributeChangedEvent,
  PlayerShieldAppliedEvent,
  PlayerPoisonAppliedEvent,
  PlayerBurnAppliedEvent,
  GameTickEvent,
} from "./eventHandlers";
import { getTargetCards, getTargetPlayers } from "./targeting";
import { getActionValue } from "./getActionValue";
import { PLAYER_PLAYER_IDX } from "@/lib/constants";

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
class CommandList implements Command {
  private commands: Command[] = [];

  constructor(commands?: Command[]) {
    this.commands = commands ?? [];
  }

  addCommand(command: Command) {
    this.commands.push(command);
  }

  execute(gameState: GameState): void {
    this.commands.forEach((command) => {
      // Log the command before execution
      //gameState.eventBus.addCommandToLog(command);

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

/**
 * Factory for creating commands based on action types
 */
export class CommandFactory {
  static createFromAction(
    action: AbilityAction,
    sourceCardID: BoardCardID,
    gameState: GameState,
    event: GameEvent,
  ): Command | null {
    const commands = new CommandList();

    switch (action.$type) {
      case ActionType.TActionPlayerDamage: {
        // get damage attribute from source card
        const damage = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DamageAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for damage action");
        }
        if (damage === undefined) {
          throw new Error("Damage amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new DamagePlayerCommand(targetPlayer, damage, sourceCardID),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerHeal: {
        const healAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.HealAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for heal action");
        }
        if (healAmount === undefined) {
          throw new Error("Heal amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new HealPlayerCommand(targetPlayer, healAmount, sourceCardID),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerBurnApply: {
        const burnAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.BurnApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for burn apply action");
        }
        if (burnAmount === undefined) {
          throw new Error("Burn amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ApplyBurnCommand(targetPlayer, burnAmount, sourceCardID),
          );
        }
        return commands;
      }

      case ActionType.TActionCardSlow: {
        const slowAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.SlowAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for slow action");
        }
        if (slowAmount === undefined) {
          throw new Error("Slow amount is undefined");
        }
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        // Filter by SlowTargets amount
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.SlowTargets,
        );

        if (targetCount === undefined) {
          // Apply to all target cards
          for (const targetCard of targetCards) {
            commands.addCommand(
              new ModifyCardAttributeCommand(
                targetCard,
                AttributeType.Slow,
                slowAmount,
                "add",
              ),
            );
          }
        } else {
          // Apply to the first targetCount cards
          for (const targetCard of targetCards.slice(0, targetCount)) {
            commands.addCommand(
              new ModifyCardAttributeCommand(
                targetCard,
                AttributeType.Slow,
                slowAmount,
                "add",
              ),
            );
          }
        }
        return commands;
      }

      case ActionType.TActionCardForceUse: {
        if (!action.Target) {
          throw new Error("Target is required for force use action");
        }
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetCard of targetCards) {
          commands.addCommand(new FireCardCommand(targetCard));
        }
        return commands;
      }

      case ActionType.TActionPlayerRegenApply: {
        const regenAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.RegenApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for regen apply action");
        }
        if (regenAmount === undefined) {
          throw new Error("Regen amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(
              targetPlayer,
              "HealthRegen",
              "add",
              regenAmount,
            ),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerPoisonApply: {
        const poisonAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.PoisonApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for poison apply action");
        }
        if (poisonAmount === undefined) {
          throw new Error("Poison amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ApplyPoisonCommand(targetPlayer, poisonAmount, sourceCardID),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerPoisonRemove: {
        const poisonRemoveAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.PoisonRemoveAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for poison remove action");
        }
        if (poisonRemoveAmount === undefined) {
          throw new Error("Poison remove amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(
              targetPlayer,
              "Poison",
              "subtract",
              poisonRemoveAmount,
            ),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerBurnRemove: {
        const burnRemoveAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.BurnRemoveAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for burn remove action");
        }
        if (burnRemoveAmount === undefined) {
          throw new Error("Burn remove amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(
              targetPlayer,
              "Burn",
              "subtract",
              burnRemoveAmount,
            ),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerShieldApply: {
        const shieldAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ShieldApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for shield apply action");
        }
        if (shieldAmount === undefined) {
          throw new Error("Shield amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ApplyShieldCommand(targetPlayer, shieldAmount, sourceCardID),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerShieldRemove: {
        const shieldRemoveAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ShieldRemoveAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for shield remove action");
        }
        if (shieldRemoveAmount === undefined) {
          throw new Error("Shield remove amount is undefined");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(
              targetPlayer,
              "Shield",
              "subtract",
              shieldRemoveAmount,
            ),
          );
        }
        return commands;
      }

      case ActionType.TActionPlayerReviveHeal: {
        if (!action.Target) {
          throw new Error("Target is required for revive heal action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(targetPlayer, "Health", "set", 0),
          );
        }
        return commands;
      }

      case ActionType.TActionCardDisable: {
        if (!action.Target) {
          throw new Error("Target is required for card disable action");
        }
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DisableTargets,
        );

        for (const targetCard of targetCards.slice(0, targetCount)) {
          commands.addCommand(new DisableCardCommand(targetCard));
        }
        return commands;
      }

      case ActionType.TActionCardFreeze: {
        const freezeAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.FreezeAmount,
        );
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.FreezeTargets,
        );

        if (!action.Target) {
          throw new Error("Target is required for freeze action");
        }

        if (freezeAmount === undefined) {
          console.warn("Freeze amount is undefined");
          return commands;
        }

        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        for (const targetCard of targetCards.slice(0, targetCount)) {
          commands.addCommand(
            new ModifyCardAttributeCommand(
              targetCard,
              AttributeType.Freeze,
              freezeAmount,
              "add",
            ),
          );
        }
        return commands;
      }

      case ActionType.TActionCardHaste: {
        const hasteAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.HasteAmount,
        );
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.HasteTargets,
        );

        if (!action.Target) {
          throw new Error("Target is required for haste action");
        }

        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        console.log("Target cards", targetCards);

        if (hasteAmount === undefined) {
          console.warn("Haste amount is undefined");
          return commands;
        }

        if (targetCount === undefined) {
          // Apply to all target cards
          for (const targetCard of targetCards) {
            commands.addCommand(
              new ModifyCardAttributeCommand(
                targetCard,
                AttributeType.Haste,
                hasteAmount,
                "add",
              ),
            );
          }
        } else {
          // Apply to the first targetCount cards
          for (const targetCard of targetCards.slice(0, targetCount)) {
            commands.addCommand(
              new ModifyCardAttributeCommand(
                targetCard,
                AttributeType.Haste,
                hasteAmount,
                "add",
              ),
            );
          }
        }

        return commands;
      }

      case ActionType.TActionCardReload: {
        const reloadAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ReloadAmount,
        );
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ReloadTargets,
        );

        if (!action.Target) {
          throw new Error("Target is required for reload action");
        }

        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        if (reloadAmount === undefined) {
          throw new Error("Reload amount is undefined");
        }

        for (const targetCard of targetCards.slice(0, targetCount)) {
          commands.addCommand(new ReloadCardCommand(targetCard, reloadAmount));
        }
        return commands;
      }

      case ActionType.TActionCardCharge: {
        const chargeAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ChargeAmount,
        );
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ChargeTargets,
        );

        if (!action.Target) {
          throw new Error("Target is required for charge action");
        }

        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        if (chargeAmount === undefined) {
          throw new Error("Charge amount is undefined");
        }

        for (const targetCard of targetCards.slice(0, targetCount)) {
          commands.addCommand(new ChargeCardCommand(targetCard, chargeAmount));
        }
        return commands;
      }

      case ActionType.TActionCardBeginSandstorm: {
        commands.addCommand(new BeginSandstormCommand());
        return commands;
      }

      case ActionType.TActionCardModifyAttribute: {
        if (!action.Target) {
          throw new Error("Target is required for modify attribute action");
        }

        if (!action.AttributeType) {
          throw new Error(
            "AttributeType is required for modify attribute action",
          );
        }

        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        // Get the attribute value from the action
        let attributeValue = 0;
        if (action.Value) {
          attributeValue = getActionValue(
            gameState,
            action.Value,
            sourceCardID,
            undefined, // No metadata
          );
        }

        // Map the operation string to the expected format
        let operation: "set" | "add" | "subtract" | "multiply" = "set";
        if (action.Operation) {
          switch (action.Operation) {
            case "Add":
              operation = "add";
              break;
            case "Subtract":
              operation = "subtract";
              break;
            case "Multiply":
              operation = "multiply";
              break;
          }
        }

        // Apply the modification to each target card
        for (const targetCard of targetCards) {
          commands.addCommand(
            new ModifyCardAttributeCommand(
              targetCard,
              action.AttributeType as AttributeType,
              attributeValue,
              operation,
            ),
          );
        }

        return commands;
      }

      default:
        console.error(`Unhandled action type: ${action.$type}`);
        return null;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createCardFromConfig(cardConfig: PlayerCardConfig): BoardCard {
  throw new Error("Not implemented");
  return {} as BoardCard;
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
    const boardCard = createCardFromConfig(this.cardConfig);

    // Add to the specified position or to the end
    const insertPosition =
      this.position >= 0 ? this.position : player.board.length;

    // Check if we're replacing an existing card
    if (insertPosition < player.board.length) {
      // Create and execute a RemoveCardCommand to properly remove the existing card
      const removeCommand = new RemoveCardCommand({
        playerIdx: this.playerID,
        cardIdx: this.position,
      });
      removeCommand.execute(gameState);

      // Now insert the new card at the position
      player.board.splice(insertPosition, 0, boardCard);
    } else {
      // Add to the end
      player.board.push(boardCard);
    }

    const boardCardID: BoardCardID = {
      playerIdx: this.playerID,
      cardIdx: insertPosition,
    };

    // Emit event that card was added
    gameState.eventBus.emit(new CardAddedEvent(boardCardID, boardCard));
  }

  toLogString(): string {
    return `Add card to ${playerName(this.playerID)}'s board at position ${this.position}`;
  }
}

/**
 * Command to remove a card from the board and unregister its event listeners
 */
export class RemoveCardCommand implements Command {
  constructor(private boardCardID: BoardCardID) {}

  execute(gameState: GameState): void {
    const { playerIdx, cardIdx } = this.boardCardID;
    const player = gameState.players[playerIdx];

    if (cardIdx >= 0 && cardIdx < player.board.length) {
      // Remove the card
      player.board.splice(cardIdx, 1);

      // Emit event that card was removed
      gameState.eventBus.emit(new CardRemovedEvent(this.boardCardID));
    }
  }

  toLogString(): string {
    return `Remove card from ${playerName(this.boardCardID.playerIdx)}'s board at position ${this.boardCardID.cardIdx}`;
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
    gameState.eventBus.emit(
      new CardAttributeChangedEvent(
        this.boardCardID,
        this.attribute,
        oldValue,
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

    return `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${playerName(this.boardCardID.playerIdx)}'s card ${this.boardCardID.cardIdx} ${this.attribute} to ${this.value}`;
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

    if (!(oldValue === newValue)) {
      // Emit event for attribute change
      gameState.eventBus.emit(
        new PlayerAttributeChangedEvent(
          this.playerIdx,
          this.attribute,
          oldValue,
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
      delayedEvents.push(
        new PlayerLifestealHealEvent(
          this.sourceCardID.playerIdx,
          this.amount * (lifestealPercent / 100),
          this.sourceCardID,
        ),
      );
    }

    if (this.sourceCardID) {
      // Emit damage event
      delayedEvents.push(
        new PlayerDamagedEvent(
          this.targetPlayerIdx,
          this.amount,
          this.sourceCardID,
        ),
      );
    }

    // Emit delayed events
    delayedEvents.forEach((event) => {
      gameState.eventBus.emit(event);
    });
  }

  toLogString(): string {
    if (!this.sourceCardID) {
      return `Dealt ${this.amount} damage to ${playerName(this.targetPlayerIdx)}`;
    }

    return `Dealt ${this.amount} damage to ${playerName(this.targetPlayerIdx)} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
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
      gameState.eventBus.emit(
        new PlayerHealedEvent(
          this.targetPlayerID,
          this.amount,
          this.sourceCardID,
        ),
      );
    } else {
      // Emit overheal event if player was already at max health
      gameState.eventBus.emit(
        new PlayerOverhealedEvent(
          this.targetPlayerID,
          this.amount,
          this.sourceCardID,
        ),
      );
    }
  }

  toLogString(): string {
    if (!this.sourceCardID) {
      return `Healed ${playerName(this.targetPlayerID)} for ${this.amount} health`;
    }

    return `Healed ${playerName(this.targetPlayerID)} for ${this.amount} health from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

/**
 * Command to trigger a card's ability
 */
export class FireCardCommand implements Command {
  constructor(private boardCardID: BoardCardID) {}

  execute(gameState: GameState): void {
    // Emit card trigger event
    gameState.eventBus.emit(new CardFiredEvent(this.boardCardID));

    // Emit card:itemused event
    gameState.eventBus.emit(new CardItemUsedEvent(this.boardCardID));

    // Reset the card's tick if it has a cooldown
    const { playerIdx: playerID, cardIdx: cardID } = this.boardCardID;
    const card = gameState.players[playerID].board[cardID];
    if ("CooldownMax" in card) {
      new ModifyCardAttributeCommand(this.boardCardID, "tick", 0).execute(
        gameState,
      );
    }
  }

  toLogString(): string {
    return `Fired ${playerName(this.boardCardID.playerIdx)}'s card ${this.boardCardID.cardIdx}`;
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
    gameState.eventBus.emit(
      new PlayerShieldAppliedEvent(
        this.targetPlayerID,
        this.amount,
        this.sourceCardID,
      ),
    );
  }

  toLogString(): string {
    if (!this.sourceCardID) {
      return `Applied ${this.amount} shield to ${playerName(this.targetPlayerID)}`;
    }

    return `Applied ${this.amount} shield to ${playerName(this.targetPlayerID)} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
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
    gameState.eventBus.emit(
      new PlayerPoisonAppliedEvent(
        this.targetPlayerID,
        this.amount,
        this.sourceCardID,
      ),
    );
  }

  toLogString(): string {
    if (!this.sourceCardID) {
      return `Applied ${this.amount} poison to ${playerName(this.targetPlayerID)}`;
    }

    return `Applied ${this.amount} poison to ${playerName(this.targetPlayerID)} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
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
    gameState.eventBus.emit(
      new PlayerBurnAppliedEvent(
        this.targetPlayerID,
        this.amount,
        this.sourceCardID,
      ),
    );
  }

  toLogString(): string {
    if (!this.sourceCardID) {
      return `Applied ${this.amount} burn to ${playerName(this.targetPlayerID)}`;
    }

    return `Applied ${this.amount} burn to ${playerName(this.targetPlayerID)} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
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
    gameState.eventBus.emit(new GameTickEvent(gameState.tick));
  }

  toLogString(): string {
    return "Process game tick";
  }
}

/**
 * Command to disable a card
 */
export class DisableCardCommand implements Command {
  constructor(private boardCardID: BoardCardID) {}

  execute(gameState: GameState): void {
    const { playerIdx, cardIdx } = this.boardCardID;
    gameState.players[playerIdx].board[cardIdx].isDisabled = true;
  }

  toLogString(): string {
    return `Disabled ${playerName(this.boardCardID.playerIdx)}'s card ${this.boardCardID.cardIdx}`;
  }
}

/**
 * Command to reload a card's ammo
 */
export class ReloadCardCommand implements Command {
  constructor(
    private boardCardID: BoardCardID,
    private reloadAmount: number,
  ) {}

  execute(gameState: GameState): void {
    const currentAmmo = getCardAttribute(
      gameState,
      this.boardCardID,
      AttributeType.Ammo,
    );
    const ammoMax = getCardAttribute(
      gameState,
      this.boardCardID,
      AttributeType.AmmoMax,
    );

    // If the card has no ammo or ammo max, don't do anything
    if (currentAmmo === undefined || ammoMax === undefined) {
      return;
    }

    const newValue = Math.min(ammoMax, currentAmmo + this.reloadAmount);
    if (currentAmmo !== newValue) {
      new ModifyCardAttributeCommand(
        this.boardCardID,
        AttributeType.Ammo,
        newValue,
        "set",
      ).execute(gameState);
    }
  }

  toLogString(): string {
    return `Reloaded ${playerName(this.boardCardID.playerIdx)}'s card ${this.boardCardID.cardIdx} with ${this.reloadAmount} ammo`;
  }
}

/**
 * Command to charge a card (advance its cooldown)
 */
export class ChargeCardCommand implements Command {
  constructor(
    private boardCardID: BoardCardID,
    private chargeAmount: number,
  ) {}

  execute(gameState: GameState): void {
    const { playerIdx, cardIdx } = this.boardCardID;
    const cooldownMax = getCardAttribute(
      gameState,
      this.boardCardID,
      AttributeType.CooldownMax,
    );

    // If the card has no cooldown max, don't do anything
    if (cooldownMax === undefined) {
      return;
    }

    const currentTick = gameState.players[playerIdx].board[cardIdx].tick || 0;
    const newValue = Math.min(cooldownMax, currentTick + this.chargeAmount);

    if (currentTick !== newValue) {
      new ModifyCardAttributeCommand(
        this.boardCardID,
        "tick",
        newValue,
        "set",
      ).execute(gameState);
    }
  }

  toLogString(): string {
    return `Charged ${playerName(this.boardCardID.playerIdx)}'s card ${this.boardCardID.cardIdx} by ${this.chargeAmount}`;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute(_: GameState): void {
    // This is just a marker command for logging purposes
  }

  toLogString(): string {
    return this.description;
  }
}
