import { useSimulatorStore, useWinrateCalculation } from "@/lib/simulatorStore";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Calculator } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function WinrateCalculator() {
  const { isCalculating, winrate, progress, total, completed } =
    useWinrateCalculation();
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const targetSimulations = useSimulatorStore(
    (state) => state.targetSimulations,
  );
  const steps = useSimulatorStore((state) => state.steps);
  const [simCount, setSimCount] = useState(
    targetSimulations > 0 ? targetSimulations : 10,
  );
  const lastCalculatedCountRef = useRef(
    targetSimulations > 0 ? targetSimulations : 10,
  );
  const isEnabled = isCalculating || winrate !== null;

  const handleCalculateWinrate = () => {
    if (isEnabled) {
      simulatorStoreActions.resetWinrateCalculation();
    } else {
      simulatorStoreActions.calculateWinrate(simCount);
      lastCalculatedCountRef.current = simCount;
    }
  };

  // Only update the input value, but don't trigger recalculation
  const handleSimCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 10;
    setSimCount(value);
  };

  // Handle input blur or Enter key - trigger recalculation
  const handleSimCountUpdate = () => {
    // Only recalculate if winrate tracking is already enabled
    // and the simulation count has changed
    if (isEnabled && simCount !== lastCalculatedCountRef.current) {
      simulatorStoreActions.calculateWinrate(simCount);
      lastCalculatedCountRef.current = simCount;
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
        {isEnabled && (
          <>
            <Input
              type="number"
              min="2"
              max="1000"
              value={simCount}
              onChange={handleSimCountChange}
              onBlur={handleSimCountUpdate}
              onKeyDown={handleKeyDown}
              className="h-8 w-20 text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              disabled={isCalculating}
              placeholder="Sims"
            />
            <span className="text-muted-foreground text-sm leading-none font-medium">
              simulations
            </span>
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleCalculateWinrate}
              className="h-8 w-8 hover:cursor-pointer"
              disabled={isCalculating}
            >
              <Calculator className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Winrate calculation</p>
          </TooltipContent>
        </Tooltip>
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
            <p className="font-mono text-xs whitespace-nowrap">
              {completed}/{total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
