import "./styles.css";
import pako from "pako";
import { useState, useEffect } from "react";
import { run, getTooltips, TICK_RATE } from "./Engine";

// import Cards from "./json/v2_Cards.json";
// const compressed = JSON.stringify([...pako.deflate(JSON.stringify(Cards))]);
// localStorage.setItem("Cards", compressed);
const compressed = new Uint8Array(JSON.parse(localStorage.getItem("Cards")));
const Cards = JSON.parse(pako.inflate(compressed, { to: "string" }));

// import Encounters from "./json/encounterDays.json"; // from https://www.howbazaar.gg/api/monsterEncounterDays
// const compressed_encounters = JSON.stringify([
//   ...pako.deflate(JSON.stringify(Encounters))
// ]);
// localStorage.setItem("Encounters", compressed_encounters);
const compressed_encounters = new Uint8Array(
  JSON.parse(localStorage.getItem("Encounters"))
);
const Encounters = JSON.parse(
  pako.inflate(compressed_encounters, { to: "string" })
);

console.log(Encounters);

const CardsValues = Object.values(Cards);

/* Bugs

// Aura for crusher claw applies before aura for abacus
getBoardCard("Crusher Claw", "Silver"),
getBoardCard("Abacus", "Gold"),

// Sparring Partner heals to half life because Aura is not triggered at the right time
getBoardMonster("Sparring Partner"),

// Freeze skills aren't working properly
getBoardMonster("Volkas Enforcer"),

// Need to implement lifesteal

// Sandstorm ticks are not correct, there should be a bunch of -1 at
// the beginning: https://youtu.be/IurqE_Egvr0?si=_x2pflCNfuxdUGvQ&t=64

// Arms Race isn't working properly nor its tooltip.
*/

const initialGameState = {
  tick: 0,
  isPlaying: true,
  players: [
    // getBoardMonster("Veteran Octopus"),
    getBoardPlayer({ HealthMax: 3500 }, [], []),
    getBoardPlayer(
      { HealthMax: 3500, HealthRegen: 0 },
      [
        // getBoardCard("Powder Flask", "Silver"),
        // getBoardCard("Abacus", "Silver"),
        // getBoardCard("Crusher Claw", "Silver"),
        // getBoardCard("Colossal Popsicle", "Diamond"),
        // getBoardCard("Blue Piggles A", "Silver"),
        getBoardCard("Octopus", "Diamond")
        // getBoardCard("Weather Glass", "Diamond")
        // getBoardCard("Agility Boots", "Silver"),
        // getBoardCard("Crusher Claw", "Silver"),
        // getBoardCard("Abacus", "Gold"),
      ],
      [
        getBoardSkill("Hyper Focus", "Diamond") //
      ]
    )
  ],
  multicast: [],
  getRand: sfc32(0, 10000, 10000000, 100000000000)
};

/**
 * Creates a board card from a card object and a specified tier.
 * If the given tier does not exist in the card's Tiers, the first available tier is used.
 *
 * @param {Object} card - The card object from CardsValues.
 * @param {string} tier - The desired tier.
 * @returns {Object} The board card object.
 */
