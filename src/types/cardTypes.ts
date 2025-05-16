// Types for the card data in the game
import type { EnchantmentType, HiddenTag, Tag, Tier } from "./shared.ts";

export interface Cards {
  [version: string]: Card[];
}

export interface Card {
  $type: CardType;
  Abilities: { [key: string]: Ability };
  ArtKey: string;
  Attributes?: Attributes;
  AudioKey: null | string;
  Auras: { [key: string]: Aura };
  CardPackId: CardPackID;
  CombatantType?: CombatantType;
  Enchantments?: Enchantments | null;
  Heroes: Hero[];
  HiddenTags: HiddenTag[];
  Id: string;
  InternalDescription: string | null;
  InternalName: string;
  IsReselectable?: boolean;
  Localization: Localization;
  RewardCombatGold?: number;
  RewardDefeat?: Reward;
  RewardVictory?: Reward;
  SelectionContext?: SelectionContext | null;
  SelectionCriteria?: Conditions;
  SelectionRequirements?: null;
  Size: Size;
  StartingTier: Tier;
  Tags: Tag[];
  Tiers?: Tiers;
  TranslationKey: string;
  Type: Type;
  Version: Version;
}

export enum CardType {
  TCardEncounterCombat = "TCardEncounterCombat",
  TCardEncounterEvent = "TCardEncounterEvent",
  TCardEncounterPedestal = "TCardEncounterPedestal",
  TCardEncounterStep = "TCardEncounterStep",
  TCardItem = "TCardItem",
  TCardSkill = "TCardSkill",
}

export interface Ability {
  Id: string;
  Trigger: Trigger;
  ActiveIn: ActiveIn;
  Action: AbilityAction;
  Prerequisites: AbilityPrerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: null | string;
  MigrationData: string;
  VFXConfig: VFXConfig | null;
  TranslationKey: string;
}

export interface AbilityAction {
  $type: ActionType;
  AttributeType?: AttributeType;
  Value?: Value;
  Operation?: Operation;
  Duration?: Duration | null;
  Target?: Target | null;
  ReferenceValue?: null;
  UpgradeToTier?: null;
  TargetPlayer?: TargetPlayer;
  SpawnContext?: SpawnContext;
  TargetCount?: TargetCount | null;
  Enchantment?: string;
  Source?: Source;
  Tags?: Tag[];
}

export enum ActionType {
  TActionCardAddTagsBySource = "TActionCardAddTagsBySource",
  TActionCardAddTagsList = "TActionCardAddTagsList",
  TActionCardBeginSandstorm = "TActionCardBeginSandstorm",
  TActionCardCharge = "TActionCardCharge",
  TActionCardDestroy = "TActionCardDestroy",
  TActionCardDisable = "TActionCardDisable",
  TActionCardEnchant = "TActionCardEnchant",
  TActionCardForceUse = "TActionCardForceUse",
  TActionCardFreeze = "TActionCardFreeze",
  TActionCardHaste = "TActionCardHaste",
  TActionCardModifyAttribute = "TActionCardModifyAttribute",
  TActionCardReload = "TActionCardReload",
  TActionCardRemoveTagsBySource = "TActionCardRemoveTagsBySource",
  TActionCardRemoveTagsList = "TActionCardRemoveTagsList",
  TActionCardSlow = "TActionCardSlow",
  TActionCardUpgrade = "TActionCardUpgrade",
  TActionGameDealCards = "TActionGameDealCards",
  TActionGameSpawnCards = "TActionGameSpawnCards",
  TActionPlayerBurnApply = "TActionPlayerBurnApply",
  TActionPlayerBurnRemove = "TActionPlayerBurnRemove",
  TActionPlayerDamage = "TActionPlayerDamage",
  TActionPlayerHeal = "TActionPlayerHeal",
  TActionPlayerJoyApply = "TActionPlayerJoyApply",
  TActionPlayerModifyAttribute = "TActionPlayerModifyAttribute",
  TActionPlayerPoisonApply = "TActionPlayerPoisonApply",
  TActionPlayerPoisonRemove = "TActionPlayerPoisonRemove",
  TActionPlayerReviveHeal = "TActionPlayerReviveHeal",
  TActionPlayerRegenApply = "TActionPlayerRegenApply",
  TActionPlayerShieldApply = "TActionPlayerShieldApply",
  TActionPlayerShieldRemove = "TActionPlayerShieldRemove",
  TAuraActionCardModifyAttribute = "TAuraActionCardModifyAttribute",
  TAuraActionPlayerModifyAttribute = "TAuraActionPlayerModifyAttribute",
}

