import { memo, useMemo, useState } from "react";
import { Card, Cards, CardType } from "../types/cardTypes.ts";
import Fuse from "fuse.js";
import ValidSkillNames from "../json/ValidSkillNames.json";
import ValidItemNames from "../json/ValidItemNames.json";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip.tsx";
import TooltipWithoutGameState from "./TooltipWithoutGameState.tsx";

export const SearchableCardSkillList = memo(SearchableCardSkillList_);
function SearchableCardSkillList_({
  Cards,
  onSelectCard,
  onSelectSkill,
}: {
  Cards: Cards;
  onSelectCard: (card: Card) => void;
  onSelectSkill: (card: Card) => void;
}) {
  const [search, setSearch] = useState("");

  // Filter for valid card and skill names
  const filteredItems = useMemo(() => {
    return Cards["0.1.9"].filter((card) => {
      const cardName = card.Localization.Title.Text;
      return (
        ValidSkillNames.includes(cardName) || ValidItemNames.includes(cardName)
      );
    });
  }, [Cards]);

  const fuse = useMemo(
    () =>
      new Fuse(filteredItems, {
        keys: ["Localization.Title.Text"],
        threshold: 0.3,
      }),
    [filteredItems],
  );

  const searchResults = useMemo(() => {
    if (search.length > 0) {
      return fuse.search(search).map((result) => result.item);
    }
    return filteredItems;
  }, [search, filteredItems, fuse]);

  // Filter results by type
  const filteredCards = searchResults.filter(
    (item: Card) => item.$type === CardType.TCardItem,
  );
  const filteredSkills = searchResults.filter(
    (item) => item.$type === CardType.TCardSkill,
  );

  return (
    <div className="bg-background border-border min-w-96 overflow-x-visible overflow-y-scroll rounded border p-3">
      <h2 className="text-card-foreground mb-2 text-lg font-semibold">
        Cards & Skills
      </h2>
      <input
        type="text"
        placeholder="Search cards & skills..."
        className="bg-input border-input text-foreground mb-2 w-full rounded border p-1 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-col gap-1 pr-1">
        {filteredCards.length > 0 ? (
          <>
            <h4>Cards</h4>
            <hr />
            {filteredCards.map((item) => {
              return (
                <SearchResultItem
                  key={item.Id}
                  item={item}
                  onSelectSkill={onSelectSkill}
                  onSelectCard={onSelectCard}
                />
              );
            })}
          </>
        ) : null}
        {filteredSkills.length > 0 ? (
          <>
            <h4>Skills</h4>
            <hr />
            {filteredSkills.map((item) => {
              return (
                <SearchResultItem
                  key={item.Id}
                  item={item}
                  onSelectSkill={onSelectSkill}
                  onSelectCard={onSelectCard}
                />
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}

const SearchResultItem = memo(SearchResultItem_);
function SearchResultItem_({
  item,
  onSelectSkill,
  onSelectCard,
}: {
  item: Card;
  onSelectSkill: (card: Card) => void;
  onSelectCard: (card: Card) => void;
}) {
  return (
    <Tooltip placement="left">
      <TooltipTrigger>
        <div
          className="hover:bg-accent text-secondary-foreground relative flex cursor-pointer items-center gap-2 rounded p-1 text-sm"
          onClick={() => {
            if (item.$type == CardType.TCardSkill) {
              onSelectSkill(item);
            } else {
              onSelectCard(item);
            }
          }}
        >
          <TriggerContent item={item} key={item.Id} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="bg-card border-border rounded border p-4">
          <TooltipWithoutGameState card={item} />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const TriggerContent = memo(TriggerContent_);
function TriggerContent_({ item }: { item: Card }) {
  const CONTAINER_SIZE = 70;
  const isCard = item.$type === CardType.TCardItem;

  // Common image properties
  const imageUrl = `https://www.howbazaar.gg/images/${isCard ? "items" : "skills"}/${
    item.Localization.Title.Text?.replace(/[ '\-&]/g, "") ?? ""
  }.avif`;

  // Determine frame URL based on card type
  const frameUrl = isCard
    ? `https://www.bazaarplanner.com/images/fromBT/CardFrame_${item.StartingTier}_${
        { Large: "L", Medium: "M", Small: "S" }[item.Size]
      }_TUI.png`
    : `https://www.bazaarplanner.com/images/fromBT/skill_tier_${item.StartingTier.toLowerCase()}.png`;

  // Item-specific properties
  const imgWidth = isCard
    ? item.Size === "Small"
      ? CONTAINER_SIZE / 2
      : item.Size === "Large"
        ? CONTAINER_SIZE * 1.5
        : CONTAINER_SIZE
    : CONTAINER_SIZE;

  // Padding/border calculations
  const padding = isCard
    ? { top: 0.06, left: 0.03, bottom: 0.08, right: 0.02 }
    : { top: 0.1, left: 0.1, bottom: 0.1, right: 0.1 };

  // Calculate container dimensions
  const containerWidth = imgWidth;
  const containerHeight = CONTAINER_SIZE;

  // Image style based on type
  const imageStyle = {
    position: "absolute" as const,
    left: padding.left * containerWidth,
    right: padding.right * containerWidth,
    top: padding.top * containerHeight,
    bottom: padding.bottom * containerHeight,
    ...(isCard ? {} : { borderRadius: "100%" }),
  };

  // Image dimensions
  const imageWidth = isCard
    ? containerWidth * (1 - padding.left - padding.right)
    : containerWidth * (1 - 2 * padding.top);
  const imageHeight = containerHeight * (1 - padding.top - padding.bottom);

  return (
    <div
      key={item.Id}
      className="hover:bg-accent text-secondary-foreground flex grow items-center gap-2 rounded p-1 text-sm"
    >
      {/* Card image with frame */}
      <div
        style={{
          width: imgWidth,
          height: CONTAINER_SIZE,
          position: "relative",
          display: "inline-block",
        }}
      >
        <img
          src={imageUrl}
          style={{
            height: imageHeight,
            width: imageWidth,
            ...imageStyle,
          }}
          alt={item.Localization.Title.Text}
        />
        <img
          src={frameUrl}
          style={{ position: "absolute", top: 0, left: 0 }}
          width="100%"
          height="100%"
        />
      </div>
      <span>{item.Localization.Title.Text}</span>
    </div>
  );
}
