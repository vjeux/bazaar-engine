import { Player } from "../Engine";
import { GameState, BoardCardID } from "./engine2";
import * as Commands from "./commands";
import { Ability, AbilityAction, AttributeType } from "../../types/cardTypes";

/**
 * Create a BoardCardID
 */
function createBoardCardID(playerID: number, cardID: number): BoardCardID {
  return { playerID, cardID };
}

/**
 * Setup event handlers for the game engine
 */
export function setupEventHandlers(gameState: GameState): void {
  const eventBus = gameState.eventBus;

  // Handle game tick events
  eventBus.on("game:tick", (data) => {
    handleGameTick(gameState, data.tick);
  });

  // Handle card triggers
  eventBus.on("card:triggered", (data) => {
    handleCardFired(gameState, data.boardCardID);
  });

  // Handle player damage
  eventBus.on("player:damaged", (data) => {
    handlePlayerDamaged(
      gameState,
      data.playerID,
      data.amount,
      data.sourceCardID,
    );
  });

  // Handle player healing
  eventBus.on("player:healed", (data) => {
    handlePlayerHealed(
      gameState,
      data.playerID,
      data.amount,
      data.sourceCardID,
    );
  });

  // Handle attribute changes
  eventBus.on("card:attributeChanged", (data) => {
    handleCardAttributeChanged(
      gameState,
      data.boardCardID,
      data.attribute,
      data.oldValue,
      data.newValue,
    );
  });

  eventBus.on("player:attributeChanged", (data) => {
    handlePlayerAttributeChanged(
      gameState,
      data.playerID,
      data.attribute as keyof Player,
      data.oldValue,
      data.newValue,
    );
  });

  // Setup more event handlers as needed
}

/**
 * Handle game tick event
 */
function handleGameTick(gameState: GameState, tick: number): void {
  // Process poison and regen on 1000 tick intervals
  if (tick % 1000 === 0) {
    processPoisonAndRegen(gameState);
  }

  // Process burn on 500 tick intervals
  if (tick % 500 === 0) {
    processBurn(gameState);
  }

  // Process card cooldowns
  processCardCooldowns(gameState);

  // Process sandstorm damage
  processSandstorm(gameState);

  // Check for player deaths
  checkPlayerDeaths(gameState);
}

/**
 * Process poison and health regeneration
 */
function processPoisonAndRegen(gameState: GameState): void {
  gameState.players.forEach((player, playerID) => {
    // Process health regen
    if (player.HealthRegen > 0) {
      const health = player.Health;
      const healthMax = player.HealthMax;
      const nextHealth = Math.min(healthMax, health + player.HealthRegen);

      if (health !== nextHealth) {
        new Commands.ModifyPlayerAttributeCommand(
          playerID,
          "Health",
          nextHealth,
          "set",
        ).execute(gameState);
      }
    }

    // Process poison damage
    if (player.Poison > 0) {
      new Commands.DamagePlayerCommand(
        playerID,
        player.Poison,
        null, // System-caused damage
      ).execute(gameState);
    }
  });
}

/**
 * Process burn effects
 */
function processBurn(gameState: GameState): void {
  gameState.players.forEach((player, playerID) => {
    if (player.Burn > 0) {
      // Apply burn damage
      new Commands.DamagePlayerCommand(
        playerID,
        player.Burn / 2,
        null, // System-caused damage
      ).execute(gameState);

      // Reduce burn counter
      new Commands.ModifyPlayerAttributeCommand(
        playerID,
        "Burn",
        player.Burn - 1,
        "set",
      ).execute(gameState);
    }
  });
}

/**
 * Process card cooldowns and triggers
 */
