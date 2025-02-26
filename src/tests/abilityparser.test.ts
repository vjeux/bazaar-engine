import { genCardsAndEncounters } from "../Data";
import { expect, it } from "vitest";
import diff from "microdiff";

const { Cards } = await genCardsAndEncounters();

import apiItems from "../json/apiItems.json";
import { tooltipToAbility } from "../abilityParser";
import { Ability } from "../types/cardTypes";
import { Item } from "../types/apiItems";

const items: Item[] = apiItems.data;

// Create a map of tooltip text to corresponding abilities from actual cards
const tooltipToRealAbilityMap = new Map<string, Ability>();

// Extract tooltip-ability pairs from real cards and their enchantments
items.forEach((item: Item) => {
  // Get the real card
  const cardsValues = Object.values(Cards);
  const realCard = cardsValues.find(
    (c) => c.Localization?.Title?.Text === item.name
  );

  if (!realCard) {
    console.log(`Could not find card for item: ${item.name}`);
    return;
  }

  // Check in unified tooltips
  if (item.unifiedTooltips && realCard.Abilities) {
    item.unifiedTooltips.forEach((tooltip) => {
      if (tooltip && !tooltip.toLowerCase().startsWith("cooldown")) {
        // Find matching ability by checking if the tooltip matches the internal description
        // ignoring numbers and parenthesis parts
        Object.values(realCard.Abilities).forEach((ability) => {
          // Normalize both texts by removing numbers and parenthesis content
          const normalizedTooltip = tooltip.replace(
            /\(\d+(?:\/\d+)*\)|\d+/g,
            "{X}"
          );
          const normalizedDescription =
            ability.InternalDescription?.replace(/\{[^}]+\}/g, "{X}") || "";

          if (
            (normalizedDescription &&
              normalizedTooltip.includes(normalizedDescription)) ||
            normalizedDescription.includes(normalizedTooltip)
          ) {
            tooltipToRealAbilityMap.set(tooltip, ability);
          }
        });
      }
    });
  }
});

// Filter out duplicate tooltips
const uniqueTooltips = Array.from(tooltipToRealAbilityMap.keys());

uniqueTooltips.forEach((tooltip) => {
  it(`Should parse tooltip: "${tooltip}" to ability`, () => {
    const parsedAbility = tooltipToAbility(tooltip);
    expect(parsedAbility).toBeDefined();

    const expectedAbility = tooltipToRealAbilityMap.get(tooltip);
    expect(expectedAbility).toBeDefined();

    if (expectedAbility) {
      // Compare the main components of the abilities
      expect(parsedAbility).toEqual(
        expect.objectContaining({
          Action: expect.objectContaining({
            $type: expectedAbility.Action.$type
          }),
          Trigger: expect.objectContaining({
            $type: expectedAbility.Trigger.$type
          })
        })
      );
    }
  });
});
