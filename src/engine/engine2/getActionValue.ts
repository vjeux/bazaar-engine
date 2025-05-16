import { Value, AttributeType } from "@/types/cardTypes";
import { Player } from "../Engine";
import { GameState, BoardCardID, getCardAttribute } from "./engine2";
import { GameEvents } from "./eventHandlers";
import { getTargetCards, getTargetPlayers } from "./targeting";

/**
 * Helper function to get a value from an action's Value property
 * Handles different value types including references to attributes
 */
export function getActionValue(
  gameState: GameState,
  value: Value,
  sourceCardID: BoardCardID,
  targetCardID?: BoardCardID,
  event?: GameEvents[keyof GameEvents],
  metadata?: { changeValue?: number },
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
        sourceCardID,
        {} as GameEvents[keyof GameEvents],
      );
      amount = value.DefaultValue;
      targetCards.forEach((valueTargetCard) => {
        if (!value.AttributeType) {
          throw new Error(
            "Attribute type must exist for action reference value card attribute",
          );
        }
        amount =
          (amount ?? 0) +
          getCardAttribute(
            gameState,
            valueTargetCard,
            value.AttributeType as AttributeType,
          );
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
        sourceCardID,
      );
      targetPlayers.forEach((valueTargetPlayerID) => {
        if (!value.AttributeType) {
          throw new Error(
            "Attribute type must exist for action reference value player attribute",
          );
        }

        amount =
          (amount ?? 0) +
          (gameState.players[valueTargetPlayerID][
            value.AttributeType as keyof {
              [P in keyof Player as Player[P] extends number
                ? P
                : never]: Player[P];
            }
          ] ?? 0);
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
        sourceCardID,
        {} as GameEvents[keyof GameEvents],
      );
      amount = targetCards.length;
      break;
    }
    case "TReferenceValuePlayerAttributeChange": {
      // Use metadata if available, otherwise use default value
      amount = metadata?.changeValue ?? value.DefaultValue;
      break;
    }
    case "TReferenceValueCardTagCount": {
      if (!value.Target) {
        throw new Error(
          "Target must exist for action reference value card tag count",
        );
      }
      const targetCards = getTargetCards(
        gameState,
        value.Target,
        sourceCardID,
        {} as GameEvents[keyof GameEvents],
      );
      const foundTags = new Set<string>();
      targetCards.forEach((targetCard) => {
        const card =
          gameState.players[targetCard.playerIdx].board[targetCard.cardIdx];
        if (card.tags) {
          card.tags.forEach((tag) => foundTags.add(tag));
        }
      });
      amount = foundTags.size;
      break;
    }
    default:
      console.warn(`Unsupported value type: ${value.$type}`);
      return 0;
  }

  // Apply modifiers if present
  if (amount != null && value.Modifier != null) {
    const modifierValue = getActionValue(
      gameState,
      value.Modifier.Value,
      sourceCardID,
      targetCardID,
    );
    if (value.Modifier.ModifyMode === "Multiply") {
      amount *= modifierValue;
    }
  }

  return amount ?? 0;
}
