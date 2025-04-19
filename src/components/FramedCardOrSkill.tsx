import { Card, CardType } from "@/types/cardTypes";

export default function FramedCard({ card }: { card: Card }) {
  const isCardItem = card.$type === CardType.TCardItem;

  const imageUrl = `https://www.howbazaar.gg/images/${isCardItem ? "items" : "skills"}/${
    card.Localization.Title.Text?.replace(/[ '\-&]/g, "") ?? ""
  }.avif`;
  const frameUrl = isCardItem
    ? `https://www.bazaarplanner.com/images/fromBT/CardFrame_${card.StartingTier}_${
        { Large: "L", Medium: "M", Small: "S" }[card.Size]
      }_TUI.png`
    : `https://www.bazaarplanner.com/images/fromBT/skill_tier_${card.StartingTier.toLowerCase()}.png`;

  return (
    <div>
      <img src={imageUrl} />
      <img src={frameUrl} />
    </div>
  );
}
