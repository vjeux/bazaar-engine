import { useSimulatorStore } from "@/lib/simulatorStore";
import { LogEntry } from "@/engine/engine2/engine2";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function EventLog() {
  const stepCount = useSimulatorStore((state) => state.stepCount);
  const steps = useSimulatorStore((state) => state.steps);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "command" | "event">(
    "all",
  );

  // Get the unified log from the current step
  const unifiedLog: LogEntry[] = steps[stepCount]?.eventBus
    .getUnifiedLog()
    .filter((entry) => entry.step === stepCount);

  // Apply filters
  const filteredLog = unifiedLog.filter((entry) => {
    // Filter by type
    if (typeFilter !== "all" && entry.type !== typeFilter) {
      return false;
    }

    // Filter by text search
    if (filter) {
      const searchLower = filter.toLowerCase();
      const nameMatch = entry.name.toLowerCase().includes(searchLower);
      const descMatch = entry.description.toLowerCase().includes(searchLower);
      const dataMatch = entry.data
        ? JSON.stringify(entry.data).toLowerCase().includes(searchLower)
        : false;

      return nameMatch || descMatch || dataMatch;
    }

    return true;
  });

  return (
    <div className="flex h-full flex-col p-2">
      <div className="mb-2 flex gap-2">
        <Input
          placeholder="Search log..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-grow"
        />
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(value as "all" | "command" | "event")
          }
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="command">Commands</SelectItem>
            <SelectItem value="event">Events</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-muted-foreground mb-2 text-xs">
        {filteredLog.length} of {unifiedLog.length} entries
      </div>

      <ScrollArea className="flex-grow">
        <div className="space-y-2">
          {filteredLog.length === 0 ? (
            <div className="text-muted-foreground py-4 text-center">
              No matching entries for this step
            </div>
          ) : (
            filteredLog.map((entry, index) => (
              <LogEntryCard key={`${index}-${entry.timestamp}`} entry={entry} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function LogEntryCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="hover:bg-accent/10 cursor-pointer rounded-md border p-2 text-xs"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between font-semibold">
        <span>{entry.description}</span>
        <Badge
          variant={entry.type === "command" ? "secondary" : "outline"}
          className="ml-2"
        >
          {entry.type}
        </Badge>
      </div>
      <div className="text-muted-foreground">
        {entry.name} - Step: {entry.step}
      </div>

      {expanded && entry.data && (
        <div className="mt-2 border-t pt-2">
          <pre className="bg-muted max-h-40 overflow-auto rounded p-2 text-xs whitespace-pre-wrap">
            {JSON.stringify(entry.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
