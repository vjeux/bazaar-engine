// Type of scraped items.ts file
import { EnchantmentType, Hero, HiddenTag, Size, Tag, Tier } from "./shared";

export interface Items {
  [key: string]: Item;
}

export interface Item {
  name: string;
  icon: string;
  tier: keyof typeof Tier;
  tags: HowBazaarTag[];
  cooldown: string | number | null;
  ammo: number | null;
  text: string[];
  enchants: {
    [key in EnchantmentType]?: string;
  };
}

export type HowBazaarTag =
  | keyof typeof Tag
  | keyof typeof Size
  | keyof typeof Hero
  | keyof typeof HiddenTag;
