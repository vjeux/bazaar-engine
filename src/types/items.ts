import { Tier, Size, Tag, EnchantmentType } from "./shared";

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
  | keyof typeof OtherTags;

export enum OtherTags {
  Economy = "Economy",
  Crit = "Crit",
  Value = "Value",
  ShieldReference = "ShieldReference",
  DamageReference = "DamageReference",
  HealReference = "HealReference",
  Ammo = "Ammo",
  HasteReference = "HasteReference",
  Charge = "Charge",
  AmmoReference = "AmmoReference",
  Cooldown = "Cooldown",
  Income = "Income",
  NonWeapon = "NonWeapon",
  Passive = "Passive",
  Health = "Health",
  PoisonReference = "PoisonReference",
  CritReference = "CritReference",
  BurnReference = "BurnReference",
  Active = "Active",
  Regen = "Regen",
  Gold = "Gold",
  FreezeReference = "FreezeReference",
  HealthReference = "HealthReference",
  SlowReference = "SlowReference",
  Lifesteal = "Lifesteal",
  Experience = "Experience"
}

export enum Hero {
  Common = "Common",
  Dooley = "Dooley",
  Jules = "Jules",
  Mak = "Mak",
  Pygmalien = "Pygmalien",
  Stelle = "Stelle",
  Vanessa = "Vanessa"
}
