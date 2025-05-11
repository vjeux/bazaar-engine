import {
  type Ability,
  type AbilityAction,
  type ActionType,
  AttributeType,
  type Aura,
  type Card,
  type Enchantments,
  Priority,
  Source,
  Subject,
  Target,
  Tooltip,
  TriggerType,
  type Value,
  type Conditions,
  AbilityPrerequisite,
  Operation,
} from "../types/cardTypes.ts";

import type { Hero, Tag, Tier } from "../types/shared.ts";

export interface GameState {
  tick: number;
  isPlaying: boolean;
  players: Player[];
  multicast: Multicast[];
  getRand: () => number;
  winner?: "Player" | "Enemy" | "Draw";
}

export interface Multicast {
  tick: number;
  playerID: number;
  boardCardID: number;
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
  Hero: string; // hero name
  board: BoardCard[];
}

export type BoardCard = {
  [key in AttributeType]: number | undefined;
} & {
  card: Card;
  uuid: string; // Used to identify similar cards in drag and drop
  tick: number;
  tags: string[]; // visible tags on the card. Dynamic as certain auras can append tags.
  HiddenTags: string[];
  tier: Tier;
  Enchantment?: keyof Enchantments | null;
  isDisabled: boolean;
  Auras: { [key: string]: Aura };
  AbilityIds: string[];
  AuraIds: string[];
  TooltipIds: number[];
  Abilities: { [key: string]: Ability };
  Localization: {
    Title: {
      Text: string;
    };
    Tooltips: Tooltip[];
  };
};

/**
 * Iterates over every board card for each player in the game state, calling the provided callback for each non-disabled board card.
 */
function forEachCard(
  gameState: GameState,
  callback: (
    player: Player,
    playerIndex: number,
    boardCard: BoardCard,
    boardCardIndex: number,
  ) => void,
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

const priorityOrder = {
  [Priority.Immediate]: 0,
  [Priority.Highest]: 1,
  [Priority.High]: 2,
  [Priority.Medium]: 3,
  [Priority.Low]: 4,
  [Priority.Lowest]: 5,
};

type ActionMetadata = { changeValue?: number } | undefined;

/**
 * Iterates over all abilities in the game state and processes them using a callback function.
 *
 * The callback function can run `addAction` to push an action to the action queue, that will be ran using {@link runAction} after all abilities have been processed.
 *
 * After all abilities have been processed via the callback, all queued actions are filtered by verifying that
 * any prerequisites specified by each ability are met, then sorted according to their priorities.
 *
 * Finally, the actions are executed in the sorted order.
 */
function forEachAbility(
  gameState: GameState,
  callback: (
    player: Player,
    playerIndex: number,
    boardCard: BoardCard,
    boardCardIndex: number,
    ability: Ability,
    addAction: (
      triggerPlayerID: number,
      triggerBoardCardID: number,
      targetPlayerID: number,
      targetBoardCardID: number,
      metadata?: ActionMetadata,
    ) => void,
  ) => void,
): void {
  const actions: [Ability, number, number, number, number, ActionMetadata][] =
    [];
  forEachCard(gameState, (player, playerIndex, boardCard, boardCardIndex) => {
    for (let i = 0; i < boardCard.AbilityIds.length; ++i) {
      const abilityId = boardCard.AbilityIds[i];
      const ability = boardCard.Abilities[abilityId];
      if (ability) {
        callback(
          player,
          playerIndex,
          boardCard,
          boardCardIndex,
          ability,
          function addAction(
            triggerPlayerID: number,
            triggerBoardCardID: number,
            targetPlayerID: number,
            targetBoardCardID: number,
            metadata?: ActionMetadata,
          ) {
            actions.push([
              ability,
              triggerPlayerID,
              triggerBoardCardID,
              targetPlayerID,
              targetBoardCardID,
              metadata,
            ]);
          },
        );
      }
    }
  });

  actions
    .filter(
      ([
        ability,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      ]) => {
        if (ability.Prerequisites == null) {
          return true;
        }
        for (let i = 0; i < ability.Prerequisites.length; ++i) {
          if (
            !testPrerequisite(
              gameState,
              ability.Prerequisites[i],
              triggerPlayerID,
              triggerBoardCardID,
              targetPlayerID,
              targetBoardCardID,
            )
          ) {
            return false;
          }
        }
        return true;
      },
    )
    .sort((a, b) => {
      const priorityA = priorityOrder[a[0].Priority || "Lowest"];
      const priorityB = priorityOrder[b[0].Priority || "Lowest"];
      return priorityA - priorityB;
    })
    .forEach(
      ([
        ability,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
        metadata,
      ]) => {
        runAction(
          gameState,
          ability.Action,
          triggerPlayerID,
          triggerBoardCardID,
          targetPlayerID,
          targetBoardCardID,
          metadata,
        );
      },
    );
}

function forEachAura(
  gameState: GameState,
  callback: (
    player: Player,
    playerIndex: number,
    boardCard: BoardCard,
    boardCardIndex: number,
    aura: Aura,
  ) => void,
): void {
  forEachCard(gameState, (player, playerIndex, boardCard, boardCardIndex) => {
    for (let i = 0; i < boardCard.AuraIds.length; ++i) {
      const auraId = boardCard.AuraIds[i];
      const aura: Aura | undefined = boardCard.Auras?.[auraId];
      if (aura) {
        callback(player, playerIndex, boardCard, boardCardIndex, aura);
      }
    }
  });
}

export function getCardAttribute<K extends keyof BoardCard>(
  gameState: GameState,
  playerID: number,
  boardCardID: number,
  attribute: K,
): BoardCard[K] {
  const boardCard = gameState.players[playerID].board[boardCardID];
  const value = boardCard[attribute];

  switch (attribute) {
    case "tags": {
      let tags: Set<string> = new Set(
        gameState.players[playerID].board[boardCardID].tags,
      );
      forEachAura(
        gameState,
        (player, playerIndex, boardCard, boardCardIndex, aura) => {
          if (aura.Action.$type !== "TAuraActionCardAddTagsBySource") {
            return;
          }
          // If target includes the card we are getting attribute for
          if (
            getTargetCards(
              gameState,
              aura.Action.Target,
              playerID,
              boardCardID,
              playerIndex,
              boardCardIndex,
            ).some(
              ([targetPlayerID, targetBoardCardID]) =>
                targetPlayerID === playerID &&
                targetBoardCardID === boardCardID,
            )
          ) {
            // Take tags from source cards
            const sourceCards = getTargetCards(
              gameState,
              aura.Action.Source,
              playerID,
              boardCardID,
              playerIndex,
              boardCardIndex,
            );
            sourceCards.forEach(([targetPlayerID, targetBoardCardID]) => {
              // Append tags from card to set
              tags = new Set([
                ...tags,
                ...gameState.players[targetPlayerID].board[targetBoardCardID]
                  .tags,
                // TODO: works for now, should use getCardAttribute but it results in an infinite loop
                // ...getCardAttribute(
                //   gameState,
                //   targetPlayerID,
                //   targetBoardCardID,
                //   "tags",
                // ),
              ]);
            });
          }
        },
      );
      return Array.from(tags) as BoardCard[K];
    }
    default: {
      // For numerical attributes only
      if (typeof value === "number") {
        let numericValue = value as number;

        forEachAura(
          gameState,
          (
            targetPlayer,
            targetPlayerID,
            targetBoardCard,
            targetBoardCardID,
            aura,
          ) => {
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
              targetBoardCardID,
            );

            targetCards.forEach(
              ([actionTargetPlayerID, actionTargetBoardCardID]) => {
                if (
                  actionTargetPlayerID !== playerID ||
                  actionTargetBoardCardID !== boardCardID
                ) {
                  return;
                }

                const actionValue = getActionValue(
                  gameState,
                  action.Value,
                  playerID,
                  boardCardID,
                  targetPlayerID,
                  targetBoardCardID,
                );

                if (typeof actionValue === "number") {
                  numericValue =
                    action.Operation === "Add"
                      ? numericValue + actionValue
                      : action.Operation === "Multiply"
                        ? numericValue * actionValue
                        : numericValue - actionValue;
                }
              },
            );
          },
        );

        return numericValue as unknown as BoardCard[K];
      }

      // For non-numeric attributes
      return value;
    }
  }
}

