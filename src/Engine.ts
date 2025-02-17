import {
  V2Card,
  Ability,
  AbilityPrerequisite,
  FluffyValue,
  AbilityAction,
  Enchantments,
  TriggerType
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
  [key: string]: any;
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
  Enchantment?: keyof Enchantments | null;
  isDisabled?: boolean;
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
      if (!boardCard.isDisabled) {
        callback(player, i, boardCard, j);
      }
    }
  }
}

function forEachAbility(
  boardCard: BoardCardOrSkill,
  callback: (ability: Ability) => void
): void {
  for (let i = 0; i < boardCard.AbilityIds.length; ++i) {
    const abilityId = boardCard.AbilityIds[i];
    const ability = boardCard.Abilities[abilityId];
    if (ability) {
      callback(ability);
    }
  }
}

function forEachAura(
  boardCard: BoardCardOrSkill,
  callback: (aura: Ability) => void
): void {
  for (let i = 0; i < boardCard.AuraIds.length; ++i) {
    const auraId = boardCard.AuraIds[i];
    const aura = boardCard.Auras[auraId];
    if (aura) {
      callback(aura);
    }
  }
}

export function getCardAttribute(
  gameState: GameState,
  playerID: number,
  boardCardID: number,
  attribute: string
): number {
  let value = gameState.players[playerID].board[boardCardID][attribute];

  forEachCard(
    gameState,
    (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
      forEachAura(targetBoardCard, (aura) => {
        const action = aura.Action;
        if (
          action.$type !== "TAuraActionCardModifyAttribute" ||
          action.AttributeType !== attribute
        ) {
          return;
        }
        const targetCards = getTargetCards(
          gameState,
          action.Target,
          playerID,
          boardCardID,
          targetPlayerID,
          targetBoardCardID
        );

        const targetCount =
          action.TargetCount == null
            ? targetCards.length
            : getActionValue(
                gameState,
                action.TargetCount,
                playerID,
                boardCardID,
                targetPlayerID,
                targetBoardCardID
              );

        targetCards
          .slice(0, targetCount)
          .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
            if (
              actionTargetPlayerID !== playerID ||
              actionTargetBoardCardID !== boardCardID
            ) {
              return;
            }

            const actionValue = getActionValue(
              gameState,
              action.Value as FluffyValue,
              playerID,
              boardCardID,
              targetPlayerID,
              targetBoardCardID
            );

            value =
              action.Operation === "Add"
                ? value + actionValue
                : action.Operation === "Multiply"
                  ? value * actionValue
                  : value - actionValue;
          });
      });
    }
  );

  return value;
}

