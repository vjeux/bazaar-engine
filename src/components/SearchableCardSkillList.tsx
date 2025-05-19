import { memo, useCallback, useMemo, useState } from "react";
import { Card, Cards, CardType } from "../types/cardTypes.ts";
import Fuse from "fuse.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip.tsx";
import CardTooltip from "./CardTooltip";
import FramedCardOrSkill from "./FramedCardOrSkill.tsx";
import { useSimulatorStore } from "@/lib/simulatorStore.ts";
import { PlayerCardConfig, PlayerSkillConfig } from "@/engine/GameState.ts";
import { CARDS_VERSION } from "@/lib/constants.ts";
import { Virtuoso } from "react-virtuoso";

const CARD_HEIGHT = 70;
const SKILL_SIZE = 70;

export const SearchableCardSkillList = memo(SearchableCardSkillList_);
function SearchableCardSkillList_({ Cards }: { Cards: Cards }) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);

  const handleCardSelect = useCallback(
    (card: Card) => {
      const cardConfig: PlayerCardConfig = {
        cardId: card.Id,
        tier: card.StartingTier,
      };
      simulatorStoreActions.addCard(cardConfig, false);
    },
    [simulatorStoreActions],
  );

  const handleSkillSelect = useCallback(
    (card: Card) => {
      const skillConfig: PlayerSkillConfig = {
        cardId: card.Id,
        tier: card.StartingTier,
      };
      simulatorStoreActions.addSkill(skillConfig, false);
    },
    [simulatorStoreActions],
  );

  const [search, setSearch] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(Cards[CARDS_VERSION], {
        keys: [
          {
            name: "Localization.Title.Text",
            weight: 3,
          },
          "Localization.Tooltips.Content.Text",
        ],
        threshold: 0.3,
        fieldNormWeight: 2,
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

  const itemContent = useCallback(
    (index: number) => {
      const item = searchResults[index];
      return (
        <SearchResultItem
          item={item}
          onSelectSkill={handleSkillSelect}
          onSelectCard={handleCardSelect}
        />
      );
    },
    [searchResults, handleCardSelect, handleSkillSelect],
  );

  return (
    <div className="bg-background border-border flex h-full min-w-96 flex-col overflow-x-visible rounded border p-3">
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
      <div className="flex-1 overflow-auto">
        {searchResults.length > 0 ? (
          <Virtuoso
            style={{ height: "100%" }}
            totalCount={searchResults.length}
            itemContent={itemContent}
          />
        ) : (
          <div className="text-center text-sm text-gray-500">
            No results found
          </div>
        )}
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
        <CardTooltip card={item} />
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
