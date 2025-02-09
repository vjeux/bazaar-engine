import {
  V2Card,
  Ability,
  AbilityPrerequisite,
  FluffyValue,
  AbilityAction
} from "./types/cardTypes";

import { Tier } from "./types/shared";

export interface GameState {
  tick: number;
  isPlaying: boolean;
  players: Player[];
  multicast: any[];
  getRand: () => number;
}

export interface Player {
  HealthMax: number;
  Health: number;
  HealthRegen: number;
  Shield: number;
  Burn: number;
  Poison: number;
  Gold: number;
  Income: number;
  board: (BoardCard | BoardSkill)[];
}

export interface BoardCard {
  card: V2Card;
  tick: number;
  Slow: number;
  Freeze: number;
  Haste: number;
  CritChance: number;
  DamageCrit: number;
  tier: Tier;
  Ammo?: number;
  DamageAmount?: number;
  HealAmount?: number;
  BurnApplyAmount?: number;
  PoisonApplyAmount?: number;
  ShieldApplyAmount?: number;
  [key: string]: any;
}

export interface BoardSkill {
  card: V2Card;
  tier: Tier;
  [key: string]: any;
}

export type BoardCardOrSkill = BoardCard | BoardSkill;

function forEachCard(
  gameState: GameState,
  callback: (
    player: Player,
    playerIndex: number,
    boardCard: BoardCardOrSkill,
    boardCardIndex: number
  ) => void
): void {
  for (let i = 0; i < gameState.players.length; ++i) {
    const player = gameState.players[i];
    for (let j = 0; j < player.board.length; ++j) {
      const boardCard = player.board[j];
      callback(player, i, boardCard, j);
    }
  }
}

function forEachAbility(
  boardCard: BoardCardOrSkill,
  callback: (ability: Ability) => void
): void {
  for (let i = 0; i < boardCard.AbilityIds.length; ++i) {
    const abilityId = boardCard.AbilityIds[i];
    callback(boardCard.Abilities[abilityId]);
  }
}

function forEachAura(
  boardCard: BoardCard,
  callback: (aura: Ability) => void
): void {
  for (let i = 0; i < boardCard.AuraIds.length; ++i) {
    const auraId = boardCard.AuraIds[i];
    callback(boardCard.Auras[auraId]);
  }
}

function hasCooldown(boardCard: BoardCardOrSkill): boolean {
  return "CooldownMax" in boardCard;
}

/**
 * Sandstorm
 *
 * Starts at 30 seconds, at 1 dmg
 * Tickrate is every 0.2 seconds
 * Increase by 1 every tick
 * End Game when reaches 600 damage per tick
 */
const sandstormInitialTick = 30000;
const sandstormTickRate = 200;

const sandstormDamagePerTick: Record<number, number> = {};
let sandstormDamage = 1;
let sandstormTick = sandstormInitialTick;
while (true) {
  sandstormDamagePerTick[sandstormTick] = sandstormDamage;
  sandstormDamage++;
  sandstormTick += sandstormTickRate;
  if (sandstormDamage > 600) {
    break;
  }
}

function updateCardAttribute(
  gameState: GameState,
  nextGameState: GameState,
  playerID: number,
  boardCardID: number,
  attribute: string,
  value: number,
  triggerActions: boolean = true
): void {
  const existingValue =
    nextGameState.players[playerID].board[boardCardID][attribute];
  nextGameState.players[playerID].board[boardCardID][attribute] = value;

  if (triggerActions) {
    forEachCard(
      nextGameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        forEachAbility(targetBoardCard, (ability) => {
          if (
            (ability.Trigger.$type === "TTriggerOnCardPerformedHaste" &&
              attribute === "Haste") ||
            (ability.Trigger.$type === "TTriggerOnCardPerformedSlow" &&
              attribute === "Slow") ||
            (ability.Trigger.$type === "TTriggerOnCardPerformedFreeze" &&
              attribute === "Freeze") ||
            (ability.Trigger.$type === "TTriggerOnCardAttributeChanged" &&
              ability.Trigger.AttributeChanged === attribute &&
              ability.Trigger.ChangeType === "Gain" &&
              value > existingValue)
          ) {
            const subjects = getTargetCards(
              gameState,
              nextGameState,
              ability.Trigger.Subject,
              playerID,
              boardCardID,
              targetPlayerID,
              targetBoardCardID
            );

            subjects.forEach(([subjectPlayerID, subjectBoardCardID]) => {
              if (
                subjectPlayerID === playerID &&
                subjectBoardCardID === boardCardID
              ) {
                runAction(
                  gameState,
                  nextGameState,
                  ability.Action,
                  ability.Prerequisites,
                  playerID,
                  boardCardID,
                  targetPlayerID,
                  targetBoardCardID
                );
              }
            });
          }
        });
      }
    );
  }
}

