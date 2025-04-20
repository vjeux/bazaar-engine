import { Card, CardType } from "@/types/cardTypes";
import { Tier } from "@/types/shared";

interface FramedCardOrSkillProps {
  card: Card;
  cardHeight?: number;
  skillSize?: number;
  tier?: Tier;
}

export default function FramedCardOrSkill({
  card,
  cardHeight = 100,
  skillSize = 60,
  tier,
}: FramedCardOrSkillProps) {
  const isCardItem = card.$type === CardType.TCardItem;
  const displayTier = tier ?? card.StartingTier;

  const imageUrl = `https://www.howbazaar.gg/images/${isCardItem ? "items" : "skills"}/${
    card.Localization.Title.Text?.replace(/[ '\-&]/g, "") ?? ""
  }.avif`;

  const frameUrl = isCardItem
    ? `https://www.bazaarplanner.com/images/fromBT/CardFrame_${displayTier}_${
        { Large: "L", Medium: "M", Small: "S" }[card.Size]
      }_TUI.png`
    : `https://www.bazaarplanner.com/images/fromBT/skill_tier_${displayTier.toLowerCase()}.png`;

  const cardWidth = isCardItem
    ? card.Size === "Small"
      ? cardHeight / 2
      : card.Size === "Medium"
        ? cardHeight
        : cardHeight * 1.5
    : skillSize;

  const padding = isCardItem
    ? {
        top: 0.06,
        left: 0.03,
        bottom: 0.1,
        right: 0.04,
      }
    : {
        top: 0.1,
        left: 0.1,
        bottom: 0.1,
        right: 0.1,
      };

  return (
    <div
      className="relative"
      style={{
        height: isCardItem ? cardHeight : skillSize,
        width: cardWidth,
      }}
    >
      {/* Image container */}
      <div
        className="absolute"
        style={{
          top: isCardItem ? cardHeight * padding.top : skillSize * padding.top,
          left: isCardItem
            ? cardHeight * padding.left
            : skillSize * padding.left,
          bottom: isCardItem
            ? cardHeight * padding.bottom
            : skillSize * padding.bottom,
          right: isCardItem
            ? cardHeight * padding.right
            : skillSize * padding.right,
        }}
      >
        <img
          src={imageUrl}
          className={`h-full w-full ${isCardItem ? "rounded-[5px]" : "rounded-full"}`}
        />
      </div>
      {/* Frame image */}
      <img src={frameUrl} className="absolute h-full w-full" />
    </div>
  );
}
