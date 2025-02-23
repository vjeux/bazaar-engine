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

export enum Tier {
  Bronze = "Bronze",
  Silver = "Silver",
  Gold = "Gold",
  Diamond = "Diamond",
  Legendary = "Legendary"
}

export enum EnchantmentType {
  Deadly = "Deadly",
  Fiery = "Fiery",
  Golden = "Golden",
  Heavy = "Heavy",
  Icy = "Icy",
  Obsidian = "Obsidian",
  Radiant = "Radiant",
  Restorative = "Restorative",
  Shielded = "Shielded",
  Shiny = "Shiny",
  Toxic = "Toxic",
  Turbo = "Turbo"
}

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
export enum Tag {
  Apparel = "Apparel",
  Aquatic = "Aquatic",
  Burn = "Burn",
  Core = "Core",
  Damage = "Damage",
  Dinosaur = "Dinosaur",
  Dragon = "Dragon",
  Food = "Food",
  Freeze = "Freeze",
  Friend = "Friend",
  Haste = "Haste",
  Heal = "Heal",
  Joy = "Joy",
  Loot = "Loot",
  Merchant = "Merchant",
  Poison = "Poison",
  Potion = "Potion",
  Property = "Property",
  Ray = "Ray",
  Shield = "Shield",
  Slow = "Slow",
  Tech = "Tech",
  Tool = "Tool",
  Toy = "Toy",
  Unsellable = "Unsellable",
  Vehicle = "Vehicle",
  Weapon = "Weapon"
}

export enum Size {
  Large = "Large",
  Medium = "Medium",
  Small = "Small"
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
