"use client";
import FramedCard from "@/components/FramedCardOrSkill";
import { genCardsAndEncounters } from "@/lib/Data";
import { Card } from "@/types/cardTypes";
import { CardType } from "@/types/cardTypes";

const { Cards: CardsData } = await genCardsAndEncounters();

export default function FramePage() {
  const filteredCards = CardsData["0.1.9"].filter(
    (item: Card) => item.$type === CardType.TCardItem,
  );
  const filteredSkills = CardsData["0.1.9"].filter(
    (item) => item.$type === CardType.TCardSkill,
  );
  return (
    <>
      <div className="text-foreground max-h-full gap-4 overflow-hidden p-4">
        {filteredCards.slice(0, 10).map((card) => (
          <FramedCard key={card.Id} card={card} />
        ))}
        {filteredSkills.slice(0, 10).map((skill) => (
          <FramedCard key={skill.Id} card={skill} />
        ))}
      </div>
    </>
  );
}