export function getPlayerAttribute<K extends keyof Player>(
  gameState: GameState,
  playerID: number,
  attribute: K,
): Player[K] {
  const value = gameState.players[playerID][attribute];

  if (typeof value === "number") {
    let numericValue = value as number;

    forEachAura(
      gameState,
      (
        targetPlayer,
        targetPlayerID,
        targetBoardCard,
        targetBoardCardID,
        aura,
      ) => {
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
          targetPlayerID,
        ).forEach((actionTargetPlayerID) => {
          if (actionTargetPlayerID !== playerID) {
            return;
          }

          const actionValue = getActionValue(
            gameState,
            action.Value as Value,
            playerID,
            -1,
            targetPlayerID,
            targetBoardCardID,
          );

          numericValue =
            action.Operation === "Add"
              ? numericValue + actionValue
              : action.Operation === "Multiply"
                ? numericValue * actionValue
                : numericValue - actionValue;
        });
      },
    );

    return numericValue as unknown as Player[K];
  }

  return value;
}

function hasCooldown(boardCard: BoardCard): boolean {
  return "CooldownMax" in boardCard;
}

/**
 * Sandstorm
 *
 * Starts at 30 seconds, at 1 dmg
 * Tickrate is every 0.1 seconds
 * Increase by 2 every tick after the first 10 ticks
 * End Game at around 100 seconds (this is hard to get exact from a video)
 */
const sandstormInitialTick = 30000;
const sandstormTickRate = 100;

const sandstormDamagePerTick: Record<number, number> = {};
let sandstormDamage = 1;
let sandstormTick = sandstormInitialTick;
let damageTicks = 0;
while (damageTicks < 1000) {
  sandstormDamagePerTick[sandstormTick] = sandstormDamage;
  if (damageTicks >= 9) {
    sandstormDamage += 2;
  }
  sandstormTick += sandstormTickRate;
  damageTicks++;
}

function updateCardAttribute(
  gameState: GameState,
  playerID: number,
  boardCardID: number,
  attribute: AttributeType | "tick",
  value: number,
): void {
  const existingValue =
    gameState.players[playerID].board[boardCardID][attribute];

  const bc = gameState.players[playerID].board[boardCardID];
  bc[attribute] = value;

  forEachAbility(
    gameState,
    (
      targetPlayer,
      targetPlayerID,
      targetBoardCard,
      targetBoardCardID,
      ability,
      addAction,
    ) => {
      if (
        typeof existingValue === "number" &&
        ability.Trigger.$type === "TTriggerOnCardAttributeChanged" &&
        ability.Trigger.AttributeChanged === attribute &&
        ((ability.Trigger.ChangeType === "Gain" && value > existingValue) ||
          (ability.Trigger.ChangeType === "Loss" && value < existingValue))
      ) {
        if (!ability.Trigger.Subject) {
          throw new Error(
            "Trigger subject must exist for attribute change trigger",
          );
        }
        const subjects = getTargetCards(
          gameState,
          ability.Trigger.Subject,
          playerID,
          boardCardID,
          targetPlayerID,
          targetBoardCardID,
        );

        subjects.forEach(([subjectPlayerID, subjectBoardCardID]) => {
          if (
            subjectPlayerID === playerID &&
            subjectBoardCardID === boardCardID
          ) {
            addAction(playerID, boardCardID, targetPlayerID, targetBoardCardID);
          }
        });
      }
    },
  );
}

function updatePlayerAttribute<K extends keyof Player>(
  gameState: GameState,
  playerID: number,
  attribute: K &
    keyof {
      [P in keyof Player as Player[P] extends number ? P : never]: Player[P];
    }, // ensures player attribute being changed is a number
  value: number,
): void {
  const existingValue = gameState.players[playerID][attribute];
  gameState.players[playerID][attribute] = value;

  forEachAbility(
    gameState,
    (
      targetPlayer,
      targetPlayerID,
      targetBoardCard,
      targetBoardCardID,
      ability,
      addAction,
    ) => {
      if (
        ability.Trigger.$type === "TTriggerOnPlayerAttributeChanged" &&
        ability.Trigger.AttributeType === attribute &&
        ((ability.Trigger.ChangeType === "Gain" && value > existingValue) ||
          (ability.Trigger.ChangeType === "Loss" && value < existingValue))
      ) {
        if (!ability.Trigger.Subject) {
          throw new Error(
            "Trigger subject must exist for player attribute change trigger",
          );
        }
        getTargetPlayers(
          gameState,
          ability.Trigger.Subject,
          playerID,
          targetPlayerID,
        ).forEach((subjectPlayerID) => {
          addAction(subjectPlayerID, -1, targetPlayerID, targetBoardCardID, {
            changeValue: Math.abs(value - existingValue),
          });
        });
      }
    },
  );
}

function testPrerequisite(
  gameState: GameState,
  prerequisite: AbilityPrerequisite,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number,
): boolean {
  switch (prerequisite.$type) {
    case "TPrerequisiteCardCount": {
      const subjects = getTargetCards(
        gameState,
        prerequisite.Subject as Subject,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      const value = subjects.length;
      const comparisonValue = prerequisite.Amount;
      if (comparisonValue === undefined) {
        throw new Error(
          "Comparison value must exist for card count prerequisite",
        );
      }
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
            "Comparison type not implemented: " + prerequisite.Comparison,
          );
      }
    }
    case "TPrerequisitePlayer": {
      if (!prerequisite.Subject) {
        throw new Error("Subject must exist for player prerequisite");
      }
      const subjects = getTargetPlayers(
        gameState,
        prerequisite.Subject,
        triggerPlayerID,
        targetPlayerID,
      );
      return subjects.length > 0;
    }
    case "TPrerequisiteRun":
      return true;
    default:
      throw new Error("Unhandled prerequisite type: " + prerequisite.$type);
  }
}

function testPlayerConditions(
  gameState: GameState,
  conditions: Conditions | null,
  triggerPlayerID: number,
  targetPlayerID: number,
) {
  if (conditions == null) {
    return true;
  }

  switch (conditions.$type) {
    case "TPlayerConditionalAttribute": {
      if (!conditions.Attribute) {
        throw new Error(
          "Attribute must exist for player conditional attribute",
        );
      }
      const value =
        gameState.players[targetPlayerID][conditions.Attribute as keyof Player];
      if (!conditions.ComparisonValue) {
        throw new Error(
          "Comparison value must exist for player conditional attribute",
        );
      }
      const comparisonValue = getActionValue(
        gameState,
        conditions.ComparisonValue,
        triggerPlayerID,
        -1,
        targetPlayerID,
        -1,
      );
      switch (conditions.ComparisonOperator) {
        case "Equal":
          return value === comparisonValue;
        case "GreaterThan":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value > comparisonValue
            : false;
        case "GreaterThanOrEqual":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value >= comparisonValue
            : false;
        case "LessThan":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value < comparisonValue
            : false;
        case "LessThanOrEqual":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value <= comparisonValue
            : false;
        default:
          throw new Error(
            "Not implemented ComparisonOperator: " +
              conditions.ComparisonOperator,
          );
      }
    }
    default:
      throw new Error("Not implemented Conditions.$type: " + conditions.$type);
  }
}

