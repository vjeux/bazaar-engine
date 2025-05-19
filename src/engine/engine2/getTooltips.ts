import { AttributeType, type ActionType } from "@/types/cardTypes";
import { CardLocationID, GameState } from "./engine2";
import { getCardAttribute } from "./getAttribute";
import { getActionValue } from "./getActionValue";

export function getTooltips(
  gameState: GameState,
  cardID: CardLocationID,
): string[] {
  const boardCard = gameState.players[cardID.playerIdx].board[cardID.cardIdx];
  const card = boardCard.card; // workaround to get abilitias and auras as they might not exist on the boardCard directly, if they are not a part of the tier, and the tooltips reference a different tiers values.
  return boardCard.TooltipIds.map((tooltipId: number) => {
    const tooltipObject = boardCard.Localization.Tooltips[tooltipId];
    if (!tooltipObject) {
      return null;
    }
    const tooltip: string = tooltipObject.Content.Text.replace(
      /\{([a-z]+)\.([a-z0-9]+)\.targets\}/g,
      (_: string, type: string, id: string | number): string => {
        const action = card[type === "aura" ? "Auras" : "Abilities"][id].Action;
        if (action.$type === "TActionCardHaste") {
          return String(
            getCardAttribute(gameState, cardID, AttributeType.HasteTargets),
          );
        } else if (action.$type === "TActionCardSlow") {
          return String(
            getCardAttribute(gameState, cardID, AttributeType.SlowTargets),
          );
        } else if (action.$type === "TActionCardFreeze") {
          return String(
            getCardAttribute(gameState, cardID, AttributeType.FreezeTargets),
          );
        } else if (action.$type === "TActionCardCharge") {
          return String(
            getCardAttribute(gameState, cardID, AttributeType.ChargeTargets),
          );
        } else if (action.$type === "TActionCardReload") {
          return String(
            getCardAttribute(gameState, cardID, AttributeType.ReloadTargets),
          );
        }
        return `{?${type}.${id}.targets}`;
      },
    )
      .replace(
        /\{([a-z]+)\.([a-z0-9]+)\.mod\}/g,
        (_: string, type: string, id: string | number): string => {
          const action =
            card[type === "aura" ? "Auras" : "Abilities"][id].Action;
          if (!action.Value || !action.Value.Modifier) {
            return "";
          }
          return String(
            getActionValue(gameState, action.Value.Modifier.Value, cardID),
          );
        },
      )
      .replace(
        /\{([a-z]+)\.([a-z0-9]+)\}/g,
        (_: string, type: string, id: string | number): string => {
          // Ensure a string is always returned
          const action =
            card[type === "aura" ? "Auras" : "Abilities"][id].Action;

          if (action.Value) {
            const actionValue = getActionValue(gameState, action.Value, cardID);
            if (
              action.$type === "TAuraActionCardModifyAttribute" &&
              (action.AttributeType === "SlowAmount" ||
                action.AttributeType === "FreezeAmount" ||
                action.AttributeType === "HasteAmount" ||
                action.AttributeType === "ChargeAmount")
            ) {
              return String(actionValue / 1000);
            } else {
              return String(actionValue);
            }
          }

          switch (action.$type as ActionType) {
            case "TActionGameSpawnCards":
              if ("SpawnContext" in action && action.SpawnContext) {
                return String(
                  getActionValue(gameState, action.SpawnContext.Limit, cardID),
                );
              }
              return ""; // Ensure string return
            case "TActionPlayerDamage":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.DamageAmount,
                ) ?? "",
              ); // Coalesce to empty string if undefined
            case "TActionCardReload":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.ReloadAmount,
                ) ?? "",
              );
            case "TActionPlayerHeal":
              return String(
                getCardAttribute(gameState, cardID, AttributeType.HealAmount) ??
                  "",
              );
            case "TActionPlayerShieldApply":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.ShieldApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerPoisonApply":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.PoisonApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerBurnApply":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.BurnApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerRegenApply":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.RegenApplyAmount,
                ) ?? "",
              );
            case "TActionCardFreeze":
              return String(
                (getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.FreezeAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardHaste":
              return String(
                (getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.HasteAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardSlow":
              return String(
                (getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.SlowAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardCharge":
              return String(
                (getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.ChargeAmount,
                ) ?? 0) / 1000,
              );
            case "TActionPlayerBurnRemove":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.BurnRemoveAmount,
                ) ?? "",
              );
            case "TActionPlayerPoisonRemove":
              return String(
                getCardAttribute(
                  gameState,
                  cardID,
                  AttributeType.PoisonRemoveAmount,
                ) ?? "",
              );

            default:
              throw new Error(
                action.$type + ": Action type tooltip not implemented",
              );
          }
        },
      );
    return tooltip;
  }).filter((tooltip: string | null) => tooltip !== null);
}