function updatePlayerAttribute<K extends keyof Player>(
  gameState: GameState,
  nextGameState: GameState,
  playerID: number,
  attribute: K,
  value: Player[K]
): void {
  const existingValue = nextGameState.players[playerID][attribute];
  nextGameState.players[playerID][attribute] = value;

  forEachCard(
    nextGameState,
    (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
      forEachAbility(targetBoardCard, (ability) => {
        if (
          (ability.Trigger.$type === "TTriggerOnCardPerformedPoison" &&
            attribute === "Poison") ||
          (ability.Trigger.$type === "TTriggerOnCardPerformedBurn" &&
            attribute === "Burn") ||
          (ability.Trigger.$type === "TTriggerOnPlayerAttributeChanged" &&
            ability.Trigger.AttributeChanged === attribute &&
            ability.Trigger.ChangeType === "Gain" &&
            value > existingValue)
        ) {
          const subjectPlayerID = getTargetPlayer(
            gameState,
            nextGameState,
            ability.Trigger.Subject,
            playerID,
            targetPlayerID
          );

          runAction(
            gameState,
            nextGameState,
            ability.Action,
            ability.Prerequisites,
            subjectPlayerID,
            null,
            targetPlayerID,
            targetBoardCardID
          );
        }
      });
    }
  );
}

