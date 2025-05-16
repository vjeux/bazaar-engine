import { Player } from "../Engine";
import { AbilityAction, AttributeType } from "../../types/cardTypes";
import { GameState, BoardCardID, getCardAttribute, BoardCard } from "./engine2";
import { PlayerCardConfig } from "../GameState";
import { GameEvents } from "./eventHandlers";
import { getTargetCards, getTargetPlayers } from "./targeting";
import { getActionValue } from "./getActionValue";

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
    event: GameEvents[keyof GameEvents],
  ): Command | null {
    const commands = new CommandList();

    switch (action.$type) {
      case "TActionPlayerDamage": {
        // get damage attribute from source card
        const damage = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DamageAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for damage action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new DamagePlayerCommand(targetPlayer, damage, sourceCardID),
          );
        }
        return commands;
      }

      case "TActionPlayerHeal": {
        const healAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.HealAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for heal action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new HealPlayerCommand(targetPlayer, healAmount, sourceCardID),
          );
        }
        return commands;
      }

      case "TActionPlayerBurnApply": {
        const burnAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.BurnApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for burn apply action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ApplyBurnCommand(targetPlayer, burnAmount, sourceCardID),
          );
        }
        return commands;
      }

      case "TActionCardSlow": {
        const slowAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.SlowAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for slow action");
        }
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
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
        return commands;
      }

      case "TActionCardForceUse": {
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

      case "TActionPlayerRegenApply": {
        const regenAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.RegenApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for regen apply action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
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

      case "TActionPlayerPoisonApply": {
        const poisonAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.PoisonApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for poison apply action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ApplyPoisonCommand(targetPlayer, poisonAmount, sourceCardID),
          );
        }
        return commands;
      }

      case "TActionPlayerPoisonRemove": {
        const poisonRemoveAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.PoisonRemoveAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for poison remove action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
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

      case "TActionPlayerBurnRemove": {
        const burnRemoveAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.BurnRemoveAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for burn remove action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
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

      case "TActionPlayerShieldApply": {
        const shieldAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ShieldApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for shield apply action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ApplyShieldCommand(targetPlayer, shieldAmount, sourceCardID),
          );
        }
        return commands;
      }

      case "TActionPlayerShieldRemove": {
        const shieldRemoveAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ShieldRemoveAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for shield remove action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
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

      case "TActionPlayerReviveHeal": {
        if (!action.Target) {
          throw new Error("Target is required for revive heal action");
        }
        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
        );
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(targetPlayer, "Health", "set", 0),
          );
        }
        return commands;
      }

      case "TActionCardDisable": {
        if (!action.Target) {
          throw new Error("Target is required for card disable action");
        }
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );
        const targetCount =
          getCardAttribute(
            gameState,
            sourceCardID,
            AttributeType.DisableTargets,
          ) || 1;

        for (const targetCard of targetCards.slice(0, targetCount)) {
          // Create a command to set isDisabled to true
          commands.addCommand({
            execute: (gameState: GameState) => {
              const { playerIdx, cardIdx } = targetCard;
              // Simply set the disabled flag without emitting an event
              gameState.players[playerIdx].board[cardIdx].isDisabled = true;
            },
          });
        }
        return commands;
      }

      case "TActionCardFreeze": {
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

      case "TActionCardHaste": {
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
        return commands;
      }

      case "TActionCardReload": {
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

        for (const targetCard of targetCards.slice(0, targetCount)) {
          commands.addCommand({
            execute: (gameState: GameState) => {
              const currentAmmo = getCardAttribute(
                gameState,
                targetCard,
                AttributeType.Ammo,
              );
              const ammoMax = getCardAttribute(
                gameState,
                targetCard,
                AttributeType.AmmoMax,
              );

              // If the card has no ammo or ammo max, don't do anything
              if (currentAmmo === undefined || ammoMax === undefined) {
                return;
              }

              const newValue = Math.min(ammoMax, currentAmmo + reloadAmount);
              if (currentAmmo !== newValue) {
                new ModifyCardAttributeCommand(
                  targetCard,
                  AttributeType.Ammo,
                  newValue,
                  "set",
                ).execute(gameState);
              }
            },
          });
        }
        return commands;
      }

      case "TActionCardCharge": {
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

        for (const targetCard of targetCards.slice(0, targetCount)) {
          commands.addCommand({
            execute: (gameState: GameState) => {
              const { playerIdx, cardIdx } = targetCard;
              const cooldownMax = getCardAttribute(
                gameState,
                targetCard,
                AttributeType.CooldownMax,
              );

              // If the card has no cooldown max, don't do anything
              if (cooldownMax === undefined) {
                return;
              }

              const currentTick =
                gameState.players[playerIdx].board[cardIdx].tick || 0;
              const newValue = Math.min(
                cooldownMax,
                currentTick + chargeAmount,
              );

              if (currentTick !== newValue) {
                new ModifyCardAttributeCommand(
                  targetCard,
                  "tick",
                  newValue,
                  "set",
                ).execute(gameState);
              }
            },
          });
        }
        return commands;
      }

      case "TActionCardBeginSandstorm": {
        commands.addCommand({
          execute: (gameState: GameState) => {
            gameState.sandstormStartTick = gameState.tick;
            // Emit tick event instead of custom event
            gameState.eventBus.emit("game:tick", {
              tick: gameState.tick,
            });
          },
        });
        return commands;
      }

      case "TActionCardModifyAttribute": {
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
            targetCards.length > 0 ? targetCards[0] : undefined, // Use first target card if available
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
    const { playerIdx, cardIdx } = this.boardCardID;
    const player = gameState.players[playerIdx];

    if (cardIdx >= 0 && cardIdx < player.board.length) {
      // Remove the card
      player.board.splice(cardIdx, 1);

      // Emit event that card was removed
      gameState.eventBus.emit("card:removed", {
        boardCardID: this.boardCardID,
      });
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
export class FireCardCommand implements Command {
  constructor(private boardCardID: BoardCardID) {}

  execute(gameState: GameState): void {
    const { playerIdx: playerID, cardIdx: cardID } = this.boardCardID;
    const card = gameState.players[playerID].board[cardID];

    // Emit card trigger event
    gameState.eventBus.emit("card:fired", {
      sourceCardID: this.boardCardID,
    });
    // Emit card:itemused event
    gameState.eventBus.emit("card:itemused", {
      sourceCardID: this.boardCardID,
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
