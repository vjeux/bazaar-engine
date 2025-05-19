import { Player } from "../Engine";
import {
  Ability,
  AbilityAction,
  ActionType,
  AttributeType,
  Priority,
} from "../../types/cardTypes";
import { GameState, CardLocationID, CardAttributeSnapshot } from "./engine2";
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
  GameFightStartedEvent,
  CardPerformedHasteEvent,
  CardPerformedSlowEvent,
  CardPerformedChargeEvent,
} from "./events";
import { GameTickEvent } from "./events";
import { GameEvent } from "./events";
import {
  getBoardCardByID,
  getTargetCards,
  getTargetPlayers,
} from "./targeting";
import { getActionValue } from "./getActionValue";
import { PLAYER_PLAYER_IDX } from "@/lib/constants";
import { genCardsAndEncounters } from "@/lib/Data";
import prand from "pure-rand";
import { EnchantmentType } from "@/types/shared";
import { createTriggerCheck, triggerToEvent } from "./eventBus";
import { createPrerequisitesCheck } from "./prereq";

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
  /**
   * Calculates critical hit for an action
   * Returns the modified amount and whether it critted
   */
  static calculateCritical(
    gameState: GameState,
    sourceCardID: CardLocationID,
    baseAmount: number,
  ): { amount: number; hasCritted: boolean } {
    let amount = baseAmount;
    let hasCritted = false;

    // Get critical chance from source card
    const critChance =
      getCardAttribute(gameState, sourceCardID, AttributeType.CritChance) ?? 0;

    if (critChance > 0) {
      // Roll for critical hit
      if (
        prand.unsafeUniformIntDistribution(0, 100, gameState.randomGen) <
        critChance
      ) {
        // Apply additional critical damage modifier if available
        const damageCrit = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DamageCrit,
        );

        if (damageCrit !== undefined) {
          amount *= 1 + damageCrit / 100;
        } else {
          throw new Error(
            "Damage crit was undefined. Assumed base to be 100 for double crit damage",
          );
        }

        hasCritted = true;
      }
    }

    return { amount, hasCritted };
  }

  static createFromAction(
    action: AbilityAction,
    sourceCardID: CardLocationID,
    gameState: GameState,
    event: GameEvent,
  ): Command | null {
    const commands = new CommandList();

    switch (action.$type) {
      case ActionType.TActionPlayerDamage: {
        // get damage attribute from source card
        const baseDamage = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DamageAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for damage action");
        }
        if (baseDamage === undefined) {
          throw new Error("Damage amount is undefined");
        }

        // Calculate critical hit
        const { amount: damage, hasCritted } = this.calculateCritical(
          gameState,
          sourceCardID,
          baseDamage,
        );

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

        // Emit crit event if it happened
        if (hasCritted) {
          commands.addCommand(new EmitCritEventCommand(sourceCardID));
        }

        return commands;
      }

      case ActionType.TActionPlayerHeal: {
        const baseHealAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.HealAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for heal action");
        }
        if (baseHealAmount === undefined) {
          throw new Error("Heal amount is undefined");
        }

        // Calculate critical hit
        const { amount: healAmount, hasCritted } = this.calculateCritical(
          gameState,
          sourceCardID,
          baseHealAmount,
        );

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

        // Emit crit event if it happened
        if (hasCritted) {
          commands.addCommand(new EmitCritEventCommand(sourceCardID));
        }

        return commands;
      }

      case ActionType.TActionPlayerBurnApply: {
        const baseBurnAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.BurnApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for burn apply action");
        }
        if (baseBurnAmount === undefined) {
          throw new Error("Burn amount is undefined");
        }

        // Calculate critical hit
        const { amount: burnAmount, hasCritted } = this.calculateCritical(
          gameState,
          sourceCardID,
          baseBurnAmount,
        );

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

        // Emit crit event if it happened
        if (hasCritted) {
          commands.addCommand(new EmitCritEventCommand(sourceCardID));
        }

        return commands;
      }

      case ActionType.TActionPlayerPoisonApply: {
        const basePoisonAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.PoisonApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for poison apply action");
        }
        if (basePoisonAmount === undefined) {
          throw new Error("Poison amount is undefined");
        }

        // Calculate critical hit
        const { amount: poisonAmount, hasCritted } = this.calculateCritical(
          gameState,
          sourceCardID,
          basePoisonAmount,
        );

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

        // Emit crit event if it happened
        if (hasCritted) {
          commands.addCommand(new EmitCritEventCommand(sourceCardID));
        }

        return commands;
      }

      case ActionType.TActionPlayerShieldApply: {
        const baseShieldAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.ShieldApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for shield apply action");
        }
        if (baseShieldAmount === undefined) {
          throw new Error("Shield amount is undefined");
        }

        // Calculate critical hit
        const { amount: shieldAmount, hasCritted } = this.calculateCritical(
          gameState,
          sourceCardID,
          baseShieldAmount,
        );

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

        // Emit crit event if it happened
        if (hasCritted) {
          commands.addCommand(new EmitCritEventCommand(sourceCardID));
        }

        return commands;
      }

      case ActionType.TActionPlayerRegenApply: {
        const baseRegenAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.RegenApplyAmount,
        );
        if (!action.Target) {
          throw new Error("Target is required for regen apply action");
        }
        if (baseRegenAmount === undefined) {
          throw new Error("Regen amount is undefined");
        }

        // Calculate critical hit
        const { amount: regenAmount, hasCritted } = this.calculateCritical(
          gameState,
          sourceCardID,
          baseRegenAmount,
        );

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

        // Emit crit event if it happened
        if (hasCritted) {
          commands.addCommand(new EmitCritEventCommand(sourceCardID));
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
        const healAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.HealAmount,
        );
        if (healAmount === undefined) {
          throw new Error("Heal amount is undefined");
        }
        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(
              targetPlayer,
              "Health",
              "set", // TODO: figure out if this should be set or add
              healAmount,
            ),
          );
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
              new ApplyHasteCommand(sourceCardID, targetCard, hasteAmount),
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
          commands.addCommand(
            new ReloadCardCommand(sourceCardID, targetCard, reloadAmount),
          );
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
          commands.addCommand(
            new ChargeCardCommand(sourceCardID, targetCard, chargeAmount),
          );
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
            event,
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
      case ActionType.TActionPlayerModifyAttribute: {
        if (!action.Target) {
          throw new Error(
            "Target is required for player modify attribute action",
          );
        }

        if (!action.Value) {
          throw new Error(
            "Value is required for player modify attribute action",
          );
        }

        if (!action.AttributeType) {
          throw new Error(
            "AttributeType is required for player modify attribute action",
          );
        }

        const targetPlayers = getTargetPlayers(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        const actionValue = getActionValue(
          gameState,
          action.Value,
          sourceCardID,
          event,
        );

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

        for (const targetPlayer of targetPlayers) {
          commands.addCommand(
            new ModifyPlayerAttributeCommand(
              targetPlayer,
              action.AttributeType as PlayerAttributeNumber,
              operation,
              actionValue,
            ),
          );
        }

        return commands;
      }

      case ActionType.TActionGameSpawnCards: {
        // Do nothng as the json does not provide enough information abouth which cards to spawn
        console.warn(
          "TActionGameSpawnCards action type is not implemented - JSON configuration does not provide sufficient information about which cards to spawn. The exact card(s) are decided by the game server",
        );
        return commands;
      }

      case ActionType.TActionCardEnchantRandom: {
        // Remove card, then add back one with the same stats but add the enchantment.
        // Store the current values as attributeoverrides, so we keep the tick information etc
        if (!action.Target) {
          throw new Error("Target is required for enchant random action");
        }

        // Get a target card
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        // limit to EnchantTargets amount
        const targetCount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.EnchantTargets,
        );

        for (const targetCard of targetCards.slice(0, targetCount)) {
          const {
            registeredTriggers: _registeredTriggers,
            Abilities: _abilities,
            AbilityIds: _abilityIds,
            Auras: _auras,
            AuraIds: _auraIds,
            Enchantment: _enchantment,
            uuid: _uuid,
            ...overrides
          } = getBoardCardByID(gameState, targetCard);

          // Get a random enchantment according to the weights
          if (!action.Enchantments || action.Enchantments.length === 0) {
            throw new Error(
              "Enchantments array is required for enchant random action",
            );
          }

          // Calculate total weight
          const totalWeight = action.Enchantments.reduce(
            (sum, enchantment) => sum + enchantment.Weight,
            0,
          );

          // Generate a random number between 0 and totalWeight
          const randomValue = prand.unsafeUniformIntDistribution(
            0,
            totalWeight,
            gameState.randomGen,
          );

          // Find the selected enchantment based on weights
          let cumulativeWeight = 0;
          let selectedEnchantment: EnchantmentType | null = null;

          for (const enchantmentOption of action.Enchantments) {
            cumulativeWeight += enchantmentOption.Weight;
            if (randomValue <= cumulativeWeight) {
              selectedEnchantment = enchantmentOption.Enchantment;
              break;
            }
          }

          if (!selectedEnchantment) {
            throw new Error(
              "No enchantment selected for enchant random action",
            );
          }

          const removedCard = getBoardCardByID(gameState, targetCard);

          commands.addCommand(new RemoveCardCommand(targetCard));
          commands.addCommand(
            new AddCardCommand(
              targetCard.playerIdx,
              {
                cardId: removedCard.card.Id,
                tier: removedCard.tier,
                enchantment: selectedEnchantment,
                attributeOverrides: overrides,
              },
              targetCard.cardIdx,
              targetCard.location,
            ),
          );
        }
        return commands;
      }

      case ActionType.TActionCardDestroy: {
        if (!action.Target) {
          throw new Error("Target is required for destroy action");
        }

        const targetCards = getTargetCards(
          gameState,
          action.Target,
          sourceCardID,
          event,
        );

        const destroyAmount = getCardAttribute(
          gameState,
          sourceCardID,
          AttributeType.DestroyTargets,
        );

        for (const targetCard of targetCards.slice(0, destroyAmount)) {
          commands.addCommand(new RemoveCardCommand(targetCard)); // TODO: use implement and use destroy event, and destroy command
          console.warn(
            "calling remove card command for destroy action, TODO: implement emit destroy event, and destroy command",
          );
        }

        return commands;
      }

      default:
        console.error(`Unhandled action type: ${action.$type}`);
        throw new Error(`Unhandled action type: ${action.$type}`);
        return null;
    }
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

