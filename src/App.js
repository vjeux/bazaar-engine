import "./styles.css";
import pako from "pako";
import { useState, useEffect } from "react";

// import Cards from "./json/v2_Cards.json";
// const compressed = JSON.stringify([...pako.deflate(JSON.stringify(Cards))]);
// localStorage.setItem("Cards", compressed);
const compressed = new Uint8Array(JSON.parse(localStorage.getItem("Cards")));
const Cards = JSON.parse(pako.inflate(compressed, { to: "string" }));

// import Encounters from "./json/encounterDays.json";
// const compressed_encounters = JSON.stringify([
//   ...pako.deflate(JSON.stringify(Encounters))
// ]);
// localStorage.setItem("Encounters", compressed_encounters);
const compressed_encounters = new Uint8Array(
  JSON.parse(localStorage.getItem("Encounters"))
);
const Encounters = JSON.parse(
  pako.inflate(compressed_encounters, { to: "string" })
);

const CardsValues = Object.values(Cards);

const MonstersList = parseMonsters(Encounters);

/* Bugs

// Aura for crusher claw applies before aura for abacus
getBoardCard("Crusher Claw", "Silver"),
getBoardCard("Abacus", "Gold"),

*/

console.log(MonstersList[1]);

const initialGameState = {
  tick: 0,
  isPlaying: true,
  players: [
    // getBoardPlayer(
    //   { MaxHealth: 2000, HealthRegen: 0 },
    //   [
    //     // getBoardCard("Switchblade", "Silver"),
    //     // getBoardCard("Bar of Gold", "Bronze"),
    //     // getBoardCard("Vial of Blood", "Silver"),
    //     getBoardCard("Ballista", "Gold"),
    //     // getBoardCard("Fire Claw", "Diamond"),
    //     getBoardCard("Uzi", "Bronze"),
    //     getBoardCard("Uzi", "Bronze")
    //     // getBoardCard("Beach Ball", "Silver"),
    //   ],
    //   []
    // ),
    getMonsterByName("Dire Inglet"),
    //MonstersList[1][1],
    getBoardPlayer(
      { MaxHealth: 3500, HealthRegen: 0 },
      [
        // getBoardCard("Powder Flask", "Silver"),
        // getBoardCard("Abacus", "Silver"),
        // getBoardCard("Crusher Claw", "Silver"),
        // getBoardCard("Colossal Popsicle", "Diamond"),
        // getBoardCard("Blue Piggles A", "Silver"),
        getBoardCard("Cutlass", "Silver"),
        getBoardCard("Barrel", "Silver")
        // getBoardCard("Agility Boots", "Silver"),
        // getBoardCard("Crusher Claw", "Silver"),
        // getBoardCard("Abacus", "Gold"),
      ],
      [getBoardSkill("Aggressive", "Silver")]
    )
  ],
  multicast: [],
  getRand: sfc32(0, 10000, 10000000, 100000000000),
  sandstorm_damage: 0
};

/**
 * Creates a board card from a card object and a specified tier.
 * If the given tier does not exist in the card's Tiers, the first available tier is used.
 *
 * @param {Object} card - The card object from CardsValues.
 * @param {string} tier - The desired tier.
 * @returns {Object} The board card object.
 */
function _createBoardCardFromCard(card, tier) {
  const attributes = {};

  // If the provided tier is not available, default to the first tier available.
  if (!(tier in card.Tiers)) {
    const tierKeys = Object.keys(card.Tiers);
    const firstTier = tierKeys.length > 0 ? tierKeys[0] : null;
    tier = firstTier;
  }

  // Iterate over the tiers in order and merge their attributes until the desired tier is reached.
  const tierNames = Object.keys(card.Tiers);
  for (const tn of tierNames) {
    const tierValues = card.Tiers[tn];

    // Merge in the tier's attributes.
    Object.assign(attributes, tierValues.Attributes || {});
    attributes.AbilityIds = tierValues.AbilityIds;
    attributes.AuraIds = tierValues.AuraIds;
    attributes.TooltipIds = tierValues.TooltipIds;

    if (tn === tier) {
      break;
    }
  }

  // Create the result object with default simulation fields.
  const result = {
    card: card,
    ...attributes,
    tick: 0,
    Slow: 0,
    Freeze: 0,
    Haste: 0,
    CritChance: 0,
    DamageCrit: 0,
    tier: tier
  };

  // If the attributes include AmmoMax, set Ammo to that value.
  if ("AmmoMax" in attributes) {
    result.Ammo = attributes.AmmoMax;
  }

  return result;
}

