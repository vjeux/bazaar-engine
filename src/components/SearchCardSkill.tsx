import { useMemo, useState } from "react";
import { Card, Cards, CardType } from "../types/cardTypes.ts";
import Fuse from "fuse.js";
import ValidSkillNames from "../json/ValidSkillNames.json";
import ValidItemNames from "../json/ValidItemNames.json";
import { cn } from "../lib/utils.ts";

export function SearchCardSkill({
  Cards,
  onSelectCard,
  onSelectSkill,
}: {
  Cards: Cards;
  onSelectCard: (card: Card) => void;
  onSelectSkill: (card: Card) => void;
}) {
  const [search, setSearch] = useState("");

  // Filter for valid rd and skill names
  const filteredItems = useMemo(() => {
    return Cards["0.1.9"].filter((card) => {
      const cardName = card.Localization.Title.Text;
      return (
        ValidSkillNames.includes(cardName) || ValidItemNames.includes(cardName)
      );
    });
  }, [Cards]);

  const fuse = new Fuse(filteredItems, {
    keys: ["Localization.Title.Text"],
  });

  const searchResults = useMemo(() => {
    if (search.length > 0) {
      return fuse.search(search).map((result) => result.item);
    }
    return filteredItems;
  }, [search, filteredItems, fuse]);

  return (
    <div className="bg-background border-border flex w-64 flex-col gap-2 overflow-auto rounded border p-3">
      <h2 className="text-card-foreground mb-2 text-lg font-semibold">
        Cards & Skills
      </h2>
      <input
        type="text"
        placeholder="Search cards & skills..."
        className="bg-input border-input text-foreground mb-2 rounded border p-1 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex-grow gap-1 overflow-y-auto pr-1">
        {searchResults.map((item) => (
          <div
            key={item.Id}
            className="hover:bg-accent text-secondary-foreground flex cursor-pointer items-center gap-2 rounded p-1 text-sm"
            onClick={() => {
              if (item.$type == CardType.TCardSkill) {
                onSelectSkill(item);
              } else {
                onSelectCard(item);
              }
            }}
          >
            <div
              className={cn(
                "border-border bg-card text-muted-foreground flex h-10 w-8 items-center justify-center rounded border text-[8px]",
                item.$type == CardType.TCardSkill && "h-8 rounded-full",
              )}
            />
            <span>{item.Localization.Title.Text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
