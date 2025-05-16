import {
  Ability,
  AbilityPrerequisite,
  Comparison,
} from "../../types/cardTypes";
import { BoardCardID, GameState, getCardAttribute } from "./engine2";
import { GameEvent } from "./eventHandlers";
import { getTargetCards, getTargetPlayers } from "./targeting";

export function compareUsingComparator(
  value1: number,
  value2: number,
  comparator: Comparison,
): boolean {
  switch (comparator) {
    case "Equal":
      return value1 === value2;
    case "NotEqual":
      return value1 !== value2;
    case "GreaterThan":
      return value1 > value2;
    case "GreaterThanOrEqual":
      return value1 >= value2;
    case "LessThan":
      return value1 < value2;
    case "LessThanOrEqual":
      return value1 <= value2;
    default:
      throw new Error(`Unknown comparator: ${comparator}`);
  }
}

export function createPrerequisitesCheck(
  ability: Ability,
  boardCardID: BoardCardID,
): (gs: GameState, event: GameEvent) => boolean {
  return (gs: GameState, event: GameEvent) => {
    if (!ability.Prerequisites) {
      return true;
    }
    if (ability.Prerequisites.length === 0) {
      return true;
    }
    return ability.Prerequisites.every((prereq) => {
      return checkPrerequisite(prereq, boardCardID, gs, event);
    });
  };
}

function checkPrerequisite(
  prereq: AbilityPrerequisite,
  boardCardID: BoardCardID,
  gs: GameState,
  event: GameEvent,
): boolean {
  switch (prereq.$type) {
    case "TPrerequisiteCardCount":
      if (prereq.Subject === undefined) {
        throw new Error("Subject must exist for card count prerequisite");
      }
      const cardCount = getTargetCards(
        gs,
        prereq.Subject,
        boardCardID,
        event,
      ).length;
      const comparisonValue = prereq.Amount;
      if (comparisonValue === undefined) {
        throw new Error(
          "Comparison value must exist for card count prerequisite",
        );
      }
      if (prereq.Comparison === undefined) {
        throw new Error("Comparison must exist for card count prerequisite");
      }
      return compareUsingComparator(
        cardCount,
        comparisonValue,
        prereq.Comparison,
      );
    case "TPrerequisitePlayer": {
      if (!prereq.Subject) {
        throw new Error("Subject must exist for player prerequisite");
      }
      const players = getTargetPlayers(gs, prereq.Subject, boardCardID, event);
      return players.length > 0;
    }
    case "TPrerequisiteCardAttributeComparator": {
      // Get subject card
      if (!prereq.Subject) {
        throw new Error(
          "Subject and SubjectOther must exist for card attribute comparator prerequisite",
        );
      }
      if (!prereq.Attribute || !prereq.AttributeOther) {
        throw new Error(
          "Attribute and AttributeOther must exist for card attribute comparator prerequisite",
        );
      }
      const subjectCard = getTargetCards(
        gs,
        prereq.Subject,
        boardCardID,
        event,
      )[0];

      let subjectOtherCard: BoardCardID;

      // If no other subject is defined, compare against self
      if (prereq.SubjectOther) {
        subjectOtherCard = getTargetCards(
          gs,
          prereq.SubjectOther,
          boardCardID,
          event,
        )[0];
      } else {
        subjectOtherCard = subjectCard;
      }

      // Get attribute value
      const attributeValue = getCardAttribute(
        gs,
        subjectCard,
        prereq.Attribute,
      );

      const attributeValueOther = getCardAttribute(
        gs,
        subjectOtherCard,
        prereq.AttributeOther,
      );

      if (attributeValue === undefined || attributeValueOther === undefined) {
        throw new Error(
          "Attribute value must exist for card attribute comparator prerequisite",
        );
      }
      if (!prereq.Comparison) {
        throw new Error(
          "Comparison must exist for card attribute comparator prerequisite",
        );
      }

      return compareUsingComparator(
        attributeValue,
        attributeValueOther,
        prereq.Comparison,
      );
    }
    // Rest of prerequisites are only required to decide which choices show during days, so we don't need to handle them.
    default:
      throw new Error(`Unknown prerequisite: ${prereq.$type}`);
  }
}