/**
 * Retrieves a board card by its localized title text.
 *
 * @param {string} name - The localized title of the card.
 * @param {string} tier - The desired tier.
 * @param {*} [modifiers=null] - Optional modifiers (unused in this implementation).
 * @returns {Object} The board card.
 * @throws Will throw an error if the card is not found.
 */
function getBoardCard(name, tier, modifiers = null) {
  // Find the card by its localized title text.
  const card = CardsValues.find((c) => c.Localization?.Title?.Text === name);
  if (!card) {
    throw new Error(`Card ${name} not found`);
  }
  return _createBoardCardFromCard(card, tier);
}

/**
 * Retrieves a board card by its card ID.
 *
 * @param {number} cardId - The ID of the card.
 * @param {string} tier - The desired tier.
 * @returns {Object} The board card.
 * @throws Will throw an error if the card with the given ID is not found.
 */
function getBoardCardWithId(cardId, tier) {
  const card = CardsValues.find((c) => c.Id === cardId);
  if (!card) {
    throw new Error(`Card with id ${cardId} not found`);
  }
  return _createBoardCardFromCard(card, tier);
}

function getBoardSkill(name, tier, modifiers) {
  const card = CardsValues.find(
    (card) => card.Localization.Title.Text === name
  );
  let attributes = {};
  if (!card.Tiers[tier]) {
    throw new Error(
      name +
        " doesn't have tier " +
        tier +
        ", the first one is " +
        Object.keys(card.Tiers)[0]
    );
  }
  const tierNames = Object.keys(card.Tiers);
  for (let i = 0; i < tierNames.length; ++i) {
    const tierName = tierNames[i];
    const tierValues = card.Tiers[tierName];
    attributes = {
      ...attributes,
      ...tierValues.Attributes,
      AbilityIds: tierValues.AbilityIds,
      AuraIds: tierValues.AuraIds,
      TooltipIds: tierValues.TooltipIds
    };
    if (tierName === tier) {
      break;
    }
  }
  const result = {
    card,
    ...attributes,
    tier
  };
  return result;
}

function getBoardPlayer(stats, boardCards, boardSkills) {
  return {
    MaxHealth: stats.MaxHealth,
    Health: stats.MaxHealth,
    HealthRegen: stats.HealthRegen ?? 0,
    Shield: 0,
    Burn: 0,
    Poison: 0,
    board: [...boardCards, ...boardSkills]
  };
}

/**
 * Parses encounter data to extract monster information and construct board players.
 *
 * @param {Object} encounters - The encounter data object.
 * @param {Array} [encounters.data=[]] - An array of daily encounter data objects.
 * @param {Array} [encounters.data[].groups=[]] - An array of groups within a day, each group being an array of monsters.
 * @returns {Array.<Array>} An array of tuples, each containing a monster's name (string) and its corresponding board player object.
 */
function parseMonsters(encounters) {
  let data = encounters;

  const monstersList = [];
  const dayData = data.data || [];
  dayData.forEach((dayInfo) => {
    const groups = dayInfo.groups || [];
    groups.forEach((group) => {
      group.forEach((monster) => {
        const name = monster.cardName || "Unnamed Monster";
        const health = monster.health || 0;
        const stats = { MaxHealth: health, HealthRegen: 0 };

        let boardCards = [];
        if (Array.isArray(monster.items) && monster.items.length > 0) {
          boardCards = monster.items.map((item) =>
            getBoardCardWithId(item.card.id, item.tierType)
          );
        }

        let boardSkills = [];
        if (Array.isArray(monster.skills) && monster.skills.length > 0) {
          monster.skills.forEach((skill) => {
            try {
              if (skill.card && skill.tierType) {
                boardSkills.push(
                  getBoardSkill(skill.card.name, skill.tierType)
                );
              }
            } catch (error) {
              // Skip this skill if there's an error.
              console.error("Error reading monster skill:", error);
            }
          });
        }

        const boardPlayer = getBoardPlayer(stats, boardCards, boardSkills);
        monstersList.push([name, boardPlayer]);
      });
    });
  });
  return monstersList;
}

