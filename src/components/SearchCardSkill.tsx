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
      return ValidSkillNames.includes(cardName) ||
        ValidItemNames.includes(cardName);
    });
  }, [Cards]);

  const fuse = new Fuse(filteredItems, {
    keys: [
      "Localization.Title.Text",
    ],
  });

  const searchResults = useMemo(() => {
    if (search.length > 0) {
      return fuse.search(search).map((result) => result.item);
    }
    return filteredItems;
  }, [search, filteredItems, fuse]);

  return (
    <div className="w-64 flex flex-col gap-2 bg-background p-3 rounded border border-border overflow-auto">
      <h2 className="text-lg font-semibold mb-2 text-card-foreground">
        Cards & Skills
      </h2>
      <input
        type="text"
        placeholder="Search cards & skills..."
        className="bg-input border border-input rounded p-1 mb-2 text-sm text-foreground"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex-grow overflow-y-auto gap-1 pr-1">
        {searchResults.map((item) => (
          <div
            key={item.Id}
            className="flex items-center gap-2 p-1 rounded hover:bg-accent cursor-pointer text-sm text-secondary-foreground"
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
                "w-8 h-10 border border-border rounded bg-card flex items-center justify-center text-[8px] text-muted-foreground",
                item.$type == CardType.TCardSkill && "rounded-full h-8",
              )}
            />
            <span>{item.Localization.Title.Text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
