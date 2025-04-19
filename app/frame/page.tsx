"use client";
import FramedCard from "@/components/FramedCardOrSkill";
import { genCardsAndEncounters } from "@/lib/Data";

const { Cards: CardsData } = await genCardsAndEncounters();

export default function FramePage() {
  return (
    <>
      <div className="text-foreground max-h-full gap-4 overflow-hidden p-4">
        {CardsData["0.1.9"].slice(0, 10).map((card) => (
          <FramedCard key={card.Id} card={card} />
        ))}
      </div>
    </>
  );
}