export enum AttributeType {
  Ammo = "Ammo",
  AmmoMax = "AmmoMax",
  Burn = "Burn",
  BurnApplyAmount = "BurnApplyAmount",
  BurnRemoveAmount = "BurnRemoveAmount",
  BuyPrice = "BuyPrice",
  ChargeAmount = "ChargeAmount",
  CooldownMax = "CooldownMax",
  Counter = "Counter",
  CritChance = "CritChance",
  Custom_0 = "Custom_0",
  Custom_1 = "Custom_1",
  Custom_2 = "Custom_2",
  Custom_3 = "Custom_3",
  Custom_4 = "Custom_4",
  Custom_5 = "Custom_5",
  DamageAmount = "DamageAmount",
  DamageCrit = "DamageCrit",
  DisableTargets = "DisableTargets",
  Experience = "Experience",
  Freeze = "Freeze",
  FreezeAmount = "FreezeAmount",
  FreezeTargets = "FreezeTargets",
  Gold = "Gold",
  Haste = "Haste",
  HasteAmount = "HasteAmount",
  HasteTargets = "HasteTargets",
  HealAmount = "HealAmount",
  Health = "Health",
  HealthMax = "HealthMax",
  HealthRegen = "HealthRegen",
  Income = "Income",
  Joy = "Joy",
  JoyApplyAmount = "JoyApplyAmount",
  Level = "Level",
  Lifesteal = "Lifesteal",
  Multicast = "Multicast",
  PercentDamageReduction = "PercentDamageReduction",
  Poison = "Poison",
  PoisonApplyAmount = "PoisonApplyAmount",
  PoisonRemoveAmount = "PoisonRemoveAmount",
  Prestige = "Prestige",
  ReloadAmount = "ReloadAmount",
  RegenApplyAmount = "RegenApplyAmount",
  RerollCostModifier = "RerollCostModifier",
  SellPrice = "SellPrice",
  Shield = "Shield",
  ShieldApplyAmount = "ShieldApplyAmount",
  ShieldRemoveAmount = "ShieldRemoveAmount",
  Slow = "Slow",
  SlowAmount = "SlowAmount",
  SlowTargets = "SlowTargets",
  ReloadTargets = "ReloadTargets",
  ChargeTargets = "ChargeTargets",
}

interface Duration {
  $type: DurationType;
  DurationType: DurationTypeEnum;
}

enum DurationType {
  TDeterminantDuration = "TDeterminantDuration",
}

enum DurationTypeEnum {
  UntilEndOfCombat = "UntilEndOfCombat",
  UntilEndOfDay = "UntilEndOfDay",
}

export enum Operation {
  Add = "Add",
  Multiply = "Multiply",
  Subtract = "Subtract",
}

export interface Source {
  $type: SourceType;
  Origin?: Origin;
  TargetMode?: Origin;
  IncludeOrigin?: boolean;
  Conditions: Conditions | null;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
}

export enum SourceType {
  TCardConditionalAnd = "TCardConditionalAnd",
  TCardConditionalOr = "TCardConditionalOr",
  TTargetCardPositional = "TTargetCardPositional",
  TTargetCardRandom = "TTargetCardRandom",
  TTargetCardSection = "TTargetCardSection",
  TTargetCardSelf = "TTargetCardSelf",
  TTargetCardTriggerSource = "TTargetCardTriggerSource",
  TTargetCardXMost = "TTargetCardXMost",
  TTargetPlayer = "TTargetPlayer",
  TTargetPlayerAbsolute = "TTargetPlayerAbsolute",
  TTargetPlayerRelative = "TTargetPlayerRelative",
}

