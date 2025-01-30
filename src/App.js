import "./styles.css";
import pako from "pako";
import { useState } from "react";

// import Cards from "./v2_Cards.json";
// const compressed = JSON.stringify([...pako.deflate(JSON.stringify(Cards))]);
// localStorage.setItem("Cards", compressed);
const compressed = new Uint8Array(JSON.parse(localStorage.getItem("Cards")));
const Cards = JSON.parse(pako.inflate(compressed, { to: "string" }));

const CardsValues = Object.values(Cards);

const initialGameState = {
  tick: 0,
  isPlaying: true,
  players: [
    getBoardPlayer({ MaxHealth: 400, HealthRegen: 0 }, [
      // getBoardCard("Switchblade", "Silver"),
      // getBoardCard("Bar of Gold", "Bronze"),
      getBoardCard("Fang", "Bronze"),
      getBoardCard("Fang", "Bronze"),
      // getBoardCard("Citrus", "Bronze"),
      // getBoardCard("Fang", "Bronze"),
      // getBoardCard("Fang", "Bronze"),
      // getBoardCard("Fang", "Bronze"),
      // getBoardCard("Colossal Popsicle", "Diamond"),
      // getBoardCard("Beach Ball", "Silver"),
    ]),
    getBoardPlayer({ MaxHealth: 350, HealthRegen: 5 }, [
      getBoardCard("Powder Flask", "Silver"),
      // getBoardCard("Ballista", "Silver"),
      getBoardCard("Atomic Clock", "Silver"),
      // getBoardCard("Blow Torch", "Silver"),
      // getBoardCard("Solar Farm", "Silver"),
    ]),
  ],
  getRand: sfc32(0, 10000, 10000000, 100000000000),
};

function getBoardCard(name, tier, modifiers) {
  const card = CardsValues.find(
    (card) => card.Localization.Title.Text === name
  );
  let attributes = {};
  const tierNames = Object.keys(card.Tiers);
  for (let i = 0; i < tierNames.length; ++i) {
    const tierName = tierNames[i];

    attributes = { ...attributes, ...card.Tiers[tierName].Attributes };
    if (tierName === tier) {
      break;
    }
  }
  const result = {
    card,
    ...attributes,
    tick: 0,
    Slow: 0,
    Freeze: 0,
    Haste: 0,
    ...(attributes.AmmoMax ? { Ammo: attributes.AmmoMax } : {}),
  };
  return result;
}

