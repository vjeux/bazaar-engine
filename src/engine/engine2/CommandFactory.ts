import { AttributeType, AbilityAction, ActionType } from "@/types/cardTypes";
import { EnchantmentType } from "@/types/shared";
import {
  Command,
  CommandList,
  DamagePlayerCommand,
  EmitCritEventCommand,
  HealPlayerCommand,
  ApplyBurnCommand,
  ApplyPoisonCommand,
  ApplyShieldCommand,
  ApplyRegenCommand,
  ModifyPlayerAttributeCommand,
  FireCardCommand,
  ApplySlowCommand,
  DisableCardCommand,
  ApplyFreezeCommand,
  ApplyHasteCommand,
  ReloadCardCommand,
  ChargeCardCommand,
  BeginSandstormCommand,
  ModifyCardAttributeCommand,
  RemoveCardCommand,
  AddCardCommand,
} from "./commands";
import { PlayerAttributeNumber } from "./engine2";
import { GameState, CardLocationID } from "./engine2";
import { GameEvent } from "./events";
import { getActionValue } from "./getActionValue";
import { getCardAttribute } from "./getAttribute";
import {
  getTargetPlayers,
  getTargetCards,
  getBoardCardByID,
} from "./targeting";
import { unsafeUniformIntDistribution } from "pure-rand/distribution/UnsafeUniformIntDistribution";

function calculateCritical(
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
      unsafeUniformIntDistribution(0, 100, gameState.randomGen) < critChance
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

const actionTypeToCommandCreation: Record<
  ActionType,
  (
    action: AbilityAction,
    sourceCardID: CardLocationID,
    gameState: GameState,
    event: GameEvent,
  ) => Command | null
> = {
  [ActionType.TActionPlayerDamage]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
    const { amount: damage, hasCritted } = calculateCritical(
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
  },
  [ActionType.TActionPlayerHeal]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
    const { amount: healAmount, hasCritted } = calculateCritical(
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
  },
  [ActionType.TActionPlayerBurnApply]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
    const { amount: burnAmount, hasCritted } = calculateCritical(
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
  },
  [ActionType.TActionPlayerPoisonApply]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
    const { amount: poisonAmount, hasCritted } = calculateCritical(
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
  },
  [ActionType.TActionPlayerShieldApply]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
    const { amount: shieldAmount, hasCritted } = calculateCritical(
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
  },
  [ActionType.TActionPlayerRegenApply]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
    const { amount: regenAmount, hasCritted } = calculateCritical(
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
        new ApplyRegenCommand(targetPlayer, regenAmount, sourceCardID),
      );
    }

    // Emit crit event if it happened
    if (hasCritted) {
      commands.addCommand(new EmitCritEventCommand(sourceCardID));
    }

    return commands;
  },
  [ActionType.TActionPlayerPoisonRemove]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionPlayerBurnRemove]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionPlayerShieldRemove]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionPlayerReviveHeal]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionCardForceUse]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionCardSlow]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
          new ApplySlowCommand(sourceCardID, targetCard, slowAmount),
        );
      }
    } else {
      // Apply to the first targetCount cards
      for (const targetCard of targetCards.slice(0, targetCount)) {
        commands.addCommand(
          new ApplySlowCommand(sourceCardID, targetCard, slowAmount),
        );
      }
    }
    return commands;
  },
  [ActionType.TActionCardDisable]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionCardFreeze]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
        new ApplyFreezeCommand(sourceCardID, targetCard, freezeAmount),
      );
    }
    return commands;
  },
  [ActionType.TActionCardHaste]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
          new ApplyHasteCommand(sourceCardID, targetCard, hasteAmount),
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
  },
  [ActionType.TActionCardReload]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionCardCharge]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionCardBeginSandstorm]: (
    _action,
    _sourceCardID,
    _gameState,
    _event,
  ) => {
    const commands = new CommandList();
    commands.addCommand(new BeginSandstormCommand());
    return commands;
  },
  [ActionType.TActionCardModifyAttribute]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
    if (!action.Target) {
      throw new Error("Target is required for modify attribute action");
    }

    if (!action.AttributeType) {
      throw new Error("AttributeType is required for modify attribute action");
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
  },
  [ActionType.TActionPlayerModifyAttribute]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
    if (!action.Target) {
      throw new Error("Target is required for player modify attribute action");
    }

    if (!action.Value) {
      throw new Error("Value is required for player modify attribute action");
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
  },
  [ActionType.TActionGameSpawnCards]: (
    _action,
    _sourceCardID,
    _gameState,
    _event,
  ) => {
    const commands = new CommandList();
    // Do nothng as the json does not provide enough information abouth which cards to spawn
    console.warn(
      "TActionGameSpawnCards action type is not implemented - JSON configuration does not provide sufficient information about which cards to spawn. The exact card(s) are decided by the game server",
    );
    return commands;
  },
  [ActionType.TActionCardEnchantRandom]: (
    action,
    sourceCardID,
    gameState,
    event,
  ) => {
    const commands = new CommandList();
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
      const randomValue = unsafeUniformIntDistribution(
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
        throw new Error("No enchantment selected for enchant random action");
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
  },
  [ActionType.TActionCardDestroy]: (action, sourceCardID, gameState, event) => {
    const commands = new CommandList();
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
  },
  [ActionType.TActionCardAddTagsBySource]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionCardAddTagsList]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionCardEnchant]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionCardRemoveTagsBySource]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionCardRemoveTagsList]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionCardUpgrade]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionGameDealCards]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TActionPlayerJoyApply]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TAuraActionCardModifyAttribute]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
  [ActionType.TAuraActionPlayerModifyAttribute]: function (
    _action: AbilityAction,
    _sourceCardID: CardLocationID,
    _gameState: GameState,
    _event: GameEvent,
  ): Command | null {
    throw new Error("Function not implemented.");
  },
};

/**
 * Factory for creating commands based on action types
 */
export class CommandFactory {
  static createFromAction(
    action: AbilityAction,
    sourceCardID: CardLocationID,
    gameState: GameState,
    event: GameEvent,
  ): Command | null {
    const commandCreation = actionTypeToCommandCreation[action.$type];
    if (!commandCreation) {
      throw new Error(
        `No command creation function found for action type ${action.$type}`,
      );
    }
    return commandCreation(action, sourceCardID, gameState, event);
  }
}
