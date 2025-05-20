import type { EnchantmentType, Tag, Tier } from "./shared.ts";

export interface EncounterDays {
  data: Datum[];
  version: string;
}

export interface Datum {
  day: number | string;
  groups: Array<Group[]>;
}

export interface Group {
  cardId: string;
  cardName: string;
  level: number;
  health: number;
  items: Item[];
  skills: Skill[];
  day: number | string;
}

export interface Item {
  card: Card;
  tierType: Tier;
  enchantmentType?: EnchantmentType;
}

export interface Card {
  id: string;
  name: string;
  startingTier: Tier;
  tiers: Tiers;
  tags: Tag[];
  hiddenTags: string[];
  size: Size;
  heroes: Hero[];
  enchantments?: Enchantment[];
  unifiedTooltips: string[];
  combatEncounters: any[];
  artKey?: string;
}

export interface Enchantment {
  type: EnchantmentType;
  tooltips: string[];
}

export enum Hero {
  Common = "Common",
  Dooley = "Dooley",
  Jules = "Jules",
  Mak = "Mak",
  Pygmalien = "Pygmalien",
  Stelle = "Stelle",
  Vanessa = "Vanessa",
}

export enum Size {
  Large = "Large",
  Medium = "Medium",
  Small = "Small",
}

export interface Tiers {
  Bronze: Bronze;
  Silver: Bronze;
  Gold: Bronze;
  Diamond: Bronze;
  Legendary: Bronze;
}

export interface Bronze {
  tooltips: string[];
}

export interface Skill {
  card: Card;
  tierType: Tier;
}

export interface FlattenedEncounter {
  name: string;
  card: { cardName: string; cardId: string };
  day: number;
}
