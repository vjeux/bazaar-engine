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
  tierType: TierType;
  enchantmentType?: Type;
}

export interface Card {
  id: string;
  name: string;
  startingTier: TierType;
  tiers: Tiers;
  tags: Tag[];
  hiddenTags: string[];
  size: Size;
  heroes: Hero[];
  enchantments?: Enchantment[];
  unifiedTooltips: string[];
  remarks: any[];
  combatEncounters: any[];
  artKey?: string;
}

export interface Enchantment {
  type: Type;
  tooltips: string[];
}

export enum Type {
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

export enum Hero {
  Common = "Common",
  Dooley = "Dooley",
  Jules = "Jules",
  Mak = "Mak",
  Pygmalien = "Pygmalien",
  Stelle = "Stelle",
  Vanessa = "Vanessa"
}

export enum Size {
  Large = "Large",
  Medium = "Medium",
  Small = "Small"
}

export enum TierType {
  Bronze = "Bronze",
  Diamond = "Diamond",
  Gold = "Gold",
  Legendary = "Legendary",
  Silver = "Silver"
}

export enum Tag {
  Apparel = "Apparel",
  Aquatic = "Aquatic",
  Dragon = "Dragon",
  Food = "Food",
  Friend = "Friend",
  Loot = "Loot",
  Potion = "Potion",
  Property = "Property",
  Ray = "Ray",
  Tech = "Tech",
  Tool = "Tool",
  Toy = "Toy",
  Vehicle = "Vehicle",
  Weapon = "Weapon"
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
  tierType: TierType;
}
