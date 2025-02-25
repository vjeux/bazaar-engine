import { genCardsAndEncounters } from "../Data";
import { expect, it } from "vitest";
import diff from "microdiff";

const { Cards } = await genCardsAndEncounters();

import apiItems from "../json/apiItems.json";
import { parseItemToCard } from "../itemBuilder";
import { Card, Version } from "../types/cardTypes";
import { Item, Items } from "../types/apiItems";
import { log } from "console";

const items: Item[] = apiItems.data;

items.forEach((item: Item) => {
  it(`Should parse item: ${item.name} to card`, () => {
    const card = parseItemToCard(item);
    expect(card).toBeDefined();

    // Check that the card object matches the expected structure from Cards
    const CardsValues = Object.values(Cards);
    const expectedCard = CardsValues.find(
      (c) => c.Localization?.Title?.Text === item.name
    );
    expect(expectedCard).toBeDefined();

    console.log("card", JSON.stringify(card, null, 2));

    expect(card).toEqual(
      expect.objectContaining({
        $type: expectedCard?.$type,
        Abilities: expectedCard?.Abilities,
        Auras: expect.any(Object),
        Tags: expect.any(Array),
        Tiers: expectedCard?.Tiers,
        Heroes: expectedCard?.Heroes,
        Id: expectedCard?.Id,
        Type: expectedCard?.Type,
        Size: expectedCard?.Size,
        StartingTier: expectedCard?.StartingTier,
        HiddenTags: expectedCard?.HiddenTags,
        InternalDescription: expect.any(String),
        Version: expectedCard?.Version
      })
    );
  });
});