function processCardCooldowns(gameState: GameState): void {
  const cardTriggers: BoardCardID[] = [];

  gameState.players.forEach((player, playerID) => {
    player.board.forEach((card, cardID) => {
      if (card.isDisabled || card.card.$type === "TCardSkill") {
        return;
      }

      // Skip cards without cooldown
      if (!("CooldownMax" in card)) {
        return;
      }

      const boardCardID = createBoardCardID(playerID, cardID);

      // Check if card is frozen
      const freeze = card[AttributeType.Freeze] as number | undefined;
      if (freeze && freeze > 0) {
        // Reduce freeze counter
        new Commands.ModifyCardAttributeCommand(
          boardCardID,
          AttributeType.Freeze,
          Math.max(0, freeze - 100),
          "set",
        ).execute(gameState);
        return; // Skip tick increment if frozen
      }

      // Calculate tick rate based on slow/haste
      let tickRate = 100; // TICK_RATE
      const slow = card[AttributeType.Slow] as number | undefined;
      if (slow && slow > 0) {
        tickRate /= 2;

        // Reduce slow counter
        new Commands.ModifyCardAttributeCommand(
          boardCardID,
          AttributeType.Slow,
          Math.max(0, slow - 100),
          "set",
        ).execute(gameState);
      }

      const haste = card[AttributeType.Haste] as number | undefined;
      if (haste && haste > 0) {
        tickRate *= 2;

        // Reduce haste counter
        new Commands.ModifyCardAttributeCommand(
          boardCardID,
          AttributeType.Haste,
          Math.max(0, haste - 100),
          "set",
        ).execute(gameState);
      }

      // Increment card tick
      const cooldownMax = card[AttributeType.CooldownMax] as number;
      const newTick = Math.min(card.tick + tickRate, cooldownMax);

      new Commands.ModifyCardAttributeCommand(
        boardCardID,
        "tick",
        newTick,
        "set",
      ).execute(gameState);

      // Check if card should trigger
      if (newTick === cooldownMax) {
        const ammo = card[AttributeType.Ammo] as number | undefined;
        const ammoMax = card[AttributeType.AmmoMax] as number | undefined;

        if (!ammoMax || (ammoMax && ammo === undefined) || (ammo && ammo > 0)) {
          cardTriggers.push(boardCardID);

          // Handle multicast
          if ("Multicast" in card && card.Multicast) {
            const MULTICAST_DELAY = 300;
            for (let i = 0; i < card.Multicast - 1; i++) {
              gameState.multicast.push({
                tick: gameState.tick + (i + 1) * MULTICAST_DELAY,
                playerID,
                boardCardID: cardID,
              });
            }
          }
        }
      }
    });
  });

  // Process delayed multicasts
  gameState.multicast = gameState.multicast.filter((multicast) => {
    if (multicast.tick <= gameState.tick) {
      cardTriggers.push(
        createBoardCardID(multicast.playerID, multicast.boardCardID),
      );
      return false;
    }
    return true;
  });

  // Trigger cards
  cardTriggers.forEach((boardCardID) => {
    const { playerID, cardID } = boardCardID;
    // Reduce ammo if needed
    const card = gameState.players[playerID].board[cardID];
    const ammoMax = card[AttributeType.AmmoMax] as number | undefined;

    if (ammoMax) {
      const ammo = card[AttributeType.Ammo] as number | undefined;
      new Commands.ModifyCardAttributeCommand(
        boardCardID,
        AttributeType.Ammo,
        ammo === undefined ? ammoMax - 1 : ammo - 1,
        "set",
      ).execute(gameState);
    }

    // Trigger the card
    new Commands.TriggerCardCommand(boardCardID).execute(gameState);
  });
}

/**
 * Process sandstorm damage
 */
function processSandstorm(gameState: GameState): void {
  // Sandstorm implementation
  const sandstormTick = gameState.tick - gameState.sandstormStartTick;
  if (sandstormTick < 0) return;

  // Calculate sandstorm damage based on ticks
  let sandstormDamage = 1;
  if (sandstormTick > 1000) {
    sandstormDamage += Math.floor((sandstormTick - 1000) / 100) * 2;
  }

  if (sandstormDamage > 0) {
    gameState.players.forEach((player, playerID) => {
      new Commands.DamagePlayerCommand(
        playerID,
        sandstormDamage,
        null, // System-caused damage
      ).execute(gameState);
    });
  }
}

/**
 * Check for player deaths
 */
