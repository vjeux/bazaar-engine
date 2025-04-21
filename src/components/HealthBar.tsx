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

  // Extract player attributes
  const Poison = player.Poison || 0;
  const Burn = player.Burn || 0;
  const HealthRegen = player.HealthRegen || 0;
  const Health = player.Health;
  const HealthMax = player.HealthMax;
  const Shield = player.Shield || 0;

  const healthPercentage =
    HealthMax > 0 ? Math.max(0, (Health / HealthMax) * 100) : 0;

  const shieldPercentage =
    HealthMax > 0 ? Math.min(100, (Shield / HealthMax) * 100) : 0;

  // Determine health bar color based on status effects
  const healthBarColor = Poison > 0 ? "bg-emerald-800" : "bg-green";

  // Calculate ticks for health bar
  const ticks = Math.floor(HealthMax / 50);

  return (
    <div className="bg-muted border-border relative h-8 min-h-8 w-full overflow-hidden rounded border">
      {/* Health bar */}
      <div
        className={`${healthBarColor} h-full`}
        style={{ width: `${healthPercentage}%` }}
      ></div>

      {/* Shield bar */}
      {Shield > 0 && (
        <div
          className="absolute top-0 h-full bg-yellow-500/50"
          style={{ width: `${shieldPercentage}%` }}
        ></div>
      )}

      {/* Health ticks */}
      {[...Array(ticks)].map(
        (_, i) =>
          i > 0 && (
            <div
              key={`tick-${i}`}
              className={`absolute w-0.5 bg-gray-400/30 ${i % 5 === 0 ? "top-0.5 bottom-0.5" : "top-1 bottom-1"}`}
              style={{ left: `${(i / ticks) * 100}%` }}
            />
          ),
      )}

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Health and status effects */}
        <div className="flex items-center space-x-1 text-sm font-medium text-shadow-lg/100">
          <span className="text-white">{Math.round(Health)}</span>

          {Shield > 0 && <span className="text-yellow-300">{Shield}</span>}

          {Poison > 0 && <span className="text-emerald-400">{Poison}</span>}

          {Burn > 0 && <span className="text-amber-400">{Burn}</span>}

          {HealthRegen > 0 && (
            <span className="text-lime-300">{HealthRegen}</span>
          )}
        </div>
      </div>
    </div>
  );
}
