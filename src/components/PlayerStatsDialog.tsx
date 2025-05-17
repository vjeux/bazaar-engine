import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSimulatorStore } from "@/lib/simulatorStore";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";
import type { GameState } from "@/engine/Engine";
import type { GameState as Engine2GameState } from "@/engine/engine2/engine2";

export function PlayerStatsDialog() {
  const playerConfig = useSimulatorStore((state) => state.playerConfig);
  const setPlayerConfig = useSimulatorStore(
    (state) => state.actions.setPlayerConfig,
  );

  const [health, setHealth] = useState(
    playerConfig.health?.toString() || "2000",
  );
  const [healthRegen, setHealthRegen] = useState(
    playerConfig.healthRegen?.toString() || "0",
  );
  const [income, setIncome] = useState(playerConfig.income?.toString() || "0");
  const [gold, setGold] = useState(playerConfig.gold?.toString() || "0");
  const [open, setOpen] = useState(false);

  // Update local state when player config changes
  useEffect(() => {
    if (open) {
      setHealth(playerConfig.health?.toString() || "2000");
      setHealthRegen(playerConfig.healthRegen?.toString() || "0");
      setIncome(playerConfig.income?.toString() || "0");
      setGold(playerConfig.gold?.toString() || "0");
    }
  }, [open, playerConfig]);

  const handleSave = () => {
    setPlayerConfig({
      ...playerConfig,
      health: parseInt(health) || 2000,
      healthRegen: parseInt(healthRegen) || 0,
      income: parseInt(income) || 0,
      gold: parseInt(gold) || 0,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hover:cursor-pointer"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Player Stats</DialogTitle>
          <DialogDescription>
            Configure your player stats for the simulation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="health">Health</Label>
            <Input
              id="health"
              type="number"
              value={health}
              onChange={(e) => setHealth(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="healthRegen">Health Regen</Label>
            <Input
              id="healthRegen"
              type="number"
              value={healthRegen}
              onChange={(e) => setHealthRegen(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="income">Income</Label>
            <Input
              id="income"
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gold">Gold</Label>
            <Input
              id="gold"
              type="number"
              value={gold}
              onChange={(e) => setGold(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
