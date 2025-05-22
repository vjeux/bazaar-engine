import { GameState, CardLocationID, cardLocationIdIsEqual } from "./engine2";
import {
  Source,
  Target,
  Subject,
  Conditions,
  CardType,
} from "../../types/cardTypes";
import prand from "pure-rand";
import {
  CardFiredEvent,
  CardItemUsedEvent,
  CardAttributeChangedEvent,
  CardPerformedPoisonEvent,
  CardPerformedBurnEvent,
  CardPerformedFreezeEvent,
} from "./events";
import { GameEvent } from "./events";
import { getActionValue } from "./getActionValue";
import { Hero, HiddenTag, Tag } from "../../types/shared";
import { PLAYER_PLAYER_IDX } from "@/lib/constants";
import { getCardAttribute } from "./getAttribute";

export type TargetConfig = Source | Target | Subject;

export function getBoardCardByID(
  gameState: GameState,
  locationID: CardLocationID,
) {
  return gameState.players[locationID.playerIdx][
    locationID.location === "board" ? "board" : "stash"
  ][locationID.cardIdx];
}

/**
 * Get the amount of card items on the board or in the stash for a player
 */
function getCardItemsLength(
  gameState: GameState,
  playerIdx: number,
  location: "board" | "stash",
): number {
  if (location === "board") {
    return (
      gameState.players[playerIdx]["board"].findLastIndex(
        (boardCard) => boardCard.card.$type === CardType.TCardItem,
      ) + 1
    );
  } else {
    return (
      gameState.players[playerIdx]["stash"].findLastIndex(
        (boardCard) => boardCard.card.$type === CardType.TCardItem,
      ) + 1
    );
  }
}

/**
 * Get target cards based on targeting configuration
 */