function testCardConditions(
  gameState: GameState,
  conditions: Conditions | null,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number,
): boolean {
  if (conditions == null) {
    return true;
  }

  switch (conditions.$type) {
    case "TCardConditionalAttribute": {
      if (!conditions.Attribute) {
        throw new Error("Attribute must exist for card conditional attribute");
      }
      const value =
        gameState.players[targetPlayerID].board[targetBoardCardID][
          conditions.Attribute as keyof BoardCard
        ];
      if (!conditions.ComparisonValue) {
        throw new Error(
          "Comparison value must exist for card conditional attribute",
        );
      }
      const comparisonValue = getActionValue(
        gameState,
        conditions.ComparisonValue,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      switch (conditions.ComparisonOperator) {
        case "Equal":
          return value === comparisonValue;
        case "GreaterThan":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value > comparisonValue
            : false;
        case "GreaterThanOrEqual":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value >= comparisonValue
            : false;
        case "LessThan":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value < comparisonValue
            : false;
        case "LessThanOrEqual":
          return typeof value === "number" &&
            typeof comparisonValue === "number"
            ? value <= comparisonValue
            : false;
        default:
          throw new Error(
            "ComparisonOperator not implemented: " +
              conditions.ComparisonOperator,
          );
      }
    }
    case "TCardConditionalSize": {
      if (!conditions.Sizes) {
        throw new Error("Sizes must exist for card conditional size");
      }
      const is = conditions.Sizes.includes(
        gameState.players[targetPlayerID].board[targetBoardCardID].card.Size,
      );
      return conditions.IsNot ? !is : is;
    }
    case "TCardConditionalId": {
      const is =
        gameState.players[targetPlayerID].board[targetBoardCardID].card.Id ===
        conditions.Id;
      return conditions.IsNot ? !is : is;
    }
    case "TCardConditionalTier": {
      if (!conditions.Tiers) {
        throw new Error("Tiers must exist for card conditional tier");
      }
      const is = conditions.Tiers.includes(
        gameState.players[targetPlayerID].board[targetBoardCardID].tier,
      );
      return conditions.IsNot ? !is : is;
    }
    case "TCardConditionalPlayerHero": {
      const targetHeroes =
        gameState.players[targetPlayerID].board[targetBoardCardID].card.Heroes;
      const is = targetHeroes.includes(
        gameState.players[targetPlayerID].Hero as Hero,
      );
      return conditions.IsSameAsPlayerHero ? is : !is;
    }
    case "TCardConditionalHasEnchantment": {
      const is =
        gameState.players[targetPlayerID].board[targetBoardCardID]
          .Enchantment === conditions.Enchantment;
      return conditions.IsNot ? !is : is;
    }
    case "TCardConditionalHiddenTag":
    case "TCardConditionalTag": {
      const tags =
        gameState.players[targetPlayerID].board[targetBoardCardID].card[
          conditions.$type === "TCardConditionalHiddenTag"
            ? "HiddenTags"
            : "Tags"
        ];

      if (!conditions.Tags) {
        throw new Error("Tags must exist for card conditional tag");
      }

      switch (conditions.Operator) {
        case "Any":
          return (
            tags.filter((tag) => conditions.Tags?.includes(tag as Tag)).length >
            0
          );
        case "None":
          return (
            tags.filter((tag) => conditions.Tags?.includes(tag as Tag))
              .length === 0
          );
        default:
          throw new Error("Operator not implemented: " + conditions.Operator);
      }
    }
    case "TCardConditionalOr": {
      if (!conditions.Conditions) {
        throw new Error("Conditions must exist for card conditional or");
      }
      for (let i = 0; i < conditions.Conditions.length; ++i) {
        if (
          testCardConditions(
            gameState,
            conditions.Conditions[i],
            triggerPlayerID,
            triggerBoardCardID,
            targetPlayerID,
            targetBoardCardID,
          )
        ) {
          return true;
        }
      }
      return false;
    }
    case "TCardConditionalAnd": {
      if (!conditions.Conditions) {
        throw new Error("Conditions must exist for card conditional and");
      }
      for (let i = 0; i < conditions.Conditions.length; ++i) {
        if (
          !testCardConditions(
            gameState,
            conditions.Conditions[i],
            triggerPlayerID,
            triggerBoardCardID,
            targetPlayerID,
            targetBoardCardID,
          )
        ) {
          return false;
        }
      }
      return true;
    }
    case "TCardConditionalTriggerSource": {
      const is =
        triggerPlayerID === targetPlayerID &&
        triggerBoardCardID === targetBoardCardID;
      return conditions.IsNot ? !is : is;
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
  targetBoardCardID: number,
) {
  forEachAbility(
    gameState,
    (
      abilityPlayer,
      abilityPlayerID,
      abilityBoardCard,
      abilityBoardCardID,
      ability,
      addAction,
    ) => {
      if (ability.Trigger.$type !== triggerType) {
        return;
      }
      if (!ability.Trigger.Subject) {
        throw new Error("Subject must exist for trigger");
      }
      const subjects = getTargetCards(
        gameState,
        ability.Trigger.Subject,
        targetPlayerID,
        targetBoardCardID,
        abilityPlayerID,
        abilityBoardCardID,
      );
      subjects.forEach(([subjectPlayerID, subjectBoardCardID]) => {
        if (
          subjectPlayerID === targetPlayerID &&
          subjectBoardCardID === targetBoardCardID
        ) {
          addAction(
            triggerPlayerID,
            triggerBoardCardID,
            abilityPlayerID,
            abilityBoardCardID,
          );
        }
      });
    },
  );
}

function triggerCard(
  gameState: GameState,
  playerID: number,
  boardCardID: number,
): void {
  forEachAbility(
    gameState,
    (
      targetPlayer,
      targetPlayerID,
      targetBoardCard,
      targetBoardCardID,
      ability,
      addAction,
    ) => {
      if (
        ability.Trigger.$type === "TTriggerOnCardFired" &&
        playerID === targetPlayerID &&
        boardCardID === targetBoardCardID
      ) {
        addAction(playerID, boardCardID, targetPlayerID, targetBoardCardID);
      } else if (ability.Trigger.$type === "TTriggerOnItemUsed") {
        if (!ability.Trigger.Subject) {
          throw new Error("Subject must exist for trigger");
        }
        const subjects = getTargetCards(
          gameState,
          ability.Trigger.Subject,
          playerID,
          boardCardID,
          targetPlayerID,
          targetBoardCardID,
        );
        subjects.forEach(([subjectPlayerID, subjectBoardCardID]) => {
          if (
            subjectPlayerID === playerID &&
            subjectBoardCardID === boardCardID
          ) {
            addAction(playerID, boardCardID, targetPlayerID, targetBoardCardID);
          }
        });
      }
    },
  );
}

// Returns true if the action critted
function runAction(
  gameState: GameState,
  action: AbilityAction,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number,
  metadata?: ActionMetadata,
): boolean {
  let hasCritted = false;

  switch (action.$type) {
    case "TActionCardForceUse": {
      if (!action.Target) {
        throw new Error("Target must exist for action card force use");
      }
      const targetCards = getTargetCards(
        gameState,
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      targetCards.forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        triggerCard(gameState, actionTargetPlayerID, actionTargetBoardCardID);
      });
      break;
    }
    case "TActionPlayerDamage": {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.DamageAmount,
      );
      let critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.CritChance,
      );
      if (!critChance) {
        critChance = 0;
      }
      if (!amount) {
        throw new Error("Damage amount must exist for action player damage");
      }
      if (critChance > 0) {
        if (gameState.getRand() * 100 < critChance) {
          amount *= 2;
          const damageCrit = getCardAttribute(
            gameState,
            targetPlayerID,
            targetBoardCardID,
            AttributeType.DamageCrit,
          );
          if (damageCrit !== undefined) {
            amount *= 1 + damageCrit / 100;
            hasCritted = true;
          }
        }
      }

      const lifesteal = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.Lifesteal,
      );

      if (!action.Target) {
        throw new Error("Target must exist for action player damage");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const shield = getPlayerAttribute(gameState, playerID, "Shield");

        const nextShield = Math.max(0, shield - amount);
        if (nextShield > 0) {
          updatePlayerAttribute(gameState, playerID, "Shield", nextShield);
        } else {
          const health = getPlayerAttribute(gameState, playerID, "Health");
          const nextAmount = amount - shield;
          updatePlayerAttribute(gameState, playerID, "Shield", 0);
          updatePlayerAttribute(
            gameState,
            playerID,
            "Health",
            health - nextAmount,
          );
        }

        if (lifesteal && lifesteal > 0) {
          const otherPlayerID = (playerID + 1) % 2;
          const health = getPlayerAttribute(gameState, otherPlayerID, "Health");
          const healthMax = getPlayerAttribute(
            gameState,
            otherPlayerID,
            "HealthMax",
          );
          const nextHealth = Math.min(health + amount, healthMax);
          if (nextHealth !== health) {
            updatePlayerAttribute(
              gameState,
              otherPlayerID,
              "Health",
              nextHealth,
            );
          }
        }
      });
      break;
    }
    case "TActionPlayerHeal": {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.HealAmount,
      );
      if (!amount) {
        throw new Error("Heal amount must exist for action player heal");
      }
      const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.CritChance,
      );
      if (critChance && critChance > 0) {
        if (gameState.getRand() * 100 < critChance) {
          amount *= 2;
          hasCritted = true;
        }
      }

      if (!action.Target) {
        throw new Error("Target must exist for action player heal");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const poison = getPlayerAttribute(gameState, playerID, "Poison");
        if (poison > 0) {
          updatePlayerAttribute(gameState, playerID, "Poison", poison - 1);
        }

        const burn = getPlayerAttribute(gameState, playerID, "Burn");
        if (burn > 0) {
          updatePlayerAttribute(gameState, playerID, "Burn", burn - 1);
        }

        const health = getPlayerAttribute(gameState, playerID, "Health");
        const healthMax = getPlayerAttribute(gameState, playerID, "HealthMax");

        if (health !== healthMax) {
          updatePlayerAttribute(
            gameState,
            playerID,
            "Health",
            Math.min(healthMax, health + amount),
          );
        } else {
          triggerActions(
            gameState,
            TriggerType.TTriggerOnCardPerformedOverHeal,
            playerID,
            -1,
            targetPlayerID,
            targetBoardCardID,
          );
        }
        triggerActions(
          gameState,
          TriggerType.TTriggerOnCardPerformedHeal,
          playerID,
          -1,
          targetPlayerID,
          targetBoardCardID,
        );
      });
      break;
    }
    case "TActionPlayerRegenApply": {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.RegenApplyAmount,
      );
      if (!amount) {
        throw new Error(
          "Regen apply amount must exist for action player regen apply",
        );
      }
      const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.CritChance,
      );
      if (critChance && critChance > 0) {
        if (gameState.getRand() * 100 < critChance) {
          amount *= 2;
          hasCritted = true;
        }
      }

      if (!action.Target) {
        throw new Error("Target must exist for action player regen apply");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const currentRegen = getPlayerAttribute(
          gameState,
          playerID,
          "HealthRegen",
        );
        updatePlayerAttribute(
          gameState,
          playerID,
          "HealthRegen",
          currentRegen + amount,
        );
      });
      break;
    }
    case "TActionPlayerPoisonApply": {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.PoisonApplyAmount,
      );
      if (!amount) {
        throw new Error(
          "Poison apply amount must exist for action player poison apply",
        );
      }
      const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.CritChance,
      );
      if (critChance && critChance > 0) {
        if (gameState.getRand() * 100 < critChance) {
          amount *= 2;
          hasCritted = true;
        }
      }

      if (!action.Target) {
        throw new Error("Target must exist for action player poison apply");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const poison = getPlayerAttribute(gameState, playerID, "Poison");
        updatePlayerAttribute(gameState, playerID, "Poison", poison + amount);
        triggerActions(
          gameState,
          TriggerType.TTriggerOnCardPerformedPoison,
          playerID,
          -1,
          targetPlayerID,
          targetBoardCardID,
        );
      });
      break;
    }
    case "TActionPlayerPoisonRemove": {
      const amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.PoisonRemoveAmount,
      );
      if (!amount) {
        throw new Error(
          "Poison remove amount must exist for action player poison remove",
        );
      }
      if (!action.Target) {
        throw new Error("Target must exist for action player poison remove");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const poison = getPlayerAttribute(gameState, playerID, "Poison");
        updatePlayerAttribute(
          gameState,
          playerID,
          "Poison",
          Math.max(0, poison - amount),
        );
      });
      break;
    }
    case "TActionPlayerBurnApply": {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.BurnApplyAmount,
      );
      if (!amount) {
        throw new Error(
          "Burn apply amount must exist for action player burn apply",
        );
      }
      const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.CritChance,
      );
      if (critChance && critChance > 0) {
        if (gameState.getRand() * 100 < critChance) {
          amount *= 2;
          hasCritted = true;
        }
      }
      if (!action.Target) {
        throw new Error("Target must exist for action player burn apply");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const burn = getPlayerAttribute(gameState, playerID, "Burn");
        updatePlayerAttribute(gameState, playerID, "Burn", burn + amount);
        triggerActions(
          gameState,
          TriggerType.TTriggerOnCardPerformedBurn,
          playerID,
          -1,
          targetPlayerID,
          targetBoardCardID,
        );
      });
      break;
    }
    case "TActionPlayerBurnRemove": {
      if (!action.Target) {
        throw new Error("Target must exist for action player burn remove");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const amount = getCardAttribute(
          gameState,
          targetPlayerID,
          targetBoardCardID,
          AttributeType.BurnRemoveAmount,
        );
        if (!amount) {
          throw new Error(
            "Burn remove amount must exist for action player burn remove",
          );
        }
        const burn = getPlayerAttribute(gameState, playerID, "Burn");
        updatePlayerAttribute(
          gameState,
          playerID,
          "Burn",
          Math.max(0, burn - amount),
        );
      });
      break;
    }
    case "TActionPlayerShieldApply": {
      let amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.ShieldApplyAmount,
      );
      if (!amount) {
        throw new Error(
          "Shield apply amount must exist for action player shield apply",
        );
      }
      const critChance = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.CritChance,
      );
      if (critChance && critChance > 0) {
        if (gameState.getRand() * 100 < critChance) {
          amount *= 2;
          hasCritted = true;
        }
      }

      if (!action.Target) {
        throw new Error("Target must exist for action player shield apply");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const shield = getPlayerAttribute(gameState, playerID, "Shield");
        updatePlayerAttribute(gameState, playerID, "Shield", shield + amount);

        triggerActions(
          gameState,
          TriggerType.TTriggerOnCardPerformedShield,
          playerID,
          -1,
          targetPlayerID,
          targetBoardCardID,
        );
      });
      break;
    }
    case "TActionPlayerShieldRemove": {
      if (!action.Target) {
        throw new Error("Target must exist for action player shield remove");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        const amount = getCardAttribute(
          gameState,
          targetPlayerID,
          targetBoardCardID,
          AttributeType.ShieldRemoveAmount,
        );
        if (!amount) {
          throw new Error(
            "Shield remove amount must exist for action player shield remove",
          );
        }
        const shield = getPlayerAttribute(gameState, playerID, "Shield");
        updatePlayerAttribute(
          gameState,
          playerID,
          "Shield",
          Math.max(0, shield - amount),
        );
      });
      break;
    }
    case "TActionPlayerReviveHeal": {
      if (!action.Target) {
        throw new Error("Target must exist for action player revive heal");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        updatePlayerAttribute(gameState, playerID, "Health", 0);
      });
      break;
    }
    case "TActionCardDisable": {
      if (!action.Target) {
        throw new Error("Target must exist for action card disable");
      }
      const targetCards = getTargetCards(
        gameState,
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      const targetCount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.DisableTargets,
      );
      targetCards
        .slice(0, targetCount)
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
            targetBoardCardID,
          );
        });
      break;
    }
    case "TActionCardReload": {
      if (!action.Target) {
        throw new Error("Target must exist for action card reload");
      }
      const targetCards = getTargetCards(
        gameState,
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      const amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.ReloadAmount,
      );

      const targetCount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        AttributeType.ReloadTargets,
      );

      targetCards
        .slice(0, targetCount)
        .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
          const currentAmmo = getCardAttribute(
            gameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            AttributeType.Ammo,
          );

          const ammoMax = getCardAttribute(
            gameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            AttributeType.AmmoMax,
          );
          // If the card has no ammo or ammo max, don't do anything
          if (!currentAmmo || !ammoMax) {
            return;
          }
          if (!amount) {
            throw new Error("Reload amount must exist for action card reload");
          }

          const newValue = Math.min(ammoMax, currentAmmo + amount);
          if (currentAmmo !== newValue) {
            updateCardAttribute(
              gameState,
              actionTargetPlayerID,
              actionTargetBoardCardID,
              AttributeType.Ammo,
              newValue,
            );
          }
        });
      break;
    }
    case "TActionCardFreeze":
    case "TActionCardSlow":
    case "TActionCardHaste": {
      const [amountKey, targetsKey, tickKey, triggerType] =
        action.$type === "TActionCardFreeze"
          ? [
              AttributeType.FreezeAmount,
              AttributeType.FreezeTargets,
              AttributeType.Freeze,
              TriggerType.TTriggerOnCardPerformedFreeze,
            ]
          : action.$type === "TActionCardSlow"
            ? [
                AttributeType.SlowAmount,
                AttributeType.SlowTargets,
                AttributeType.Slow,
                TriggerType.TTriggerOnCardPerformedSlow,
              ]
            : action.$type === "TActionCardHaste"
              ? [
                  AttributeType.HasteAmount,
                  AttributeType.HasteTargets,
                  AttributeType.Haste,
                  TriggerType.TTriggerOnCardPerformedHaste,
                ]
              : [];
      if (!amountKey || !targetsKey || !tickKey || !triggerType) {
        throw new Error(
          "Card:" +
            gameState.players[targetPlayerID].board[targetBoardCardID].card
              .InternalName +
            "is missing an amount, target or tick key for " +
            action.$type,
        );
      }
      const amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        amountKey,
      );
      if (!amount) {
        throw new Error("Amount must exist for action card freeze|slow|haste");
      }
      const targetCount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        targetsKey,
      );

      if (!action.Target) {
        throw new Error("Target must exist for action card freeze|slow|haste");
      }

      const targetCards = getTargetCards(
        gameState,
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      targetCards
        .filter(([actionTargetPlayerID, actionTargetBoardCardID]) => {
          return hasCooldown(
            gameState.players[actionTargetPlayerID].board[
              actionTargetBoardCardID
            ],
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
          let existingAmount = getCardAttribute(
            gameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            tickKey,
          );
          if (existingAmount === undefined) {
            existingAmount = 0;
          }
          updateCardAttribute(
            gameState,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            tickKey,
            existingAmount + amount,
          );
          triggerActions(
            gameState,
            triggerType,
            actionTargetPlayerID,
            actionTargetBoardCardID,
            targetPlayerID,
            targetBoardCardID,
          );
        });
      break;
    }
    case "TActionCardCharge": {
      const [amountKey, targetsKey] = [
        AttributeType.ChargeAmount,
        AttributeType.ChargeTargets,
      ];
      const amount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        amountKey,
      );
      const targetCount = getCardAttribute(
        gameState,
        targetPlayerID,
        targetBoardCardID,
        targetsKey,
      );

      if (!amount) {
        throw new Error("Amount must exist for action card charge");
      }
      if (!action.Target) {
        throw new Error("Target must exist for action card charge");
      }

      const targetCards = getTargetCards(
        gameState,
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      targetCards
        .filter(([actionTargetPlayerID, actionTargetBoardCardID]) => {
          return hasCooldown(
            gameState.players[actionTargetPlayerID].board[
              actionTargetBoardCardID
            ],
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
            AttributeType.CooldownMax,
          );
          if (!cooldownMax) {
            return; // If the target card has no cooldown max, don't do anything as it does not have a cooldown
          }
          const newValue = Math.min(cooldownMax, nextBoardCard.tick + amount);

          if (nextBoardCard.tick !== newValue) {
            updateCardAttribute(
              gameState,
              actionTargetPlayerID,
              actionTargetBoardCardID,
              "tick",
              newValue,
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
        targetBoardCardID,
        metadata,
      );

      if (!action.Target) {
        throw new Error("Target must exist for action card modify attribute");
      }

      const targetCards = getTargetCards(
        gameState,
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );

      if (!action.AttributeType) {
        throw new Error(
          "Attribute type must exist for action card modify attribute",
        );
      }

      targetCards.forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
        const oldValue =
          gameState.players[actionTargetPlayerID].board[
            actionTargetBoardCardID
          ][action.AttributeType as AttributeType];
        if (oldValue === undefined) {
          return;
        }
        let newValue: number;
        switch (action.Operation) {
          case Operation.Add:
            newValue = oldValue + actionValue;
            break;
          case Operation.Multiply:
            newValue = oldValue * actionValue;
            break;
          case Operation.Subtract:
            newValue = oldValue - actionValue;
            break;
          default:
            throw new Error("Unhandled operation: " + action.Operation);
        }

        updateCardAttribute(
          gameState,
          actionTargetPlayerID,
          actionTargetBoardCardID,
          action.AttributeType as AttributeType,
          Math.max(0, Math.floor(newValue)),
        );
      });
      break;
    }
    case "TActionPlayerModifyAttribute": {
      const actionValue = getActionValue(
        gameState,
        action.Value as Value,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      if (!action.Target) {
        throw new Error("Target must exist for action player modify attribute");
      }
      getTargetPlayers(
        gameState,
        action.Target,
        triggerPlayerID,
        targetPlayerID,
      ).forEach((playerID) => {
        let oldValue: number | undefined = gameState.players[playerID][
          action.AttributeType as keyof Player
        ] as number | undefined;
        if (oldValue === undefined) {
          oldValue = 0; // If the attribute doesn't exist, set it to 0
        }
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
          action.AttributeType as keyof {
            [P in keyof Player as Player[P] extends number
              ? P
              : never]: Player[P];
          },
          Math.floor(newValue),
        );
      });
      break;
    }
    default:
      throw new Error("Unhandled action type: " + action.$type);
  }
  return hasCritted;
}

