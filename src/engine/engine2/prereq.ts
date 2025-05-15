import {
  Ability,
  AbilityPrerequisite,
  Comparison,
} from "../../types/cardTypes";
import { BoardCardID, GameState } from "./engine2";
import { getTargetCards, getTargetPlayers } from "./targeting";

export function compareUsingComparator(
  value1: number,
  value2: number,
  comparator: Comparison,
): boolean {
  switch (comparator) {
    case "Equal":
      return value1 === value2;
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
): (gs: GameState) => boolean {
  return (gs: GameState) => {
    if (!ability.Prerequisites) {
      return true;
    }
    if (ability.Prerequisites.length === 0) {
      return true;
    }
    return ability.Prerequisites.every((prereq) => {
      return checkPrerequisite(prereq, boardCardID, gs);
    });
  };
}

function checkPrerequisite(
  prereq: AbilityPrerequisite,
  boardCardID: BoardCardID,
  gs: GameState,
): boolean {
  switch (prereq.$type) {
    case "TPrerequisiteCardCount":
      if (prereq.Subject === undefined) {
        throw new Error("Subject must exist for card count prerequisite");
      }
      const cardCount = getTargetCards(gs, prereq.Subject, boardCardID).length;
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
      const players = getTargetPlayers(gs, prereq.Subject, boardCardID);
      return players.length > 0;
    }
    // Rest of prerequisites are only required to decide which choices show during days, so we don't need to handle them.
    default:
      throw new Error(`Unknown prerequisite: ${prereq.$type}`);
  }
}
