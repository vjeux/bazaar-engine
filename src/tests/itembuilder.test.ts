import { genCardsAndEncounters } from "../Data";
import { expect, it } from "vitest";
import diff from "microdiff";

const { Cards } = await genCardsAndEncounters();

import { items } from "../json/items";
import { parseItemToCard } from "../itemBuilder";
import { Card } from "../types/cardTypes";

Object.keys(items).forEach((itemKey) => {
  const item = items[itemKey as keyof typeof items];
  it(`Should parse item: ${itemKey} to card`, () => {
    const card = parseItemToCard(item);
    expect(card).toBeDefined();

    // Check that the card object matches the expected structure from Cards
    const CardsValues = Object.values(Cards);
    const expectedCard = CardsValues.find(
      (c) => c.Localization?.Title?.Text === itemKey
    );
    expect(expectedCard).toBeDefined();

    // Check that the card object matches the expected structure from NewItems
    const keysThatShouldMatch = ["$type", "Abilities", "Auras", "Tags"];

    // For every key run diff
    keysThatShouldMatch.forEach((key) => {
      // Create objects with only the key we are interested in
      const filteredCard = { [key]: card[key as keyof Card] };
      const filteredExpectedCard = { [key]: expectedCard[key as keyof Card] };
      const diffResult = diff(filteredCard, filteredExpectedCard);
      expect(diffResult).toEqual([]);
    });
  });
});
