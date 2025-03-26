// howbazaar api items schema
import { EnchantmentType, Hero, HiddenTag, Size, Tag, Tier } from "./shared.ts";

export interface Items {
  data: Item[];
  version: string;
}

export interface Item {
  id: string;
  name: string;
  startingTier: Tier;
  tiers: Tiers;
  tags: Tag[];
  hiddenTags: HiddenTag[];
  size: Size;
  heroes: Hero[];
  enchantments: Enchantment[];
  unifiedTooltips: string[];
  remarks: string[];
  combatEncounters: CombatEncounter[];
}

export interface CombatEncounter {
  cardId: string;
  cardName: string;
}

export interface Enchantment {
  type: EnchantmentType;
  tooltips: string[];
}

export type Tiers = {
  [key in Tier]: TierTooltips;
};

export interface TierTooltips {
  tooltips: string[];
}