enum ConditionType {
  TCardConditionalAnd = "TCardConditionalAnd",
  TCardConditionalAttribute = "TCardConditionalAttribute",
  TCardConditionalAttributeHighest = "TCardConditionalAttributeHighest",
  TCardConditionalAttributeLowest = "TCardConditionalAttributeLowest",
  TCardConditionalEnchantmentEligible = "TCardConditionalEnchantmentEligible",
  TCardConditionalHasEnchantment = "TCardConditionalHasEnchantment",
  TCardConditionalHiddenTag = "TCardConditionalHiddenTag",
  TCardConditionalID = "TCardConditionalId",
  TCardConditionalOr = "TCardConditionalOr",
  TCardConditionalPlayerHero = "TCardConditionalPlayerHero",
  TCardConditionalSize = "TCardConditionalSize",
  TCardConditionalTag = "TCardConditionalTag",
  TCardConditionalTier = "TCardConditionalTier",
  TCardConditionalTriggerSource = "TCardConditionalTriggerSource",
  TCardConditionalType = "TCardConditionalType",
  TPlayerConditionalAttribute = "TPlayerConditionalAttribute",
  TRunConditionalCurrentDay = "TRunConditionalCurrentDay",
}

export enum Comparison {
  Equal = "Equal",
  NotEqual = "NotEqual",
  GreaterThan = "GreaterThan",
  GreaterThanOrEqual = "GreaterThanOrEqual",
  LessThan = "LessThan",
  LessThanOrEqual = "LessThanOrEqual",
}

interface TargetPlayerClass {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: Conditions | null;
}

interface ComparisonValue {
  $type: ValueType;
  Target?: TargetPlayerClass;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: Modifier;
  Value?: number | number;
}

export enum Origin {
  AllLeftCards = "AllLeftCards",
  AllRightCards = "AllRightCards",
  Both = "Both",
  LeftCard = "LeftCard",
  LeftMostCard = "LeftMostCard",
  Neighbor = "Neighbor",
  Opponent = "Opponent",
  Player = "Player",
  RightCard = "RightCard",
  RightMostCard = "RightMostCard",
  Self = "Self",
  TriggerSource = "TriggerSource",
}

export enum ValueType {
  TFixedValue = "TFixedValue",
  TRangeValue = "TRangeValue",
  TReferenceValueCardAttribute = "TReferenceValueCardAttribute",
  TReferenceValueCardAttributeAggregate = "TReferenceValueCardAttributeAggregate",
  TReferenceValueCardCount = "TReferenceValueCardCount",
  TReferenceValueCardTagCount = "TReferenceValueCardTagCount",
  TReferenceValuePlayerAttribute = "TReferenceValuePlayerAttribute",
  TReferenceValuePlayerAttributeChange = "TReferenceValuePlayerAttributeChange",
}

interface Modifier {
  ModifyMode: Operation;
  Value: Value;
}

interface TargetCount {
  $type: ValueType;
  Value: number;
}

enum Operator {
  Any = "Any",
  None = "None",
}

export enum TargetSection {
  AbsolutePlayerHand = "AbsolutePlayerHand",
  AbsolutePlayerHandAndStash = "AbsolutePlayerHandAndStash",
  AllHands = "AllHands",
  OpponentBoard = "OpponentBoard",
  OpponentHand = "OpponentHand",
  SelfBoard = "SelfBoard",
  SelfHand = "SelfHand",
  SelfHandAndStash = "SelfHandAndStash",
  SelfNeighbors = "SelfNeighbors",
}

interface SpawnContext {
  $type: SpawnContextType;
  Limit: Limit;
}

enum SpawnContextType {
  TSpawnContextQuery = "TSpawnContextQuery",
}

interface Limit {
  $type: ValueType;
  Value?: number;
  Target?: Target;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: Modifier | null;
}

export interface Conditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  AttributeType?: AttributeType;
  CardType?: Type;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  Conditions?: Conditions[];
  CurrentDay: number;
  Enchantment?: string;
  Id?: string;
  IsNot?: boolean;
  IsSameAsPlayerHero?: boolean;
  Operator?: Operator;
  Sizes?: Size[];
  Tags?: Tag[] | HiddenTag[];
  Tiers?: Tier[];
}

export interface Target {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: Conditions | null;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
  Origin?: Origin;
  IncludeOrigin?: boolean;
}

