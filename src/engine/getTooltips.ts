import { AttributeType, type ActionType } from "@/types/cardTypes";
import { GameState, getCardAttribute, getActionValue } from "./Engine";

export function getTooltips(
  gameState: GameState,
  playerID: number,
  boardCardID: number,
): string[] {
  const boardCard = gameState.players[playerID].board[boardCardID];
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
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.HasteTargets,
            ),
          );
        } else if (action.$type === "TActionCardSlow") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.SlowTargets,
            ),
          );
        } else if (action.$type === "TActionCardFreeze") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.FreezeTargets,
            ),
          );
        } else if (action.$type === "TActionCardCharge") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.ChargeTargets,
            ),
          );
        } else if (action.$type === "TActionCardReload") {
          return String(
            getCardAttribute(
              gameState,
              playerID,
              boardCardID,
              AttributeType.ReloadTargets,
            ),
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
            getActionValue(
              gameState,
              action.Value.Modifier.Value,
              playerID,
              boardCardID,
              playerID,
              boardCardID,
            ),
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
            const actionValue = getActionValue(
              gameState,
              action.Value,
              playerID,
              boardCardID,
              playerID,
              boardCardID,
            );
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
                  getActionValue(
                    gameState,
                    action.SpawnContext.Limit,
                    playerID,
                    boardCardID,
                    playerID,
                    boardCardID,
                  ),
                );
              }
              return ""; // Ensure string return
            case "TActionPlayerDamage":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.DamageAmount,
                ) ?? "",
              ); // Coalesce to empty string if undefined
            case "TActionCardReload":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.ReloadAmount,
                ) ?? "",
              );
            case "TActionPlayerHeal":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.HealAmount,
                ) ?? "",
              );
            case "TActionPlayerShieldApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.ShieldApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerPoisonApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.PoisonApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerBurnApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.BurnApplyAmount,
                ) ?? "",
              );
            case "TActionPlayerRegenApply":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.RegenApplyAmount,
                ) ?? "",
              );
            case "TActionCardFreeze":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.FreezeAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardHaste":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.HasteAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardSlow":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.SlowAmount,
                ) ?? 0) / 1000,
              );
            case "TActionCardCharge":
              return String(
                (getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.ChargeAmount,
                ) ?? 0) / 1000,
              );
            case "TActionPlayerBurnRemove":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
                  AttributeType.BurnRemoveAmount,
                ) ?? "",
              );
            case "TActionPlayerPoisonRemove":
              return String(
                getCardAttribute(
                  gameState,
                  playerID,
                  boardCardID,
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
