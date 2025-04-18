"use client";
import { type BoardCard, type GameState, getCardAttribute } from "@/engine/Engine";
import React from "react";
import { CARD_HEIGHT, Tooltip } from "./-App";

export function BoardCardElement({
  boardCard, gameState, playerID, boardCardID,
}: {
  boardCard: BoardCard;
  gameState: GameState;
  playerID: number;
  boardCardID: number;
}) {
  const card = boardCard.card;
  const tier = boardCard.tier;
  const cardWidth = card.Size === "Small"
    ? CARD_HEIGHT / 2
    : card.Size === "Medium"
      ? CARD_HEIGHT / 1
      : CARD_HEIGHT * 1.5;

  const localeText = card.Localization.Title.Text;
  const imgUrl = `https://www.howbazaar.gg/images/items/${localeText.replace(
    /[ '\-&]/g,
    ""
  )}.avif`;

  const paddingTop = 0.06;
  const paddingLeft = 0.03;
  const paddingBottom = 0.1;
  const paddingRight = 0.04;

  const sizesOneLetter = {
    Large: "L",
    Medium: "M",
    Small: "S",
  };
  const frameUrl = `https://www.bazaarplanner.com/images/fromBT/CardFrame_${tier}_${sizesOneLetter[card.Size]}_TUI.png`;

  const DamageAmount = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "DamageAmount"
  );
  const HealAmount = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "HealAmount"
  );
  const BurnApplyAmount = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "BurnApplyAmount"
  );
  const PoisonApplyAmount = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "PoisonApplyAmount"
  );
  const ShieldApplyAmount = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "ShieldApplyAmount"
  );
  const Freeze = getCardAttribute(gameState, playerID, boardCardID, "Freeze");
  const Slow = getCardAttribute(gameState, playerID, boardCardID, "Slow");
  const Haste = getCardAttribute(gameState, playerID, boardCardID, "Haste");
  const CritChance = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "CritChance"
  );
  const SellPrice = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "SellPrice"
  );
  const Multicast = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "Multicast"
  );
  const AmmoMax = getCardAttribute(gameState, playerID, boardCardID, "AmmoMax");
  const Ammo = getCardAttribute(gameState, playerID, boardCardID, "Ammo");
  const CooldownMax = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "CooldownMax"
  );
  const Lifesteal = getCardAttribute(
    gameState,
    playerID,
    boardCardID,
    "Lifesteal"
  );

  return (
    // Tooltip container
    <div
      className="tooltipContainer"
      style={{ position: "relative" }}
      onClick={() => {
        console.log(boardCard);
      }}
    >
      {/* Settings button */}
      <div
        style={{ position: "absolute", top: 2, right: 2, zIndex: 1 }}
        className="tooltip"
      >
        <button type="button">⚙️</button>
      </div>
      {/* Card container */}
      <div
        style={{
          margin: 5,
          position: "relative",
          height: CARD_HEIGHT,
          width: cardWidth,
          marginTop: 5,
          opacity: boardCard.isDisabled ? 0.1 : 1,
        }}
      >
        {/* Image container */}
        <div
          style={{
            position: "absolute",
            top: CARD_HEIGHT * paddingTop,
            left: CARD_HEIGHT * paddingLeft,
            bottom: CARD_HEIGHT * paddingBottom,
            right: CARD_HEIGHT * paddingRight,
          }}
        >
          <img
            src={imgUrl}
            style={{
              filter: boardCard.Freeze > 0 ? "grayscale(1)" : "",
              opacity: boardCard.Freeze > 0 ? 0.5 : 1,
              borderRadius: 5,
            }}
            width="100%"
            height="100%" />
        </div>
        {/* Frame image */}
        <img
          src={frameUrl}
          style={{
            position: "absolute",
          }}
          width="100%"
          height="100%" />
        {/* Cooldown Indicator */}
        {CooldownMax > 0 ? (
          <div
            style={{
              position: "absolute",
              left: CARD_HEIGHT * paddingLeft,
              right: CARD_HEIGHT * paddingRight,
              bottom: CARD_HEIGHT * paddingBottom +
                (boardCard.tick / CooldownMax) *
                (CARD_HEIGHT -
                  CARD_HEIGHT * (paddingTop + paddingBottom) -
                  2),
              borderTop: "2px solid white",
              color: "white",
              textAlign: "right",
              fontSize: "8pt",
              boxSizing: "border-box",
              height: 2,
            }}
          >
            <span
              style={{
                position: "absolute",
                ...(boardCard.tick / boardCard.CooldownMax > 0.5
                  ? { top: 1 }
                  : { bottom: 3 }),
                right: 2,
                display: "inline-block",
              }}
            >
              {(boardCard.tick / 1000).toFixed(1)} /{" "}
              {(CooldownMax / 1000).toFixed(1)}
            </span>
          </div>
        ) : null}
        {/* Status effects container */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            color: "white",
            whiteSpace: "preserve nowrap",
          }}
        >
          {Freeze > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2,
              }}
            >
              ❄️ {(Freeze / 1000).toFixed(1)}
            </div>
          ) : null}
          {Slow > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2,
              }}
            >
              🐌 {(Slow / 1000).toFixed(1)}
            </div>
          ) : null}
          {Haste > 0 ? (
            <div
              style={{
                background: "rgba(0.2, 0.2, 0.2, 0.5)",
                padding: "2px 5px",
                borderRadius: 5,
                margin: 2,
              }}
            >
              ⏱️ {(Haste / 1000).toFixed(1)}
            </div>
          ) : null}
        </div>
        {/* Amount container */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            top: (CARD_HEIGHT * paddingTop) / 2,
          }}
        >
          {DamageAmount !== undefined && (
            <div
              style={{
                background: Lifesteal > 0
                  ? "linear-gradient(to bottom right, purple, red)"
                  : "red",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white",
              }}
            >
              {DamageAmount}
            </div>
          )}
          {HealAmount !== undefined && (
            <div
              style={{
                backgroundColor: "limegreen",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white",
              }}
            >
              {HealAmount}
            </div>
          )}
          {BurnApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "orange",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white",
              }}
            >
              {BurnApplyAmount}
            </div>
          )}
          {PoisonApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "purple",
                padding: "2px 5px",
                margin: "0 2px",
                borderRadius: 5,
                color: "white",
              }}
            >
              {PoisonApplyAmount}
            </div>
          )}
          {ShieldApplyAmount !== undefined && (
            <div
              style={{
                backgroundColor: "yellow",
                borderRadius: 5,
                padding: "2px 5px",
                margin: "0 2px",
              }}
            >
              {ShieldApplyAmount}
            </div>
          )}
        </div>
        {CritChance > 0 && (
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 0,
              backgroundColor: "red",
              padding: "1px 3px",
              borderRadius: 5,
              fontSize: "9pt",
              color: "white",
            }}
          >
            🎯 {CritChance + "%"}
          </div>
        )}
        {SellPrice !== undefined && (
          <div
            style={{
              position: "absolute",
              bottom: 4,
              left: 0,
              backgroundColor: "orange",
              padding: "1px 3px",
              borderRadius: 5,
              fontSize: "9pt",
              color: "white",
            }}
          >
            💰 {SellPrice}
          </div>
        )}
        {Multicast !== undefined && Multicast > 1 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: 20,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              padding: "1px 3px",
              borderRadius: 5,
              fontSize: "9pt",
              color: "white",
            }}
          >
            x{Multicast}
          </div>
        )}
        {AmmoMax !== undefined && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 22,
              display: "flex",
              backgroundColor: "gray",
              padding: "2px 5px",
              borderRadius: 5,
            }}
          >
            {AmmoMax > 5 ? (
              <div style={{ color: "orange", fontSize: "8pt" }}>
                {Ammo === undefined ? AmmoMax : Ammo}/{AmmoMax}&nbsp;
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 4,
                    display: "inline-block",
                    backgroundColor: "orange",
                    margin: "1px 1px",
                    border: "1px solid orange",
                  }} />
              </div>
            ) : (
              [...new Array(AmmoMax)].map((_, i) => {
                return (
                  // Ammo indicator
                  <div
                    key={"ammo" + i}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 4,
                      backgroundColor: (Ammo === undefined ? AmmoMax : Ammo) > i
                        ? "orange"
                        : "transparent",
                      margin: "1px 1px",
                      border: "1px solid orange",
                    }} />
                );
              })
            )}
          </div>
        )}
      </div>
      <Tooltip
        boardCard={boardCard}
        gameState={gameState}
        playerID={playerID}
        boardCardID={boardCardID} />
    </div>
  );
}