export interface TargetPlayer {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: Conditions | null;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
}

export enum Type {
  CombatEncounter = "CombatEncounter",
  EncounterStep = "EncounterStep",
  EventEncounter = "EventEncounter",
  Item = "Item",
  PedestalEncounter = "PedestalEncounter",
  Skill = "Skill",
}

enum Size {
  Large = "Large",
  Medium = "Medium",
  Small = "Small",
}

export interface Value {
  $type: ValueType;
  Target?: Target;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: Modifier | null;
  Value?: number;
  MinValue?: number;
  MaxValue?: number;
}

export enum ActiveIn {
  HandAndStash = "HandAndStash",
  HandOnly = "HandOnly",
}

export interface AbilityPrerequisite {
  $type: PrerequisiteType;
  Subject?: Subject;
  Comparison?: Comparison;
  Amount?: number;
  Conditions?: Conditions;
  Attribute?: AttributeType;
  AttributeOther?: AttributeType;
  SubjectOther?: Subject;
}

enum PrerequisiteType {
  TPrerequisiteCardCount = "TPrerequisiteCardCount",
  TPrerequisitePlayer = "TPrerequisitePlayer",
  TPrerequisiteRun = "TPrerequisiteRun",
  TPrerequisiteCardAttributeComparator = "TPrerequisiteCardAttributeComparator",
}

export enum Priority {
  Immediate = "Immediate",
  Highest = "Highest",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Lowest = "Lowest",
}

export interface Trigger {
  $type: TriggerType;
  Subject?: Subject;
  Target?: Target;
  CombatType?: null | string;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
  CombatOutcome?: CombatOutcome | null;
  AttributeChanged?: AttributeType;
  Conditions?: Conditions;
}

export enum TriggerType {
  TTriggerOnCardAttributeChanged = "TTriggerOnCardAttributeChanged",
  TTriggerOnCardCritted = "TTriggerOnCardCritted",
  TTriggerOnCardFired = "TTriggerOnCardFired",
  TTriggerOnCardPerformedBurn = "TTriggerOnCardPerformedBurn",
  TTriggerOnCardPerformedDestruction = "TTriggerOnCardPerformedDestruction",
  TTriggerOnCardPerformedFreeze = "TTriggerOnCardPerformedFreeze",
  TTriggerOnCardPerformedHaste = "TTriggerOnCardPerformedHaste",
  TTriggerOnCardPerformedHeal = "TTriggerOnCardPerformedHeal",
  TTriggerOnCardPerformedOverHeal = "TTriggerOnCardPerformedOverHeal",
  TTriggerOnCardPerformedPoison = "TTriggerOnCardPerformedPoison",
  TTriggerOnCardPerformedShield = "TTriggerOnCardPerformedShield",
  TTriggerOnCardPerformedSlow = "TTriggerOnCardPerformedSlow",
  TTriggerOnCardPurchased = "TTriggerOnCardPurchased",
  TTriggerOnCardSelected = "TTriggerOnCardSelected",
  TTriggerOnCardSold = "TTriggerOnCardSold",
  TTriggerOnCardUpgraded = "TTriggerOnCardUpgraded",
  TTriggerOnDayStarted = "TTriggerOnDayStarted",
  TTriggerOnEncounterSelected = "TTriggerOnEncounterSelected",
  TTriggerOnFightEnded = "TTriggerOnFightEnded",
  TTriggerOnFightStarted = "TTriggerOnFightStarted",
  TTriggerOnHourStarted = "TTriggerOnHourStarted",
  TTriggerOnItemUsed = "TTriggerOnItemUsed",
  TTriggerOnPlayerAttributeChanged = "TTriggerOnPlayerAttributeChanged",
  TTriggerOnPlayerAttributePercentChange = "TTriggerOnPlayerAttributePercentChange",
  TTriggerOnPlayerDied = "TTriggerOnPlayerDied",
  TTriggerOnCardPerformedRegen = "TTriggerOnCardPerformedRegen",
  TTriggerOnCardReloaded = "TTriggerOnCardReloaded",
  TTriggerOnCardPerformedReload = "TTriggerOnCardPerformedReload",
}