export function getTargetCards(
  gameState: GameState,
  targetConfig: TargetConfig,
  sourceCard: CardLocationID,
  event?: GameEvent,
): CardLocationID[] {
  let results: CardLocationID[] = [];

  switch (targetConfig.$type) {
    case "TTargetCardSelf": {
      results.push(sourceCard);
      break;
    }

    // TODO: improve this instanceof check, as many more events can probably trigger this path
    case "TTargetCardTriggerSource": {
      if (
        (event && event instanceof CardFiredEvent) ||
        event instanceof CardItemUsedEvent ||
        event instanceof CardPerformedPoisonEvent ||
        event instanceof CardPerformedBurnEvent ||
        event instanceof CardPerformedFreezeEvent
      ) {
        results.push(event.sourceCardID);
      } else if (event instanceof CardAttributeChangedEvent) {
        results.push(event.targetCardID);
      } else {
        throw new Error(
          "sourceCardID is required for TTargetCardTriggerSource",
        );
      }
      break;
    }

    case "TTargetCardPositional": {
      switch (targetConfig.TargetMode) {
        case "AllRightCards": {
          const lengthCardItems = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            sourceCard.location,
          );

          for (
            let i = sourceCard.cardIdx + (targetConfig.IncludeOrigin ? 0 : 1);
            i < lengthCardItems;
            ++i
          ) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: i,
            });
          }
          break;
        }

        case "AllLeftCards": {
          for (
            let i = 0;
            i < sourceCard.cardIdx - (targetConfig.IncludeOrigin ? 0 : 1);
            ++i
          ) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: i,
            });
          }
          break;
        }

        case "Neighbor": {
          if (targetConfig.IncludeOrigin) {
            results.push(sourceCard);
          }
          // If not the first card, add the left neighbor
          if (sourceCard.cardIdx !== 0) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: sourceCard.cardIdx - 1,
            });
          }

          const lengthCardItems = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            sourceCard.location,
          );

          // If not the last card, add the right neighbor
          if (sourceCard.cardIdx < lengthCardItems - 1) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: sourceCard.cardIdx + 1,
            });
          }
          break;
        }

        case "RightCard": {
          if (targetConfig.IncludeOrigin) {
            results.push(sourceCard);
          }

          const lengthCardItems = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            sourceCard.location,
          );

          // If not the last card, add the right neighbor
          if (sourceCard.cardIdx < lengthCardItems - 1) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: sourceCard.cardIdx + 1,
            });
          }
          break;
        }

        case "LeftCard": {
          if (targetConfig.IncludeOrigin) {
            results.push(sourceCard);
          }

          // If not the first card, add the left neighbor
          if (sourceCard.cardIdx !== 0) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: sourceCard.cardIdx - 1,
            });
          }
          break;
        }

        default:
          throw new Error(
            `Not implemented Target.TargetMode: ${targetConfig.TargetMode}`,
          );
      }
      break;
    }

    case "TTargetCardSection":
    case "TTargetCardRandom": {
      switch (targetConfig.TargetSection) {
        // Cards in hand and stash
        case "SelfHandAndStash": {
          const lengthCardItemsHand = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            sourceCard.location,
          );

          for (let i = 0; i < lengthCardItemsHand; ++i) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: i,
            });
          }

          const lengthCardItemsStash = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            "stash",
          );

          for (let i = 0; i < lengthCardItemsStash; ++i) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: "stash",
              cardIdx: i,
            });
          }
          break;
        }
        // Cards in hand
        case "SelfHand": {
          const lengthCardItemsHand = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            "board",
          );

          for (let i = 0; i < lengthCardItemsHand; ++i) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: i,
            });
          }
          break;
        }
        // Cards on board + skills
        case "SelfBoard": {
          const lengthCardItems = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            "board",
          );

          for (let i = 0; i < lengthCardItems; ++i) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: "board",
              cardIdx: i,
            });
          }
          break;
        }
        // Opponent CardItems
        case "OpponentHand": {
          const opponentPlayerID = sourceCard.playerIdx === 0 ? 1 : 0;
          const lengthCardItems = getCardItemsLength(
            gameState,
            opponentPlayerID,
            "board",
          );
          for (let i = 0; i < lengthCardItems; ++i) {
            results.push({
              playerIdx: opponentPlayerID,
              location: "board",
              cardIdx: i,
            });
          }
          break;
        }

        // Opponent CardItems or skills
        case "OpponentBoard": {
          const opponentPlayerID = sourceCard.playerIdx === 0 ? 1 : 0;
          const lengthCardItems = getCardItemsLength(
            gameState,
            opponentPlayerID,
            "board",
          );

          for (let i = 0; i < lengthCardItems; ++i) {
            results.push({
              playerIdx: opponentPlayerID,
              location: "board",
              cardIdx: i,
            });
          }
          break;
        }
        // All CardItems in game
        case "AllHands": {
          gameState.players.forEach((player, playerID) => {
            const lengthCardItems = getCardItemsLength(
              gameState,
              playerID,
              "board",
            );

            for (let i = 0; i < lengthCardItems; ++i) {
              results.push({
                playerIdx: playerID,
                location: "board",
                cardIdx: i,
              });
            }
          });
          break;
        }

        case "SelfNeighbors": {
          if (sourceCard.cardIdx !== 0) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: sourceCard.cardIdx - 1,
            });
          }

          const lengthCardItems = getCardItemsLength(
            gameState,
            sourceCard.playerIdx,
            sourceCard.location,
          );

          if (sourceCard.cardIdx < lengthCardItems - 1) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              location: sourceCard.location,
              cardIdx: sourceCard.cardIdx + 1,
            });
          }
          break;
        }

        // All players items in both hand and stash
        case "AbsolutePlayerHandAndStash": {
          gameState.players[PLAYER_PLAYER_IDX].board.forEach((card, index) => {
            if (card.card.$type === CardType.TCardItem) {
              results.push({
                playerIdx: PLAYER_PLAYER_IDX,
                location: "board",
                cardIdx: index,
              });
            }
          });
          gameState.players[PLAYER_PLAYER_IDX].stash.forEach((card, index) => {
            if (card.card.$type === CardType.TCardItem) {
              results.push({
                playerIdx: PLAYER_PLAYER_IDX,
                location: "stash",
                cardIdx: index,
              });
            }
          });
          break;
        }

        case "SelfStash": {
          gameState.players[sourceCard.playerIdx].stash.forEach(
            (card, index) => {
              if (card.card.$type === CardType.TCardItem) {
                results.push({
                  playerIdx: sourceCard.playerIdx,
                  cardIdx: index,
                  location: "stash",
                });
              }
            },
          );
          break;
        }

        default:
          throw new Error(
            `Not implemented Target.TargetSection: ${targetConfig.TargetSection}`,
          );

        // no break as we want to fallthrough to next if random
      }

      if (targetConfig.$type === "TTargetCardRandom") {
        // Shuffle
        let currentIndex = results.length;
        while (currentIndex !== 0) {
          const randomIndex = prand.unsafeUniformIntDistribution(
            0,
            currentIndex - 1,
            gameState.randomGen,
          );
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
      // Just add everything, filter on condition later
      const lengthCardItems = getCardItemsLength(
        gameState,
        sourceCard.playerIdx,
        sourceCard.location,
      );

      for (let i = 0; i < lengthCardItems; ++i) {
        results.push({
          playerIdx: sourceCard.playerIdx,
          location: sourceCard.location,
          cardIdx: i,
        });
      }
      break;
    }

    default:
      throw new Error(`Not implemented Target.$type: ${targetConfig.$type}`);
  }

  // Filter out self if ExcludeSelf is true
  if (targetConfig.ExcludeSelf) {
    results = results.filter(
      (cardID) => !cardLocationIdIsEqual(cardID, sourceCard),
    );
  }

  // Filter out disabled cards and test conditions
  const filteredResults = results.filter((cardID) => {
    const { playerIdx, cardIdx } = cardID;
    if (
      targetConfig.Conditions?.$type === "TCardConditionalAttributeHighest" ||
      targetConfig.Conditions?.$type === "TCardConditionalAttributeLowest"
    ) {
      return true;
    }
    return (
      !gameState.players[playerIdx].board[cardIdx].isDisabled &&
      testCardConditions(
        gameState,
        targetConfig.Conditions,
        sourceCard,
        cardID,
        event,
      )
    );
  });

  // Handle attribute-based targeting (highest/lowest)
  if (
    targetConfig.Conditions &&
    (targetConfig.Conditions.$type === "TCardConditionalAttributeHighest" ||
      targetConfig.Conditions.$type === "TCardConditionalAttributeLowest")
  ) {
    const isHighest =
      targetConfig.Conditions.$type === "TCardConditionalAttributeHighest";
    let extremeValue = isHighest ? -Infinity : Infinity;
    let extremeCard: CardLocationID | null = null;

    filteredResults.forEach((cardID) => {
      const { playerIdx, cardIdx } = cardID;
      if (!targetConfig.Conditions?.AttributeType) {
        throw new Error(
          "Attribute type must exist for card conditional attribute highest/lowest",
        );
      }

      const value =
        gameState.players[playerIdx].board[cardIdx][
          targetConfig.Conditions.AttributeType
        ];

      if (
        !gameState.players[playerIdx].board[cardIdx].isDisabled &&
        value !== undefined &&
        (isHighest ? value > extremeValue : value < extremeValue)
      ) {
        extremeValue = value;
        extremeCard = cardID;
      }
    });

    return extremeCard ? [extremeCard] : [];
  }

  // Handle X Most targeting
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

