import type { GameState } from "../engine/Engine.ts";

interface GoldIncomeDisplayProps {
  gameState: GameState;
  playerId: number;
}

export function GoldIncomeDisplay({
  gameState,
  playerId,
}: GoldIncomeDisplayProps) {
  const player = gameState.players[playerId];
  if (!player) return null;

  const gold = player.Gold || 0;
  const income = player.Income || 0;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-yellow text-nowrap">Gold: {gold}</span>
      <span className="text-yellow text-nowrap">Income: {income}</span>
    </div>
  );
}