function checkPlayerDeaths(gameState: GameState): void {
  let isPlaying = true;
  const eventBus = gameState.eventBus;

  gameState.players.forEach((player, playerID) => {
    if (player.Health <= 0) {
      isPlaying = false;
      eventBus.emit("player:died", { playerID });
    }
  });

  gameState.isPlaying = isPlaying;

  // Determine winner
  if (gameState.players[0].Health <= 0 && gameState.players[1].Health <= 0) {
    gameState.winner = "Draw";
    eventBus.emit("game:ended", { winner: "Draw" });
  } else if (gameState.players[0].Health <= 0) {
    gameState.winner = "Player";
    eventBus.emit("game:ended", { winner: "Player" });
  } else if (gameState.players[1].Health <= 0) {
    gameState.winner = "Enemy";
    eventBus.emit("game:ended", { winner: "Enemy" });
  }
}

/**
 * Handle card fired event
 */
function handleCardFired(
  gameState: GameState,
  boardCardID: BoardCardID,
): void {
  const { playerID, cardID } = boardCardID;
  const card = gameState.players[playerID].board[cardID];

  // Process abilities when card is fired
  card.AbilityIds.forEach((abilityId) => {
    const ability = card.Abilities[abilityId];
    if (!ability) return;

    // Check if ability should trigger on card use
    if (ability.Trigger?.$type === "TTriggerOnCardFired") {
      processAbility(gameState, ability, boardCardID, boardCardID);
    }
  });

  // Notify other cards about this card being used
  notifyCardsAboutCardUsed(gameState, boardCardID);
}

/**
 * Notify other cards about a card being used
 */
function notifyCardsAboutCardUsed(
  gameState: GameState,
  usedCardID: BoardCardID,
): void {
  gameState.players.forEach((player, pID) => {
    player.board.forEach((card, cID) => {
      if (card.isDisabled) return;

      const abilityCardID = createBoardCardID(pID, cID);

      card.AbilityIds.forEach((abilityId) => {
        const ability = card.Abilities[abilityId];
        if (!ability) return;

        if (ability.Trigger?.$type === "TTriggerOnItemUsed") {
          // Check if the used card is a subject of this ability
          const isSubject = checkIfCardIsSubject(
            gameState,
            ability.Trigger.Subject,
            usedCardID,
            abilityCardID,
          );

          if (isSubject) {
            processAbility(gameState, ability, usedCardID, abilityCardID);
          }
        }
      });
    });
  });
}

/**
 * Check if a card is a subject of a target/subject config
 */
function checkIfCardIsSubject(
  gameState: GameState,
  subject: unknown,
  sourceCardID: BoardCardID,
  abilityCardID: BoardCardID,
): boolean {
  // This is a simplified implementation - complete implementation would need card targeting logic
  if (!subject) return false;

  const typedSubject = subject as { $type?: string };

  if (typedSubject.$type === "TTargetCardSelf") {
    return (
      sourceCardID.playerID === abilityCardID.playerID &&
      sourceCardID.cardID === abilityCardID.cardID
    );
  }

  if (typedSubject.$type === "TTargetCardTriggerSource") {
    return true; // Simplification - would need more context in real implementation
  }

  // Other targeting types would be implemented here

  return false;
}

/**
 * Process an ability
 */
function processAbility(
  gameState: GameState,
  ability: Ability,
  triggerCardID: BoardCardID,
  abilityCardID: BoardCardID,
): void {
  // Check prerequisites
  if (ability.Prerequisites) {
    // Skip prerequisite checking for now
    // In a real implementation, we would check each prerequisite
  }

  // Process the ability action
  processAction(gameState, ability.Action, triggerCardID, abilityCardID);
}

/**
 * Process an action
 */