function getActionValue(
  gameState: GameState,
  value: Value,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number,
  metadata?: ActionMetadata,
): number {
  let amount: number | undefined = undefined;

  switch (value.$type) {
    case "TFixedValue":
      amount = value.Value;
      break;
    case "TReferenceValueCardAttribute":
    case "TReferenceValueCardAttributeAggregate": {
      if (!value.Target) {
        throw new Error(
          "Target must exist for action reference value card attribute",
        );
      }
      const targetCards = getTargetCards(
        gameState,
        value.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      amount = value.DefaultValue;
      targetCards.forEach(([valueTargetPlayerID, valueTargetBoardCardID]) => {
        if (!value.AttributeType) {
          throw new Error(
            "Attribute type must exist for action reference value card attribute",
          );
        }
        amount =
          (amount ?? 0) +
          (getCardAttribute(
            gameState,
            valueTargetPlayerID,
            valueTargetBoardCardID,
            value.AttributeType,
          ) ?? 0);
      });
      break;
    }
    case "TReferenceValuePlayerAttribute": {
      amount = value.DefaultValue;
      if (!value.Target) {
        throw new Error(
          "Target must exist for action reference value player attribute",
        );
      }
      const targetPlayers = getTargetPlayers(
        gameState,
        value.Target,
        triggerPlayerID,
        targetPlayerID,
      );
      targetPlayers.forEach((valueTargetPlayerID) => {
        if (!value.AttributeType) {
          throw new Error(
            "Attribute type must exist for action reference value player attribute",
          );
        }

        amount =
          (amount ?? 0) +
          (getPlayerAttribute(
            gameState,
            valueTargetPlayerID,
            value.AttributeType as keyof {
              [P in keyof Player as Player[P] extends number
                ? P
                : never]: Player[P];
            },
          ) ?? 0);
      });
      break;
    }
    case "TReferenceValueCardCount": {
      if (!value.Target) {
        throw new Error(
          "Target must exist for action reference value card count",
        );
      }
      const targetCards = getTargetCards(
        gameState,
        value.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      amount = targetCards.length;
      break;
    }
    case "TReferenceValuePlayerAttributeChange": {
      // Not sure what to do with value.Target
      amount = metadata?.changeValue ?? value.DefaultValue;
      break;
    }
    // Count number of visible tags on a card
    case "TReferenceValueCardTagCount": {
      if (!value.Target) {
        throw new Error(
          "Target must exist for action reference value card tag count",
        );
      }
      const targetCards = getTargetCards(
        gameState,
        value.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID,
      );
      const foundTags = new Set<string>();
      targetCards.forEach(([playerID, boardCardID]) => {
        getCardAttribute(gameState, playerID, boardCardID, "tags").forEach(
          (tag) => {
            foundTags.add(tag);
          },
        );
      });
      amount = foundTags.size;
      break;
    }
    default:
      throw new Error("Unhandled value type: " + value.$type);
  }

  if (amount != null && value.Modifier != null) {
    const modifierValue = getActionValue(
      gameState,
      value.Modifier.Value,
      triggerPlayerID,
      triggerBoardCardID,
      targetPlayerID,
      targetBoardCardID,
    );
    if (value.Modifier.ModifyMode === "Multiply") {
      amount *= modifierValue;
    }
  }
  return amount ?? 0;
}

function getTargetCards(
  gameState: GameState,
  targetConfig: Source | Target | Subject,
  triggerPlayerID: number,
  triggerBoardCardID: number,
  targetPlayerID: number,
  targetBoardCardID: number,
): Array<[number, number]> {
  const results: [number, number][] = [];

  switch (targetConfig.$type) {
    case "TTargetCardSelf":
      results.push([targetPlayerID, targetBoardCardID]);
      break;
    case "TTargetCardTriggerSource":
      results.push([triggerPlayerID, triggerBoardCardID]);
      break;
    case "TTargetCardPositional": {
      const [originPlayerID, originBoardCardID] =
        targetConfig.Origin === "TriggerSource"
          ? [triggerPlayerID, triggerBoardCardID]
          : [targetPlayerID, targetBoardCardID];

      switch (targetConfig.TargetMode) {
        case "AllRightCards": {
          const lengthCardItems =
            gameState.players[originPlayerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;
          for (
            let i = originBoardCardID + (targetConfig.IncludeOrigin ? 0 : 1);
            i < lengthCardItems;
            ++i
          ) {
            results.push([originPlayerID, i]);
          }
          break;
        }
        case "AllLeftCards": {
          for (
            let i = 0;
            i < originBoardCardID - (targetConfig.IncludeOrigin ? 0 : 1);
            ++i
          ) {
            results.push([originPlayerID, i]);
          }
          break;
        }
        case "Neighbor": {
          if (targetConfig.IncludeOrigin) {
            results.push([originPlayerID, originBoardCardID]);
          }
          if (originBoardCardID !== 0) {
            results.push([originPlayerID, originBoardCardID - 1]);
          }
          const lengthCardItems =
            gameState.players[originPlayerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;
          if (originBoardCardID < lengthCardItems - 1) {
            results.push([originPlayerID, originBoardCardID + 1]);
          }
          break;
        }
        case "RightCard": {
          if (targetConfig.IncludeOrigin) {
            results.push([targetPlayerID, targetBoardCardID]);
          }
          const lengthCardItems =
            gameState.players[targetPlayerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;
          if (targetBoardCardID < lengthCardItems - 1) {
            results.push([targetPlayerID, targetBoardCardID + 1]);
          }
          break;
        }
        case "LeftCard": {
          if (targetConfig.IncludeOrigin) {
            results.push([targetPlayerID, targetBoardCardID]);
          }
          if (targetBoardCardID !== 0) {
            results.push([targetPlayerID, targetBoardCardID - 1]);
          }
          break;
        }
        default:
          throw new Error(
            "Not implemented Target.TargetMode: " + targetConfig.TargetMode,
          );
      }
      break;
    }
    case "TTargetCardSection":
    case "TTargetCardRandom": {
      switch (targetConfig.TargetSection) {
        case "SelfHandAndStash":
        case "SelfHand":
        case "SelfBoard": {
          const lengthCardItems =
            gameState.players[targetPlayerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;
          for (let i = 0; i < lengthCardItems; ++i) {
            if (
              i !== targetBoardCardID ||
              (i === targetBoardCardID && !targetConfig.ExcludeSelf)
            ) {
              results.push([targetPlayerID, i]);
            }
          }
          break;
        }
        case "OpponentHand":
        case "OpponentBoard": {
          const lengthCardItems =
            gameState.players[(targetPlayerID + 1) % 2].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;
          for (let i = 0; i < lengthCardItems; ++i) {
            results.push([(targetPlayerID + 1) % 2, i]);
          }
          break;
        }
        case "AllHands": {
          gameState.players.forEach((player, playerID) => {
            const lengthCardItems =
              gameState.players[playerID].board.findLastIndex(
                (boardCard) => boardCard.card.$type === "TCardItem",
              ) + 1;
            for (let i = 0; i < lengthCardItems; ++i) {
              if (
                playerID !== targetPlayerID ||
                i !== targetBoardCardID ||
                (i === targetBoardCardID && !targetConfig.ExcludeSelf)
              ) {
                results.push([playerID, i]);
              }
            }
          });
          break;
        }
        case "SelfNeighbors": {
          if (targetBoardCardID !== 0) {
            results.push([targetPlayerID, targetBoardCardID - 1]);
          }
          const lengthCardItems =
            gameState.players[targetPlayerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;
          if (targetBoardCardID < lengthCardItems - 1) {
            results.push([targetPlayerID, targetBoardCardID + 1]);
          }
          break;
        }
        default:
          throw new Error(
            "Not implemented Target.TargetSection: " +
              targetConfig.TargetSection,
          );
      }

      if (targetConfig.$type === "TTargetCardRandom") {
        // Shuffle
        let currentIndex = results.length;
        while (currentIndex != 0) {
          const randomIndex = Math.floor(gameState.getRand() * currentIndex);
          currentIndex--;
          [results[currentIndex], results[randomIndex]] = [
            results[randomIndex],
            results[currentIndex],
          ];
        }
      }
      break;
    }
    case "TTargetCardXMost": {
      const lengthCardItems =
        gameState.players[targetPlayerID].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem",
        ) + 1;
      for (let i = 0; i < lengthCardItems; ++i) {
        if (
          i !== targetBoardCardID ||
          (i === targetBoardCardID && !targetConfig.ExcludeSelf)
        ) {
          results.push([targetPlayerID, i]);
        }
      }
      break;
    }
    default:
      throw new Error("Not implemented Target.$type: " + targetConfig.$type);
  }

  if (
    targetConfig.Conditions &&
    (targetConfig.Conditions.$type === "TCardConditionalAttributeHighest" ||
      targetConfig.Conditions.$type === "TCardConditionalAttributeLowest")
  ) {
    const isHighest =
      targetConfig.Conditions.$type === "TCardConditionalAttributeHighest";
    let highestValue = isHighest ? -Infinity : Infinity;
    let highestPlayerID = null;
    let highestBoardCardID = null;
    results.forEach(([testPlayerID, testBoardCardID]) => {
      if (!targetConfig.Conditions?.AttributeType) {
        throw new Error(
          "Attribute type must exist for action card conditional attribute highest",
        );
      }
      const value = getCardAttribute(
        gameState,
        testPlayerID,
        testBoardCardID,
        targetConfig.Conditions.AttributeType,
      );

      if (
        !gameState.players[testPlayerID].board[testBoardCardID].isDisabled &&
        value !== undefined &&
        (isHighest ? value > highestValue : value < highestValue)
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
      testCardConditions(
        gameState,
        targetConfig.Conditions,
        triggerPlayerID,
        triggerBoardCardID,
        testPlayerID,
        testBoardCardID,
      )
    );
  });

  if (targetConfig.$type === "TTargetCardXMost") {
    switch (targetConfig.TargetMode) {
      case "LeftMostCard":
        return filteredResults.slice(0, 1);
      default:
        return filteredResults.slice(-1);
    }
  }

  return filteredResults;
}

function getTargetPlayers(
  gameState: GameState,
  targetConfig: Target | Subject,
  triggerPlayerID: number,
  targetPlayerID: number,
): number[] {
  let results: number[] = [];

  switch (targetConfig.$type) {
    case "TTargetPlayerRelative":
      switch (targetConfig.TargetMode) {
        case "Opponent":
          results = [(targetPlayerID + 1) % 2];
          break;
        case "Self":
          results = [targetPlayerID];
          break;
        default:
          throw new Error(
            "Not implemented TargetMode: " + targetConfig.TargetMode,
          );
      }
      break;
    case "TTargetCardSection":
      switch (targetConfig.TargetSection) {
        case "SelfBoard":
          results = [targetPlayerID];
          break;
        default:
          results = [(targetPlayerID + 1) % 2];
          break;
      }
      break;
    case "TTargetPlayer":
      if (targetConfig.TargetMode === "Both") {
        results = [targetPlayerID, (targetPlayerID + 1) % 2];
      } else {
        throw new Error(
          "Not implemented TargetMode: " + targetConfig.TargetMode,
        );
      }
      break;
    default:
      throw new Error("Unhandled target type: " + targetConfig.$type);
  }

  if (targetConfig.Conditions) {
    results = results.filter(() => {
      return testPlayerConditions(
        gameState,
        targetConfig.Conditions,
        triggerPlayerID,
        targetPlayerID,
      );
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
      board: player.board.map((boardCard) => ({ ...boardCard })),
    })),
    multicast: [...initialGameState.multicast],
  };

  // Start fight
  if (gameState.tick === 0) {
    forEachAbility(
      gameState,
      (
        targetPlayer,
        targetPlayerID,
        targetBoardCard,
        targetBoardCardID,
        ability,
        addAction,
      ) => {
        if (ability.Trigger.$type === "TTriggerOnFightStarted") {
          addAction(targetPlayerID, -1, targetPlayerID, targetBoardCardID);
        }
      },
    );
  }

  // Poison + Regen
  if (gameState.tick % 1000 === 0) {
    gameState.players.forEach((player, playerID) => {
      const healthRegen = getPlayerAttribute(
        gameState,
        playerID,
        "HealthRegen",
      );
      if (healthRegen > 0) {
        const health = getPlayerAttribute(gameState, playerID, "Health");
        const healthMax = getPlayerAttribute(gameState, playerID, "HealthMax");
        const nextHealth = Math.min(healthMax, health + healthRegen);
        if (health !== nextHealth) {
          updatePlayerAttribute(gameState, playerID, "Health", nextHealth);
        }
      }
      const poison = getPlayerAttribute(gameState, playerID, "Poison");
      if (player.Poison > 0) {
        const health = getPlayerAttribute(gameState, playerID, "Health");
        updatePlayerAttribute(gameState, playerID, "Health", health - poison);
      }
    });
  }

  // Burn
  if (gameState.tick % 500 === 0) {
    gameState.players.forEach((player, playerID) => {
      const burn = getPlayerAttribute(gameState, playerID, "Burn");
      if (burn > 0) {
        const shield = getPlayerAttribute(gameState, playerID, "Shield");

        const nextShield = Math.max(0, shield - burn / 2);
        if (nextShield > 0) {
          updatePlayerAttribute(gameState, playerID, "Shield", nextShield);
        } else {
          const nextAmount = burn - shield * 2;
          const health = getPlayerAttribute(gameState, playerID, "Health");
          updatePlayerAttribute(gameState, playerID, "Shield", 0);
          updatePlayerAttribute(
            gameState,
            playerID,
            "Health",
            health - nextAmount,
          );
        }
        updatePlayerAttribute(gameState, playerID, "Burn", burn - 1);
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
    const slowValue = boardCard[AttributeType.Slow] as number | undefined;
    if (slowValue && slowValue > 0) {
      tickRate /= 2;
    }
    const hasteValue = boardCard[AttributeType.Haste] as number | undefined;
    if (hasteValue && hasteValue > 0) {
      tickRate *= 2;
    }
    const tick = TICK_RATE;
    const CooldownMax = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      AttributeType.CooldownMax,
    );
    const slow = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      AttributeType.Slow,
    );
    if (slow) {
      const nextSlow = Math.max(0, slow - tick);
      if (nextSlow !== slow) {
        updateCardAttribute(
          gameState,
          playerID,
          boardCardID,
          AttributeType.Slow,
          nextSlow,
        );
      }
    }

    const haste = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      AttributeType.Haste,
    );
    if (haste) {
      const nextHaste = Math.max(0, haste - tick);
      if (nextHaste !== haste) {
        updateCardAttribute(
          gameState,
          playerID,
          boardCardID,
          AttributeType.Haste,
          nextHaste,
        );
      }
    }

    // Check if card is frozen, if not then tick the card
    const freeze = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      AttributeType.Freeze,
    );
    if ((freeze && !(freeze > 0)) || !freeze) {
      boardCard.tick = Math.min(
        boardCard.tick + tickRate,
        CooldownMax ?? Infinity,
      );
    }

    if (freeze) {
      const nextFreeze = Math.max(0, freeze - tick);
      if (nextFreeze !== freeze) {
        updateCardAttribute(
          gameState,
          playerID,
          boardCardID,
          AttributeType.Freeze,
          nextFreeze,
        );
      }
    }

    if (boardCard.tick === CooldownMax) {
      const AmmoMax = getCardAttribute(
        gameState,
        playerID,
        boardCardID,
        AttributeType.AmmoMax,
      );
      const Ammo = getCardAttribute(
        gameState,
        playerID,
        boardCardID,
        AttributeType.Ammo,
      );
      if (!AmmoMax || (AmmoMax && Ammo === undefined) || (Ammo && Ammo > 0)) {
        cardTriggerList.push([playerID, boardCardID, /* isMulticast */ false]);
        if ("Multicast" in boardCard) {
          const MULTICAST_DELAY = 300;
          for (let i = 0; i < (boardCard.Multicast ?? 1) - 1; ++i) {
            gameState.multicast.push({
              tick: gameState.tick + (i + 1) * MULTICAST_DELAY,
              playerID,
              boardCardID,
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
        /* isMulticast */ true,
      ]);
      gameState.multicast.splice(gameState.multicast.indexOf(multicast), 1);
    }
  });

  const cardCrittedList: number[][] = [];

  // Trigger Cards
  cardTriggerList.forEach(([playerID, boardCardID, isMulticast]) => {
    const AmmoMax = getCardAttribute(
      gameState,
      playerID,
      boardCardID,
      AttributeType.AmmoMax,
    );
    if (!isMulticast && AmmoMax) {
      const Ammo = getCardAttribute(
        gameState,
        playerID,
        boardCardID,
        AttributeType.Ammo,
      );
      updateCardAttribute(
        gameState,
        playerID,
        boardCardID,
        AttributeType.Ammo,
        Ammo === undefined ? AmmoMax - 1 : Ammo - 1,
      );
    }

    triggerCard(gameState, playerID, boardCardID);

    if (!isMulticast) {
      gameState.players[playerID].board[boardCardID].tick = 0;
    }
  });

  // TODO: Rework the way crit triggers works
  cardCrittedList.forEach(([playerID, boardCardID]) => {
    forEachAbility(
      gameState,
      (
        targetPlayer,
        targetPlayerID,
        targetBoardCard,
        targetBoardCardID,
        ability,
        addAction,
      ) => {
        if (ability.Trigger.$type === "TTriggerOnCardCritted") {
          addAction(playerID, boardCardID, targetPlayerID, targetBoardCardID);
        }
      },
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
          player.Health - nextHealthDamage,
        );
      }
    });
  }

  // Death
  gameState.players.forEach((player, playerID) => {
    if (player.Health < 0) {
      forEachAbility(
        gameState,
        (
          targetPlayer,
          targetPlayerID,
          targetBoardCard,
          targetBoardCardID,
          ability,
          addAction,
        ) => {
          if (ability.Trigger.$type === "TTriggerOnPlayerDied") {
            if (!ability.Trigger.Subject) {
              throw new Error("Subject must exist for player died trigger");
            }
            getTargetPlayers(
              gameState,
              ability.Trigger.Subject,
              playerID,
              targetPlayerID,
            ).forEach((abilityPlayerID) => {
              if (abilityPlayerID === playerID) {
                addAction(
                  abilityPlayerID,
                  -1,
                  targetPlayerID,
                  targetBoardCardID,
                );
              }
            });
          }
        },
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
  // Check who won
  // Draw if both health <= 0
  if (gameState.players[0].Health <= 0 && gameState.players[1].Health <= 0) {
    gameState.winner = "Draw";
  } else if (gameState.players[0].Health <= 0) {
    gameState.winner = "Player";
  } else if (gameState.players[1].Health <= 0) {
    gameState.winner = "Enemy";
  }

  gameState.tick += TICK_RATE;

  return gameState;
}

export function getTooltips(
  gameState: GameState,
  playerID: number,
  boardCardID: number,
): string[] {
  const boardCard = gameState.players[playerID].board[boardCardID];
  return boardCard.TooltipIds.map((tooltipId: number) => {
    const tooltipObject = boardCard.Localization.Tooltips[tooltipId];
    if (!tooltipObject) {
      return null;
    }
    const tooltip: string = tooltipObject.Content.Text.replace(
      /\{([a-z]+)\.([a-z0-9]+)\.targets\}/g,
      (_: string, type: string, id: string | number): string => {
        const action =
          boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
        if (action.$type === "TActionCardHaste") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.HasteTargets,
            ),
          );
        } else if (action.$type === "TActionCardSlow") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.SlowTargets,
            ),
          );
        } else if (action.$type === "TActionCardFreeze") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.FreezeTargets,
            ),
          );
        } else if (action.$type === "TActionCardCharge") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.ChargeTargets,
            ),
          );
        } else if (action.$type === "TActionCardReload") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.ReloadTargets,
            ),
          );
        }
        return `{?${type}.${id}.targets}`;
      },
    )
      .replace(
        /\{([a-z]+)\.([a-z0-9]+)\.mod\}/g,
        (_: string, type: string, id: string | number): string => {
          const action =
            boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;
          if (!action.Value || !action.Value.Modifier) {
            return "";
          }
          return String(
            getActionValue(
              gameState,
              action.Value.Modifier.Value,
              playerID,
              boardCardID,
              playerID,
              boardCardID,
            ),
          );
        },
      )
      .replace(
        /\{([a-z]+)\.([a-z0-9]+)\}/g,
        (_: string, type: string, id: string | number): string => {
          // Ensure a string is always returned
          const action =
            boardCard[type === "aura" ? "Auras" : "Abilities"][id].Action;

          if (action.Value) {
            const actionValue = getActionValue(
              gameState,
              action.Value,
              playerID,
              boardCardID,
              playerID,
              boardCardID,
            );
            if (
              action.$type === "TAuraActionCardModifyAttribute" &&
              (action.AttributeType === "SlowAmount" ||
                action.AttributeType === "FreezeAmount" ||
                action.AttributeType === "HasteAmount" ||
                action.AttributeType === "ChargeAmount")
            ) {
              return String(actionValue / 1000);
            } else {
              return String(actionValue);
            }
          }

          switch (action.$type as ActionType) {
            case "TActionGameSpawnCards":
              if ("SpawnContext" in action && action.SpawnContext) {
                return String(
                  getActionValue(
                    gameState,
                    action.SpawnContext.Limit,
                    playerID,
                    boardCardID,
                    playerID,
                    boardCardID,
                  ),
                );
              }
              return ""; // Ensure string return
            case "TActionPlayerDamage":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.DamageAmount,
                ) ?? "",
              ); // Coalesce to empty string if undefined
            case "TActionCardReload":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.ReloadAmount,
                ) ?? "",
              );
            case "TActionPlayerHeal":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.HealAmount,
                ) ?? "",
              );
            case "TActionPlayerShieldApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.ShieldApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerPoisonApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.PoisonApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerBurnApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.BurnApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerRegenApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.RegenApplyAmount,
                ) ?? "",
              );
            case "TActionCardFreeze":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.FreezeAmount,
                ) ?? 0) / 1000, // Ensure number before division, then string
              );
            case "TActionCardHaste":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.HasteAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardSlow":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.SlowAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardCharge":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.ChargeAmount,
                ) ?? 0) / 1000,
              );
            case "TActionPlayerBurnRemove":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.BurnRemoveAmount,
                ) ?? "",
              );
            case "TActionPlayerPoisonRemove":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.PoisonRemoveAmount,
                ) ?? "",
              );

            default:
              throw new Error(
                action.$type + ": Action type tooltip not implemented",
              );
          }
        },
      );
    return tooltip;
  }).filter((tooltip: string | null) => tooltip !== null);
}

export function run(
  initialGameState: GameState,
  maxTicks: number = Infinity,
): GameState[] {
  const steps = [initialGameState];

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