function testPrerequisite(
  gameState: GameState,
  nextGameState: GameState,
  prerequisite: any,
  triggerPlayerID: number,
  triggerBoardCardID: number | null,
  targetPlayerID: number,
  targetBoardCardID: number
): boolean {
  if (prerequisite.$type === "TPrerequisiteCardCount") {
    const subjects = getTargetCards(
      gameState,
      nextGameState,
      prerequisite.Subject,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    const value = subjects.length;
    const comparisonValue = prerequisite.Amount;
    if (prerequisite.Comparison === "Equal") {
      return value === comparisonValue;
    } else if (prerequisite.Comparison === "GreaterThan") {
      return value > comparisonValue;
    } else if (prerequisite.Comparison === "GreaterThanOrEqual") {
      return value >= comparisonValue;
    } else if (prerequisite.Comparison === "LessThan") {
      return value < comparisonValue;
    } else if (prerequisite.Comparison === "LessThanOrEqual") {
      return value <= comparisonValue;
    }
  }
  // Return true if no prerequisites count
  return true;
}

function testConditions(
  gameState: GameState,
  nextGameState: GameState,
  conditions: any,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number
): boolean {
  if (conditions == null) {
    return true;
  } else if (conditions.$type === "TCardConditionalAttribute") {
    const value =
      gameState.players[targetPlayerID].board[targetBoardCardID][
        conditions.Attribute
      ];
    const comparisonValue = getActionValue(
      gameState,
      nextGameState,
      conditions.ComparisonValue,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    if (conditions.ComparisonOperator === "Equal") {
      return value === comparisonValue;
    } else if (conditions.ComparisonOperator === "GreaterThan") {
      return value > comparisonValue;
    } else if (conditions.ComparisonOperator === "GreaterThanOrEqual") {
      return value >= comparisonValue;
    } else if (conditions.ComparisonOperator === "LessThan") {
      return value < comparisonValue;
    } else if (conditions.ComparisonOperator === "LessThanOrEqual") {
      return value <= comparisonValue;
    }
  } else if (conditions.$type === "TCardConditionalSize") {
    const is = conditions.Sizes.includes(
      gameState.players[targetPlayerID].board[targetBoardCardID].card.Size
    );
    if (conditions.IsNot) {
      return !is;
    } else {
      return is;
    }
  } else if (
    conditions.$type === "TCardConditionalHiddenTag" ||
    conditions.$type === "TCardConditionalTag"
  ) {
    const tags =
      gameState.players[targetPlayerID].board[targetBoardCardID].card[
        conditions.$type === "TCardConditionalHiddenTag" ? "HiddenTags" : "Tags"
      ];

    if (conditions.Operator === "Any") {
      return tags.filter((tag) => conditions.Tags.includes(tag)).length > 0;
    } else if (conditions.Operator === "None") {
      return tags.filter((tag) => conditions.Tags.includes(tag)).length === 0;
    }
  } else if (conditions.$type === "TCardConditionalOr") {
    for (let i = 0; i < conditions.Conditions.length; ++i) {
      const value = testConditions(
        gameState,
        nextGameState,
        conditions.Conditions[i],
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      if (value) {
        return true;
      }
    }
    return false;
  } else if (conditions.$type === "TCardConditionalAnd") {
    for (let i = 0; i < conditions.Conditions.length; ++i) {
      const value = testConditions(
        gameState,
        nextGameState,
        conditions.Conditions[i],
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      if (!value) {
        return false;
      }
    }
    return true;
  }
  // Return false for any unhandled conditions
  return false;
}

// Returns true if the action critted
function runAction(
  gameState: GameState,
  nextGameState: GameState,
  action: AbilityAction,
  prerequisites: AbilityPrerequisite[] | null,
  triggerPlayerID: number,
  triggerBoardCardID: number | null,
  targetPlayerID: number,
  targetBoardCardID: number
): boolean {
  let hasCritted = false;
  if (prerequisites != null) {
    for (let i = 0; i < prerequisites.length; ++i) {
      if (
        !testPrerequisite(
          gameState,
          nextGameState,
          prerequisites[i],
          triggerPlayerID,
          triggerBoardCardID,
          targetPlayerID,
          targetBoardCardID
        )
      ) {
        return false;
      }
    }
  }

  if (action.$type === "TActionPlayerDamage") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );
    const shield = nextGameState.players[playerID].Shield;
    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.DamageAmount;
    const critChance = targetBoardCard.CritChance;
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        const damageCrit = targetBoardCard.DamageCrit;
        if (damageCrit !== undefined) {
          amount *= 1 + damageCrit / 100;
          hasCritted = true;
        }
      }
    }

    const nextShield = Math.max(0, shield - amount);
    if (nextShield > 0) {
      nextGameState.players[playerID].Shield = nextShield;
    } else {
      const nextAmount = amount - shield;
      nextGameState.players[playerID].Shield = 0;
      nextGameState.players[playerID].Health -= nextAmount;
    }
  } else if (action.$type === "TActionPlayerHeal") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.HealAmount;
    const critChance = targetBoardCard.CritChance;
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }
    nextGameState.players[playerID].Health = Math.min(
      nextGameState.players[playerID].HealthMax,
      nextGameState.players[playerID].Health + amount
    );
    if (nextGameState.players[playerID].Poison > 0) {
      nextGameState.players[playerID].Poison--;
    }
    if (nextGameState.players[playerID].Burn > 0) {
      nextGameState.players[playerID].Burn--;
    }
  } else if (action.$type === "TActionPlayerPoisonApply") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.PoisonApplyAmount;
    const critChance = targetBoardCard.CritChance;
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Poison",
      nextGameState.players[playerID].Poison + amount
    );
  } else if (action.$type === "TActionPlayerPoisonRemove") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.PoisonRemoveAmount;

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Poison",
      Math.max(0, nextGameState.players[playerID].Poison - amount)
    );
  } else if (action.$type === "TActionPlayerBurnApply") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.BurnApplyAmount;
    const critChance = targetBoardCard.CritChance;
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Burn",
      nextGameState.players[playerID].Burn + amount
    );
  } else if (action.$type === "TActionPlayerBurnRemove") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.BurnRemoveAmount;

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Burn",
      Math.max(0, nextGameState.players[playerID].Burn - amount)
    );
  } else if (action.$type === "TActionPlayerShieldApply") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.ShieldApplyAmount;
    const critChance = targetBoardCard.CritChance;
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Shield",
      nextGameState.players[playerID].Shield + amount
    );
  } else if (action.$type === "TActionPlayerShieldRemove") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const targetBoardCard =
      gameState.players[triggerPlayerID].board[targetBoardCardID];
    let amount = targetBoardCard.ShieldRemoveAmount;

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Shield",
      Math.max(0, nextGameState.players[playerID].Shield - amount)
    );
  } else if (action.$type === "TActionPlayerReviveHeal") {
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );
    nextGameState.players[playerID].Health = 0;
  } else if (action.$type === "TActionCardReload") {
    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    const amount =
      gameState.players[targetPlayerID].board[targetBoardCardID].ReloadAmount;
    const targetCount =
      gameState.players[targetPlayerID].board[targetBoardCardID].ReloadTargets;

    targetCards
      .slice(0, targetCount)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const nextBoardCard =
          nextGameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ];
        const value = nextBoardCard.Ammo;
        const newValue = Math.min(
          nextBoardCard.AmmoMax,
          nextBoardCard.Ammo + amount
        );
        if (value !== newValue) {
          updateCardAttribute(
            gameState,
            nextGameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            "Ammo",
            newValue
          );
        }
      });
  } else if (
    action.$type === "TActionCardFreeze" ||
    action.$type === "TActionCardSlow" ||
    action.$type === "TActionCardHaste"
  ) {
    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    const [amountKey, targetsKey, tickKey] =
      action.$type === "TActionCardFreeze"
        ? ["FreezeAmount", "FreezeTargets", "Freeze"]
        : action.$type === "TActionCardSlow"
          ? ["SlowAmount", "SlowTargets", "Slow"]
          : action.$type === "TActionCardHaste"
            ? ["HasteAmount", "HasteTargets", "Haste"]
            : [];
    if (amountKey == null || targetsKey == null || tickKey == null) {
      throw new Error(
        "Card:" +
          gameState.players[targetPlayerID].board[targetBoardCardID].card
            .InternalName +
          "is missing an amount, target or tick key for " +
          action.$type
      );
    }
    const amount =
      gameState.players[targetPlayerID].board[targetBoardCardID][amountKey];
    const targetCount =
      gameState.players[targetPlayerID].board[targetBoardCardID][targetsKey];

    targetCards
      .filter(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        return hasCooldown(
          gameState.players[actionTargetPlayerID].board[actionTargetBoardCardID]
        );
      })
      .sort((a, b) => {
        // Prioritize items that have no slow/freeze
        const amountA = nextGameState.players[a[0]].board[a[1]][tickKey];
        const amountB = nextGameState.players[b[0]].board[b[1]][tickKey];
        if (amountA === 0 && amountB !== 0) {
          return -1;
        } else if (amountB === 0 && amountA !== 0) {
          return 1;
        } else {
          return 0;
        }
      })
      .slice(0, targetCount)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        updateCardAttribute(
          gameState,
          nextGameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          tickKey,
          nextGameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ][tickKey] + amount
        );
      });
  } else if (action.$type === "TActionCardCharge") {
    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    const [amountKey, targetsKey] = ["ChargeAmount", "ChargeTargets"];
    const amount =
      gameState.players[targetPlayerID].board[targetBoardCardID][amountKey];
    const targetCount =
      gameState.players[targetPlayerID].board[targetBoardCardID][targetsKey];

    targetCards
      .filter(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        return hasCooldown(
          gameState.players[actionTargetPlayerID].board[actionTargetBoardCardID]
        );
      })
      .slice(0, targetCount)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const nextBoardCard =
          nextGameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ];
        updateCardAttribute(
          gameState,
          nextGameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          "tick",
          Math.min(nextBoardCard.CooldownMax, nextBoardCard.tick + amount)
        );
      });
  } else if (
    action.$type === "TActionCardModifyAttribute" ||
    action.$type === "TAuraActionCardModifyAttribute"
  ) {
    const actionValue = getActionValue(
      gameState,
      nextGameState,
      action.Value,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );

    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );

    const targetCount =
      action.TargetCount == null
        ? targetCards.length
        : getActionValue(
            gameState,
            nextGameState,
            action.TargetCount,
            triggerPlayerID,
            triggerBoardCardID,
            targetPlayerID,
            targetBoardCardID
          );

    targetCards
      .slice(0, targetCount)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const oldValue =
          nextGameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ][action.AttributeType];
        if (oldValue === undefined) {
          return;
        }

        const newValue =
          action.Operation === "Add"
            ? oldValue + actionValue
            : action.Operation === "Multiply"
              ? oldValue * actionValue
              : oldValue;

        updateCardAttribute(
          gameState,
          nextGameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          action.AttributeType,
          newValue,
          /* triggerActions */ action.$type === "TActionCardModifyAttribute"
        );
      });
  } else if (
    action.$type === "TActionPlayerModifyAttribute" ||
    action.$type === "TAuraActionPlayerModifyAttribute"
  ) {
    const actionValue = getActionValue(
      gameState,
      nextGameState,
      action.Value,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    const playerID = getTargetPlayer(
      gameState,
      nextGameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    );

    const oldValue = nextGameState.players[playerID][action.AttributeType];
    const newValue =
      action.Operation === "Add" ? oldValue + actionValue : oldValue;
    nextGameState.players[playerID][action.AttributeType] = newValue;
  }

  return hasCritted;
}

