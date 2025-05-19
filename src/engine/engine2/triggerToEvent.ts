import { TriggerType } from "@/types/cardTypes";
import { GameEventConstructor } from "./eventBus";
import {
  GameEvent,
  NotImplementedEvent,
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
  GameFightStartedEvent,
  PlayerAttributeChangedEvent,
  PlayerDiedEvent,
  PlayerOverhealedEvent,
} from "./events";

// Using a function to create the map ensures that all imports are initialized
// before accessing them, solving the circular dependency issue
function createTriggerToEventMap(): Record<
  TriggerType,
  GameEventConstructor<GameEvent>
> {
  return {
    // Card events
    TTriggerOnCardFired: CardFiredEvent,
    TTriggerOnCardAttributeChanged: CardAttributeChangedEvent,
    TTriggerOnItemUsed: CardItemUsedEvent,

    // Card actions
    TTriggerOnCardPerformedBurn: CardPerformedBurnEvent,
    TTriggerOnCardPerformedPoison: CardPerformedPoisonEvent,
    TTriggerOnCardPerformedHeal: CardPerformedHealEvent,
    TTriggerOnCardPerformedOverHeal: PlayerOverhealedEvent,
    TTriggerOnCardPerformedShield: CardPerformedShieldEvent,
    TTriggerOnCardReloaded: CardReloadedEvent,
    TTriggerOnCardPerformedReload: CardReloadedEvent, // TODO: assume these two reload events are the same for now
    TTriggerOnCardPerformedRegen: CardPerformedRegenEvent,

    // Player events
    TTriggerOnPlayerDied: PlayerDiedEvent,
    TTriggerOnPlayerAttributeChanged: PlayerAttributeChangedEvent,

    // Game events
    TTriggerOnFightStarted: GameFightStartedEvent,
    TTriggerOnFightEnded: GameEndedEvent,

    // Game shop events - using NotImplementedEvent as placeholder
    TTriggerOnCardPurchased: NotImplementedEvent,
    TTriggerOnCardSelected: NotImplementedEvent,
    TTriggerOnCardSold: NotImplementedEvent,
    TTriggerOnCardUpgraded: NotImplementedEvent,

    // Game progression events - using NotImplementedEvent as placeholder
    TTriggerOnDayStarted: NotImplementedEvent,
    TTriggerOnHourStarted: NotImplementedEvent,
    TTriggerOnEncounterSelected: NotImplementedEvent,

    // Card effect events - using NotImplementedEvent as placeholder
    TTriggerOnCardCritted: CardCrittedEvent,
    TTriggerOnCardPerformedDestruction: CardPerformedDestructionEvent,
    TTriggerOnCardPerformedFreeze: CardPerformedFreezeEvent,
    TTriggerOnCardPerformedHaste: CardPerformedHasteEvent,
    TTriggerOnCardPerformedSlow: CardPerformedSlowEvent,
  };
}

// Lazy initialize the map when it's first needed
let triggerToEventMapInstance: Record<
  TriggerType,
  GameEventConstructor<GameEvent>
> | null = null;

export function getTriggerToEventMap(): Record<
  TriggerType,
  GameEventConstructor<GameEvent>
> {
  if (!triggerToEventMapInstance) {
    triggerToEventMapInstance = createTriggerToEventMap();
  }
  return triggerToEventMapInstance;
}

export function triggerToEvent(trigger: {
  $type: TriggerType;
}): GameEventConstructor<GameEvent> {
  const triggerType = trigger?.$type || "";
  const eventMap = getTriggerToEventMap();
  const eventClass = eventMap[triggerType];

  if (!eventClass) {
    console.warn(`Unhandled trigger type: ${triggerType}`);
    throw new Error(`Unhandled trigger type: ${triggerType}`);
  }

  return eventClass;
}