function _createBoardCardFromCard(card, tier, enchantment) {
  let attributes = {
    Abilities: card.Abilities,
    Auras: card.Auras,
    Localization: {
      Tooltips: card.Localization.Tooltips,
      Title: {
        Text: card.Localization.Title.Text
      }
    }
  };

  // If the provided tier is not available, default to the first tier available.
  if (!(tier in card.Tiers)) {
    console.error(
      `Tier ${tier} not found for card ${card.Localization.Title.Text}`
    );
    const tierKeys = Object.keys(card.Tiers);
    const firstTier = tierKeys.length > 0 ? tierKeys[0] : null;
    tier = firstTier;
  }

  // Iterate over the tiers in order and merge their attributes until the desired tier is reached.
  const tierNames = Object.keys(card.Tiers);
  for (const tn of tierNames) {
    const tierValues = card.Tiers[tn];

    attributes = { ...attributes, ...(tierValues.Attributes ?? {}) };
    attributes.AbilityIds = tierValues.AbilityIds;
    attributes.AuraIds = tierValues.AuraIds;
    attributes.TooltipIds = tierValues.TooltipIds;

    if (tn === tier) {
      break;
    }
  }

  if (enchantment) {
    const enchant = card.Enchantments[enchantment];

    attributes = { ...attributes, ...enchant.Attributes };
    if (enchant.HasAbilities) {
      attributes.Abilities = { ...attributes.Abilities, ...enchant.Abilities };
      attributes.AbilityIds = [
        ...attributes.AbilityIds,
        ...Object.keys(enchant.Abilities)
      ];
    }
    if (enchant.HasAuras) {
      attributes.Auras = { ...attributes.Auras, ...enchant.Auras };
      attributes.AuraIds = [
        ...attributes.AuraIds,
        ...Object.keys(enchant.Auras)
      ];
    }

    attributes.Tags = [...(attributes.Tags ?? []), ...enchant.Tags];
    attributes.HiddenTags = [
      ...(attributes.HiddenTags ?? []),
      ...enchant.HiddenTags
    ];

    attributes.Localization.Tooltips = [
      ...attributes.Localization.Tooltips,
      ...enchant.Localization.Tooltips
    ];
    attributes.TooltipIds = [
      ...attributes.TooltipIds,
      ...enchant.Localization.Tooltips.map((tooltip) =>
        attributes.Localization.Tooltips.indexOf(tooltip)
      )
    ];

    attributes.Localization.Title.Text = `${enchantment} ${attributes.Localization.Title.Text}`;
  }

  // Create the result object with default simulation fields.
  const result = {
    card: card,
    ...attributes,
    tick: 0,
    Slow: 0,
    Freeze: 0,
    Haste: 0,
    CritChance: 0,
    DamageCrit: 0,
    tier: tier
  };

  if ("AmmoMax" in attributes) {
    result.Ammo = attributes.AmmoMax;
  }

  return result;
}

/**
 * Retrieves a board card by its localized title text.
 *
 * @param {string} name - The localized title of the card.
 * @param {string} tier - The desired tier.
 * @param {?string} enchantment - The desired enchantment.
 * @returns {Object} The board card.
 * @throws Will throw an error if the card is not found.
 */
function getBoardCard(name, tier, enchantment) {
  // Find the card by its localized title text.
  const card = CardsValues.find((c) => c.Localization?.Title?.Text === name);
  if (!card) {
    throw new Error(`Card ${name} not found`);
  }
  return _createBoardCardFromCard(card, tier, enchantment);
}

/**
 * Retrieves a board card by its card ID.
 *
 * @param {number} cardId - The ID of the card.
 * @param {string} tier - The desired tier.
 * @param {?string} enchantment - The desired enchantment.
 * @returns {Object} The board card.
 * @throws Will throw an error if the card with the given ID is not found.
 */
function getBoardCardFromId(cardId, tier, enchantment) {
  const card = Cards[cardId];
  if (!card) {
    throw new Error(`Card from id ${cardId} not found`);
  }
  return _createBoardCardFromCard(card, tier, enchantment);
}

function getBoardSkill(name, tier, modifiers) {
  const card = CardsValues.find(
    (card) => card.Localization.Title.Text === name
  );
  let attributes = {
    Abilities: card.Abilities,
    Auras: card.Auras,
    Localization: {
      Tooltips: card.Localization.Tooltips,
      Title: {
        Text: card.Localization.Title.Text
      }
    }
  };
  if (!card.Tiers[tier]) {
    throw new Error(
      name +
        " doesn't have tier " +
        tier +
        ", the first one is " +
        Object.keys(card.Tiers)[0]
    );
  }
  const tierNames = Object.keys(card.Tiers);
  for (let i = 0; i < tierNames.length; ++i) {
    const tierName = tierNames[i];
    const tierValues = card.Tiers[tierName];
    attributes = {
      ...attributes,
      ...tierValues.Attributes,
      AbilityIds: tierValues.AbilityIds,
      AuraIds: tierValues.AuraIds,
      TooltipIds: tierValues.TooltipIds
    };
    if (tierName === tier) {
      break;
    }
  }
  const result = {
    card,
    ...attributes,
    tier
  };
  return result;
}

function getBoardPlayer(stats, boardCards, boardSkills) {
  return {
    HealthMax: stats.HealthMax,
    Health: stats.HealthMax,
    HealthRegen: stats.HealthRegen ?? 0,
    Shield: 0,
    Burn: 0,
    Poison: 0,
    Gold: 0,
    Income: 0,
    board: [...boardCards, ...boardSkills]
  };
}

