import { useSimulatorStore, useWinrateCalculation } from "@/lib/simulatorStore";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";

export default function WinrateCalculator() {
  const { isCalculating, winrate, progress, total, completed } =
    useWinrateCalculation();
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const targetSimulations = useSimulatorStore(
    (state) => state.targetSimulations,
  );
  const steps = useSimulatorStore((state) => state.steps);
  const [simCount, setSimCount] = useState(
    targetSimulations.toString() || "100",
  );

  const isWinrateTrackingEnabled = isCalculating || winrate !== null;

  const handleCalculateWinrate = () => {
    if (isWinrateTrackingEnabled) {
      simulatorStoreActions.resetWinrateCalculation();
    } else {
      const numSimulations = parseInt(simCount) || 100;
      simulatorStoreActions.calculateWinrate(numSimulations);
    }
  };

  // Only update the input value, but don't trigger recalculation
  const handleSimCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimCount(e.target.value);
  };

  // Handle input blur or Enter key - trigger recalculation
  const handleSimCountUpdate = () => {
    // Only recalculate if winrate tracking is already enabled and not currently calculating
    if (isWinrateTrackingEnabled && !isCalculating) {
      const numSimulations = parseInt(simCount) || 100;
      simulatorStoreActions.calculateWinrate(numSimulations);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // Remove focus
      handleSimCountUpdate();
    }
  };

  // Get the winner from last step
  const lastStep = steps.at(-1);
  const winner = lastStep?.winner;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="calculate-winrate"
          checked={isWinrateTrackingEnabled}
          onCheckedChange={handleCalculateWinrate}
        />
        <label
          htmlFor="calculate-winrate"
          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Calculate Winrate
        </label>

        {isWinrateTrackingEnabled && (
          <>
            <Input
              type="number"
              min="10"
              max="1000"
              value={simCount}
              onChange={handleSimCountChange}
              onBlur={handleSimCountUpdate}
              onKeyDown={handleKeyDown}
              className="h-8 w-20 text-xs"
              disabled={isCalculating}
              placeholder="Sims"
            />
            <span className="text-muted-foreground text-sm leading-none font-medium">
              x simulations
            </span>
          </>
        )}
      </div>

      {/* Combined Winner, Winrate, and Progress display */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-sm font-medium",
              winner === "Player" && "text-green-600",
              winner === "Enemy" && "text-red-500",
              winner === "Draw" && "text-yellow-500",
            )}
          >
            {winner === "Player" ? "Win" : winner === "Enemy" ? "Loss" : "Draw"}
          </span>
          {winrate !== null && (
            <span
              className={cn(
                "text-sm",
                winrate > 0.5
                  ? "text-green-600"
                  : winrate < 0.5
                    ? "text-red-500"
                    : "text-yellow-500",
              )}
            >
              ({(winrate * 100).toFixed(1)}% winrate)
            </span>
          )}
        </div>

        {/* Progress display */}
        {isCalculating && (
          <div className="flex w-40 items-center gap-1">
            <div className="w-full">
              <Progress value={progress * 100} className="h-2 w-full" />
            </div>
            <p className="text-xs whitespace-nowrap">
              {completed}/{total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
