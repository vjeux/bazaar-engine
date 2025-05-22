import { AttributeType } from "@/types/cardTypes";
import { playerName } from "./commands";
import { CardLocationID } from "./engine2";

/**
 * Base Game Event class
 */
export abstract class GameEvent {
  abstract readonly type: string;
  abstract getDescription(): string;
}

/**
 * Base class for events targeting a single player
 */
export abstract class SingleTargetPlayerEvent extends GameEvent {
  constructor(public readonly targetPlayerIdx: number) {
    super();
  }
}

/**
 * Base class for events targeting multiple players
 */
export abstract class MultipleTargetPlayerEvent extends GameEvent {
  constructor(public readonly targetPlayerIdxs: number[]) {
    super();
  }
}

/**
 * Base class for events targeting a single card
 */
export abstract class SingleTargetCardEvent extends GameEvent {
  constructor(public readonly targetCardID: CardLocationID) {
    super();
  }
}

/**
 * Base class for events targeting multiple cards
 */
export abstract class MultipleTargetCardEvent extends GameEvent {
  constructor(public readonly targetCardIDs: CardLocationID[]) {
    super();
  }
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
    public readonly targetCardID: CardLocationID,
    public readonly attribute: AttributeType | "tick",
    public readonly oldValue: number,
    public readonly newValue: number,
  ) {
    super();
  }

  getDescription(): string {
    return `${playerName(this.targetCardID.playerIdx)}'s card ${this.targetCardID.cardIdx} ${this.attribute} changed from ${this.oldValue} to ${this.newValue}`;
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

export class PlayerDamagedEvent extends MultipleTargetPlayerEvent {
  readonly type = "player:damaged";
  constructor(
    targetPlayerIdxs: number[],
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID | null,
  ) {
    super(targetPlayerIdxs);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0) return `No players were damaged`;

    if (this.targetPlayerIdxs.length === 1) {
      if (!this.sourceCardID) {
        return `${playerName(this.targetPlayerIdxs[0])} took ${this.amount} damage`;
      }
      return `${playerName(this.targetPlayerIdxs[0])} took ${this.amount} damage from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    if (!this.sourceCardID) {
      return `${this.targetPlayerIdxs.length} players took ${this.amount} damage`;
    }
    return `${this.targetPlayerIdxs.length} players took ${this.amount} damage from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedHealEvent extends MultipleTargetPlayerEvent {
  readonly type = "player:healed";
  constructor(
    targetPlayerIdx: number[],
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID,
  ) {
    super(targetPlayerIdx);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0) return `No players were healed`;

    if (this.targetPlayerIdxs.length === 1) {
      return `${playerName(this.targetPlayerIdxs[0])} was healed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    return `${this.targetPlayerIdxs.length} players were healed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerOverhealedEvent extends MultipleTargetPlayerEvent {
  readonly type = "player:overhealed";
  constructor(
    playerIdxs: number[],
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID,
  ) {
    super(playerIdxs);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0) return `No players were overhealed`;

    if (this.targetPlayerIdxs.length === 1) {
      return `${playerName(this.targetPlayerIdxs[0])} was overhealed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    return `${this.targetPlayerIdxs.length} players were overhealed for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class PlayerLifestealHealEvent extends SingleTargetPlayerEvent {
  readonly type = "player:lifestealheal";
  constructor(
    targetPlayerIdx: number,
    public readonly amount: number,
    public readonly sourceCardID: CardLocationID | null,
  ) {
    super(targetPlayerIdx);
  }

  getDescription(): string {
    if (!this.sourceCardID) {
      return `${playerName(this.targetPlayerIdx)} healed ${this.amount} from lifesteal`;
    }
    return `${playerName(this.targetPlayerIdx)} healed ${this.amount} from lifesteal via ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
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

export class PlayerDiedEvent extends SingleTargetPlayerEvent {
  readonly type = "player:died";
  constructor(targetPlayerIdx: number) {
    super(targetPlayerIdx);
  }

  getDescription(): string {
    return `${playerName(this.targetPlayerIdx)} died`;
  }
}

export class CardPerformedShieldEvent extends MultipleTargetPlayerEvent {
  readonly type = "player:shieldApplied";
  constructor(
    targetPlayerIdxs: number[],
    public readonly sourceCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super(targetPlayerIdxs);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0) return `No players gained shield`;

    if (this.targetPlayerIdxs.length === 1) {
      return `${playerName(this.targetPlayerIdxs[0])} gained ${this.amount} shield from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    return `${this.targetPlayerIdxs.length} players gained ${this.amount} shield from ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedPoisonEvent extends MultipleTargetPlayerEvent {
  readonly type = "card:performedPoison";
  constructor(
    targetPlayerIdxs: number[],
    public readonly sourceCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super(targetPlayerIdxs);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0) return `No players were poisoned`;

    if (this.targetPlayerIdxs.length === 1) {
      return `${playerName(this.targetPlayerIdxs[0])} was poisoned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    return `${this.targetPlayerIdxs.length} players were poisoned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedBurnEvent extends MultipleTargetPlayerEvent {
  readonly type = "card:performedBurn";
  constructor(
    targetPlayerIdxs: number[],
    public readonly sourceCardID: CardLocationID,
    public readonly amount: number,
  ) {
    super(targetPlayerIdxs);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0) return `No players were burned`;

    if (this.targetPlayerIdxs.length === 1) {
      return `${playerName(this.targetPlayerIdxs[0])} was burned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
    }

    return `${this.targetPlayerIdxs.length} players were burned for ${this.amount} by ${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx}`;
  }
}

export class CardPerformedDestructionEvent extends MultipleTargetCardEvent {
  readonly type = "card:performedDestruction";
  constructor(
    public readonly sourceCardID: CardLocationID,
    destroyedCardIDs: CardLocationID[],
  ) {
    super(destroyedCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were destroyed`;

    if (this.targetCardIDs.length === 1) {
      const destroyedCard = this.targetCardIDs[0];
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} destroyed ${playerName(destroyedCard.playerIdx)}'s card ${destroyedCard.cardIdx}`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} destroyed ${this.targetCardIDs.length} cards`;
  }
}

export class CardPerformedFreezeEvent extends MultipleTargetCardEvent {
  readonly type = "card:performedFreeze";
  constructor(
    public readonly sourceCardID: CardLocationID,
    frozenCardIDs: CardLocationID[],
    public readonly amount: number,
  ) {
    super(frozenCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were frozen`;

    if (this.targetCardIDs.length === 1) {
      const frozenCard = this.targetCardIDs[0];
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} froze ${playerName(frozenCard.playerIdx)}'s card ${frozenCard.cardIdx}`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} froze ${this.targetCardIDs.length} cards`;
  }
}

export class CardPerformedHasteEvent extends MultipleTargetCardEvent {
  readonly type = "card:performedHaste";
  constructor(
    public readonly sourceCardID: CardLocationID,
    hastenedCardIDs: CardLocationID[],
    public readonly amount: number,
  ) {
    super(hastenedCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were hastened`;

    if (this.targetCardIDs.length === 1) {
      const hastenedCard = this.targetCardIDs[0];
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} hastened ${playerName(hastenedCard.playerIdx)}'s card ${hastenedCard.cardIdx}`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} hastened ${this.targetCardIDs.length} cards`;
  }
}

export class CardPerformedChargeEvent extends MultipleTargetCardEvent {
  readonly type = "card:performedCharge";
  constructor(
    public readonly sourceCardID: CardLocationID,
    chargedCardIDs: CardLocationID[],
    public readonly amount: number,
  ) {
    super(chargedCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were charged`;

    if (this.targetCardIDs.length === 1) {
      const chargedCard = this.targetCardIDs[0];
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} charged ${playerName(chargedCard.playerIdx)}'s card ${chargedCard.cardIdx}`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} charged ${this.targetCardIDs.length} cards`;
  }
}

export class CardPerformedSlowEvent extends MultipleTargetCardEvent {
  readonly type = "card:performedSlow";
  constructor(
    public readonly sourceCardID: CardLocationID,
    slowedCardIDs: CardLocationID[],
    public readonly amount: number,
  ) {
    super(slowedCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were slowed`;

    if (this.targetCardIDs.length === 1) {
      const slowedCard = this.targetCardIDs[0];
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} slowed ${playerName(slowedCard.playerIdx)}'s card ${slowedCard.cardIdx}`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} slowed ${this.targetCardIDs.length} cards`;
  }
}

export class CardPerformedRegenEvent extends MultipleTargetPlayerEvent {
  readonly type = "card:performedRegen";
  constructor(
    public readonly sourceCardID: CardLocationID,
    targetPlayerIdxs: number[],
    public readonly amount: number,
  ) {
    super(targetPlayerIdxs);
  }

  getDescription(): string {
    if (this.targetPlayerIdxs.length === 0)
      return `No players gained regeneration`;

    if (this.targetPlayerIdxs.length === 1) {
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} gave ${playerName(this.targetPlayerIdxs[0])} ${this.amount} health regeneration`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} gave ${this.targetPlayerIdxs.length} players ${this.amount} health regeneration`;
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

export class CardPerformedReloadEvent extends MultipleTargetCardEvent {
  readonly type = "card:performedReload";
  constructor(
    public readonly sourceCardID: CardLocationID,
    targetCardIDs: CardLocationID[],
  ) {
    super(targetCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were reloaded`;

    if (this.targetCardIDs.length === 1) {
      const targetCard = this.targetCardIDs[0];
      return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} reloaded ${playerName(targetCard.playerIdx)}'s card ${targetCard.cardIdx}`;
    }

    return `${playerName(this.sourceCardID.playerIdx)}'s card ${this.sourceCardID.cardIdx} reloaded ${this.targetCardIDs.length} cards`;
  }
}

export class CardDisabledEvent extends MultipleTargetCardEvent {
  readonly type = "card:disabled";
  constructor(disabledCardIDs: CardLocationID[]) {
    super(disabledCardIDs);
  }

  getDescription(): string {
    if (this.targetCardIDs.length === 0) return `No cards were disabled`;

    if (this.targetCardIDs.length === 1) {
      const disabledCard = this.targetCardIDs[0];
      return `${playerName(disabledCard.playerIdx)}'s card ${disabledCard.cardIdx} was disabled`;
    }

    return `${this.targetCardIDs.length} cards were disabled`;
  }
}
