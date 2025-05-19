/**
 * Base Game Event class
 */

import { AttributeType } from "@/types/cardTypes";
import { playerName } from "./commands";
import { CardLocationID } from "./engine2";

export abstract class GameEvent {
  abstract readonly type: string;
  abstract getDescription(): string;
}
/**
 * Game Events
 */

export class GameTickEvent extends GameEvent {
  readonly type = "game:tick";
  constructor() {
    super();
  }

  getDescription(): string {
    return `Tick`;
  }
}
/**
 * Should never be emitted, only used as a placeholder
 */

export class NotImplementedEvent extends GameEvent {
  readonly type = "game:notImplemented";
  constructor(public readonly message: string) {
    super();
  }

  getDescription(): string {
    return `Not implemented: ${this.message}`;
  }
}
export class GameFightStartedEvent extends GameEvent {
  readonly type = "game:fightStarted";

  constructor() {
    super();
  }

  getDescription(): string {
    return "Fight started";
  }
}

export class GameEndedEvent extends GameEvent {
  readonly type = "game:ended";
  constructor(public readonly winner: string) {
    super();
  }

  getDescription(): string {
    return `Game ended - Winner: ${this.winner}`;
  }
}
/**
 * Card Events
 */

export class CardFiredEvent extends GameEvent {
  readonly type = "card:fired";
  constructor(public readonly sourceCardID: CardLocationID) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} was fired`;
  }
}

export class CardCrittedEvent extends GameEvent {
  readonly type = "card:critted";
  constructor(public readonly sourceCardID: CardLocationID) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} critted`;
  }
}

export class CardItemUsedEvent extends GameEvent {
  readonly type = "card:itemused";
  constructor(public readonly sourceCardID: CardLocationID) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} was used`;
  }
}

export class CardAttributeChangedEvent extends GameEvent {
  readonly type = "card:attributeChanged";
  constructor(
    public readonly modifiedLocationID: CardLocationID,
    public readonly attribute: AttributeType | "tick",
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.modifiedLocationID.playerIdx)}'s card ${this.modifiedLocationID.cardIdx} ${this.attribute} changed from ${this.oldValue} to ${this.newValue}`;
  }
}

export class CardAddedEvent extends GameEvent {
  readonly type = "card:added";
  constructor(
    public readonly locationID: CardLocationID,
    public readonly card: unknown,
  ) {
    super();
  }

  getDescription(): string {
    return `Card added to ${playerName(this.locationID.playerIdx)}'s board at position ${this.locationID.cardIdx}`;
  }
}

export class CardRemovedEvent extends GameEvent {
  readonly type = "card:removed";
  constructor(public readonly locationID: CardLocationID) {
    super();
  }

  getDescription(): string {
    return `Card removed from ${playerName(this.locationID.playerIdx)}'s board at position ${this.locationID.cardIdx}`;
  }
}
/**
 * Player Events
 */

export class PlayerDamagedEvent extends GameEvent {
  readonly type = "player:damaged";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} took ${this.amount} damage`;
    }
    return `${playerName(this.playerIdx)} took ${this.amount} damage from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedHealEvent extends GameEvent {
  readonly type = "player:healed";
  constructor(
    public readonly targetPlayerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.targetPlayerIdx)} was healed for ${this.amount}`;
    }
    return `${playerName(this.targetPlayerIdx)} was healed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerOverhealedEvent extends GameEvent {
  readonly type = "player:overhealed";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} was overhealed for ${this.amount}`;
    }
    return `${playerName(this.playerIdx)} was overhealed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerLifestealHealEvent extends GameEvent {
  readonly type = "player:lifestealheal";
  constructor(
    public readonly playerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID | null,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.playerIdx)} healed ${this.amount} from lifesteal`;
    }
    return `${playerName(this.playerIdx)} healed ${this.amount} from lifesteal via ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerAttributeChangedEvent extends GameEvent {
  readonly type = "player:attributeChanged";
  constructor(
    public readonly playerIdx: number,
    public readonly attribute: string,
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.playerIdx)}'s ${this.attribute} changed from ${this.oldValue} to ${this.newValue}`;
  }
}

export class PlayerAttributeChangeHandledEvent extends GameEvent {
  readonly type = "player:attributeChangeHandled";
  constructor(
    public readonly playerIdx: number,
    public readonly attribute: string,
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.playerIdx)}'s ${this.attribute} change was handled`;
  }
}

export class PlayerDiedEvent extends GameEvent {
  readonly type = "player:died";
  constructor(public readonly playerIdx: number) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.playerIdx)} died`;
  }
}

export class CardPerformedShieldEvent extends GameEvent {
  readonly type = "player:shieldApplied";
  constructor(
    public readonly targetPlayerIdx: number,
    public readonly sourceCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.targetPlayerIdx)} gained ${this.amount} shield`;
    }
    return `${playerName(this.targetPlayerIdx)} gained ${this.amount} shield from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedPoisonEvent extends GameEvent {
  readonly type = "card:performedPoison";
  constructor(
    public readonly targetPlayerIdx: number,
    public readonly sourceCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.targetPlayerIdx)} was poisoned for ${this.amount}`;
    }
    return `${playerName(this.targetPlayerIdx)} was poisoned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedBurnEvent extends GameEvent {
  readonly type = "card:performedBurn";
  constructor(
    public readonly targetPlayerIdx: number,
    public readonly sourceCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.targetPlayerIdx)} was burned for ${this.amount}`;
    }
    return `${playerName(this.targetPlayerIdx)} was burned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedDestructionEvent extends GameEvent {
  readonly type = "card:performedDestruction";
  constructor(
    public readonly sourceCardID: CardLocationID,
    public readonly destroyedCardID: CardLocationID,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} destroyed ${playerName(this.destroyedCardID.playerIdx)}'s card ${this.destroyedCardID.cardIdx}`;
  }
}

export class CardPerformedFreezeEvent extends GameEvent {
  readonly type = "card:performedFreeze";
  constructor(
    public readonly sourceCardID: CardLocationID,
    public readonly frozenCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} froze ${playerName(this.frozenCardID.playerIdx)}'s card ${this.frozenCardID.cardIdx}`;
  }
}

export class CardPerformedHasteEvent extends GameEvent {
  readonly type = "card:performedHaste";
  constructor(
    public readonly sourceCardID: CardLocationID,
    public readonly hastenedCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} hastened ${playerName(this.hastenedCardID.playerIdx)}'s card ${this.hastenedCardID.cardIdx}`;
  }
}

export class CardPerformedChargeEvent extends GameEvent {
  readonly type = "card:performedCharge";
  constructor(
    public readonly sourceCardID: CardLocationID,
    public readonly chargedCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} charged ${playerName(this.chargedCardID.playerIdx)}'s card ${this.chargedCardID.cardIdx}`;
  }
}

export class CardPerformedSlowEvent extends GameEvent {
  readonly type = "card:performedSlow";
  constructor(
    public readonly sourceCardID: CardLocationID,
    public readonly slowedCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} slowed ${playerName(this.slowedCardID.playerIdx)}'s card ${this.slowedCardID.cardIdx}`;
  }
}

export class CardPerformedRegenEvent extends GameEvent {
  readonly type = "card:performedRegen";
  constructor(
    public readonly sourceCardID: CardLocationID,
    public readonly targetPlayerIdx: number,
    public readonly amount: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} gave ${playerName(this.targetPlayerIdx)} ${this.amount} health regeneration`;
  }
}

export class CardReloadedEvent extends GameEvent {
  readonly type = "card:reloaded";
  constructor(public readonly sourceCardID: CardLocationID) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} reloaded`;
  }
}