function getMonsterByName(name) {
  return MonstersList.find((monster) => monster[0] === name)[1];
}

function sfc32(a, b, c, d) {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function forEachCard(gameState, callback) {
  for (let i = 0; i < gameState.players.length; ++i) {
    const player = gameState.players[i];
    for (let j = 0; j < player.board.length; ++j) {
      const boardCard = player.board[j];
      callback(player, i, boardCard, j);
    }
  }
}

function forEachAbility(boardCard, callback) {
  for (let i = 0; i < boardCard.AbilityIds.length; ++i) {
    const abilityId = boardCard.AbilityIds[i];
    callback(boardCard.card.Abilities[abilityId]);
  }
}

function forEachAura(boardCard, callback) {
  for (let i = 0; i < boardCard.AuraIds.length; ++i) {
    const auraId = boardCard.AuraIds[i];
    callback(boardCard.card.Auras[auraId]);
  }
}

function hasCooldown(boardCard) {
  return "CooldownMax" in boardCard;
}

function updateCardAttribute(
  gameState,
  nextGameState,
  playerID,
  boardCardID,
  attribute,
  value,
  triggerActions = true
) {
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

function updatePlayerAttribute(
  gameState,
  nextGameState,
  playerID,
  attribute,
  value
) {
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
  gameState,
  nextGameState,
  prerequisite,
  triggerPlayerID,
  triggerBoardCardID,
  targetPlayerID,
  targetBoardCardID
) {
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
    if (prerequisite.Comparison === "Equal") {
      return subjects.length === prerequisite.Amount;
    }
  }
}

function testConditions(
  gameState,
  nextGameState,
  conditions,
  triggerPlayerID,
  triggerBoardCardID,
  targetPlayerID,
  targetBoardCardID
) {
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
}

function runAction(
  gameState,
  nextGameState,
  action,
  prerequisites,
  triggerPlayerID,
  triggerBoardCardID,
  targetPlayerID,
  targetBoardCardID
) {
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
        return;
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
      }
    }
    nextGameState.players[playerID].Health = Math.min(
      nextGameState.players[playerID].MaxHealth,
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
      }
    }

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Poison",
      nextGameState.players[playerID].Poison + amount
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
      }
    }

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Burn",
      nextGameState.players[playerID].Burn + amount
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
      }
    }

    updatePlayerAttribute(
      gameState,
      nextGameState,
      playerID,
      "Shield",
      nextGameState.players[playerID].Shield + amount
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
          action.Operation === "Add" ? oldValue + actionValue : oldValue;

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
  } else if (action.$type === "TActionPlayerModifyAttribute") {
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
}