/**
 * Get target players based on targeting configuration
 */
export function getTargetPlayers(
  gameState: GameState,
  targetConfig: TargetConfig,
  sourceCard: CardLocationID,
  event?: GameEvent,
): number[] {
  let results: number[] = [];

  switch (targetConfig.$type) {
    case "TTargetPlayerRelative":
      switch (targetConfig.TargetMode) {
        case "Opponent":
          results = [sourceCard.playerIdx === 0 ? 1 : 0];
          break;
        case "Self":
          results = [sourceCard.playerIdx];
          break;
        default:
          throw new Error(
            `Not implemented TTargetPlayerRelative player targeting TargetMode: ${targetConfig.TargetMode}`,
          );
      }
      break;

    case "TTargetCardSection":
      switch (targetConfig.TargetSection) {
        case "SelfBoard":
          results = [sourceCard.playerIdx];
          break;
        default:
          results = [sourceCard.playerIdx === 0 ? 1 : 0];
          break;
      }
      break;

    case "TTargetPlayer":
      switch (targetConfig.TargetMode) {
        case "Both":
          results = [sourceCard.playerIdx, sourceCard.playerIdx === 0 ? 1 : 0];
          break;
        case "Self":
          results = [sourceCard.playerIdx];
          break;
        case "Opponent":
          results = [sourceCard.playerIdx === 0 ? 1 : 0];
          break;
        default:
          throw new Error(
            `Not implemented TTargetPlayer player targeting TargetMode: ${targetConfig.TargetMode}`,
          );
      }
      break;

    case "TTargetPlayerAbsolute": {
      switch (targetConfig.TargetMode) {
        case "Player":
          return [PLAYER_PLAYER_IDX];
        default:
          throw new Error(
            `Not implemented TTargetPlayerAbsolute player targeting TargetMode: ${targetConfig.TargetMode}`,
          );
      }
      break;
    }

    default:
      throw new Error(`Unhandled player targeting type: ${targetConfig.$type}`);
  }

  // Filter by conditions
  if (targetConfig.Conditions) {
    results = results.filter((playerID) => {
      return testPlayerConditions(
        gameState,
        targetConfig.Conditions,
        sourceCard,
        playerID,
        event,
      );
    });
  }

  return results;
}

