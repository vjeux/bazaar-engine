import { GameState, BoardCardID } from "./engine2";
import {
  Source,
  Target,
  Subject,
  Conditions,
  AttributeType,
} from "../../types/cardTypes";
import prand from "pure-rand";

export type TargetConfig = Source | Target | Subject;

/**
 * Get target cards based on targeting configuration
 */
export function getTargetCards(
  gameState: GameState,
  targetConfig: TargetConfig,
  sourceCard: BoardCardID,
): BoardCardID[] {
  const results: BoardCardID[] = [];

  switch (targetConfig.$type) {
    case "TTargetCardSelf":
      results.push(sourceCard);
      break;

    case "TTargetCardTriggerSource":
      results.push(triggerCard);
      break;

    case "TTargetCardPositional": {
      const originCard =
        targetConfig.Origin === "TriggerSource" ? triggerCard : sourceCard;
      const { playerIdx: playerID, cardIdx: cardID } = originCard;

      switch (targetConfig.TargetMode) {
        case "AllRightCards": {
          const lengthCardItems =
            gameState.players[playerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;

          for (
            let i = cardID + (targetConfig.IncludeOrigin ? 0 : 1);
            i < lengthCardItems;
            ++i
          ) {
            results.push({ playerIdx: playerID, cardIdx: i });
          }
          break;
        }

        case "AllLeftCards": {
          for (
            let i = 0;
            i < cardID - (targetConfig.IncludeOrigin ? 0 : 1);
            ++i
          ) {
            results.push({ playerIdx: playerID, cardIdx: i });
          }
          break;
        }

        case "Neighbor": {
          if (targetConfig.IncludeOrigin) {
            results.push(originCard);
          }

          if (cardID !== 0) {
            results.push({ playerIdx: playerID, cardIdx: cardID - 1 });
          }

          const lengthCardItems =
            gameState.players[playerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;

          if (cardID < lengthCardItems - 1) {
            results.push({ playerIdx: playerID, cardIdx: cardID + 1 });
          }
          break;
        }

        case "RightCard": {
          if (targetConfig.IncludeOrigin) {
            results.push(originCard);
          }

          const lengthCardItems =
            gameState.players[playerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;

          if (cardID < lengthCardItems - 1) {
            results.push({ playerIdx: playerID, cardIdx: cardID + 1 });
          }
          break;
        }

        case "LeftCard": {
          if (targetConfig.IncludeOrigin) {
            results.push(originCard);
          }

          if (cardID !== 0) {
            results.push({ playerIdx: playerID, cardIdx: cardID - 1 });
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
        case "SelfHandAndStash":
        case "SelfHand":
        case "SelfBoard": {
          const lengthCardItems =
            gameState.players[sourceCard.playerIdx].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;

          for (let i = 0; i < lengthCardItems; ++i) {
            if (
              i !== sourceCard.cardIdx ||
              (i === sourceCard.cardIdx && !targetConfig.ExcludeSelf)
            ) {
              results.push({ playerIdx: sourceCard.playerIdx, cardIdx: i });
            }
          }
          break;
        }

        case "OpponentHand":
        case "OpponentBoard": {
          const opponentPlayerID = (sourceCard.playerIdx + 1) % 2;
          const lengthCardItems =
            gameState.players[opponentPlayerID].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;

          for (let i = 0; i < lengthCardItems; ++i) {
            results.push({ playerIdx: opponentPlayerID, cardIdx: i });
          }
          break;
        }

        case "AllHands": {
          gameState.players.forEach((player, playerID) => {
            const lengthCardItems =
              player.board.findLastIndex(
                (boardCard) => boardCard.card.$type === "TCardItem",
              ) + 1;

            for (let i = 0; i < lengthCardItems; ++i) {
              if (
                playerID !== sourceCard.playerIdx ||
                i !== sourceCard.cardIdx ||
                (i === sourceCard.cardIdx && !targetConfig.ExcludeSelf)
              ) {
                results.push({ playerIdx: playerID, cardIdx: i });
              }
            }
          });
          break;
        }

        case "SelfNeighbors": {
          if (sourceCard.cardIdx !== 0) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              cardIdx: sourceCard.cardIdx - 1,
            });
          }

          const lengthCardItems =
            gameState.players[sourceCard.playerIdx].board.findLastIndex(
              (boardCard) => boardCard.card.$type === "TCardItem",
            ) + 1;

          if (sourceCard.cardIdx < lengthCardItems - 1) {
            results.push({
              playerIdx: sourceCard.playerIdx,
              cardIdx: sourceCard.cardIdx + 1,
            });
          }
          break;
        }

        default:
          throw new Error(
            `Not implemented Target.TargetSection: ${targetConfig.TargetSection}`,
          );
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
      const lengthCardItems =
        gameState.players[sourceCard.playerIdx].board.findLastIndex(
          (boardCard) => boardCard.card.$type === "TCardItem",
        ) + 1;

      for (let i = 0; i < lengthCardItems; ++i) {
        if (
          i !== sourceCard.cardIdx ||
          (i === sourceCard.cardIdx && !targetConfig.ExcludeSelf)
        ) {
          results.push({ playerIdx: sourceCard.playerIdx, cardIdx: i });
        }
      }
      break;
    }

    default:
      throw new Error(`Not implemented Target.$type: ${targetConfig.$type}`);
  }

  // Filter by conditions
  const filteredResults = results.filter((cardID) => {
    const { playerIdx: playerID, cardIdx: boardCardID } = cardID;
    return (
      !gameState.players[playerID].board[boardCardID].isDisabled &&
      testCardConditions(
        gameState,
        targetConfig.Conditions,
        triggerCard,
        cardID,
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
    let extremeCard: BoardCardID | null = null;

    filteredResults.forEach((cardID) => {
      const { playerIdx: playerID, cardIdx: boardCardID } = cardID;
      if (!targetConfig.Conditions?.AttributeType) {
        throw new Error(
          "Attribute type must exist for card conditional attribute highest/lowest",
        );
      }

      const value = gameState.players[playerID].board[boardCardID][
        targetConfig.Conditions.AttributeType
      ] as number | undefined;

      if (
        !gameState.players[playerID].board[boardCardID].isDisabled &&
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
  sourceCard: BoardCardID,
): number[] {
  let results: number[] = [];

  switch (targetConfig.$type) {
    case "TTargetPlayerRelative":
      switch (targetConfig.TargetMode) {
        case "Opponent":
          results = [(sourceCard.playerIdx + 1) % 2];
          break;
        case "Self":
          results = [sourceCard.playerIdx];
          break;
        default:
          throw new Error(
            `Not implemented TargetMode: ${targetConfig.TargetMode}`,
          );
      }
      break;

    case "TTargetCardSection":
      switch (targetConfig.TargetSection) {
        case "SelfBoard":
          results = [sourceCard.playerIdx];
          break;
        default:
          results = [(sourceCard.playerIdx + 1) % 2];
          break;
      }
      break;

    case "TTargetPlayer":
      if (targetConfig.TargetMode === "Both") {
        results = [sourceCard.playerIdx, (sourceCard.playerIdx + 1) % 2];
      } else {
        throw new Error(
          `Not implemented TargetMode: ${targetConfig.TargetMode}`,
        );
      }
      break;

    default:
      throw new Error(`Unhandled target type: ${targetConfig.$type}`);
  }

  // Filter by conditions
  if (targetConfig.Conditions) {
    results = results.filter((playerID) => {
      return testPlayerConditions(
        gameState,
        targetConfig.Conditions,
        triggerCard,
        playerID,
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
  triggerCard: BoardCardID,
  targetCard: BoardCardID,
): boolean {
  if (conditions == null) {
    return true;
  }

  const { playerIdx: playerID, cardIdx: cardID } = targetCard;
  const card = gameState.players[playerID].board[cardID];

  switch (conditions.$type) {
    case "TCardConditionalAttribute": {
      if (!conditions.Attribute) {
        throw new Error("Attribute must exist for card conditional attribute");
      }

      const value = card[conditions.Attribute as keyof typeof card];

      if (!conditions.ComparisonValue) {
        throw new Error(
          "Comparison value must exist for card conditional attribute",
        );
      }

      // Note: getActionValue would need to be implemented
      // const comparisonValue = getActionValue(...);
      const comparisonValue = 0; // Placeholder

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
            `ComparisonOperator not implemented: ${conditions.ComparisonOperator}`,
          );
      }
    }

    case "TCardConditionalSize": {
      if (!conditions.Sizes) {
        throw new Error("Sizes must exist for card conditional size");
      }

      const is = conditions.Sizes.includes(card.card.Size);
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalId": {
      const is = card.card.Id === conditions.Id;
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalTier": {
      if (!conditions.Tiers) {
        throw new Error("Tiers must exist for card conditional tier");
      }

      const is = conditions.Tiers.includes(card.tier);
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalPlayerHero": {
      const targetHeroes = card.card.Heroes;
      const is = targetHeroes.includes(gameState.players[playerID].Hero);
      return conditions.IsSameAsPlayerHero ? is : !is;
    }

    case "TCardConditionalHasEnchantment": {
      const is = card.Enchantment === conditions.Enchantment;
      return conditions.IsNot ? !is : is;
    }

    case "TCardConditionalHiddenTag":
    case "TCardConditionalTag": {
      const tags =
        card.card[
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
            tags.filter((tag) => conditions.Tags?.includes(tag)).length > 0
          );
        case "None":
          return (
            tags.filter((tag) => conditions.Tags?.includes(tag)).length === 0
          );
        default:
          throw new Error(`Operator not implemented: ${conditions.Operator}`);
      }
    }

    case "TCardConditionalOr": {
      if (!conditions.Conditions) {
        throw new Error("Conditions must exist for card conditional or");
      }

      for (const condition of conditions.Conditions) {
        if (testCardConditions(gameState, condition, triggerCard, targetCard)) {
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
          !testCardConditions(gameState, condition, triggerCard, targetCard)
        ) {
          return false;
        }
      }

      return true;
    }

    case "TCardConditionalTriggerSource": {
      const is =
        triggerCard.playerIdx === targetCard.playerIdx &&
        triggerCard.cardIdx === targetCard.cardIdx;
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
  triggerCard: BoardCardID,
  targetPlayerID: number,
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

      const value =
        gameState.players[targetPlayerID][conditions.Attribute as keyof Player];

      if (!conditions.ComparisonValue) {
        throw new Error(
          "Comparison value must exist for player conditional attribute",
        );
      }

      // Note: getActionValue would need to be implemented
      // const comparisonValue = getActionValue(...);
      const comparisonValue = 0; // Placeholder

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