function getBoardPlayerFromMonsterCard(monsterCard) {
  return getBoardPlayer(
    { HealthMax: monsterCard.health },
    monsterCard.items.map((item) =>
      getBoardCardFromId(item.card.id, item.tierType, item.enchantmentType)
    ),
    monsterCard.skills.map((item) =>
      getBoardCardFromId(item.card.id, item.tierType)
    )
  );
}

function getBoardMonster(name) {
  for (let i = 0; i < Encounters.data.length; ++i) {
    const day = Encounters.data[i];
    for (let j = 0; j < day.groups.length; ++j) {
      const group = day.groups[j];
      for (let k = 0; k < group.length; ++k) {
        const monsterCard = group[k];
        if (monsterCard.cardName === name) {
          return getBoardPlayerFromMonsterCard(monsterCard);
        }
      }
    }
  }
  throw new Exception(`Can't find a monster with name ${name}`);
}

function sfc32(a, b, c, d) {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const CARD_HEIGHT = 150;

function Tooltip({ boardCard, gameState, playerID, boardCardID }) {
  return (
    <div
      style={{
        position: "absolute",
        maxWidth: 300,
        backgroundColor: "#222",
        color: "white",
        border: "1px solid black",
        borderRadius: 5,
        padding: "5px 10px",
        zIndex: 1
      }}
      className="tooltip"
    >
      <div style={{ margin: "5px 0px 5px 0", fontWeight: "bold" }}>
        {boardCard.Localization.Title.Text}
      </div>
      {getTooltips(gameState, playerID, boardCardID).map((tooltip, i) => (
        <div style={{ margin: "10px 10px" }} key={"tooltip" + i}>
          {tooltip}
        </div>
      ))}
    </div>
  );
}

function BoardCard({ boardCard, gameState, playerID, boardCardID }) {
  const card = boardCard.card;
  const tier = boardCard.tier;
  const cardWidth =
    card.Size === "Small"
      ? CARD_HEIGHT / 2
      : card.Size === "Medium"
        ? CARD_HEIGHT / 1
        : CARD_HEIGHT * 1.5;

  const paddingTop = 12;
  const borderSize = 4;
  return (
    <div className="tooltipContainer">
      <div
        style={{
          margin: 5,
          position: "relative",
          height: CARD_HEIGHT + paddingTop + 2 * borderSize,
          width: cardWidth + 2 * borderSize,
          overflow: "hidden"
        }}
      >
        <img
          src={
            "https://www.howbazaar.gg/images/items/" +
            boardCard.card.Localization.Title.Text.replace(/[ ']/g, "") +
            ".avif"
          }
          style={{
            filter: boardCard.Freeze > 0 ? "grayscale(1)" : "",
            opacity: boardCard.Freeze > 0 ? 0.5 : 1,
            borderRadius: 5,
            position: "relative",
            top: paddingTop,
            border: borderSize + "px solid",
            borderColor:
              tier === "Bronze"
                ? "brown"
                : tier === "Silver"
                  ? "gray"
                  : tier === "Gold"
                    ? "yellow"
                    : "blue"
          }}
          height={CARD_HEIGHT}
          width={cardWidth}
        />
        {"CooldownMax" in boardCard ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: (boardCard.tick / boardCard.CooldownMax) * CARD_HEIGHT,
              borderTop: "2px solid white",
              color: "white",
              textAlign: "right",
              fontSize: "8pt",
              boxSizing: "border-box",
              height: 2
            }}
          >
            {(boardCard.tick / 1000).toFixed(1)} /{" "}
            {(boardCard.CooldownMax / 1000).toFixed(1)}&nbsp;&nbsp;
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            color: "white",
            whiteSpace: "preserve nowrap"
          }}
        >
          {boardCard.Freeze > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2
              }}
            >
              ❄️ {(boardCard.Freeze / 1000).toFixed(1)}
            </div>
          ) : null}
          {boardCard.Slow > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2
              }}
            >
              🐌 {(boardCard.Slow / 1000).toFixed(1)}
            </div>
          ) : null}
          {boardCard.Haste > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2
              }}
            >
              ⏱️ {(boardCard.Haste / 1000).toFixed(1)}
            </div>
          ) : null}
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            top: paddingTop
          }}
        >
          {boardCard.DamageAmount !== undefined && (
            <div
              style={{
                backgroundColor: "red",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.DamageAmount}
            </div>
          )}
          {boardCard.HealAmount !== undefined && (
            <div
              style={{
                backgroundColor: "limegreen",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.HealAmount}
            </div>
          )}
          {boardCard.BurnApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "orange",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.BurnApplyAmount}
            </div>
          )}
          {boardCard.PoisonApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "purple",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white"
              }}
            >
              {boardCard.PoisonApplyAmount}
            </div>
          )}
          {boardCard.ShieldApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "yellow",
                borderRadius: 5,
                padding: "2px 5px",
                margin: "0 2px"
              }}
            >
              {boardCard.ShieldApplyAmount}
            </div>
          )}
        </div>
        {boardCard.CritChance > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 31.5,
              left: 5,
              backgroundColor: "red",
              padding: "2px 5px",
              margin: "0 2px",
              borderRadius: 5,
              color: "white"
            }}
          >
            {boardCard.CritChance + "%"}
          </div>
        )}
        {boardCard.SellPrice !== undefined && (
          <div
            style={{
              position: "absolute",
              bottom: 6.5,
              left: 5,
              backgroundColor: "orange",
              padding: "2px 5px",
              margin: "0 2px",
              borderRadius: 5,
              color: "white"
            }}
          >
            {boardCard.SellPrice}
          </div>
        )}
        {boardCard.Multicast !== undefined && boardCard.Multicast > 1 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: 25,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              padding: "1px 3px",
              borderRadius: 5,
              fontSize: "9pt",
              color: "white"
            }}
          >
            x{boardCard.Multicast}
          </div>
        )}
        {boardCard.AmmoMax && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 0,
              display: "flex",
              backgroundColor: "gray",
              padding: "2px 5px",
              marginBottom: 5,
              borderRadius: 5
            }}
          >
            {[...new Array(boardCard.AmmoMax)].map((_, i) => {
              return (
                <div
                  key={"ammo" + i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 10,
                    backgroundColor:
                      boardCard.Ammo > i ? "orange" : "transparent",
                    margin: "1px 1px",
                    border: "1px solid orange"
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      <Tooltip
        boardCard={boardCard}
        gameState={gameState}
        playerID={playerID}
        boardCardID={boardCardID}
      />
    </div>
  );
}

function BoardSkill({ boardCard, gameState, playerID, boardCardID }) {
  const card = boardCard.card;
  const tier = boardCard.tier;

  const borderSize = 4;
  const IMAGE_SIZE = 30;
  return (
    <div className="tooltipContainer">
      <div
        style={{
          margin: 5,
          position: "relative",
          height: IMAGE_SIZE + borderSize * 2,
          width: IMAGE_SIZE + borderSize * 2,
          overflow: "hidden"
        }}
      >
        <img
          src={
            "https://www.howbazaar.gg/images/skills/" +
            boardCard.card.Localization.Title.Text.replace(/[ ']/g, "") +
            ".avif"
          }
          style={{
            borderRadius: "100%",
            position: "relative",
            top: 0,
            border: borderSize + "px solid",
            borderColor:
              tier === "Bronze"
                ? "brown"
                : tier === "Silver"
                  ? "gray"
                  : tier === "Gold"
                    ? "yellow"
                    : "blue"
          }}
          height={IMAGE_SIZE}
          width={IMAGE_SIZE}
        />
      </div>
      <Tooltip
        boardCard={boardCard}
        gameState={gameState}
        playerID={playerID}
        boardCardID={boardCardID}
      />
    </div>
  );
}

function Game({ gameState }) {
  return (
    <div>
      {gameState.players.map((player, playerID) => {
        const ticks = Math.floor(player.HealthMax / 50);
        const healthBar = (
          <div
            key="healthbar"
            style={{
              border: "1px solid #3abf39",
              borderRadius: 5,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(87, 66, 52, 0.4)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                backgroundColor: player.Poison > 0 ? "#076044" : "#1da81c",
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: Math.max(0, player.Health / player.HealthMax) * 100 + "%"
              }}
            />
            <div
              style={{
                backgroundColor: "rgba(217, 174, 45, 0.5)",
                position: "absolute",
                top: 0,
                bottom: "50%",
                left: 0,
                width: Math.min(1, player.Shield / player.HealthMax) * 100 + "%"
              }}
            />
            {[...new Array(ticks)].map((_, i) => {
              if (i === 0) {
                return;
              }
              return (
                <div
                  key={"tick" + i}
                  style={{
                    backgroundColor: "#3abf39",
                    position: "absolute",
                    opacity: 0.5,
                    width: 1,
                    top: i % 5 === 0 ? 1 : 5,
                    bottom: i % 5 === 0 ? 1 : 5,
                    left: (i / ticks) * 100 + "%"
                  }}
                />
              );
            })}
            <div
              style={{
                position: "relative",
                fontSize: "20pt",
                textShadow:
                  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                fontSmoothing: "antialiased"
              }}
            >
              <span
                style={{
                  color: "white",
                  display: "inline-block",
                  margin: "0 5px"
                }}
              >
                {Math.floor(player.Health)}
              </span>
              {player.Shield >= 1 ? (
                <span
                  style={{
                    color: "#ffd62e",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {Math.floor(player.Shield)}
                </span>
              ) : null}
              {player.Poison > 0 ? (
                <span
                  style={{
                    color: "#1e976d",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {player.Poison}
                </span>
              ) : null}
              {player.Burn > 0 ? (
                <span
                  style={{
                    color: "#d99c3e",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {player.Burn}
                </span>
              ) : null}
              {player.HealthRegen > 0 ? (
                <span
                  style={{
                    color: "#96dd4b",
                    display: "inline-block",
                    margin: "0 5px"
                  }}
                >
                  {player.HealthRegen}
                </span>
              ) : null}
            </div>
          </div>
        );
        const board = (
          <div key="board" style={{ display: "flex" }}>
            {player.board
              .filter((x) => x.card.$type === "TCardItem")
              .map((boardCard, i) => (
                <BoardCard
                  boardCard={boardCard}
                  gameState={gameState}
                  key={i}
                  playerID={playerID}
                  boardCardID={i}
                />
              ))}
          </div>
        );
        const boardSkills = (
          <div key="skills" style={{ display: "flex" }}>
            {player.board
              .filter((x) => x.card.$type === "TCardSkill")
              .map((boardCard, i) => (
                <BoardSkill
                  boardCard={boardCard}
                  gameState={gameState}
                  key={i}
                  playerID={playerID}
                  boardCardID={player.board.indexOf(boardCard)}
                />
              ))}
          </div>
        );
        const display =
          playerID === 0
            ? [boardSkills, healthBar, board]
            : [board, healthBar, boardSkills];
        return <div key={playerID}>{display}</div>;
      })}
    </div>
  );
}

function stepCountToSeconds(stepCount) {
  return (stepCount * TICK_RATE) / 1000;
}

const steps = run(initialGameState, 10);

export default function App() {
  const [stepCount, setStepCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoReset, setAutoReset] = useState(false);

  useEffect(() => {
    if (!autoScroll) return;

    const interval = setInterval(() => {
      setStepCount((prev) =>
        prev >= steps.length - 1 ? (autoReset ? 0 : prev) : prev + 1
      );
    }, 100);

    return () => clearInterval(interval);
  }, [autoScroll, autoReset]);

  return (
    <div className="App">
      <Game gameState={steps[stepCount]} />
      <input
        style={{ width: "100%", marginTop: 20 }}
        type="range"
        min="0"
        max={steps.length - 1}
        value={stepCount}
        onChange={(e) => setStepCount(Number(e.target.value))}
      />
      <div style={{ marginTop: 10 }}>
        <label style={{ marginRight: 10 }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />{" "}
          Auto Scroll
        </label>
        <label>
          <input
            type="checkbox"
            checked={autoReset}
            onChange={(e) => setAutoReset(e.target.checked)}
          />{" "}
          Auto Reset
        </label>
      </div>

      <p>Time: {stepCountToSeconds(stepCount).toFixed(1)}s </p>
      <p>
        Steps: {stepCount}/{steps.length - 1}
      </p>
    </div>
  );
}