function processAction(
  gameState: GameState,
  action: AbilityAction,
  triggerCardID: BoardCardID,
  abilityCardID: BoardCardID,
): void {
  // This would handle different action types and create appropriate commands
  // Simplified implementation for now
  switch (action.$type) {
    case "TActionPlayerDamage":
      // Get damage amount from the card
      const { playerID, cardID } = abilityCardID;
      const damageCard = gameState.players[playerID].board[cardID];
      const damage = damageCard[AttributeType.DamageAmount] as number;

      if (damage) {
        // In a real implementation, would determine target players and apply damage to each
        new Commands.DamagePlayerCommand(
          (playerID + 1) % 2, // Target opponent for now
          damage,
          abilityCardID,
        ).execute(gameState);
      }
      break;

    case "TActionPlayerHeal":
      // Get heal amount from the card
      const healCard =
        gameState.players[abilityCardID.playerID].board[abilityCardID.cardID];
      const healAmount = healCard[AttributeType.HealAmount] as number;

      if (healAmount) {
        // In a real implementation, would determine target players
        new Commands.HealPlayerCommand(
          abilityCardID.playerID, // Heal self for now
          healAmount,
          abilityCardID,
        ).execute(gameState);
      }
      break;

    // Add more action types as needed
  }
}

/**
 * Handle card attribute changed event
 */
function handleCardAttributeChanged(
  gameState: GameState,
  boardCardID: BoardCardID,
  attribute: AttributeType | "tick",
  oldValue: number,
  newValue: number,
): void {
  // Check for abilities that trigger on attribute change
  gameState.players.forEach((player, pID) => {
    player.board.forEach((card, cID) => {
      if (card.isDisabled) return;

      const abilityCardID = createBoardCardID(pID, cID);

      card.AbilityIds.forEach((abilityId) => {
        const ability = card.Abilities[abilityId];
        if (!ability) return;

        if (
          ability.Trigger?.$type === "TTriggerOnCardAttributeChanged" &&
          ability.Trigger.AttributeChanged === attribute
        ) {
          // Check change type
          if (
            (ability.Trigger.ChangeType === "Gain" && newValue > oldValue) ||
            (ability.Trigger.ChangeType === "Loss" && newValue < oldValue)
          ) {
            // Check if the changed card is a subject of this ability
            const isSubject = checkIfCardIsSubject(
              gameState,
              ability.Trigger.Subject,
              boardCardID,
              abilityCardID,
            );

            if (isSubject) {
              processAbility(gameState, ability, boardCardID, abilityCardID);
            }
          }
        }
      });
    });
  });
}

/**
 * Handle player attribute changed event
 */
function handlePlayerAttributeChanged(
  gameState: GameState,
  playerID: number,
  attribute: keyof Player,
  oldValue: number,
  newValue: number,
): void {
  // This is a placeholder for player attribute change handling
  // Implementation would check for abilities that trigger on player attribute changes
  const eventBus = gameState.eventBus;

  // Emit a generic player attribute changed event that other systems can listen for
  eventBus.emit("player:attributeChangeHandled", {
    playerID,
    attribute,
    oldValue,
    newValue,
  });
}

/**
 * Handle player damaged event
 */
function handlePlayerDamaged(
  gameState: GameState,
  playerID: number,
  amount: number,
  sourceCardID: BoardCardID | null,
): void {
  // Check for abilities that trigger on damage
  // Implement lifesteal and other damage-related effects
  if (sourceCardID) {
    // Check for lifesteal
    const sourceCard =
      gameState.players[sourceCardID.playerID].board[sourceCardID.cardID];
    const lifesteal = sourceCard[AttributeType.Lifesteal] as number | undefined;

    if (lifesteal && lifesteal > 0) {
      const healAmount = amount * (lifesteal / 100);
      if (healAmount > 0) {
        new Commands.HealPlayerCommand(
          sourceCardID.playerID,
          healAmount,
          sourceCardID,
        ).execute(gameState);
      }
    }
  }
}

/**
 * Handle player healed event
 */
function handlePlayerHealed(
  gameState: GameState,
  playerID: number,
  amount: number,
  sourceCardID: BoardCardID | null,
): void {
  // Check for abilities that trigger on healing
  const eventBus = gameState.eventBus;

  // Emit a heal handled event for other systems to respond to
  eventBus.emit("player:healHandled", {
    playerID,
    amount,
    sourceCardID,
  });
}
