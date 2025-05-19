import { Ability, TriggerType } from "@/types/cardTypes";
import { CardLocationID, cardLocationIdIsEqual, GameState } from "./engine2";
import {
  CardAttributeChangedEvent,
  CardCrittedEvent,
  CardFiredEvent,
  CardItemUsedEvent,
  CardPerformedBurnEvent,
  CardPerformedDestructionEvent,
  CardPerformedFreezeEvent,
  CardPerformedHasteEvent,
  CardPerformedHealEvent,
  CardPerformedPoisonEvent,
  CardPerformedRegenEvent,
  CardPerformedShieldEvent,
  CardPerformedSlowEvent,
  CardReloadedEvent,
  GameEndedEvent,
  GameEvent,
  GameFightStartedEvent,
  PlayerAttributeChangedEvent,
  PlayerDiedEvent,
  PlayerOverhealedEvent,
} from "./events";
import { getTargetCards, getTargetPlayers } from "./targeting";

/**
 * Helper function to check if the event source is a subject of the triggering card,
 * and if a target is defined, check if the event targets the target.
 */
function checkSubjectAndTargetIfDefined(
  gs: GameState,
  ability: Ability,
  checkIfTriggeringID: CardLocationID,
  eventSourceID: CardLocationID,
  e: GameEvent,
  targetType: "player" | "card" | null,
) {
  if (!ability.Trigger.Subject) {
    console.warn(
      `Ability ${ability.InternalName} has no subject, skipping trigger check`,
    );
    return false;
  }
  // Check subjects include source card
  const subjects = getTargetCards(
    gs,
    ability.Trigger.Subject,
    checkIfTriggeringID,
    e,
  );
  // if no subjects is source card return false
  if (
    !subjects.some((subject) => cardLocationIdIsEqual(subject, eventSourceID))
  ) {
    return false;
  }

  if (ability.Trigger.Target && targetType) {
    if (targetType === "player") {
      // Check if target player is same as ability target
      const targetPlayers = getTargetPlayers(
        gs,
        ability.Trigger.Target,
        checkIfTriggeringID,
        e,
      );

      return targetPlayers.some(
        (playerIdx) => playerIdx === checkIfTriggeringID.playerIdx,
      );
    } else if (targetType === "card") {
      const targetCards = getTargetCards(
        gs,
        ability.Trigger.Target,
        checkIfTriggeringID,
        e,
      );

      return targetCards.some((card) =>
        cardLocationIdIsEqual(card, eventSourceID),
      );
    }
  }
  return true;
}

/**
 * Create a trigger check function for an ability
 */
export function createTriggerCheck(
  ability: Ability,
  locationID: CardLocationID,
): (gs: GameState, e: GameEvent) => boolean {
  const triggerType = ability.Trigger.$type || "";

  // Use the triggerTypeToTriggerCheck record if the trigger type is defined there
  if (triggerType in triggerTypeToTriggerCheck) {
    return triggerTypeToTriggerCheck[triggerType as TriggerType](
      ability,
      locationID,
    );
  }

  throw new Error(`Trigger type ${triggerType} not implemented`);
}

export const triggerTypeToTriggerCheck: Record<
  TriggerType,
  (
    ability: Ability,
    locationID: CardLocationID,
  ) => (gs: GameState, e: GameEvent) => boolean