export type PlayerAttributeNumber = keyof {
  [K in keyof Player as Player[K] extends number ? K : never]: Player[K];
};

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
    private targetPlayerIdx: number,
    private amount: number,
    private sourceCardID: CardLocationID | null,
  ) {}

  execute(gameState: GameState): void {
    const targetPlayerShield = getPlayerAttribute(
      gameState,
      this.targetPlayerIdx,
      "Shield",
    );

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
        "subtract",
        targetPlayerShield,
      ).execute(gameState);
      new ModifyPlayerAttributeCommand(
        this.targetPlayerIdx,
        "Health",
        "subtract",
        remainingDamage,
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
      let lifestealAmount = this.amount * (lifestealPercent / 100);

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
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    const player = gameState.players[this.targetPlayerID];
    const currentHealth = player.Health;
    const maxHealth = player.HealthMax;

    // Check if player is at max health
    if (currentHealth < maxHealth) {
      // Use add operation instead of calculating and setting
      new ModifyPlayerAttributeCommand(
        this.targetPlayerID,
        "Health",
        "add",
        this.amount,
      ).execute(gameState);

      // Emit heal event
      gameState.eventBus.emit(
        new CardPerformedHealEvent(
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
    private targetPlayerID: number,
    private amount: number,
    private sourceCardID: CardLocationID,
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
      new CardPerformedShieldEvent(
        this.targetPlayerID,
        this.sourceCardID,
        this.amount,
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
    private sourceCardID: CardLocationID,
  ) {}

  execute(gameState: GameState): void {
    // Use add operation instead of calculating and setting
    new ModifyPlayerAttributeCommand(
      this.targetPlayerID,
      "Poison",
      "add",
      this.amount,
    ).execute(gameState);

    // Emit poison applied event
    gameState.eventBus.emit(
      new CardPerformedPoisonEvent(
        this.targetPlayerID,
        this.sourceCardID,
        this.amount,
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
    private sourceCardID: CardLocationID,
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
      new CardPerformedBurnEvent(
        this.targetPlayerID,
        this.sourceCardID,
        this.amount,
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
 * Command to apply haste to a card
 */
export class ApplyHasteCommand implements Command {
  constructor(
    private targetCardID: CardLocationID,
    private sourceCardID: CardLocationID,
    private amount: number,
  ) {}

  execute(gameState: GameState): void {
    new ModifyCardAttributeCommand(
      this.targetCardID,
      AttributeType.Haste,
      this.amount,
      "add",
    ).execute(gameState);

    gameState.eventBus.emit(
      new CardPerformedHasteEvent(
        this.targetCardID,
        this.sourceCardID,
        this.amount,
      ),
    );
  }

  toLogString(): string {
    return `Applied ${this.amount} haste to ${playerName(this.targetCardID.playerIdx)}'s card ${this.targetCardID.cardIdx} from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
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
 * Command to disable a card
 */
export class DisableCardCommand implements Command {
  constructor(private locationID: CardLocationID) {}

  execute(gameState: GameState): void {
    const { playerIdx, cardIdx } = this.locationID;
    gameState.players[playerIdx].board[cardIdx].isDisabled = true;
  }

  toLogString(): string {
    return `Disabled ${playerName(this.locationID.playerIdx)}'s card ${this.locationID.cardIdx}`;
  }
}

/**
 * Command to reload a card's ammo
 */
export class ReloadCardCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardID: CardLocationID,
    private reloadAmount: number,
  ) {}

  execute(gameState: GameState): void {
    const currentAmmo = getCardAttribute(
      gameState,
      this.targetCardID,
      AttributeType.Ammo,
    );
    const ammoMax = getCardAttribute(
      gameState,
      this.targetCardID,
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
        this.targetCardID,
        AttributeType.Ammo,
        this.reloadAmount,
        "add",
      ).execute(gameState);
    }
  }

  toLogString(): string {
    return `Reloaded ${playerName(this.targetCardID.playerIdx)}'s card ${this.targetCardID.cardIdx} with ${this.reloadAmount} ammo`;
  }
}

/**
 * Command to charge a card (advance its cooldown)
 */
export class ChargeCardCommand implements Command {
  constructor(
    private sourceCardID: CardLocationID,
    private targetCardID: CardLocationID,
    private chargeAmount: number,
  ) {}

  execute(gameState: GameState): void {
    const cooldownMax = getCardAttribute(
      gameState,
      this.targetCardID,
      AttributeType.CooldownMax,
    );

    // If the card has no cooldown max, don't do anything
    if (cooldownMax === undefined) {
      return;
    }

    if (this.chargeAmount !== 0) {
      new ModifyCardAttributeCommand(
        this.targetCardID,
        "tick",
        this.chargeAmount,
        "add",
      ).execute(gameState);
    }

    gameState.eventBus.emit(
      new CardPerformedChargeEvent(
        this.targetCardID,
        this.sourceCardID,
        this.chargeAmount,
      ),
    );
  }

  toLogString(): string {
    return `Charged ${playerName(this.targetCardID.playerIdx)}'s card ${this.targetCardID.cardIdx} by ${this.chargeAmount}`;
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