function getActionValue(
  gameState,
  nextGameState,
  value,
  triggerPlayerID,
  triggerBoardCardID,
  targetPlayerID,
  targetBoardCardID
) {
  if (value.$type === "TFixedValue") {
    return value.Value;
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
    let amount = value.DefaultValue;
    targetCards.forEach(([valueTargetPlayerID, valueTargetBoardCardID]) => {
      amount +=
        gameState.players[valueTargetPlayerID].board[valueTargetBoardCardID][
          value.AttributeType
        ] ?? 0;
    });
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
}

function getTargetCards(
  gameState,
  nextGameState,
  target,
  triggerPlayerID,
  triggerBoardCardID,
  targetPlayerID,
  targetBoardCardID
) {
  const results = [];
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
  gameState,
  nextGameState,
  target,
  triggerPlayerID,
  targetPlayerID
) {
  if (target.$type === "TTargetPlayerRelative") {
    if (target.TargetMode === "Opponent") {
      return (triggerPlayerID + 1) % 2;
    } else if (target.TargetMode === "Self") {
      return triggerPlayerID;
    }
  } else if (target.$type === "TTargetCardSection") {
    if (target.TargetSection === "SelfBoard") {
      return triggerPlayerID;
    } else {
      return (triggerPlayerID + 1) % 2;
    }
  }
}

const TICK_RATE = 100;

function runGameTick(initialGameState) {
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

  // Run Tick
  nextGameState.tick += TICK_RATE;

  // Poison + Regen
  if (gameState.tick % 1000 === 0) {
    gameState.players.forEach((player, playerID) => {
      if (player.Poison > 0) {
        nextGameState.players[playerID].Health -= player.Poison;
      }
      if (player.HealthRegen > 0) {
        nextGameState.players[playerID].Health = Math.min(
          nextGameState.players[playerID].Health + player.HealthRegen,
          nextGameState.players[playerID].MaxHealth
        );
      }
    });
  }

  // Shield
  if (gameState.tick % 500 === 0) {
    gameState.players.forEach((player, playerID) => {
      if (player.Burn > 0) {
        const shield = nextGameState.players[playerID].Shield;
        const amount = player.Burn;

        const nextShield = Math.max(0, shield - amount / 2);
        if (nextShield > 0) {
          nextGameState.players[playerID].Shield = nextShield;
        } else {
          const nextAmount = amount - shield * 2;
          nextGameState.players[playerID].Shield = 0;
          nextGameState.players[playerID].Health -= nextAmount;
        }
        nextGameState.players[playerID].Burn--;
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
        if ("Multicast" in nextBoardCard) {
          const MULTICAST_DELAY = 300;
          for (let i = 0; i < nextBoardCard.Multicast - 1; ++i) {
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

  // Trigger Cards
  cardTriggerList.forEach(([playerID, boardCardID, isMulticast]) => {
    const boardCard = gameState.players[playerID].board[boardCardID];
    if (!isMulticast && boardCard.AmmoMax) {
      nextGameState.players[playerID].board[boardCardID].Ammo--;
    }

    forEachCard(
      gameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        forEachAbility(targetBoardCard, (ability) => {
          if (
            ability.Trigger.$type === "TTriggerOnCardFired" &&
            playerID === targetPlayerID &&
            boardCardID === targetBoardCardID
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
                boardCardID === subjectBoardCardID
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

    if (!isMulticast) {
      nextGameState.players[playerID].board[boardCardID].tick = 0;
    }
  });

  /* 
  Sandstorm

  Start at 30 seconds, at 1 dmg
  Tickrate is every 0.2 seconds
  Increase by 1 every tick
  */
  // TODO: End game when it reaches 600 dmg per tick
  const sandstorm_initial_tick = 30000;
  const sandstorm_tickrate = 200;

  let tickDamage = 0;
  if (nextGameState.tick - sandstorm_initial_tick > 0) {
    if (
      (nextGameState.tick - sandstorm_initial_tick) % sandstorm_tickrate ===
      0
    ) {
      tickDamage = Math.floor(
        (nextGameState.tick - sandstorm_initial_tick) / sandstorm_tickrate
      );
    }
  }
  nextGameState.sandstorm_damage = tickDamage;
  nextGameState.players.forEach((player) => {
    const shield = player.Shield;
    // Damage shield first, then health
    const nextShield = Math.max(0, shield - tickDamage);
    if (nextShield > 0) {
      player.Shield = nextShield;
    } else {
      const nextHealthDamage = tickDamage - shield;
      player.Shield = 0;
      player.Health -= nextHealthDamage;
    }
  });

  // Death
  nextGameState.players.forEach((player, playerID) => {
    if (player.Health < 0) {
      forEachCard(
        nextGameState,
        (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
          forEachAbility(targetBoardCard, (ability) => {
            if (ability.Trigger.$type === "TTriggerOnPlayerDied") {
              const abilityPlayerID = getTargetPlayer(
                ability.Trigger.Subject,
                playerID,
                targetPlayerID
              );
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

const steps = [];
console.log(initialGameState);

let gameState = initialGameState;
let displayGameState = null;
for (let i = 0; i < 1000; ++i) {
  [displayGameState, gameState] = runGameTick(gameState);
  steps.push(displayGameState);
  if (!displayGameState.isPlaying) {
    break;
  }
}

const CARD_HEIGHT = 150;

function Tooltip({ boardCard, gameState, playerID, boardCardID }) {
  return (
    <div
      style={{
        position: "absolute",
        maxWidth: 300,
        backgroundColor: "#222",
        color: "white",
        border: "1px solid black",
        borderRadius: 5,
        padding: "5px 10px",
        zIndex: 1
      }}
      className="tooltip"
    >
      <div style={{ margin: "5px 0px 5px 0", fontWeight: "bold" }}>
        {boardCard.card.Localization.Title.Text}
      </div>
      {boardCard.TooltipIds.map((tooltipId, i) => {
        const tooltip = boardCard.card.Localization.Tooltips[
          tooltipId
        ].Content.Text.replace(
          /\{([a-z]+)\.([0-9+])\.targets\}/g,
          (_, type, id) => {
            const action =
              boardCard.card[type === "aura" ? "Auras" : "Abilities"][id]
                .Action;
            const target = action.Target;
            if (target.$type === "TTargetCardRandom") {
              return 1;
            }
            return `{?${type}.${id}.targets}`;
          }
        ).replace(/\{([a-z]+)\.([0-9+])\}/g, (_, type, id, targets) => {
          const action =
            boardCard.card[type === "aura" ? "Auras" : "Abilities"][id].Action;
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
          }
          if (action.$type === "TActionCardReload") {
            return boardCard.ReloadAmount;
          }
          if (action.$type === "TActionCardFreeze") {
            return boardCard.FreezeAmount / 1000;
          }
          if (action.$type === "TActionCardSlow") {
            return boardCard.SlowAmount / 1000;
          }
          if (action.$type === "TActionCardCharge") {
            return boardCard.ChargeAmount / 1000;
          }
          const match = action.$type.match(/^TActionPlayer([A-Za-z]+)Apply$/);
          if (match) {
            return boardCard[`${match[1]}ApplyAmount`];
          }
          return `{?${type}.${id}}`;
        });
        return (
          <div style={{ margin: "10px 10px" }} key={"tooltip" + i}>
            {tooltip}
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ boardCard, gameState, playerID, boardCardID }) {
  const card = boardCard.card;
  const tier = boardCard.tier;
  const cardWidth =
    card.Size === "Small"
      ? CARD_HEIGHT / 2
      : card.Size === "Medium"
        ? CARD_HEIGHT / 1
        : CARD_HEIGHT * 1.5;

  const paddingTop = 12;
  const borderSize = 4;
  return (
    <div className="tooltipContainer">
      <div
        style={{
          margin: 5,
          position: "relative",
          height: CARD_HEIGHT + paddingTop + 2 * borderSize,
          width: cardWidth + 2 * borderSize,
          overflow: "hidden"
        }}
      >
        <img
          src={
            "https://www.howbazaar.gg/images/items/" +
            (card.InternalName ? card.InternalName.replace(/[ ']/g, "") : "") +
            ".avif"
          }
          style={{
            filter: boardCard.Freeze > 0 ? "grayscale(1)" : "",
            opacity: boardCard.Freeze > 0 ? 0.5 : 1,
            borderRadius: 5,
            position: "relative",
            top: paddingTop,
            border: borderSize + "px solid",
            borderColor:
              tier === "Bronze"
                ? "brown"
                : tier === "Silver"
                  ? "gray"
                  : tier === "Gold"
                    ? "yellow"
                    : "blue"
          }}
          height={CARD_HEIGHT}
          width={cardWidth}
        />
        {hasCooldown(boardCard) ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: (boardCard.tick / boardCard.CooldownMax) * CARD_HEIGHT,
              borderTop: "2px solid white",
              color: "white",
              textAlign: "right",
              fontSize: "8pt",
              boxSizing: "border-box",
              height: 2
            }}
          >
            {(boardCard.tick / 1000).toFixed(1)} /{" "}
            {(boardCard.CooldownMax / 1000).toFixed(1)}&nbsp;&nbsp;
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            color: "white",
            whiteSpace: "preserve nowrap"
          }}
        >
          {boardCard.Freeze > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2
              }}
            >
              ❄️ {(boardCard.Freeze / 1000).toFixed(1)}
            </div>
          ) : null}
          {boardCard.Slow > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2
              }}
            >
              🐌 {(boardCard.Slow / 1000).toFixed(1)}
            </div>
          ) : null}
          {boardCard.Haste > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2
              }}
            >
              ⏱️ {(boardCard.Haste / 1000).toFixed(1)}
            </div>
          ) : null}
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            top: paddingTop
          }}
        >
          {boardCard.DamageAmount !== undefined && (
            <div
              style={{
                backgroundColor: "red",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.DamageAmount}
            </div>
          )}
          {boardCard.HealAmount !== undefined && (
            <div
              style={{
                backgroundColor: "limegreen",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.HealAmount}
            </div>
          )}
          {boardCard.BurnApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "orange",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.BurnApplyAmount}
            </div>
          )}
          {boardCard.PoisonApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "purple",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.PoisonApplyAmount}
            </div>
          )}
          {boardCard.ShieldApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "yellow",
                borderRadius: 5,
                padding: "2px 5px",
                margin: "0 2px"
              }}
            >
              {boardCard.ShieldApplyAmount}
            </div>
          )}
        </div>
        {boardCard.CritChance > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 31.5,
              left: 5,
              backgroundColor: "red",
              padding: "2px 5px",
              margin: "0 2px",
              borderRadius: 5,
              color: "white"
            }}
          >
            {boardCard.CritChance + "%"}
          </div>
        )}
        {boardCard.SellPrice !== undefined && (
          <div
            style={{
              position: "absolute",
              bottom: 6.5,
              left: 5,
              backgroundColor: "orange",
              padding: "2px 5px",
              margin: "0 2px",
              borderRadius: 5,
              color: "white"
            }}
          >
            {boardCard.SellPrice}
          </div>
        )}
        {boardCard.Multicast !== undefined && boardCard.Multicast > 1 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: 25,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              padding: "1px 3px",
              borderRadius: 5,
              fontSize: "9pt",
              color: "white"
            }}
          >
            x{boardCard.Multicast}
          </div>
        )}
        {boardCard.AmmoMax && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 0,
              display: "flex",
              backgroundColor: "gray",
              padding: "2px 5px",
              marginBottom: 5,
              borderRadius: 5
            }}
          >
            {[...new Array(boardCard.AmmoMax)].map((_, i) => {
              return (
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 10,
                    backgroundColor:
                      boardCard.Ammo > i ? "orange" : "transparent",
                    margin: "1px 1px",
                    border: "1px solid orange"
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      <Tooltip
        boardCard={boardCard}
        gameState={gameState}
        playerID={playerID}
        boardCardID={boardCardID}
      />
    </div>
  );
}

function BoardSkill({ boardCard, gameState, playerID, boardCardID }) {
  const card = boardCard.card;
  const tier = boardCard.tier;

  const borderSize = 4;
  const IMAGE_SIZE = 30;
  return (
    <div className="tooltipContainer">
      <div
        style={{
          margin: 5,
          position: "relative",
          height: IMAGE_SIZE + borderSize * 2,
          width: IMAGE_SIZE + borderSize * 2,
          overflow: "hidden"
        }}
      >
        <img
          src={
            "https://www.howbazaar.gg/images/skills/" +
            (card.InternalName ? card.InternalName.replace(/[ ']/g, "") : "") +
            ".avif"
          }
          style={{
            borderRadius: "100%",
            position: "relative",
            top: 0,
            border: borderSize + "px solid",
            borderColor:
              tier === "Bronze"
                ? "brown"
                : tier === "Silver"
                  ? "gray"
                  : tier === "Gold"
                    ? "yellow"
                    : "blue"
          }}
          height={IMAGE_SIZE}
          width={IMAGE_SIZE}
        />
      </div>
      <Tooltip
        boardCard={boardCard}
        gameState={gameState}
        playerID={playerID}
        boardCardID={boardCardID}
      />
    </div>
  );
}

function Game({ gameState }) {
  return (
    <div>
      {gameState.players.map((player, playerID) => {
        const ticks = Math.floor(player.MaxHealth / 50);
        const healthBar = (
          <div
            key="healthbar"
            style={{
              border: "1px solid #3abf39",
              borderRadius: 5,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(87, 66, 52, 0.4)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                backgroundColor: player.Poison > 0 ? "#076044" : "#1da81c",
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: Math.max(0, player.Health / player.MaxHealth) * 100 + "%"
              }}
            />
            <div
              style={{
                backgroundColor: "rgba(217, 174, 45, 0.5)",
                position: "absolute",
                top: 0,
                bottom: "50%",
                left: 0,
                width: Math.min(1, player.Shield / player.MaxHealth) * 100 + "%"
              }}
            />
            {[...new Array(ticks)].map((_, i) => {
              if (i === 0) {
                return;
              }
              return (
                <div
                  key={"tick" + i}
                  style={{
                    backgroundColor: "#3abf39",
                    position: "absolute",
                    opacity: 0.5,
                    width: 1,
                    top: i % 5 === 0 ? 1 : 5,
                    bottom: i % 5 === 0 ? 1 : 5,
                    left: (i / ticks) * 100 + "%"
                  }}
                />
              );
            })}
            <div
              style={{
                position: "relative",
                fontSize: "20pt",
                textShadow:
                  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                fontSmoothing: "antialiased"
              }}
            >
              <span
                style={{
                  color: "white",
                  display: "inline-block",
                  margin: "0 5px"
                }}
              >
                {Math.floor(player.Health)}
              </span>
              {player.Shield >= 1 ? (
                <span
                  style={{
                    color: "#ffd62e",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {Math.floor(player.Shield)}
                </span>
              ) : null}
              {player.Poison > 0 ? (
                <span
                  style={{
                    color: "#1e976d",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {player.Poison}
                </span>
              ) : null}
              {player.Burn > 0 ? (
                <span
                  style={{
                    color: "#d99c3e",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {player.Burn}
                </span>
              ) : null}
              {player.HealthRegen > 0 ? (
                <span
                  style={{
                    color: "#96dd4b",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {player.HealthRegen}
                </span>
              ) : null}
            </div>
          </div>
        );
        const board = (
          <div key="board" style={{ display: "flex" }}>
            {player.board
              .filter((x) => x.card.$type === "TCardItem")
              .map((boardCard, i) => (
                <BoardCard
                  boardCard={boardCard}
                  gameState={gameState}
                  key={i}
                  playerID={playerID}
                  boardCardID={i}
                />
              ))}
          </div>
        );
        const boardSkills = (
          <div key="skills" style={{ display: "flex" }}>
            {player.board
              .filter((x) => x.card.$type === "TCardSkill")
              .map((boardCard, i) => (
                <BoardSkill
                  boardCard={boardCard}
                  gameState={gameState}
                  key={i}
                  playerID={playerID}
                  boardCardID={player.board.indexOf(boardCard)}
                />
              ))}
          </div>
        );
        const display =
          playerID === 0
            ? [boardSkills, healthBar, board]
            : [board, healthBar, boardSkills];
        return <div key={playerID}>{display}</div>;
      })}
      <p>Sandstorm damage: {gameState.sandstorm_damage}</p>
    </div>
  );
}

function stepCountToSeconds(stepCount) {
  return (stepCount * TICK_RATE) / 1000;
}

export default function App() {
  const [stepCount, setStepCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoReset, setAutoReset] = useState(false);

  useEffect(() => {
    if (!autoScroll) return;

    const interval = setInterval(() => {
      setStepCount((prev) =>
        prev >= steps.length - 1 ? (autoReset ? 0 : prev) : prev + 1
      );
    }, 100);

    return () => clearInterval(interval);
  }, [autoScroll, autoReset]);

  return (
    <div className="App">
      <Game gameState={steps[stepCount]} />
      <input
        style={{ width: "100%", marginTop: 20 }}
        type="range"
        min="0"
        max={steps.length - 1}
        value={stepCount}
        onChange={(e) => setStepCount(Number(e.target.value))}
      />
      <div style={{ marginTop: 10 }}>
        <label style={{ marginRight: 10 }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />{" "}
          Auto Scroll
        </label>
        <label>
          <input
            type="checkbox"
            checked={autoReset}
            onChange={(e) => setAutoReset(e.target.checked)}
          />{" "}
          Auto Reset
        </label>
      </div>

      <p>Time: {stepCountToSeconds(stepCount).toFixed(1)}s </p>
      <p>
        Steps: {stepCount}/{steps.length - 1}
      </p>
    </div>
  );
}