function getBoardPlayer(stats, board) {
  return {
    MaxHealth: stats.MaxHealth,
    Health: stats.MaxHealth,
    HealthRegen: stats.HealthRegen ?? 0,
    Shield: 0,
    Burn: 0,
    Poison: 0,
    board,
  };
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

const TICK_RATE = 100;

function runGameTick(gameState) {
  const nextGameState = {
    ...gameState,
    players: gameState.players.map((player) => ({
      ...player,
      board: player.board.map((boardCard) => ({ ...boardCard })),
    })),
  };

  nextGameState.tick += TICK_RATE;

  function updateCardAttribute(playerID, boardCardID, attribute, value) {
    const existingValue =
      nextGameState.players[playerID].board[boardCardID][attribute];
    nextGameState.players[playerID].board[boardCardID][attribute] = value;

    forEachCard(
      nextGameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        Object.values(targetBoardCard.card.Abilities).forEach((ability) => {
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

  function updatePlayerAttribute(playerID, attribute, value) {
    const existingValue = nextGameState.players[playerID][attribute];
    nextGameState.players[playerID][attribute] = value;

    forEachCard(
      nextGameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        Object.values(targetBoardCard.card.Abilities).forEach((ability) => {
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
              ability.Trigger.Subject,
              playerID,
              targetPlayerID
            );

            runAction(
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
    prerequisite,
    triggerPlayerID,
    triggerBoardCardID,
    targetPlayerID,
    targetBoardCardID
  ) {
    if (prerequisite.$type === "TPrerequisiteCardCount") {
      const subjects = getTargetCards(
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
          conditions.$type === "TCardConditionalHiddenTag"
            ? "HiddenTags"
            : "Tags"
        ];

      if (conditions.Operator === "Any") {
        return tags.filter((tag) => conditions.Tags.includes(tag)).length > 0;
      } else if (conditions.Operator === "None") {
        return tags.filter((tag) => conditions.Tags.includes(tag)).length === 0;
      }
    } else if (conditions.$type === "TCardConditionalOr") {
      for (let i = 0; i < conditions.Conditions.length; ++i) {
        const value = testConditions(
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
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      const shield = nextGameState.players[playerID].Shield;
      const amount =
        gameState.players[triggerPlayerID].board[triggerBoardCardID]
          .DamageAmount;

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
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      nextGameState.players[playerID].Health = Math.min(
        nextGameState.players[playerID].MaxHealth,
        nextGameState.players[playerID].Health +
          gameState.players[targetPlayerID].board[targetBoardCardID].HealAmount
      );
      if (nextGameState.players[playerID].Poison > 0) {
        nextGameState.players[playerID].Poison--;
      }
      if (nextGameState.players[playerID].Burn > 0) {
        nextGameState.players[playerID].Burn--;
      }
    } else if (action.$type === "TActionPlayerPoisonApply") {
      const playerID = getTargetPlayer(
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      nextGameState.players[playerID].Poison =
        nextGameState.players[playerID].Poison +
        gameState.players[targetPlayerID].board[targetBoardCardID]
          .PoisonApplyAmount;
    } else if (action.$type === "TActionPlayerBurnApply") {
      const playerID = getTargetPlayer(
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      updatePlayerAttribute(
        playerID,
        "Burn",
        nextGameState.players[playerID].Burn +
          gameState.players[targetPlayerID].board[targetBoardCardID]
            .BurnApplyAmount
      );
    } else if (action.$type === "TActionPlayerReviveHeal") {
      const playerID = getTargetPlayer(
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      nextGameState.players[playerID].Health = 0;
    } else if (action.$type === "TActionPlayerShieldApply") {
      const playerID = getTargetPlayer(
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      nextGameState.players[playerID].Shield +=
        gameState.players[targetPlayerID].board[
          targetBoardCardID
        ].ShieldApplyAmount;
    } else if (action.$type === "TActionPlayerReviveHeal") {
      const playerID = getTargetPlayer(
        action.Target,
        triggerPlayerID,
        targetPlayerID
      );
      nextGameState.players[playerID].Health = 0;
    } else if (action.$type === "TActionCardReload") {
      const targetCards = getTargetCards(
        action.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      const amount =
        gameState.players[targetPlayerID].board[targetBoardCardID].ReloadAmount;
      const targetCount =
        gameState.players[targetPlayerID].board[targetBoardCardID]
          .ReloadTargets;

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
          return (
            gameState.players[actionTargetPlayerID].board[
              actionTargetBoardCardID
            ].CooldownMax > 0
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
          return (
            gameState.players[actionTargetPlayerID].board[
              actionTargetBoardCardID
            ].CooldownMax > 0
          );
        })
        .slice(0, targetCount)
        .forEach(([actionTargetPlayerID, actionTargetBoardCardID]) => {
          const nextBoardCard =
            nextGameState.players[actionTargetPlayerID].board[
              actionTargetBoardCardID
            ];
          updateCardAttribute(
            actionTargetPlayerID,
            actionTargetBoardCardID,
            "tick",
            Math.min(nextBoardCard.CooldownMax, nextBoardCard.tick + amount)
          );
        });
    } else if (action.$type === "TActionCardModifyAttribute") {
      const actionValue = getActionValue(
        action.Value,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );

      const targetCards = getTargetCards(
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
            actionTargetPlayerID,
            actionTargetBoardCardID,
            action.AttributeType,
            newValue
          );
        });
    } else if (action.$type === "TActionPlayerModifyAttribute") {
      const actionValue = getActionValue(
        action.Value,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      const playerID = getTargetPlayer(
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
    value,
    triggerPlayerID,
    triggerBoardCardID,
    targetPlayerID,
    targetBoardCardID
  ) {
    if (value.$type === "TFixedValue") {
      return value.Value;
    } else if (value.$type === "TReferenceValueCardAttribute") {
      const [[valueTargetPlayerID, valueTargetBoardCardID]] = getTargetCards(
        value.Target,
        triggerPlayerID,
        triggerBoardCardID,
        targetPlayerID,
        targetBoardCardID
      );
      return (
        gameState.players[valueTargetPlayerID].board[valueTargetBoardCardID][
          value.AttributeType
        ] ?? value.DefaultValue
      );
    }
  }

  function getTargetCards(
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
        for (
          let i = targetBoardCardID + (target.IncludeOrigin ? 0 : 1);
          i < gameState.players[targetPlayerID].board.length;
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
        if (
          targetBoardCardID !==
          gameState.players[targetPlayerID].board.length - 1
        ) {
          results.push([targetPlayerID, targetBoardCardID + 1]);
        }
      } else if (target.TargetMode === "RightCard") {
        if (target.IncludeOrigin) {
          results.push([targetPlayerID, targetBoardCardID]);
        }
        if (
          targetBoardCardID !==
          gameState.players[targetPlayerID].board.length - 1
        ) {
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
        for (
          let i = 0;
          i < gameState.players[targetPlayerID].board.length;
          ++i
        ) {
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
        for (
          let i = 0;
          i < gameState.players[(targetPlayerID + 1) % 2].board.length;
          ++i
        ) {
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
            results[currentIndex],
          ];
        }
      }
    } else if (target.$type === "TTargetCardSelf") {
      results.push([targetPlayerID, targetBoardCardID]);
    }

    return results.filter(([testPlayerID, testBoardCardID]) => {
      return testConditions(
        target.Conditions,
        triggerPlayerID,
        triggerBoardCardID,
        testPlayerID,
        testBoardCardID
      );
    });
  }

  function getTargetPlayer(target, triggerPlayerID, targetPlayerID) {
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

  const cardTriggerList = [];
  forEachCard(gameState, (player, playerID, boardCard, boardCardID) => {
    const nextBoardCard = nextGameState.players[playerID].board[boardCardID];
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
        cardTriggerList.push([playerID, boardCardID]);
      }
    }
  });

  cardTriggerList.forEach(([playerID, boardCardID]) => {
    const boardCard = gameState.players[playerID].board[boardCardID];
    if (boardCard.AmmoMax) {
      nextGameState.players[playerID].board[boardCardID].Ammo--;
    }

    forEachCard(
      gameState,
      (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
        Object.values(targetBoardCard.card.Abilities).forEach((ability) => {
          if (
            ability.Trigger.$type === "TTriggerOnCardFired" &&
            playerID === targetPlayerID &&
            boardCardID === targetBoardCardID
          ) {
            runAction(
              ability.Action,
              ability.Prerequisites,
              playerID,
              boardCardID,
              targetPlayerID,
              targetBoardCardID
            );
          } else if (ability.Trigger.$type === "TTriggerOnItemUsed") {
            const subjects = getTargetCards(
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

    nextGameState.players[playerID].board[boardCardID].tick = 0;
  });

  nextGameState.players.forEach((player, playerID) => {
    if (player.Health < 0) {
      forEachCard(
        nextGameState,
        (targetPlayer, targetPlayerID, targetBoardCard, targetBoardCardID) => {
          Object.values(targetBoardCard.card.Abilities).forEach((ability) => {
            if (ability.Trigger.$type === "TTriggerOnPlayerDied") {
              const abilityPlayerID = getTargetPlayer(
                ability.Trigger.Subject,
                playerID,
                targetPlayerID
              );
              runAction(
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
  return nextGameState;
}

const steps = [initialGameState];
console.log(initialGameState);
let gameState = initialGameState;
for (let i = 0; i < 1000; ++i) {
  gameState = runGameTick(gameState);
  steps.push(gameState);
  if (!gameState.isPlaying) {
    break;
  }
}

const CARD_HEIGHT = 150;

function BoardCard({ boardCard }) {
  const card = boardCard.card;
  const cardWidth =
    card.Size === "Small"
      ? CARD_HEIGHT / 2
      : card.Size === "Medium"
      ? CARD_HEIGHT / 1
      : CARD_HEIGHT * 1.5;

  const paddingTop = 20;
  return (
    <div
      style={{
        margin: 5,
        position: "relative",
        height: CARD_HEIGHT + paddingTop,
        width: cardWidth,
        overflow: "hidden",
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
        }}
        height={CARD_HEIGHT}
        width={cardWidth}
      />
      {boardCard.CooldownMax > 0 ? (
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
            height: 2,
          }}
        >
          {(boardCard.tick / 1000).toFixed(1)} /{" "}
          {(boardCard.CooldownMax / 1000).toFixed(1)}&nbsp;
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
          whiteSpace: "preserve nowrap",
        }}
      >
        {boardCard.Freeze > 0 ? (
          <div
            style={{
              background: "rgba(0.2, 0.2, 0.2, 0.5)",
              padding: "2px 5px",
              borderRadius: 5,
              margin: 2,
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
              margin: 2,
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
              margin: 2,
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
          top: paddingTop,
        }}
      >
        {boardCard.DamageAmount !== undefined && (
          <div
            style={{
              backgroundColor: "red",
              padding: "2px 5px",
              margin: "0 2px",
              borderRadius: 5,
              color: "white",
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
              color: "white",
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
              color: "white",
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
              color: "white",
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
              margin: "0 2px",
            }}
          >
            {boardCard.ShieldApplyAmount}
          </div>
        )}
      </div>
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
            borderRadius: 5,
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
                  border: "1px solid orange",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Game({ gameState }) {
  return (
    <div>
      {gameState.players.map((player, playerID) => {
        const healthBar = (
          <div key="healthbar">
            Health: {player.Health}
            {player.HealthRegen > 0 ? <>, Regen: {player.HealthRegen}</> : null}
            {player.Shield > 0 ? <>, Shield: {player.Shield}</> : null}
            {player.Poison > 0 ? <>, Poison: {player.Poison}</> : null}
            {player.Burn > 0 ? <>, Burn: {player.Burn}</> : null}
          </div>
        );
        const board = (
          <div key="board" style={{ display: "flex" }}>
            {player.board.map((boardCard, i) => (
              <BoardCard boardCard={boardCard} key={i} />
            ))}
          </div>
        );
        const display =
          playerID === 0 ? [healthBar, board] : [board, healthBar];
        return <div key={playerID}>{display}</div>;
      })}
    </div>
  );
}

export default function App() {
  let [stepCount, setStepCount] = useState(0);

  return (
    <div className="App">
      <Game gameState={steps[stepCount]} />
      <input
        style={{ width: "100%" }}
        type="range"
        min="0"
        max={steps.length - 1}
        value={stepCount}
        onChange={(e) => setStepCount(e.target.value)}
      />
    </div>
  );
}