> = {
  [TriggerType.TTriggerOnCardFired]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardFiredEvent) {
        return cardLocationIdIsEqual(e.sourceCardID, locationID);
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnFightStarted]: (_ability, _locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      return e instanceof GameFightStartedEvent;
    };
  },
  [TriggerType.TTriggerOnItemUsed]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardItemUsedEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          null,
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardCritted]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardCrittedEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          null,
        );
      }
      return false;
    };
  },
  // TODO implement  "PreviousValue": null, "CurrentValue": null, "Source": null, see Ramrod's ability 1
  [TriggerType.TTriggerOnCardAttributeChanged]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardAttributeChangedEvent) {
        if (!ability.Trigger.Subject) {
          console.warn(
            `Ability ${ability.InternalName} has no subject, skipping trigger check`,
          );
          return false;
        }
        // Check subjects include source card
        const subjects = getTargetCards(
          gs,
          ability.Trigger.Subject,
          locationID,
          e,
        );
        return subjects.some((subject) => {
          if (cardLocationIdIsEqual(subject, e.modifiedLocationID)) {
            if (
              e.attribute === ability.Trigger.AttributeChanged &&
              ((ability.Trigger.ChangeType === "Gain" &&
                e.newValue > e.oldValue) ||
                (ability.Trigger.ChangeType === "Loss" &&
                  e.newValue < e.oldValue))
            ) {
              return true;
            }
          }
          return false;
        });
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnFightEnded]: (_ability, _locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      return e instanceof GameEndedEvent;
    };
  },
  [TriggerType.TTriggerOnCardPerformedHeal]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedHealEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "player",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedBurn]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedBurnEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "player",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedDestruction]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedDestructionEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "card",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedShield]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedShieldEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "player",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedPoison]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedPoisonEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "player",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnPlayerAttributeChanged]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof PlayerAttributeChangedEvent) {
        if (!ability.Trigger.Subject) {
          console.warn(
            `Ability ${ability.InternalName} has no subject, skipping trigger check`,
          );
          return false;
        }
        // Check if subjects include source player
        const subjects = getTargetPlayers(
          gs,
          ability.Trigger.Subject,
          locationID,
        );
        // TODO: implement Trigger.Source
        // Check if attribute that changed was the one specified in the trigger and change type is the same as the trigger
        if (
          e.attribute === ability.Trigger.AttributeChanged &&
          ((ability.Trigger.ChangeType === "Gain" && e.newValue > e.oldValue) ||
            (ability.Trigger.ChangeType === "Loss" && e.newValue < e.oldValue))
        ) {
          return subjects.some((subject) => subject === e.playerIdx);
        }
        return false;
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnPlayerDied]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof PlayerDiedEvent) {
        if (!ability.Trigger.Subject) {
          console.warn(
            `Ability ${ability.InternalName} has no subject, skipping trigger check`,
          );
          return false;
        }
        // Check if subjects include source player
        const subjects = getTargetPlayers(
          gs,
          ability.Trigger.Subject,
          locationID,
        );
        return subjects.some((subject) => subject === e.playerIdx);
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedOverHeal]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof PlayerOverhealedEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "player",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedRegen]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedRegenEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "player",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardReloaded]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardReloadedEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "card",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedReload]: (ability, locationID) => {
    // Using the same logic as TTriggerOnCardReloaded
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardReloadedEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "card",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedHaste]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedHasteEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "card",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedSlow]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedSlowEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "card",
        );
      }
      return false;
    };
  },
  [TriggerType.TTriggerOnCardPerformedFreeze]: (ability, locationID) => {
    return (gs: GameState, e: GameEvent): boolean => {
      if (e instanceof CardPerformedFreezeEvent) {
        return checkSubjectAndTargetIfDefined(
          gs,
          ability,
          locationID,
          e.sourceCardID,
          e,
          "card",
        );
      }
      return false;
    };
  },
  // Shop events use NotImplementedEvent in the triggerToEventMap, implement basic check
  [TriggerType.TTriggerOnCardPurchased]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
  [TriggerType.TTriggerOnCardSelected]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
  [TriggerType.TTriggerOnCardSold]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
  [TriggerType.TTriggerOnCardUpgraded]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
  // Game progression events - using simple type check
  [TriggerType.TTriggerOnDayStarted]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
  [TriggerType.TTriggerOnHourStarted]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
  [TriggerType.TTriggerOnEncounterSelected]: (_ability, _locationID) => {
    return (_gs: GameState, _e: GameEvent): boolean => {
      return false;
    };
  },
};