export function getPlayerAttribute(
  gameState: GameState,
  playerID: number,
  attribute: string
): number {
  let value = gameState.players[playerID][attribute];

  forEachCard(
    gameState,
    (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
      forEachAura(targetBoardCard, (aura) => {
        const action = aura.Action;
        if (
          action.$type !== "TAuraActionPlayerModifyAttribute" ||
          action.AttributeType !== attribute
        ) {
          return;
        }

        getTargetPlayers(
          gameState,
          action.Target,
          playerID,
          targetPlayerID
        ).forEach((actionTargetPlayerID) => {
          if (actionTargetPlayerID !== playerID) {
            return;
          }

          const actionValue = getActionValue(
            gameState,
            action.Value as FluffyValue,
            playerID,
            -1,
            targetPlayerID,
            targetBoardCardID
          );

          value =
            action.Operation === "Add"
              ? value + actionValue
              : action.Operation === "Multiply"
                ? value * actionValue
                : value - actionValue;
        });
      });
    }
  );

  return value;
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
  playerID: number,
  boardCardID: number,
  attribute: string,
  value: number
): void {
  const existingValue =
    gameState.players[playerID].board[boardCardID][attribute];
  gameState.players[playerID].board[boardCardID][attribute] = value;

  forEachCard(
    gameState,
    (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
      forEachAbility(targetBoardCard, (ability) => {
        if (
          ability.Trigger.$type === "TTriggerOnCardAttributeChanged" &&
          ability.Trigger.AttributeChanged === attribute &&
          ((ability.Trigger.ChangeType === "Gain" && value > existingValue) ||
            (ability.Trigger.ChangeType === "Loss" && value < existingValue))
        ) {
          const subjects = getTargetCards(
            gameState,
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

function updatePlayerAttribute<K extends keyof Player>(
  gameState: GameState,
  playerID: number,
  attribute: K,
  value: Player[K]
): void {
  const existingValue = gameState.players[playerID][attribute];
  gameState.players[playerID][attribute] = value;

  forEachCard(
    gameState,
    (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
      forEachAbility(targetBoardCard, (ability) => {
        if (
          ability.Trigger.$type === "TTriggerOnPlayerAttributeChanged" &&
          ability.Trigger.AttributeType === attribute &&
          ((ability.Trigger.ChangeType === "Gain" && value > existingValue) ||
            (ability.Trigger.ChangeType === "Loss" && value < existingValue))
        ) {
          getTargetPlayers(
            gameState,
            ability.Trigger.Subject,
            playerID,
            targetPlayerID
          ).forEach((subjectPlayerID) => {
            runAction(
              gameState,
              ability.Action,
              ability.Prerequisites,
              subjectPlayerID,
              -1,
              targetPlayerID,
              targetBoardCardID
            );
          });
        }
      });
    }
  );
}

function testPrerequisite(
  gameState: GameState,
  prerequisite: any,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number
): boolean {
  switch (prerequisite.$type) {
    case "TPrerequisiteCardCount": {
      const subjects = getTargetCards(
        gameState,
        prerequisite.Subject,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      const value = subjects.length;
      const comparisonValue = prerequisite.Amount;
      switch (prerequisite.Comparison) {
        case "Equal":
          return value === comparisonValue;
        case "GreaterThan":
          return value > comparisonValue;
        case "GreaterThanOrEqual":
          return value >= comparisonValue;
        case "LessThan":
          return value < comparisonValue;
        case "LessThanOrEqual":
          return value <= comparisonValue;
        default:
          throw new Error(
            "Comparison type not implemented: " + prerequisite.Comparison
          );
      }
    }
    case "TPrerequisitePlayer": {
      const subjects = getTargetPlayers(
        gameState,
        prerequisite.Subject,
        triggerPlayerID,
        targetPlayerID
      );
      return subjects.length > 0;
    }
    case "TPrerequisiteRun":
      return true;
    default:
      throw new Error("Unhandled prerequisite type: " + prerequisite.$type);
  }
}

function testConditions(
  gameState: GameState,
  conditions: any,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number
): boolean {
    if (conditions == null) {
        return true;
    }

    switch (conditions.$type) {
        case "TCardConditionalAttribute": {
            const value =
                gameState.players[targetPlayerID].board[targetBoardCardID][
                    conditions.Attribute
                ];
            const comparisonValue = getActionValue(
                gameState,
                conditions.ComparisonValue,
                triggerPlayerID,
                triggerBoardCardID,
                targetPlayerID,
                targetBoardCardID
            );
            switch (conditions.ComparisonOperator) {
                case "Equal":
                    return value === comparisonValue;
                case "GreaterThan":
                    return value > comparisonValue;
                case "GreaterThanOrEqual":
                    return value >= comparisonValue;
                case "LessThan":
                    return value < comparisonValue;
                case "LessThanOrEqual":
                    return value <= comparisonValue;
                default:
                    throw new Error(
                        "ComparisonOperator not implemented: " +
                            conditions.ComparisonOperator
                    );
            }
        }
        case "TCardConditionalSize": {
            const is = conditions.Sizes.includes(
                gameState.players[targetPlayerID].board[targetBoardCardID].card.Size
            );
            return conditions.IsNot ? !is : is;
        }
        case "TCardConditionalHasEnchantment": {
            const is =
                gameState.players[targetPlayerID].board[targetBoardCardID].Enchantment ===
                conditions.Enchantment;
            return conditions.IsNot ? !is : is;
        }
        case "TCardConditionalHiddenTag":
        case "TCardConditionalTag": {
            const tags =
                gameState.players[targetPlayerID].board[targetBoardCardID].card[
                    conditions.$type === "TCardConditionalHiddenTag" ? "HiddenTags" : "Tags"
                ];

            switch (conditions.Operator) {
                case "Any":
                    return tags.filter((tag) => conditions.Tags.includes(tag)).length > 0;
                case "None":
                    return tags.filter((tag) => conditions.Tags.includes(tag)).length === 0;
                default:
                    throw new Error("Operator not implemented: " + conditions.Operator);
            }
        }
        case "TCardConditionalOr": {
            for (let i = 0; i < conditions.Conditions.length; ++i) {
                if (
                    testConditions(
                        gameState,
                        conditions.Conditions[i],
                        triggerPlayerID,
                        triggerBoardCardID,
                        targetPlayerID,
                        targetBoardCardID
                    )
                ) {
                    return true;
                }
            }
            return false;
        }
        case "TCardConditionalAnd": {
            for (let i = 0; i < conditions.Conditions.length; ++i) {
                if (
                    !testConditions(
                        gameState,
                        conditions.Conditions[i],
                        triggerPlayerID,
                        triggerBoardCardID,
                        targetPlayerID,
                        targetBoardCardID
                    )
                ) {
                    return false;
                }
            }
            return true;
        }
        default:
            throw new Error("Unhandled condition type: " + conditions.$type);
    }
}

function triggerActions(
  gameState: GameState,
  triggerType: TriggerType,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number
) {
  forEachCard(
    gameState,
    (abilityPlayer, abilityPlayerID, abilityBoardCard, abilityBoardCardID) => {
      forEachAbility(abilityBoardCard, (ability) => {
        if (ability.Trigger.$type !== triggerType) {
          return;
        }
        const subjects = getTargetCards(
          gameState,
          ability.Trigger.Subject,
          targetPlayerID,
          targetBoardCardID,
          abilityPlayerID,
          abilityBoardCardID
        );
        subjects.forEach(([subjectPlayerID, subjectBoardCardID]) => {
          if (
            subjectPlayerID === targetPlayerID &&
            subjectBoardCardID === targetBoardCardID
          ) {
            runAction(
              gameState,
              ability.Action,
              ability.Prerequisites,
              triggerPlayerID,
              triggerBoardCardID,
              abilityPlayerID,
              abilityBoardCardID
            );
          }
        });
      });
    }
  );
}

// Returns true if the action critted
function runAction(
  gameState: GameState,
  action: AbilityAction,
  prerequisites: AbilityPrerequisite[] | null, // null means no prerequisites
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number
): boolean {
  let hasCritted = false;
  if (prerequisites != null) {
    for (let i = 0; i < prerequisites.length; ++i) {
      if (
        !testPrerequisite(
          gameState,
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

  switch (action.$type) {
    case "TActionPlayerDamage": {
      getTargetPlayers(
        gameState,
          action.Target,
        triggerPlayerID,
        targetPlayerID
      ).forEach((playerID) => {
        const shield = gameState.players[playerID].Shield;
        let amount = getCardAttribute(
          gameState,
        targetPlayerID,
        targetBoardCardID,
          "DamageAmount"
      );
        const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        "CritChange"
      );
        if (critChance > 0) {
          if (gameState.getRand() * 100 < critChance) {
            amount *= 2;
            const damageCrit = getCardAttribute(
            gameState,
            targetPlayerID,
            targetBoardCardID,
            "DamageCrit"
          );
            if (damageCrit !== undefined) {
              amount *= 1 + damageCrit / 100;
              hasCritted = true;
            }
          }
        }

        const nextShield = Math.max(0, shield - amount);
        if (nextShield > 0) {
          gameState.players[playerID].Shield = nextShield;
        } else {
          const nextAmount = amount - shield;
          gameState.players[playerID].Shield = 0;
          gameState.players[playerID].Health -= nextAmount;
        }
      });
      break;
    }
    case "TActionPlayerHeal": {
      getTargetPlayers(
        gameState,
          action.Target,
        triggerPlayerID,
        targetPlayerID
      ).forEach((playerID) => {
        let amount = getCardAttribute(
          gameState,
        targetPlayerID,
        targetBoardCardID,
          "HealAmount"
      );
        const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        "CritChance"
      );
        if (critChance > 0) {
          if (gameState.getRand() * 100 < critChance) {
            amount *= 2;
            hasCritted = true;
          }
        }

      if (gameState.players[playerID].Poison > 0) {
        updatePlayerAttribute(
          gameState,
          playerID,
          "Poison",
          gameState.players[playerID].Poison - 1
        );
      }
      if (gameState.players[playerID].Burn > 0) {
        updatePlayerAttribute(
          gameState,
          playerID,
          "Burn",
          gameState.players[playerID].Burn - 1
        );
      }

      if (
        gameState.players[playerID].HealthMax !==
        gameState.players[playerID].Health
      ) {
        updatePlayerAttribute(
          gameState,
          playerID,
          "Health",
          Math.min(
            gameState.players[playerID].HealthMax,
            gameState.players[playerID].Health + amount
          )
        );
      } else {
        triggerActions(
          gameState,
          TriggerType.TTriggerOnCardPerformedOverHeal,
          playerID,
          -1,
          targetPlayerID,
          targetBoardCardID
        );
      }
      triggerActions(
        gameState,
        TriggerType.TTriggerOnCardPerformedHeal,
        playerID,
        -1,
        targetPlayerID,
        targetBoardCardID
      );
    });
    break;
  } 
  case "TActionPlayerPoisonApply": {
    let amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "PoisonApplyAmount"
    );
    const critChance = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "CritChance"
    );
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }

    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      triggerActions(
        gameState,
        TriggerType.TTriggerOnCardPerformedPoison,
        playerID,
        -1,
        targetPlayerID,
        targetBoardCardID
      );
      updatePlayerAttribute(
        gameState,
        playerID,
        "Poison",
        gameState.players[playerID].Poison + amount
      );
    });
    break;
  } 
  case "TActionPlayerPoisonRemove": {
    let amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "PoisonRemoveAmount"
    );
    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      updatePlayerAttribute(
        gameState,
        playerID,
        "Poison",
        Math.max(0, gameState.players[playerID].Poison - amount)
      );
    });
    break;
  }
  case "TActionPlayerBurnApply": {
    let amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "BurnApplyAmount"
    );
    const critChance = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "CritChance"
    );
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }
    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      triggerActions(
        gameState,
        TriggerType.TTriggerOnCardPerformedBurn,
        playerID,
        -1,
        targetPlayerID,
        targetBoardCardID
      );
      updatePlayerAttribute(
        gameState,
        playerID,
        "Burn",
        gameState.players[playerID].Burn + amount
      );
    });
    break;
  }
  case "TActionPlayerBurnRemove": {
    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        "BurnRemoveAmount"
      );

      updatePlayerAttribute(
        gameState,
        playerID,
        "Burn",
        Math.max(0, gameState.players[playerID].Burn - amount)
      );
    });
    break;
  } 
  case "TActionPlayerShieldApply": {
    let amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "ShieldApplyAmount"
    );
    const critChance = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "CritChance"
    );
    if (critChance > 0) {
      if (gameState.getRand() * 100 < critChance) {
        amount *= 2;
        hasCritted = true;
      }
    }

    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      updatePlayerAttribute(
        gameState,
        playerID,
        "Shield",
        gameState.players[playerID].Shield + amount
      );

      triggerActions(
        gameState,
        TriggerType.TTriggerOnCardPerformedShield,
        playerID,
        -1,
        targetPlayerID,
        targetBoardCardID
      );
    });
    break;
  } 
  case "TActionPlayerShieldRemove": {
    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        "ShieldRemoveAmount"
      );

      updatePlayerAttribute(
        gameState,
        playerID,
        "Shield",
        Math.max(0, gameState.players[playerID].Shield - amount)
      );
    });
    break;
  } 
  case "TActionPlayerReviveHeal": {
    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      updatePlayerAttribute(gameState, playerID, "Health", 0);
    });
    break;
  } 
  case "TActionCardDisable": {
    const targetCards = getTargetCards(
      gameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    targetCards
      .slice(0, 1)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const nextBoardCard =
          gameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ];
        nextBoardCard.isDisabled = true;
        triggerActions(
          gameState,
          TriggerType.TTriggerOnCardPerformedDestruction,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          targetPlayerID,
          targetBoardCardID
        );
      });
  } else if (action.$type === "TActionCardReload") {
    const targetCards = getTargetCards(
      gameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    const amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "ReloadAmount"
    );

    const targetCount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      "ReloadTargets"
    );

    targetCards
      .slice(0, targetCount)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const value = getCardAttribute(
          gameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          "Ammo"
        );
        const ammoMax = getCardAttribute(
          gameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          "AmmoMax"
        );
        const newValue = Math.min(ammoMax, value + amount);
        if (value !== newValue) {
          updateCardAttribute(
            gameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            "Ammo",
            newValue
          );
        }
      });
  } case "TActionCardFreeze":
    case "TActionCardSlow":
    case "TActionCardHaste": {
    const [amountKey, targetsKey, tickKey, triggerType] =
      action.$type === "TActionCardFreeze"
        ? [
            "FreezeAmount",
            "FreezeTargets",
            "Freeze",
            TriggerType.TTriggerOnCardPerformedFreeze
          ]
        : action.$type === "TActionCardSlow"
          ? [
              "SlowAmount",
              "SlowTargets",
              "Slow",
              TriggerType.TTriggerOnCardPerformedSlow
            ]
          : action.$type === "TActionCardHaste"
            ? [
                "HasteAmount",
                "HasteTargets",
                "Haste",
                TriggerType.TTriggerOnCardPerformedHaste
              ]
            : [];
    if (
      amountKey == null ||
      targetsKey == null ||
      tickKey == null ||
      triggerType == null
    ) {
      throw new Error(
        "Card:" +
          gameState.players[targetPlayerID].board[targetBoardCardID].card
            .InternalName +
          "is missing an amount, target or tick key for " +
          action.$type
      );
    }
    const amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      amountKey
    );
    const targetCount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      targetsKey
    );

    const targetCards = getTargetCards(
      gameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    targetCards
      .filter(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        return hasCooldown(
          gameState.players[actionTargetPlayerID].board[actionTargetBoardCardID]
        );
      })
      .sort((a, b) => {
        // Prioritize items that have no slow/freeze
        const amountA = gameState.players[a[0]].board[a[1]][tickKey];
        const amountB = gameState.players[b[0]].board[b[1]][tickKey];
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
          actionTargetPlayerID,
          actionTargetBoardCardID,
          tickKey,
          gameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ][tickKey] + amount
        );

        triggerActions(
          gameState,
          triggerType,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          targetPlayerID,
          targetBoardCardID
        );
      });
      break;
  } 
  case "TActionCardCharge": {
    const [amountKey, targetsKey] = ["ChargeAmount", "ChargeTargets"];
    const amount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      amountKey
    );
    const targetCount = getCardAttribute(
      gameState,
      targetPlayerID,
      targetBoardCardID,
      targetsKey
    );

    const targetCards = getTargetCards(
      gameState,
      action.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    targetCards
      .filter(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        return hasCooldown(
          gameState.players[actionTargetPlayerID].board[actionTargetBoardCardID]
        );
      })
      .slice(0, targetCount)
      .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const nextBoardCard =
          gameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ];
        const cooldownMax = getCardAttribute(
          gameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          "CooldownMax"
        );
        const newValue = Math.min(cooldownMax, nextBoardCard.tick + amount);

        if (nextBoardCard.tick !== newValue) {
          updateCardAttribute(
            gameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            "tick",
            newValue
          );
        }
      });
      break;
  } 
  case "TActionCardModifyAttribute": {
    if (!action.Value || !action.AttributeType) {
      throw new Error("Missing Value");
    }
    const actionValue = getActionValue(
      gameState,
      action.Value,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );

    const targetCards = getTargetCards(
      gameState,
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
          gameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ][action.AttributeType as string];
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
          actionTargetPlayerID,
          actionTargetBoardCardID,
          action.AttributeType as string,
          newValue
        );
      });
      break;
  } 
  case "TActionPlayerModifyAttribute": {
    const actionValue = getActionValue(
      gameState,
      action.Value as FluffyValue,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    getTargetPlayers(
      gameState,
      action.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((playerID) => {
      const oldValue =
        gameState.players[playerID][action.AttributeType as string];
      const newValue =
        action.Operation === "Add"
          ? oldValue + actionValue
          : action.Operation === "Subtract"
            ? oldValue - actionValue
            : action.Operation === "Multiply"
              ? oldValue * actionValue
              : oldValue;

      updatePlayerAttribute(
        gameState,
        playerID,
        action.AttributeType as string,
        newValue
      );
    });
    break;
  }

  return hasCritted;
}

function getActionValue(
  gameState: GameState,
  value: FluffyValue,
  triggerPlayerID: number,
  triggerBoardCardID: number,
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
      value.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    amount = value.DefaultValue;
    targetCards.forEach(([valueTargetPlayerID, valueTargetBoardCardID]) => {
      amount =
        (amount ?? 0) +
        (getCardAttribute(
          gameState,
          valueTargetPlayerID,
          valueTargetBoardCardID,
          value.AttributeType as string
        ) ?? 0);
    });
  } else if (value.$type === "TReferenceValuePlayerAttribute") {
    amount = value.DefaultValue;
    getTargetPlayers(
      gameState,
      value.Target,
      triggerPlayerID,
      targetPlayerID
    ).forEach((valueTargetPlayerID) => {
      amount =
        (amount ?? 0) +
        (getPlayerAttribute(
          gameState,
          valueTargetPlayerID,
          value.AttributeType as string
        ) ?? 0);
    });
  } else if (value.$type === "TReferenceValueCardCount") {
    const targetCards = getTargetCards(
      gameState,
      value.Target,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID
    );
    amount = targetCards.length;
  }
  if (amount != null && value.Modifier != null) {
    const modifierValue = getActionValue(
      gameState,
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
  return amount ?? 0;
}

function getTargetCards(
  gameState: GameState,
  target: any,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number
): Array<[number, number]> {
  const results: [number, number][] = [];
  if (target.$type === "TTargetCardSelf") {
    results.push([targetPlayerID, targetBoardCardID]);
  } else if (target.$type === "TTargetCardTriggerSource") {
    results.push([triggerPlayerID, triggerBoardCardID]);
  } else if (target.$type === "TTargetCardPositional") {
    const [originPlayerID, originBoardCardID] =
      target.Origin === "TriggerSource"
        ? [triggerPlayerID, triggerBoardCardID]
        : [targetPlayerID, targetBoardCardID];

    if (target.TargetMode === "AllRightCards") {
      const lengthCardItems =
        gameState.players[originPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      for (
        let i = originBoardCardID + (target.IncludeOrigin ? 0 : 1);
        i < lengthCardItems;
        ++i
      ) {
        results.push([originPlayerID, i]);
      }
    } else if (target.TargetMode === "AllLeftCards") {
      for (
        let i = 0;
        i < originBoardCardID - (target.IncludeOrigin ? 0 : 1);
        ++i
      ) {
        results.push([originPlayerID, i]);
      }
    } else if (target.TargetMode === "Neighbor") {
      if (target.IncludeOrigin) {
        results.push([originPlayerID, originBoardCardID]);
      }
      if (originBoardCardID !== 0) {
        results.push([originPlayerID, originBoardCardID - 1]);
      }
      const lengthCardItems =
        gameState.players[originPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      if (originBoardCardID < lengthCardItems - 1) {
        results.push([originPlayerID, originBoardCardID + 1]);
      }
    } else if (target.TargetMode === "RightCard") {
      if (target.IncludeOrigin) {
        results.push([targetPlayerID, targetBoardCardID]);
      }
      const lengthCardItems =
        gameState.players[targetPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem"
        ) + 1;
      if (targetBoardCardID < lengthCardItems - 1) {
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
  } else if (target.$type === "TTargetCardXMost") {
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
  }

  if (
    target.Conditions &&
    target.Conditions.$type === "TCardConditionalAttributeHighest"
  ) {
    let highestValue = -Infinity;
    let highestPlayerID = null;
    let highestBoardCardID = null;
    results.forEach(([testPlayerID, testBoardCardID]) => {
      const value = getCardAttribute(
        gameState,
        testPlayerID,
        testBoardCardID,
        target.Conditions.AttributeType
      );

      if (
        !gameState.players[testPlayerID].board[testBoardCardID].isDisabled &&
        value !== undefined &&
        value > highestValue
      ) {
        highestValue = value;
        highestPlayerID = testPlayerID;
        highestBoardCardID = testBoardCardID;
      }
    });
    if (highestPlayerID !== null && highestBoardCardID !== null) {
      return [[highestPlayerID, highestBoardCardID]];
    } else {
      return [];
    }
  }

  const filteredResults = results.filter(([testPlayerID, testBoardCardID]) => {
    return (
      !gameState.players[testPlayerID].board[testBoardCardID].isDisabled &&
      testConditions(
        gameState,
        target.Conditions,
        triggerPlayerID,
        triggerBoardCardID,
        testPlayerID,
        testBoardCardID
      )
    );
  });

  if (target.$type === "TTargetCardXMost") {
    if (target.TargetMode === "LeftMostCard") {
      return filteredResults.slice(0, 1);
    } else {
      return filteredResults.slice(-1);
    }
  }

  return filteredResults;
}

function getTargetPlayers(
  gameState: GameState,
  target: any,
  triggerPlayerID: number,
  targetPlayerID: number
): number[] {
  let results: number[] = [];
  if (target.$type === "TTargetPlayerRelative") {
    if (target.TargetMode === "Opponent") {
      results = [(targetPlayerID + 1) % 2];
    } else if (target.TargetMode === "Self") {
      results = [targetPlayerID];
    }
  } else if (target.$type === "TTargetCardSection") {
    if (target.TargetSection === "SelfBoard") {
      results = [targetPlayerID];
    } else {
      results = [(targetPlayerID + 1) % 2];
    }
  } else if (target.$type === "TTargetPlayer" && target.TargetMode === "Both") {
    results = [targetPlayerID, (targetPlayerID + 1) % 2];
  } else {
    throw new Error("Unhandled target type: " + target.$type);
  }

  if (target.Conditions) {
    results = results.filter((playerID) => {
      if (target.Conditions.$type === "TPlayerConditionalAttribute") {
        const value = gameState.players[playerID][target.Conditions.Attribute];
        const comparisonValue = getActionValue(
          gameState,
          target.Conditions.ComparisonValue,
          triggerPlayerID,
          -1,
          playerID,
          -1
        );
        if (target.Conditions.ComparisonOperator === "Equal") {
          return value === comparisonValue;
        } else if (target.Conditions.ComparisonOperator === "GreaterThan") {
          return value > comparisonValue;
        } else if (
          target.Conditions.ComparisonOperator === "GreaterThanOrEqual"
        ) {
          return value >= comparisonValue;
        } else if (target.Conditions.ComparisonOperator === "LessThan") {
          return value < comparisonValue;
        } else if (target.Conditions.ComparisonOperator === "LessThanOrEqual") {
          return value <= comparisonValue;
        }
      }
    });
  }
  return results;
}

export const TICK_RATE = 100;

function runGameTick(initialGameState: GameState): GameState {
  const gameState = {
    ...initialGameState,
    players: initialGameState.players.map((player) => ({
      ...player,
      board: player.board.map((boardCard) => ({ ...boardCard }))
    })),
    multicast: [...initialGameState.multicast]
  };

  // Start fight
  if (gameState.tick === 0) {
    forEachCard(
      gameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        forEachAbility(targetBoardCard, (ability) => {
          if (ability.Trigger.$type === "TTriggerOnFightStarted") {
            runAction(
              gameState,
              ability.Action,
              ability.Prerequisites,
              targetPlayerID,
              -1,
              targetPlayerID,
              targetBoardCardID
            );
          }
        });
      }
    );
  }

  // Poison + Regen
  if (gameState.tick % 1000 === 0) {
    gameState.players.forEach((player, playerID) => {
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
    gameState.players.forEach((player, playerID) => {
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
  const cardTriggerList: [number, number, boolean][] = [];
  forEachCard(gameState, (player, playerID, boardCard, boardCardID) => {
    if (boardCard.card.$type === "TCardSkill") {
      return;
    }
    if (boardCard.isDisabled) {
      return;
    }
    if (!hasCooldown(boardCard)) {
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
    const CooldownMax = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      "CooldownMax"
    );
    boardCard.Slow = Math.max(0, boardCard.Slow - tick);
    boardCard.Haste = Math.max(0, boardCard.Haste - tick);
    if (boardCard.Freeze > 0) {
      boardCard.Freeze -= tick;
      tick = boardCard.Freeze;
      if (boardCard.Freeze > 0) {
        tick = 0;
      } else {
        tick = -boardCard.Freeze;
        boardCard.Freeze = 0;
      }
    } else {
      boardCard.tick = Math.min(boardCard.tick + tickRate, CooldownMax);
    }

    if (boardCard.tick === CooldownMax) {
      const AmmoMax = getCardAttribute(
        gameState,
        playerID,
        boardCardID,
        "AmmoMax"
      );
      const Ammo = getCardAttribute(gameState, playerID, boardCardID, "Ammo");
      if (!AmmoMax || (AmmoMax && Ammo === undefined) || Ammo > 0) {
        cardTriggerList.push([playerID, boardCardID, /* isMulticast */ false]);
        if ("Multicast" in boardCard) {
          const MULTICAST_DELAY = 300;
          for (let i = 0; i < boardCard.Multicast - 1; ++i) {
            gameState.multicast.push({
              tick: gameState.tick + (i + 1) * MULTICAST_DELAY,
              playerID,
              boardCardID
            });
          }
        }
      }
    }
  });

  gameState.multicast.forEach((multicast) => {
    if (multicast.tick <= gameState.tick) {
      cardTriggerList.push([
        multicast.playerID,
        multicast.boardCardID,
        /* isMulticast */ true
      ]);
      gameState.multicast.splice(gameState.multicast.indexOf(multicast), 1);
    }
  });

  const cardCrittedList: number[][] = [];

  // Trigger Cards
  cardTriggerList.forEach(([playerID, boardCardID, isMulticast]) => {
    const boardCard = gameState.players[playerID].board[boardCardID];
    const AmmoMax = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      "AmmoMax"
    );
    if (!isMulticast && AmmoMax) {
      const Ammo = getCardAttribute(gameState, playerID, boardCardID, "Ammo");
      gameState.players[playerID].board[boardCardID].Ammo =
        Ammo === undefined ? AmmoMax - 1 : Ammo - 1;
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

        if (hasCritted) {
          cardCrittedList.push([targetPlayerID, targetBoardCardID]);
        }
      }
    );

    if (!isMulticast) {
      gameState.players[playerID].board[boardCardID].tick = 0;
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
  const sandstormDamage = sandstormDamagePerTick[gameState.tick];
  if (sandstormDamage > 0) {
    gameState.players.forEach((player, playerID) => {
      const shield = player.Shield;
      const nextShield = Math.max(0, shield - sandstormDamage);
      if (nextShield > 0) {
        updatePlayerAttribute(gameState, playerID, "Shield", nextShield);
      } else {
        const nextHealthDamage = sandstormDamage - shield;
        updatePlayerAttribute(gameState, playerID, "Shield", 0);
        updatePlayerAttribute(
          gameState,
          playerID,
          "Health",
          player.Health - nextHealthDamage
        );
      }
    });
  }

  // Death
  gameState.players.forEach((player, playerID) => {
    if (player.Health < 0) {
      forEachCard(
        gameState,
        (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
          forEachAbility(targetBoardCard, (ability) => {
            if (ability.Trigger.$type === "TTriggerOnPlayerDied") {
              getTargetPlayers(
                gameState,
                ability.Trigger.Subject,
                playerID,
                targetPlayerID
              ).forEach((abilityPlayerID) => {
                if (abilityPlayerID === playerID) {
                  runAction(
                    gameState,
                    ability.Action,
                    ability.Prerequisites,
                    abilityPlayerID,
                    -1,
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
  });

  let isPlaying = true;
  gameState.players.forEach((player) => {
    if (player.Health <= 0) {
      isPlaying = false;
    }
  });
  gameState.isPlaying = isPlaying;

  gameState.tick += TICK_RATE;

  return gameState;
}

export function getTooltips(
  gameState: GameState,
  playerID: number,
  boardCardID: number
): string[] {
  const boardCard = gameState.players[playerID].board[boardCardID];
  return boardCard.TooltipIds.map((tooltipId: string) => {
    const tooltipObject = boardCard.Localization.Tooltips[tooltipId];
    if (!tooltipObject) {
      return "??";
    }
    const tooltip: string | number = tooltipObject.Content.Text.replace(
      /\{([a-z]+)\.([a-z0-9]+)\.targets\}/g,
      (_: any, type: string, id: string | number) => {
        const action =
          boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
        if (action.$type === "TActionCardHaste") {
          return boardCard.HasteTargets;
        } else if (action.$type === "TActionCardSlow") {
          return boardCard.SlowTargets;
        } else if (action.$type === "TActionCardFreeze") {
          return boardCard.FreezeTargets;
        } else if (action.$type === "TActionCardCharge") {
          return boardCard.ChargeTargets;
        } else if (action.$type === "TActionCardReload") {
          return boardCard.ReloadTargets;
        }
        return `{?${type}.${id}.targets}`;
      }
    )
      .replace(
        /\{([a-z]+)\.([a-z0-9]+)\.mod\}/g,
        (_: any, type: string, id: string | number) => {
          const action =
            boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
          return getActionValue(
            gameState,
            action.Value.Modifier.Value,
            playerID,
            boardCardID,
            playerID,
            boardCardID
          );
        }
      )
      .replace(
        /\{([a-z]+)\.([a-z0-9]+)\}/g,
        (_: any, type: string, id: string | number, targets: any) => {
          const action =
            boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;

          if (action.Value) {
            const actionValue = getActionValue(
              gameState,
              action.Value,
              playerID,
              boardCardID,
              playerID,
              boardCardID
            );
            if (
              action.$type === "TAuraActionCardModifyAttribute" &&
              (action.AttributeType === "SlowAmount" ||
                action.AttributeType === "FreezeAmount" ||
                action.AttributeType === "HasteAmount" ||
                action.AttributeType === "ChargeAmount")
            ) {
              return actionValue / 1000;
            } else {
              return actionValue;
            }
          }

          if (action.$type === "TActionGameSpawnCards") {
            return getActionValue(
              gameState,
              action.SpawnContext.Limit,
              playerID,
              boardCardID,
              playerID,
              boardCardID
            );
          } else if (action.$type === "TActionPlayerDamage") {
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
        }
      );
    return tooltip;
  });
}

export function run(
  initialGameState: GameState,
  maxTicks: number = Infinity
): GameState[] {
  const steps = [initialGameState];
  console.log(initialGameState);

  let gameState = initialGameState;
  for (let i = 0; i < maxTicks; ++i) {
    gameState = runGameTick(gameState);
    steps.push(gameState);
    if (!gameState.isPlaying || gameState.tick >= sandstormTick) {
      break;
    }
  }
  return steps;
}