function getActionValue(
  gameState: GameState,
  nextGameState: GameState,
  value: FluffyValue,
  triggerPlayerID: number,
  triggerBoardCardID: number | null,
  targetPlayerID: number,
  targetBoardCardID: number
): number {
  let amount: number | undefined = undefined;
  if (value.$type === "TFixedValue") {
    amount = value.Value;
  } else if (
    value.$type === "TReferenceValueCardAttribute" ||
    value.$type === "TReferenceValueCardAttributeAggregate"
  ) {
    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      value.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    amount = value.DefaultValue;
    targetCards.forEach(([valueTargetPlayerID, valueTargetBoardCardID]) => {
      amount +=
        nextGameState.players[valueTargetPlayerID].board[
          valueTargetBoardCardID
        ][value.AttributeType] ?? 0;
    });
  } else if (
    value.$type === "TReferenceValueCardAttribute" ||
    value.$type === "TReferenceValueCardAttributeAggregate"
  ) {
    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      value.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    amount = value.DefaultValue;
    targetCards.forEach(([valueTargetPlayerID, valueTargetBoardCardID]) => {
      amount +=
        nextGameState.players[valueTargetPlayerID].board[
          valueTargetBoardCardID
        ][value.AttributeType] ?? 0;
    });
  } else if (value.$type === "TReferenceValuePlayerAttribute") {
    const valueTargetPlayerID = getTargetPlayer(
      gameState,
      nextGameState,
      value.Target,
      triggerPlayerID,
      targetPlayerID
    );
    amount = value.DefaultValue;
    amount +=
      nextGameState.players[valueTargetPlayerID][value.AttributeType] ?? 0;
  } else if (value.$type === "TReferenceValueCardCount") {
    const targetCards = getTargetCards(
      gameState,
      nextGameState,
      value.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    amount = targetCards.length;
  }

  // If no amount found, throw an error
  if (!amount)
    if (value.Modifier != null) {
      const modifierValue = getActionValue(
        gameState,
        nextGameState,
        value.Modifier.Value,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      if (value.Modifier.ModifyMode === "Multiply") {
        amount *= modifierValue;
      }
    }
  return amount;
}

function getTargetCards(
  gameState: GameState,
  nextGameState: GameState,
  target: any,
  triggerPlayerID: number,
  triggerBoardCardID: number | null,
  targetPlayerID: number,
  targetBoardCardID: number
): Array<[number, number]> {
  const results: [number, number | null][] = [];
  if (target.$type === "TTargetCardSelf") {
    results.push([targetPlayerID, targetBoardCardID]);
  } else if (target.$type === "TTargetCardTriggerSource") {
    results.push([triggerPlayerID, triggerBoardCardID]);
  } else if (target.$type === "TTargetCardPositional") {
    if (target.TargetMode === "AllRightCards") {
      const lengthCardItems =
        gameState.players[targetPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      for (
        let i = targetBoardCardID + (target.IncludeOrigin ? 0 : 1);
        i < lengthCardItems;
        ++i
      ) {
        results.push([targetPlayerID, i]);
      }
    } else if (target.TargetMode === "AllLeftCards") {
      for (
        let i = 0;
        i < targetBoardCardID - (target.IncludeOrigin ? 0 : 1);
        ++i
      ) {
        results.push([targetPlayerID, i]);
      }
    } else if (target.TargetMode === "Neighbor") {
      if (target.IncludeOrigin) {
        results.push([targetPlayerID, targetBoardCardID]);
      }
      if (targetBoardCardID !== 0) {
        results.push([targetPlayerID, targetBoardCardID - 1]);
      }
      const lengthCardItems =
        gameState.players[targetPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      if (targetBoardCardID !== lengthCardItems - 1) {
        results.push([targetPlayerID, targetBoardCardID + 1]);
      }
    } else if (target.TargetMode === "RightCard") {
      if (target.IncludeOrigin) {
        results.push([targetPlayerID, targetBoardCardID]);
      }
      const lengthCardItems =
        gameState.players[targetPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      if (targetBoardCardID !== lengthCardItems - 1) {
        results.push([targetPlayerID, targetBoardCardID + 1]);
      }
    } else if (target.TargetMode === "LeftCard") {
      if (target.IncludeOrigin) {
        results.push([targetPlayerID, targetBoardCardID]);
      }
      if (targetBoardCardID !== 0) {
        results.push([targetPlayerID, targetBoardCardID - 1]);
      }
    }
  } else if (
    target.$type === "TTargetCardSection" ||
    target.$type === "TTargetCardRandom"
  ) {
    if (
      target.TargetSection === "SelfHand" ||
      target.TargetSection === "SelfBoard"
    ) {
      const lengthCardItems =
        gameState.players[targetPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      for (let i = 0; i < lengthCardItems; ++i) {
        if (
          i !== targetBoardCardID ||
          (i === targetBoardCardID && !target.ExcludeSelf)
        ) {
          results.push([targetPlayerID, i]);
        }
      }
    } else if (
      target.TargetSection === "OpponentHand" ||
      target.TargetSection === "OpponentBoard"
    ) {
      const lengthCardItems =
        gameState.players[(targetPlayerID + 1) % 2].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      for (let i = 0; i < lengthCardItems; ++i) {
        results.push([(targetPlayerID + 1) % 2, i]);
      }
    } else if (target.TargetSection === "AllHands") {
      gameState.players.forEach((player, playerID) => {
        const lengthCardItems =
          gameState.players[playerID].board.findLastIndex(
            (boardCard) => boardCard.card.$type === "TCardItem"
          ) + 1;
        for (let i = 0; i < lengthCardItems; ++i) {
          if (
            playerID !== targetPlayerID ||
            i !== targetBoardCardID ||
            (i === targetBoardCardID && !target.ExcludeSelf)
          ) {
            results.push([playerID, i]);
          }
        }
      });
    }

    if (target.$type === "TTargetCardRandom") {
      // Shuffle
      let currentIndex = results.length;
      while (currentIndex != 0) {
        let randomIndex = Math.floor(gameState.getRand() * currentIndex);
        currentIndex--;
        [results[currentIndex], results[randomIndex]] = [
          results[randomIndex],
          results[currentIndex]
        ];
      }
    }
  } else if (target.$type === "TTargetCardSelf") {
    results.push([targetPlayerID, targetBoardCardID]);
  }

  if (
    target.Conditions &&
    target.Conditions.$type === "TCardConditionalAttributeHighest"
  ) {
    let highestValue = -Infinity;
    let highestPlayerID = null;
    let highestBoardCardID = null;
    results.forEach(([testPlayerID, testBoardCardID]) => {
      const boardCard = gameState.players[testPlayerID].board[testBoardCardID];
      const value = boardCard[target.Conditions.AttributeType];
      if (value !== undefined && value > highestValue) {
        highestValue = value;
        highestPlayerID = testPlayerID;
        highestBoardCardID = testBoardCardID;
      }
    });
    if (highestPlayerID !== null) {
      return [[highestPlayerID, highestBoardCardID]];
    } else {
      return [];
    }
  }
  return results.filter(([testPlayerID, testBoardCardID]) => {
    return testConditions(
      gameState,
      nextGameState,
      target.Conditions,
      triggerPlayerID,
      triggerBoardCardID,
      testPlayerID,
      testBoardCardID
    );
  });
}

function getTargetPlayer(
  gameState: GameState,
  nextGameState: GameState,
  target: any,
  triggerPlayerID: number,
  targetPlayerID: number
): number {
  if (target.$type === "TTargetPlayerRelative") {
    if (target.TargetMode === "Opponent") {
      return (targetPlayerID + 1) % 2;
    } else if (target.TargetMode === "Self") {
      return targetPlayerID;
    }
  } else if (target.$type === "TTargetCardSection") {
    if (target.TargetSection === "SelfBoard") {
      return targetPlayerID;
    } else {
      return (targetPlayerID + 1) % 2;
    }
  }
}

export const TICK_RATE = 100;

function runGameTick(initialGameState: GameState): [GameState, GameState] {
  const nextGameState = {
    ...initialGameState,
    players: initialGameState.players.map((player) => ({
      ...player,
      board: player.board.map((boardCard) => ({ ...boardCard }))
    })),
    multicast: [...initialGameState.multicast]
  };

  const gameState = {
    ...initialGameState,
    players: initialGameState.players.map((player) => ({
      ...player,
      board: player.board.map((boardCard) => ({ ...boardCard }))
    })),
    multicast: [...initialGameState.multicast]
  };

  // Run Auras
  forEachCard(initialGameState, (player, playerID, boardCard, boardCardID) => {
    forEachAura(boardCard, (ability) => {
      runAction(
        initialGameState,
        gameState,
        ability.Action,
        ability.Prerequisites,
        playerID,
        boardCardID,
        playerID,
        boardCardID
      );
    });
  });

  // Start fight
  if (gameState.tick === 0) {
    forEachCard(
      nextGameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        forEachAbility(targetBoardCard, (ability) => {
          if (ability.Trigger.$type === "TTriggerOnFightStarted") {
            runAction(
              gameState,
              nextGameState,
              ability.Action,
              ability.Prerequisites,
              targetPlayerID,
              null,
              targetPlayerID,
              targetBoardCardID
            );
          }
        });
      }
    );
  }

  // Run Tick
  nextGameState.tick += TICK_RATE;

  // Poison + Regen
  if (gameState.tick % 1000 === 0) {
    nextGameState.players.forEach((player, playerID) => {
      if (player.Poison > 0) {
        player.Health -= player.Poison;
      }
      if (player.HealthRegen > 0) {
        player.Health = Math.min(
          player.Health + player.HealthRegen,
          player.HealthMax
        );
      }
    });
  }

  // Burn
  if (gameState.tick % 500 === 0) {
    nextGameState.players.forEach((player, playerID) => {
      if (player.Burn > 0) {
        const shield = player.Shield;
        const amount = player.Burn;

        const nextShield = Math.max(0, shield - amount / 2);
        if (nextShield > 0) {
          player.Shield = nextShield;
        } else {
          const nextAmount = amount - shield * 2;
          player.Shield = 0;
          player.Health -= nextAmount;
        }
        player.Burn--;
      }
    });
  }

  // Ticks
  const cardTriggerList = [];
  forEachCard(gameState, (player, playerID, boardCard, boardCardID) => {
    const nextBoardCard = nextGameState.players[playerID].board[boardCardID];
    if (nextBoardCard.card.$type === "TCardSkill") {
      return;
    }
    if (!hasCooldown(nextBoardCard)) {
      return;
    }

    let tickRate = TICK_RATE;
    if (boardCard.Slow > 0) {
      tickRate /= 2;
    }
    if (boardCard.Haste > 0) {
      tickRate *= 2;
    }
    let tick = TICK_RATE;
    nextBoardCard.Slow = Math.max(0, boardCard.Slow - tick);
    nextBoardCard.Haste = Math.max(0, boardCard.Haste - tick);
    if (boardCard.Freeze > 0) {
      nextBoardCard.Freeze -= tick;
      tick = boardCard.Freeze;
      if (boardCard.Freeze > 0) {
        tick = 0;
      } else {
        tick = -boardCard.Freeze;
        nextBoardCard.Freeze = 0;
      }
    } else {
      nextBoardCard.tick = Math.min(
        boardCard.tick + tickRate,
        boardCard.CooldownMax
      );
    }

    if (nextBoardCard.tick === boardCard.CooldownMax) {
      if (
        !nextBoardCard.AmmoMax ||
        (nextBoardCard.AmmoMax && nextBoardCard.Ammo > 0)
      ) {
        cardTriggerList.push([playerID, boardCardID, /* isMulticast */ false]);
        if ("Multicast" in boardCard) {
          const MULTICAST_DELAY = 300;
          for (let i = 0; i < boardCard.Multicast - 1; ++i) {
            nextGameState.multicast.push({
              tick: nextGameState.tick + (i + 1) * MULTICAST_DELAY,
              playerID,
              boardCardID
            });
          }
        }
      }
    }
  });

  gameState.multicast.forEach((multicast) => {
    if (multicast.tick <= nextGameState.tick) {
      cardTriggerList.push([
        multicast.playerID,
        multicast.boardCardID,
        /* isMulticast */ true
      ]);
      nextGameState.multicast.splice(
        nextGameState.multicast.indexOf(multicast),
        1
      );
    }
  });

  const cardCrittedList = [];

  // Trigger Cards
  cardTriggerList.forEach(([playerID, boardCardID, isMulticast]) => {
    const boardCard = gameState.players[playerID].board[boardCardID];
    if (!isMulticast && boardCard.AmmoMax) {
      nextGameState.players[playerID].board[boardCardID].Ammo--;
    }

    forEachCard(
      gameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        let hasCritted = false;

        forEachAbility(targetBoardCard, (ability) => {
          if (
            ability.Trigger.$type === "TTriggerOnCardFired" &&
            playerID === targetPlayerID &&
            boardCardID === targetBoardCardID
          ) {
            hasCritted ||= runAction(
              gameState,
              nextGameState,
              ability.Action,
              ability.Prerequisites,
              playerID,
              boardCardID,
              targetPlayerID,
              targetBoardCardID
            );
          } else if (ability.Trigger.$type === "TTriggerOnItemUsed") {
            const subjects = getTargetCards(
              gameState,
              nextGameState,
              ability.Trigger.Subject,
              playerID,
              boardCardID,
              targetPlayerID,
              targetBoardCardID
            );
            subjects.forEach(([subjectPlayerID, subjectBoardCardID]) => {
              if (
                subjectPlayerID === playerID &&
                subjectBoardCardID === boardCardID
              ) {
                runAction(
                  gameState,
                  nextGameState,
                  ability.Action,
                  ability.Prerequisites,
                  subjectPlayerID,
                  subjectBoardCardID,
                  targetPlayerID,
                  targetBoardCardID
                );
              }
            });
          }
        });

        if (hasCritted) {
          cardCrittedList.push([targetPlayerID, targetBoardCardID]);
        }
      }
    );

    if (!isMulticast) {
      nextGameState.players[playerID].board[boardCardID].tick = 0;
    }
  });

  cardCrittedList.forEach(([playerID, boardCardID]) => {
    forEachCard(
      gameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        forEachAbility(targetBoardCard, (ability) => {
          if (ability.Trigger.$type === "TTriggerOnCardCritted") {
            runAction(
              gameState,
              nextGameState,
              ability.Action,
              ability.Prerequisites,
              playerID,
              boardCardID,
              targetPlayerID,
              targetBoardCardID
            );
          }
        });
      }
    );
  });

  // Sandstorm
  const sandstormDamage = sandstormDamagePerTick[nextGameState.tick];
  if (sandstormDamage > 0) {
    nextGameState.players.forEach((player) => {
      const shield = player.Shield;
      const nextShield = Math.max(0, shield - sandstormDamage);
      if (nextShield > 0) {
        player.Shield = nextShield;
      } else {
        const nextHealthDamage = sandstormDamage - shield;
        player.Shield = 0;
        player.Health -= nextHealthDamage;
      }
    });
  }

  // Death
  nextGameState.players.forEach((player, playerID) => {
    if (player.Health < 0) {
      forEachCard(
        nextGameState,
        (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
          forEachAbility(targetBoardCard, (ability) => {
            if (ability.Trigger.$type === "TTriggerOnPlayerDied") {
              const abilityPlayerID = getTargetPlayer(
                gameState,
                nextGameState,
                ability.Trigger.Subject,
                playerID,
                targetPlayerID
              );
              if (abilityPlayerID === playerID) {
                runAction(
                  gameState,
                  nextGameState,
                  ability.Action,
                  ability.Prerequisites,
                  abilityPlayerID,
                  null,
                  targetPlayerID,
                  targetBoardCardID
                );
              }
            }
          });
        }
      );
    }
  });

  let isPlaying = true;
  nextGameState.players.forEach((player) => {
    if (player.Health <= 0) {
      isPlaying = false;
    }
  });
  nextGameState.isPlaying = isPlaying;
  return [gameState, nextGameState];
}

export function getTooltips(
  gameState: GameState,
  playerID: number,
  boardCardID: number
): string[] {
  const boardCard = gameState.players[playerID].board[boardCardID];
  return boardCard.TooltipIds.map((tooltipId: string) => {
    const tooltip = boardCard.Localization.Tooltips[
      tooltipId
    ].Content.Text.replace(
      /\{([a-z]+)\.([a-z0-9]+)\.targets\}/g,
      (_, type, id) => {
        const action =
          boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
        const target = action.Target;
        if (target.$type === "TTargetCardRandom") {
          return 1;
        }
        return `{?${type}.${id}.targets}`;
      }
    )
      .replace(/\{([a-z]+)\.([a-z0-9]+)\.mod\}/g, (_, type, id) => {
        const action =
          boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
        return getActionValue(
          gameState,
          gameState,
          action.Value.Modifier.Value,
          playerID,
          boardCardID,
          playerID,
          boardCardID
        );
      })
      .replace(/\{([a-z]+)\.([a-z0-9]+)\}/g, (_, type, id, targets) => {
        const action =
          boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
        if (action.Value) {
          return getActionValue(
            gameState,
            gameState,
            action.Value,
            playerID,
            boardCardID,
            playerID,
            boardCardID
          );
        }
        if (action.$type === "TActionGameSpawnCards") {
          return getActionValue(
            gameState,
            gameState,
            action.SpawnContext.Limit,
            playerID,
            boardCardID,
            playerID,
            boardCardID
          );
        }
        if (action.$type === "TActionPlayerDamage") {
          return boardCard.DamageAmount;
        } else if (action.$type === "TActionCardReload") {
          return boardCard.ReloadAmount;
        } else if (action.$type === "TActionPlayerHeal") {
          return boardCard.HealAmount;
        } else if (action.$type === "TActionPlayerShield") {
          return boardCard.ShieldApplyAmount;
        } else if (action.$type === "TActionPlayerPoison") {
          return boardCard.PoisonApplyAmount;
        } else if (action.$type === "TActionCardFreeze") {
          return boardCard.FreezeAmount / 1000;
        } else if (action.$type === "TActionCardHaste") {
          return boardCard.HasteAmount / 1000;
        } else if (action.$type === "TActionCardSlow") {
          return boardCard.SlowAmount / 1000;
        } else if (action.$type === "TActionCardCharge") {
          return boardCard.ChargeAmount / 1000;
        }
        const match = action.$type.match(/^TActionPlayer([A-Za-z]+)Apply$/);
        if (match) {
          return boardCard[`${match[1]}ApplyAmount`];
        }
        return `{?${type}.${id}}`;
      });
    return tooltip;
  });
}

export function run(
  initialGameState: GameState,
  maxTicks: number = Infinity
): GameState[] {
  const steps = [];
  console.log(initialGameState);

  let gameState = initialGameState;
  let displayGameState = null;
  for (let i = 0; i < maxTicks; ++i) {
    [displayGameState, gameState] = runGameTick(gameState);
    steps.push(displayGameState);
    if (!displayGameState.isPlaying) {
      break;
    }
    if (displayGameState.tick >= sandstormTick) {
      break;
    }
  }
  return steps;
}
