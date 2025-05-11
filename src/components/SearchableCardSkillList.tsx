import { memo, useCallback, useMemo, useState } from "react";
import { Card, Cards, CardType } from "../types/cardTypes.ts";
import Fuse from "fuse.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip.tsx";
import TooltipWithoutGameState from "./TooltipWithoutGameState.tsx";
import FramedCardOrSkill from "./FramedCardOrSkill.tsx";
import { useSimulatorStore } from "@/lib/simulatorStore.ts";
import { PlayerCardConfig, PlayerSkillConfig } from "@/engine/GameState.ts";
import { CARDS_VERSION } from "@/lib/constants.ts";
import { GroupedVirtuoso } from "react-virtuoso";

const CARD_HEIGHT = 70;
const SKILL_SIZE = 70;

export const SearchableCardSkillList = memo(SearchableCardSkillList_);
function SearchableCardSkillList_({ Cards }: { Cards: Cards }) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const addPlayerCard = simulatorStoreActions.addPlayerCard;
  const addPlayerSkill = simulatorStoreActions.addPlayerSkill;

  const handleCardSelect = useCallback(
    (card: Card) => {
      const cardConfig: PlayerCardConfig = {
        cardId: card.Id,
        tier: card.StartingTier,
      };
      addPlayerCard(cardConfig);
    },
    [addPlayerCard],
  );

  const handleSkillSelect = useCallback(
    (card: Card) => {
      const skillConfig: PlayerSkillConfig = {
        cardId: card.Id,
        tier: card.StartingTier,
      };
      addPlayerSkill(skillConfig);
    },
    [addPlayerSkill],
  );

  const [search, setSearch] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(Cards[CARDS_VERSION], {
        keys: ["Localization.Title.Text"],
        threshold: 0.3,
      }),
    [Cards],
  );

  const searchResults = useMemo(() => {
    if (search.length > 0) {
      return fuse.search(search).map((result) => result.item);
    }
    return Cards[CARDS_VERSION].slice().sort((a, b) =>
      a.Localization.Title.Text.localeCompare(b.Localization.Title.Text),
    );
  }, [search, Cards, fuse]);

  // Filter results by type
  const filteredCards = useMemo(
    () =>
      searchResults.filter((item: Card) => item.$type === CardType.TCardItem),
    [searchResults],
  );

  const filteredSkills = useMemo(
    () => searchResults.filter((item) => item.$type === CardType.TCardSkill),
    [searchResults],
  );

  // Create group counts for GroupedVirtuoso
  const groupCounts = useMemo(() => {
    const counts = [];

    // Add cards count if we have cards
    if (filteredCards.length > 0) {
      counts.push(filteredCards.length);
    }

    // Add skills count if we have skills
    if (filteredSkills.length > 0) {
      counts.push(filteredSkills.length);
    }

    return counts;
  }, [filteredCards.length, filteredSkills.length]);

  // Group content renderer (headers)
  const groupContent = useCallback(
    (groupIndex: number) => {
      // First group is cards (if any), second group is skills
      const isCardGroup = groupIndex === 0 && filteredCards.length > 0;
      const title = isCardGroup ? "Cards" : "Skills";

      return (
        <div className="bg-background flex flex-col items-center">
          <h4 className="text-xs font-medium text-gray-500 uppercase">
            {title}
          </h4>
          <hr className="w-full" />
        </div>
      );
    },
    [filteredCards.length],
  );

  // Item content renderer
  const itemContent = useCallback(
    (absoluteIndex: number, groupIndex: number) => {
      // First group is cards (if we have cards), second group is skills
      const isCardGroup = groupIndex === 0 && filteredCards.length > 0;

      // Get the item from the correct array based on group
      const item = isCardGroup
        ? filteredCards[absoluteIndex]
        : filteredSkills[
            absoluteIndex -
              (filteredCards.length > 0 ? filteredCards.length : 0)
          ];

      return (
        <SearchResultItem
          item={item}
          onSelectSkill={handleSkillSelect}
          onSelectCard={handleCardSelect}
        />
      );
    },
    [filteredCards, filteredSkills, handleCardSelect, handleSkillSelect],
  );

  return (
    <div className="bg-background border-border flex min-w-96 flex-col overflow-x-visible rounded border p-3">
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
      {groupCounts.length > 0 ? (
        <GroupedVirtuoso
          groupCounts={groupCounts}
          groupContent={groupContent}
          itemContent={itemContent}
        />
      ) : (
        <div className="text-center text-sm text-gray-500">
          No results found
        </div>
      )}
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
        <TriggerContent
          item={item}
          key={item.Id}
          onClick={() => {
            if (item.$type == CardType.TCardSkill) {
              onSelectSkill(item);
            } else {
              onSelectCard(item);
            }
          }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <TooltipWithoutGameState card={item} />
      </TooltipContent>
    </Tooltip>
  );
}

const TriggerContent = memo(TriggerContent_);
function TriggerContent_({
  item,
  ...props
}: { item: Card } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      key={item.Id}
      className="hover:bg-accent text-secondary-foreground flex grow items-center justify-between gap-2 rounded p-1 pr-4 text-sm hover:cursor-pointer"
      {...props}
    >
      <span>{item.Localization.Title.Text}</span>

      <FramedCardOrSkill
        card={item}
        cardHeight={CARD_HEIGHT}
        skillSize={SKILL_SIZE}
      />
    </div>
  );
}