enum ChangeType {
  Gain = "Gain",
  Loss = "Loss",
}

enum CombatOutcome {
  Lose = "Lose",
  Win = "Win",
}

export interface Subject {
  $type: SourceType;
  Conditions: Conditions | null;
  ExcludeSelf?: boolean;
  IncludeOrigin?: boolean;
  Origin?: Origin;
  TargetMode?: Origin;
  TargetSection?: TargetSection;
}

interface VFXConfig {
  VFXOverrideKey: null | string;
  VFXShouldPlay: boolean;
  VFXIsTakeover: boolean;
}

/**
 * Represents an effect which does not utilize a cooldown to activate.
 *
 * Can be:
 * - Skills such as "If you have 4 or fewer items, you have +{aura.0} Max Health."
 * - Card enchantments such as Deadly, Heavy, Icy, etc.
 */
export interface Aura {
  Id: string;
  ActiveIn: ActiveIn;
  Action: AuraAction;
  Prerequisites: AuraPrerequisite[] | null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig | null;
  TranslationKey: string;
}

interface AuraAction {
  $type: AuraActionType;
  AttributeType: AttributeType;
  Source: Source;
  Operation: Operation;
  Value: Value;
  Target: Target;
}

enum AuraActionType {
  TAuraActionCardModifyAttribute = "TAuraActionCardModifyAttribute",
  TAuraActionPlayerModifyAttribute = "TAuraActionPlayerModifyAttribute",
  TAuraActionCardAddTagsBySource = "TAuraActionCardAddTagsBySource",
}

interface AuraPrerequisite {
  $type: PrerequisiteType;
  Subject: Subject;
  Comparison?: Comparison;
  Amount?: number;
}

enum CardPackID {
  Core = "Core",
  DooleyCore = "Dooley_Core",
  JulesCore = "Jules_Core",
  MakCore = "Mak_Core",
  PygFrozenAssets = "Pyg_Frozen_Assets",
  PygmalienCore = "Pygmalien_Core",
  StelleCore = "Stelle_Core",
  Vanessa = "Vanessa",
  VanessaCore = "Vanessa_Core",
  VanessaMysteriesOfTheDeep = "Vanessa_Mysteries_of_the_Deep",
}

interface CombatantType {
  $type: CombatantTypeType;
  Level: number;
}

enum CombatantTypeType {
  TCombatantMonster = "TCombatantMonster",
}

export type Enchantments = {
  [key in EnchantmentType]: Enchantment;
};

interface Enchantment {
  Attributes: Attributes;
  Abilities: { [key: string]: Ability };
  Auras: { [key: string]: Aura };
  Tags: Tag[];
  HiddenTags: HiddenTag[];
  Localization: Localization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

type Attributes = {
  [key in AttributeType]?: number;
};

export interface Tooltip {
  Content: Title;
  TooltipType: HiddenTag;
  Prerequisites: null;
}

export interface Title {
  Key: string;
  Text: string;
}

enum Hero {
  Common = "Common",
  Dooley = "Dooley",
  Jules = "Jules",
  Mak = "Mak",
  Pygmalien = "Pygmalien",
  Stelle = "Stelle",
  Vanessa = "Vanessa",
}

interface Localization {
  Title: Title;
  Description: Title | null;
  FlavorText: null;
  Tooltips: Tooltip[];
}

interface Reward {
  SelectionContextRules: Rules | null;
  GoldReward: number;
  ExperienceReward: number;
}

interface Rules {
  CanSelectMultiple: boolean;
  SelectionIsFree: boolean;
  CanExit: boolean;
  RerollRules: RerollRules | null;
  WillAutoSellOnExit: boolean;
  NextEncounterOnExit: null;
}

interface RerollRules {
  TotalAllowedRerolls: number | null;
  CostIncrease: number;
  StartingCost: number;
  CostMax: null;
}

interface SelectionContext {
  Rules: Rules;
}

export type Tiers = {
  [key in Tier]?: TierInfo;
};

export interface TierInfo {
  Attributes: Attributes;
  AbilityIds: string[];
  AuraIds: string[];
  TooltipIds: number[];
}

export enum Version {
  The000 = "0.0.0",
  The100 = "1.0.0",
}