/**
 * Test if card meets condition requirements
 */
export function testCardConditions(
  gameState: GameState,
  conditions: Conditions | null,
  sourceCard: CardLocationID,
  targetCard: CardLocationID,
  event?: GameEvent,
): boolean {
  if (conditions == null) {
    return true;
  }

  const { playerIdx: targetPlayerIdx, cardIdx: targetCardIdx } = targetCard;
  const targetBoardCard =
    gameState.players[targetPlayerIdx].board[targetCardIdx];

  switch (conditions.$type) {
    case "TCardConditionalAttribute": {
      if (!conditions.Attribute) {
        throw new Error("Attribute must exist for card conditional attribute");
      }

      const targetBoardCardAtrributeValue = getCardAttribute(
        gameState,
        targetCard,
        conditions.Attribute,
      );

      if (!conditions.ComparisonValue) {
        throw new Error(
          "Comparison value must exist for card conditional attribute",
        );
      }

      const comparisonValue = getActionValue(
        gameState,
        conditions.ComparisonValue,
        sourceCard,
        event,
      );

      switch (conditions.ComparisonOperator) {
        case "Equal":
          return targetBoardCardAtrributeValue === comparisonValue;
        case "GreaterThan":
          return typeof targetBoardCardAtrributeValue === "number" &&
            typeof comparisonValue === "number"
            ? targetBoardCardAtrributeValue > comparisonValue
            : false;
        case "GreaterThanOrEqual":
          return typeof targetBoardCardAtrributeValue === "number" &&
            typeof comparisonValue === "number"
            ? targetBoardCardAtrributeValue >= comparisonValue
            : false;
        case "LessThan":
          return typeof targetBoardCardAtrributeValue === "number" &&
            typeof comparisonValue === "number"
            ? targetBoardCardAtrributeValue < comparisonValue
            : false;
        case "LessThanOrEqual":
          return typeof targetBoardCardAtrributeValue === "number" &&
            typeof comparisonValue === "number"
            ? targetBoardCardAtrributeValue <= comparisonValue
            : false;
        default:
          throw new Error(
            `ComparisonOperator not implemented: ${conditions.ComparisonOperator}`,
          );
      }
    }

    case "TCardConditionalSize": {
      if (!conditions.Sizes) {
        throw new Error("Sizes must exist for card conditional size");
      }

      const is = conditions.Sizes.includes(targetBoardCard.card.Size);
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalId": {
      const is = targetBoardCard.card.Id === conditions.Id;
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalTier": {
      if (!conditions.Tiers) {
        throw new Error("Tiers must exist for card conditional tier");
      }

      const is = conditions.Tiers.includes(targetBoardCard.tier);
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalPlayerHero": {
      const targetHeroes = targetBoardCard.card.Heroes;
      const is = targetHeroes.includes(
        gameState.players[targetPlayerIdx].Hero as Hero,
      );
      return conditions.IsSameAsPlayerHero ? is : !is;
    }

    case "TCardConditionalHasEnchantment": {
      const is = targetBoardCard.Enchantment === conditions.Enchantment;
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalHiddenTag":
    case "TCardConditionalTag": {
      const isHiddenTag = conditions.$type === "TCardConditionalHiddenTag";
      const tags = isHiddenTag
        ? targetBoardCard.card.HiddenTags
        : (getCardAttribute(gameState, targetCard, "tags") as
            | string[]
            | undefined) || targetBoardCard.card.Tags;

      if (!conditions.Tags) {
        throw new Error("Tags must exist for card conditional tag");
      }

      const conditionTags = conditions.Tags;

      switch (conditions.Operator) {
        case "Any":
          return tags.some((tag) => {
            // For hidden tags
            if (isHiddenTag) {
              return (conditionTags as unknown as HiddenTag[]).includes(
                tag as HiddenTag,
              );
            }
            // For regular tags
            return (conditionTags as unknown as Tag[]).includes(tag as Tag);
          });
        case "None":
          return !tags.some((tag) => {
            // For hidden tags
            if (isHiddenTag) {
              return (conditionTags as unknown as HiddenTag[]).includes(
                tag as HiddenTag,
              );
            }
            // For regular tags
            return (conditionTags as unknown as Tag[]).includes(tag as Tag);
          });
        default:
          throw new Error(`Operator not implemented: ${conditions.Operator}`);
      }
    }

    case "TCardConditionalOr": {
      if (!conditions.Conditions) {
        throw new Error("Conditions must exist for card conditional or");
      }

      for (const condition of conditions.Conditions) {
        if (
          testCardConditions(
            gameState,
            condition,
            sourceCard,
            targetCard,
            event,
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

      for (const condition of conditions.Conditions) {
        if (
          !testCardConditions(
            gameState,
            condition,
            sourceCard,
            targetCard,
            event,
          )
        ) {
          return false;
        }
      }

      return true;
    }

    case "TCardConditionalTriggerSource": {
      const is =
        sourceCard.playerIdx === targetCard.playerIdx &&
        sourceCard.cardIdx === targetCard.cardIdx;
      return conditions.IsNot ? !is : is;
    }

    default:
      throw new Error(`Unhandled condition type: ${conditions.$type}`);
  }
}

/**
 * Test if player meets condition requirements
 */
export function testPlayerConditions(
  gameState: GameState,
  conditions: Conditions | null,
  sourceCard: CardLocationID,
  targetPlayerID: number,
  event?: GameEvent,
): boolean {
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

      const player = gameState.players[targetPlayerID];
      const value = player[conditions.Attribute as keyof typeof player]; // TODO: should type this properly

      if (!conditions.ComparisonValue) {
        throw new Error(
          "Comparison value must exist for player conditional attribute",
        );
      }

      const comparisonValue = getActionValue(
        gameState,
        conditions.ComparisonValue,
        sourceCard,
        event,
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
            `Not implemented ComparisonOperator: ${conditions.ComparisonOperator}`,
          );
      }
    }

    default:
      throw new Error(`Not implemented Conditions.$type: ${conditions.$type}`);
  }
}
