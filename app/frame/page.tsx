"use client";
import FramedCard from "@/components/FramedCardOrSkill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { genCardsAndEncounters } from "@/lib/Data";

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

export default function FramePage() {
  return (
    <>
      <Tooltip>
        <TooltipTrigger>
          <button className="px-2 py-1">❔</button>
        </TooltipTrigger>
        <TooltipContent>Tooltip content, hello world!</TooltipContent>
      </Tooltip>
      <div className="text-foreground max-h-full gap-4 overflow-hidden p-4">
        {CardsData["0.1.9"].slice(0, 10).map((card) => (
          <FramedCard key={card.Id} card={card} />
        ))}
      </div>
    </>
  );
}
