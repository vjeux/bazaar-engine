import type { GameState } from "../engine/Engine.ts";

interface HealthBarProps {
  gameState: GameState;
  playerId: number;
}

export function HealthBar({ gameState, playerId }: HealthBarProps) {
  const player = gameState.players[playerId];
  if (!player) {
    // Handle case where player might not exist yet or ID is invalid
    return (
      <div className="bg-muted border-border relative h-6 w-full rounded border">
        Invalid Player ID
      </div>
    );
  }

  const healthPercentage =
    player.HealthMax > 0
      ? Math.max(0, (player.Health / player.HealthMax) * 100)
      : 0;
  const healthBarColor = "bg-green-600";
  const textColor = "text-primary";

  return (
    <div className="bg-muted border-border relative h-6 w-full rounded border">
      <div
        className={`${healthBarColor} h-full rounded`}
        style={{ width: `${healthPercentage}%` }}
      ></div>
      <span
        className={`absolute inset-0 flex items-center justify-center text-sm ${textColor}`}
      >
        {Math.round(player.Health)} / {player.HealthMax}
      </span>
    </div>
  );
}
