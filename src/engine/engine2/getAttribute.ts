import { AttributeType } from "@/types/cardTypes";
import { GameState, CardLocationID, Player } from "./engine2";
import { getActionValue } from "./getActionValue";
import { getTargetCards, getTargetPlayers } from "./targeting";

/**
 * Get attribute value from a card with all aura modifications applied
 */

export function getCardAttribute(
  gameState: GameState,
  cardID: CardLocationID,
  attribute: "tags",
): string[];
export function getCardAttribute(
  gameState: GameState,
  cardID: CardLocationID,
  attribute: AttributeType,
): number | undefined;
export function getCardAttribute(
  gameState: GameState,
  cardID: CardLocationID,
  attribute: AttributeType | "tags",
): number | string[] | undefined {
  const card = gameState.players[cardID.playerIdx].board[cardID.cardIdx];

  // Special handling for tags
  if (attribute === "tags") {
    const tags: Set<string> = new Set(card.tags || []);

    // Apply auras that add tags
    gameState.players.forEach((player, playerIdx) => {
      player.board.forEach((boardCard, cardIdx) => {
        // Skip if card has no auras
        if (!boardCard.Auras || Object.keys(boardCard.Auras).length === 0) {
          return;
        }

        // Check each aura on the card
        Object.values(boardCard.Auras).forEach((aura) => {
          // Skip if not a tag-adding aura
          if (aura.Action.$type !== "TAuraActionCardAddTagsBySource") {
            return;
          }

          const auraSourceCardID: CardLocationID = {
            playerIdx,
            cardIdx,
            location: "board",
          };

          // Check if the aura targets our card
          const targetCards = getTargetCards(
            gameState,
            aura.Action.Target,
            auraSourceCardID,
            undefined,
          );

          // Check if our card is among the targets
          const isTargeted = targetCards.some(
            (target: CardLocationID) =>
              target.playerIdx === cardID.playerIdx &&
              target.cardIdx === cardID.cardIdx,
          );

          if (isTargeted) {
            // Get tags from source cards
            const sourceCards = getTargetCards(
              gameState,
              aura.Action.Source,
              auraSourceCardID,
              undefined,
            );

            // Add tags from each source card
            sourceCards.forEach((sourceCard) => {
              const sourceTags =
                gameState.players[sourceCard.playerIdx].board[
                  sourceCard.cardIdx
                ].tags || [];
              sourceTags.forEach((tag) => tags.add(tag));
            });
          }
        });
      });
    });

    return Array.from(tags);
  }

  // Handle numeric attributes with aura modifications
  let value = card[attribute];

  // Apply aura effects
  gameState.players.forEach((player, playerIdx) => {
    player.board.forEach((boardCard, cardIdx) => {
      // Skip if card has no auras
      if (!boardCard.Auras || Object.keys(boardCard.Auras).length === 0) {
        return;
      }

      // Check each aura on the card
      Object.values(boardCard.Auras).forEach((aura) => {
        // Skip if not attribute modification aura
        if (
          aura.Action.$type !== "TAuraActionCardModifyAttribute" ||
          aura.Action.AttributeType !== attribute
        ) {
          return;
        }

        // Check if the aura targets our card
        const auraSourceCardID: CardLocationID = {
          playerIdx,
          cardIdx,
          location: "board",
        };
        const targetCards = getTargetCards(
          gameState,
          aura.Action.Target,
          auraSourceCardID,
          undefined,
        );

        // Check if our card is among the targets
        const isTargeted = targetCards.some(
          (target: CardLocationID) =>
            target.playerIdx === cardID.playerIdx &&
            target.cardIdx === cardID.cardIdx,
        );

        if (isTargeted) {
          // Get the value to apply from the aura
          const actionValue = getActionValue(
            gameState,
            aura.Action.Value,
            auraSourceCardID,
            undefined,
          );

          // If targeted by an aura, assume the value is 0
          if (value === undefined) {
            console.warn(
              `Attribute ${attribute} was undefined, but target ${cardID.playerIdx}-${cardID.cardIdx} was targeted by an aura, so it was set to 0`,
            );
            value = 0;
          }

          // Apply the modification based on operation type
          switch (aura.Action.Operation) {
            case "Add":
              value += actionValue;
              break;
            case "Multiply":
              value *= actionValue;
              break;
            case "Subtract":
              value -= actionValue;
              break;
          }
        }
      });
    });
  });

  return value;
}
/**
 * Get player attribute value with all aura modifications applied
 */

export function getPlayerAttribute<K extends keyof Player>(
  gameState: GameState,
  playerID: number,
  attribute: K,
): Player[K] {
  const value = gameState.players[playerID][attribute];

  if (typeof value === "number") {
    let numericValue = value as number;

    // Apply aura effects
    gameState.players.forEach((player, playerIdx) => {
      player.board.forEach((boardCard, cardIdx) => {
        // Skip if card has no auras
        if (!boardCard.Auras || Object.keys(boardCard.Auras).length === 0) {
          return;
        }

        // Check each aura on the card
        Object.values(boardCard.Auras).forEach((aura) => {
          // Skip if not player attribute modification aura
          if (
            aura.Action.$type !== "TAuraActionPlayerModifyAttribute" ||
            aura.Action.AttributeType !== attribute
          ) {
            return;
          }

          const auraSourceCardID: CardLocationID = {
            playerIdx,
            cardIdx,
            location: "board",
          };

          // Get target players for this aura
          const targetPlayers = getTargetPlayers(
            gameState,
            aura.Action.Target,
            auraSourceCardID,
            undefined,
          );

          // Check if our player is among the targets
          if (targetPlayers.includes(playerID)) {
            // Get the value to apply from the aura
            const actionValue = getActionValue(
              gameState,
              aura.Action.Value,
              auraSourceCardID,
              undefined,
            );

            // Apply the modification based on operation type
            switch (aura.Action.Operation) {
              case "Add":
                numericValue += actionValue;
                break;
              case "Multiply":
                numericValue *= actionValue;
                break;
              case "Subtract":
                numericValue -= actionValue;
                break;
            }
          }
        });
      });
    });

    return numericValue as unknown as Player[K];
  }

  return value;
}
