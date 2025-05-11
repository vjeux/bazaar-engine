import { memo, useMemo, useState } from "react";
import { Card, Cards, CardType } from "../types/cardTypes.ts";
import Fuse from "fuse.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip.tsx";
import TooltipWithoutGameState from "./TooltipWithoutGameState.tsx";
import FramedCardOrSkill from "./FramedCardOrSkill.tsx";
import { useSimulatorStore } from "@/lib/simulatorStore.ts";
import { PlayerCardConfig, PlayerSkillConfig } from "@/engine/GameState.ts";
import { CARDS_VERSION } from "@/lib/constants.ts";

const CARD_HEIGHT = 70;
const SKILL_SIZE = 70;

export const SearchableCardSkillList = memo(SearchableCardSkillList_);
function SearchableCardSkillList_({ Cards }: { Cards: Cards }) {
  const simulatorStoreActions = useSimulatorStore((state) => state.actions);
  const addPlayerCard = simulatorStoreActions.addPlayerCard;
  const addPlayerSkill = simulatorStoreActions.addPlayerSkill;

  const handleCardSelect = (card: Card) => {
    const cardConfig: PlayerCardConfig = {
      cardId: card.Id,
      tier: card.StartingTier,
    };
    addPlayerCard(cardConfig);
  };

  const handleSkillSelect = (card: Card) => {
    const skillConfig: PlayerSkillConfig = {
      cardId: card.Id,
      tier: card.StartingTier,
    };
    addPlayerSkill(skillConfig);
  };

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
    return Cards[CARDS_VERSION];
  }, [search, Cards, fuse]);

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
                  onSelectSkill={handleSkillSelect}
                  onSelectCard={handleCardSelect}
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
                  onSelectSkill={handleSkillSelect}
                  onSelectCard={handleCardSelect}
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
        <TooltipWithoutGameState card={item} />
      </TooltipContent>
    </Tooltip>
  );
}

const TriggerContent = memo(TriggerContent_);
function TriggerContent_({ item }: { item: Card }) {
  return (
    <div
      key={item.Id}
      className="hover:bg-accent text-secondary-foreground flex grow items-center justify-between gap-2 rounded p-1 text-sm"
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
