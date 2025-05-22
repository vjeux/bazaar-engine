import { AttributeType } from "@/types/cardTypes";
import {
  GameState,
  CardLocationID,
  Player,
  BoardCard,
  PlayerAttributeSnapshot,
} from "./engine2";
import { getActionValue } from "./getActionValue";
import { getTargetCards, getTargetPlayers } from "./targeting";
import { checkPrerequisite } from "./prereq";

/**
 * Recursion guards to prevent infinite recursion when checking attributes
 */
const attributeRecursionGuard = new Map<string, Set<string>>();

function getRecursionKey(cardID: CardLocationID): string {
  return `${cardID.playerIdx}-${cardID.cardIdx}-${cardID.location}`;
}

/**
 * Helper to get a card's effective attribute value respecting the draft/snapshot system
 */
function getCardEffectiveValue(
  gameState: GameState,
  card: BoardCard,
  attribute: AttributeType | "tags",
): number | string[] | undefined {
  // For tags, handle separately
  if (attribute === "tags") {
    // Check draft first
    if (card.attributeDraft?.tags) {
      return [...card.attributeDraft.tags];
    }

    // Check snapshot next
    if (gameState.attributeSnapshots?.cards.has(card.uuid)) {
      const snapshot = gameState.attributeSnapshots.cards.get(card.uuid);
      if (snapshot?.tags) {
        return [...snapshot.tags];
      }
    }

    // Fallback to current value
    return [...(card.tags || [])];
  }

  // For other attributes
  // Check draft first
  if (card.attributeDraft && attribute in card.attributeDraft) {
    return card.attributeDraft[attribute];
  }

  // Check snapshot next
  if (gameState.attributeSnapshots?.cards.has(card.uuid)) {
    const snapshot = gameState.attributeSnapshots.cards.get(card.uuid);
    if (snapshot && attribute in snapshot) {
      return snapshot[attribute];
    }
  }

  // Fallback to current value
  return card[attribute];
}

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
  const cardKey = getRecursionKey(cardID);
  const guardKey = `${cardKey}-${attribute}`;

  // Check if we're already computing this attribute for this card
  if (!attributeRecursionGuard.has(guardKey)) {
    attributeRecursionGuard.set(guardKey, new Set());
  }

  // If we're in a recursive call for this same attribute, return the base value without aura modifications
  if (attributeRecursionGuard.get(guardKey)?.has("computing")) {
    const card = gameState.players[cardID.playerIdx].board[cardID.cardIdx];
    return getCardEffectiveValue(gameState, card, attribute);
  }

  // Mark that we're computing this attribute
  attributeRecursionGuard.get(guardKey)?.add("computing");

  try {
    const card = gameState.players[cardID.playerIdx].board[cardID.cardIdx];

    // Special handling for tags
    if (attribute === "tags") {
      const baseTags = getCardEffectiveValue(
        gameState,
        card,
        attribute,
      ) as string[];
      const tags: Set<string> = new Set(baseTags);

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
                const sourceTags = getCardAttribute(
                  gameState,
                  sourceCard,
                  "tags",
                );
                sourceTags.forEach((tag) => tags.add(tag));
              });
            }
          });
        });
      });

      return Array.from(tags);
    }

    // Handle numeric attributes with aura modifications
    let value = getCardEffectiveValue(gameState, card, attribute) as
      | number
      | undefined;

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

          // Check if the aura modifies the attribute we are getting
          if (aura.Action.AttributeType !== attribute) {
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
            // Check that aura prerequisites are met
            if (aura.Prerequisites) {
              const isMet = aura.Prerequisites.every((prereq) =>
                checkPrerequisite(
                  prereq,
                  {
                    playerIdx: playerIdx,
                    cardIdx: cardIdx,
                    location: "board",
                  },
                  gameState,
                ),
              );
              if (!isMet) {
                return;
              }
            }

            // Get the value to apply from the aura
            const actionValue = getActionValue(
              gameState,
              aura.Action.Value,
              auraSourceCardID,
              undefined,
            );

            if (actionValue === undefined) {
              console.error(
                `Aura action value is undefined for card ${auraSourceCardID.playerIdx}-${auraSourceCardID.cardIdx}`,
              );
            }

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
  } finally {
    // Clean up the recursion guard
    attributeRecursionGuard.get(guardKey)?.delete("computing");
  }
}

/**
 * Helper to get a player's effective attribute value respecting the draft/snapshot system
 */
function getPlayerEffectiveValue<K extends keyof Player>(
  gameState: GameState,
  player: Player,
  playerIdx: number,
  attribute: K,
): Player[K] {
  // Check draft first
  if (player.attributeDraft && attribute in player.attributeDraft) {
    // Safe to cast since we've checked that the key exists
    const draftValue =
      player.attributeDraft[attribute as keyof PlayerAttributeSnapshot];
    if (draftValue !== undefined) {
      return draftValue as Player[K];
    }
  }

  // Check snapshot next
  if (gameState.attributeSnapshots?.players?.[playerIdx]) {
    const snapshot = gameState.attributeSnapshots.players[playerIdx];
    if (snapshot && attribute in snapshot) {
      // Safe to cast since we've checked that the key exists
      const snapshotValue =
        snapshot[attribute as keyof PlayerAttributeSnapshot];
      if (snapshotValue !== undefined) {
        return snapshotValue as Player[K];
      }
    }
  }

  // Fallback to current value
  return player[attribute];
}

/**
 * Get player attribute value with all aura modifications applied
 */

export function getPlayerAttribute<K extends keyof Player>(
  gameState: GameState,
  playerID: number,
  attribute: K,
): Player[K] {
  const guardKey = `player-${playerID}-${String(attribute)}`;

  // Check if we're already computing this attribute for this player
  if (!attributeRecursionGuard.has(guardKey)) {
    attributeRecursionGuard.set(guardKey, new Set());
  }

  // If we're in a recursive call for this same attribute, return the base value without aura modifications
  if (attributeRecursionGuard.get(guardKey)?.has("computing")) {
    return getPlayerEffectiveValue(
      gameState,
      gameState.players[playerID],
      playerID,
      attribute,
    );
  }

  // Mark that we're computing this attribute
  attributeRecursionGuard.get(guardKey)?.add("computing");

  try {
    const value = getPlayerEffectiveValue(
      gameState,
      gameState.players[playerID],
      playerID,
      attribute,
    );

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
              // Check that aura prerequisites are met
              if (aura.Prerequisites) {
                const isMet = aura.Prerequisites.every((prereq) =>
                  checkPrerequisite(
                    prereq,
                    {
                      playerIdx: playerIdx,
                      cardIdx: cardIdx,
                      location: "board",
                    },
                    gameState,
                  ),
                );
                if (!isMet) {
                  return;
                }
              }

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
  } finally {
    // Clean up the recursion guard
    attributeRecursionGuard.get(guardKey)?.delete("computing");
  }
}
