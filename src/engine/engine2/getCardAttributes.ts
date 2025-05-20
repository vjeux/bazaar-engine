import { AttributeType } from "@/types/cardTypes";
import { GameState, CardLocationID } from "./engine2";
import { getCardAttribute } from "./getAttribute";

/**
 * Type for all card attributes including tags
 */
export type CardAttributes = {
  [key in AttributeType]?: number;
} & {
  tags: string[];
};

/**
 * Gets all relevant attributes for a card, including any aura modifications
 *
 * @param gameState The current game state
 * @param cardID The location ID of the card
 * @param attributesToInclude Optional list of specific attributes to include (gets all if not specified)
 * @returns An object containing all the card's attributes
 */
export function getCardAttributes(
  gameState: GameState,
  cardID: CardLocationID,
  attributesToInclude?: (AttributeType | "tags")[],
): CardAttributes {
  const result: CardAttributes = { tags: [] };

  // Get the list of attributes to process
  const attributes =
    attributesToInclude ||
    (["tags", ...Object.values(AttributeType)] as (AttributeType | "tags")[]);

  // Process each attribute
  attributes.forEach((attribute) => {
    if (attribute === "tags") {
      result.tags = getCardAttribute(gameState, cardID, "tags");
    } else {
      const value = getCardAttribute(gameState, cardID, attribute);
      if (value !== undefined) {
        result[attribute] = value;
      }
    }
  });

  return result;
}
