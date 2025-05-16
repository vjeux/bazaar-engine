import { useState } from "react";
import { Input } from "./ui/input";
import { useSimulatorStore, useStepCount } from "@/lib/simulatorStore";
import { EventLogEntry } from "@/engine/engine2/eventHandlers";

// EventLog component that uses only the store
export function EventLog() {
  const [filter, setFilter] = useState("");
  const currentStep = useStepCount();
  const gameState = useSimulatorStore(
    (state) => state.steps[Math.min(state.stepCount, state.steps.length - 1)],
  );

  const eventLog = gameState.eventBus.getEventLog(currentStep);

  // Filter events based on search term
  const filteredEvents = eventLog.filter((event: EventLogEntry) => {
    if (!filter) return true;

    const searchLower = filter.toLowerCase();
    const eventNameMatch = event.eventName.toLowerCase().includes(searchLower);
    const dataString = JSON.stringify(event.data).toLowerCase();
    const dataMatch = dataString.includes(searchLower);

    return eventNameMatch || dataMatch;
  });

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter events..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-2"
        />
        <div className="text-muted-foreground ml-2 text-sm whitespace-nowrap">
          Step: {currentStep} ({(currentStep / 10).toFixed(1)}s)
        </div>
      </div>

      <div className="text-muted-foreground mb-2 text-sm">
        {filteredEvents.length} events found
      </div>

      <div className="flex h-[calc(100%-80px)] flex-col gap-2 overflow-y-auto">
        {filteredEvents.map((event: EventLogEntry, index: number) => (
          <EventCard key={index} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: EventLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  // Format timestamp to readable time
  const formattedTime = new Date(event.timestamp).toLocaleTimeString();

  return (
    <div
      className="bg-card hover:bg-accent/30 cursor-pointer rounded border p-2 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between">
        <span className="font-medium">{event.eventName}</span>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground text-xs">{formattedTime}</span>
          {event.step !== undefined && (
            <span className="text-muted-foreground text-xs">
              Step: {event.step} ({(event.step / 10).toFixed(1)}s)
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <pre className="bg-muted mt-2 max-h-96 overflow-auto rounded p-2 text-xs whitespace-pre-wrap">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
