export interface Items {
  [key: string]: Item;
}

export interface Item {
  name: string;
  icon: string;
  tier: Tier;
  tags: HowBazaarTag[];
  cooldown: string | number | null;
  ammo: number | null;
  text: string[];
  enchants: {
    [key in EnchantmentType]?: string;
  };
}

export type Tier = "Bronze" | "Silver" | "Gold" | "Diamond" | "Legendary";

export type EnchantmentType =
  | "Deadly"
  | "Fiery"
  | "Golden"
  | "Heavy"
  | "Icy"
  | "Obsidian"
  | "Radiant"
  | "Restorative"
  | "Shielded"
  | "Shiny"
  | "Toxic"
  | "Turbo";

export type HowBazaarTag = Tag | Size | Hero | OtherTags;

export type OtherTags =
  | "Economy"
  | "Crit"
  | "Value"
  | "ShieldReference"
  | "DamageReference"
  | "HealReference"
  | "Ammo"
  | "HasteReference"
  | "Charge"
  | "AmmoReference"
  | "Cooldown"
  | "Income"
  | "NonWeapon"
  | "Passive"
  | "Health"
  | "PoisonReference"
  | "CritReference"
  | "BurnReference"
  | "Active"
  | "Regen"
  | "Gold"
  | "FreezeReference"
  | "HealthReference"
  | "SlowReference"
  | "Lifesteal"
  | "Experience";

export type Tag =
  | "Apparel"
  | "Aquatic"
  | "Burn"
  | "Core"
  | "Damage"
  | "Dinosaur"
  | "Dragon"
  | "Food"
  | "Freeze"
  | "Friend"
  | "Haste"
  | "Heal"
  | "Joy"
  | "Loot"
  | "Merchant"
  | "Poison"
  | "Potion"
  | "Property"
  | "Ray"
  | "Shield"
  | "Slow"
  | "Tech"
  | "Tool"
  | "Toy"
  | "Unsellable"
  | "Vehicle"
  | "Weapon";

export type Size = "Large" | "Medium" | "Small";

export type Hero =
  | "Common"
  | "Dooley"
  | "Jules"
  | "Mak"
  | "Pygmalien"
  | "Stelle"
  | "Vanessa";
