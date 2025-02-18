import { Tag, Tier } from "./shared";

export interface V2Cards {
  [key: string]: V2Card;
}

export interface V2Card {
  $type: V2CardType;
  IsReselectable?: boolean;
  Type: Type;
  Attributes?: V2CardAttributes | null;
  Id: string;
  Version: Version;
  InternalName: string;
  InternalDescription: V2CardInternalDescription | null;
  StartingTier: Tier;
  Size: Size;
  Heroes: Hero[];
  Tags: Tag[];
  HiddenTags: HiddenTag[];
  ArtKey: string;
  CardPackId: CardPackID;
  TranslationKey: string;
  AudioKey: null | string;
  Localization: V2CardLocalization;
  Abilities: { [key: string]: Ability };
  Auras: { [key: string]: Aura };
  Tiers?: Tiers;
  Enchantments?: Enchantments | null;
  CombatantType?: CombatantType;
  RewardCombatGold?: number;
  RewardVictory?: Reward;
  RewardDefeat?: Reward;
  SelectionContext?: SelectionContext | null;
  SelectionRequirements?: null;
  SelectionCriteria?: SelectionCriteria;
}

export enum V2CardType {
  TCardEncounterCombat = "TCardEncounterCombat",
  TCardEncounterEvent = "TCardEncounterEvent",
  TCardEncounterPedestal = "TCardEncounterPedestal",
  TCardEncounterStep = "TCardEncounterStep",
  TCardItem = "TCardItem",
  TCardSkill = "TCardSkill"
}

export interface Ability {
  Id: string;
  Trigger: AbilityTrigger;
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
  Value?: FluffyValue;
  Operation?: Operation;
  Duration?: Duration | null;
  Target?: PurpleTarget | null;
  ReferenceValue?: null;
  UpgradeToTier?: null;
  TargetPlayer?: TargetPlayer;
  SpawnContext?: PurpleSpawnContext;
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
  TActionPlayerShieldApply = "TActionPlayerShieldApply",
  TActionPlayerShieldRemove = "TActionPlayerShieldRemove",
  TAuraActionCardModifyAttribute = "TAuraActionCardModifyAttribute",
  TAuraActionPlayerModifyAttribute = "TAuraActionPlayerModifyAttribute"
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
  Custom0 = "Custom_0",
  Custom1 = "Custom_1",
  Custom2 = "Custom_2",
  Custom3 = "Custom_3",
  Custom4 = "Custom_4",
  Custom5 = "Custom_5",
  Custom8 = "Custom_8",
  DamageAmount = "DamageAmount",
  DamageCrit = "DamageCrit",
  Experience = "Experience",
  Freeze = "Freeze",
  FreezeAmount = "FreezeAmount",
  FreezeTargets = "FreezeTargets",
  Gold = "Gold",
  Haste = "Haste",
  HasteAmount = "HasteAmount",
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
  Poison = "Poison",
  PoisonApplyAmount = "PoisonApplyAmount",
  Prestige = "Prestige",
  ReloadAmount = "ReloadAmount",
  SellPrice = "SellPrice",
  Shield = "Shield",
  ShieldApplyAmount = "ShieldApplyAmount",
  ShieldRemoveAmount = "ShieldRemoveAmount",
  Slow = "Slow",
  SlowAmount = "SlowAmount"
}

export interface Duration {
  $type: DurationType;
  DurationType: DurationTypeEnum;
}

export enum DurationType {
  TDeterminantDuration = "TDeterminantDuration"
}

export enum DurationTypeEnum {
  UntilEndOfCombat = "UntilEndOfCombat",
  UntilEndOfDay = "UntilEndOfDay"
}

export enum Operation {
  Add = "Add",
  Multiply = "Multiply",
  Subtract = "Subtract"
}

export interface Source {
  $type: SourceType;
  Origin?: Origin;
  TargetMode?: Origin;
  IncludeOrigin?: boolean;
  Conditions: SourceConditions | null;
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
  TTargetPlayerRelative = "TTargetPlayerRelative"
}

export interface SourceConditions {
  $type: ConditionType;
  Conditions?: PurpleCondition[];
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: PurpleValue;
}

export enum ConditionType {
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
  TPlayerConditionalAttribute = "TPlayerConditionalAttribute"
}

export enum Comparison {
  Equal = "Equal",
  GreaterThan = "GreaterThan",
  GreaterThanOrEqual = "GreaterThanOrEqual",
  LessThan = "LessThan",
  LessThanOrEqual = "LessThanOrEqual"
}

export interface PurpleConditions {
  $type: ConditionType;
  Attribute: AttributeType;
  ComparisonOperator: Comparison;
  ComparisonValue: PurpleValue;
}

export interface TargetPlayerClass {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: PurpleConditions | null;
}

export interface PurpleValue {
  $type: ComparisonValueType;
  Target?: TargetPlayerClass;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier;
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
  Self = "Self"
}

export enum ComparisonValueType {
  TFixedValue = "TFixedValue",
  TRangeValue = "TRangeValue",
  TReferenceValueCardAttribute = "TReferenceValueCardAttribute",
  TReferenceValueCardAttributeAggregate = "TReferenceValueCardAttributeAggregate",
  TReferenceValueCardCount = "TReferenceValueCardCount",
  TReferenceValueCardTagCount = "TReferenceValueCardTagCount",
  TReferenceValuePlayerAttribute = "TReferenceValuePlayerAttribute",
  TReferenceValuePlayerAttributeChange = "TReferenceValuePlayerAttributeChange"
}

export interface ComparisonValueModifier {
  ModifyMode: Operation;
  Value: TargetCount;
}

export interface TargetCount {
  $type: ComparisonValueType;
  Value: number;
}

export interface PurpleCondition {
  $type: ConditionType;
  Conditions?: FluffyCondition[];
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: string;
}

export interface FluffyCondition {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: FluffyCondition[];
  Enchantment?: string;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
}

export enum Operator {
  Any = "Any",
  None = "None"
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
  SelfNeighbors = "SelfNeighbors"
}

export interface PurpleSpawnContext {
  $type: SpawnContextType;
  Limit: Limit;
}

export enum SpawnContextType {
  TSpawnContextQuery = "TSpawnContextQuery"
}

export interface Limit {
  $type: ComparisonValueType;
  Value?: number;
  Target?: LimitTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier | null;
}

export interface LimitTarget {
  $type: SourceType;
  Conditions: TentacledCondition[] | FluffyConditions | null;
}

export interface Condition {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: TentacledCondition[];
  Enchantment?: string;
}

export interface TentacledCondition {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Conditions?: Condition[];
  Enchantment?: string;
}

export interface FluffyConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tiers?: Tier[];
  IsNot?: boolean;
}

export interface PurpleTarget {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: TentacledCondition[] | TentacledConditions | null;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
  Origin?: PurpleOrigin;
  IncludeOrigin?: boolean;
}

export interface TentacledConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  Conditions?: StickyCondition[];
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: null | string;
  Tiers?: Tier[];
  IsNot?: boolean;
  Sizes?: Size[];
  Id?: string;
  AttributeType?: AttributeType;
  CardType?: Type;
  IsSameAsPlayerHero?: boolean;
}

export enum Type {
  CombatEncounter = "CombatEncounter",
  EncounterStep = "EncounterStep",
  EventEncounter = "EventEncounter",
  Item = "Item",
  PedestalEncounter = "PedestalEncounter",
  Skill = "Skill"
}

export interface ComparisonValue {
  $type: ComparisonValueType;
  Value?: number;
  Target?: TargetPlayerClass;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier | null;
}

export interface StickyCondition {
  $type: ConditionType;
  Tiers?: Tier[];
  IsNot?: boolean;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Conditions?: IndigoCondition[];
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: string;
  Sizes?: Size[];
  Id?: string;
  CardType?: Type;
  AttributeType?: AttributeType;
  IsSameAsPlayerHero?: boolean;
}

export interface IndigoCondition {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: TentacledCondition[];
  Enchantment?: string;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
}

export enum Size {
  Large = "Large",
  Medium = "Medium",
  Small = "Small"
}

export enum PurpleOrigin {
  Self = "Self",
  TriggerSource = "TriggerSource"
}

export interface TargetPlayer {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: StickyConditions | null;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
}

export interface StickyConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: PurpleValue;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: Condition[];
}

export interface FluffyValue {
  $type: ComparisonValueType;
  Target?: FluffyTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: PurpleModifier | null;
  Value?: number;
  MinValue?: number;
  MaxValue?: number;
}

export interface PurpleModifier {
  ModifyMode: Operation;
  Value: Limit;
}

export interface FluffyTarget {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: TentacledCondition[] | IndigoConditions | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
}

export interface IndigoConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  Tags?: Tag[];
  Operator?: Operator;
  AttributeType?: AttributeType;
  Sizes?: Size[];
  IsNot?: boolean;
  Tiers?: Tier[];
  Conditions?: PurpleCondition[];
  Enchantment?: string;
}

export enum ActiveIn {
  HandAndStash = "HandAndStash",
  HandOnly = "HandOnly"
}

export interface AbilityPrerequisite {
  $type: PrerequisiteType;
  Subject?: PurpleSubject;
  Comparison?: Comparison;
  Amount?: number;
  Conditions?: PrerequisiteConditions;
}

export enum PrerequisiteType {
  TPrerequisiteCardCount = "TPrerequisiteCardCount",
  TPrerequisitePlayer = "TPrerequisitePlayer",
  TPrerequisiteRun = "TPrerequisiteRun"
}

export interface PrerequisiteConditions {
  $type: FluffyType;
  CurrentDay: number;
  ComparisonOperator: Comparison;
}

export enum FluffyType {
  TRunConditionalCurrentDay = "TRunConditionalCurrentDay"
}

export interface PurpleSubject {
  $type: SourceType;
  Conditions: TentacledCondition[] | IndecentConditions | null;
  TargetMode?: Origin;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
}

export interface IndecentConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  Sizes?: Size[];
  IsNot?: boolean;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: IndecentCondition[];
  Tiers?: Tier[];
  AttributeType?: AttributeType;
  CardType?: Type;
  Enchantment?: string;
}

export interface IndecentCondition {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: string;
  CardType?: Type;
  IsNot?: boolean;
  Sizes?: Size[];
  Conditions?: Condition[];
}

export enum Priority {
  High = "High",
  Highest = "Highest",
  Immediate = "Immediate",
  Low = "Low",
  Lowest = "Lowest",
  Medium = "Medium"
}

export interface AbilityTrigger {
  $type: TriggerType;
  Subject?: FluffySubject;
  CombatType?: null | string;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
  CombatOutcome?: CombatOutcome | null;
  AttributeChanged?: AttributeType;
  Conditions?: Condition;
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
  TTriggerOnPlayerDied = "TTriggerOnPlayerDied"
}

export enum ChangeType {
  Gain = "Gain",
  Loss = "Loss"
}

export enum CombatOutcome {
  Lose = "Lose",
  Win = "Win"
}

export interface FluffySubject {
  $type: SourceType;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  Conditions: HilariousConditions | null;
  TargetMode?: Origin;
  Origin?: PurpleOrigin;
  IncludeOrigin?: boolean;
}

export interface HilariousConditions {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Sizes?: Size[];
  IsNot?: boolean;
  Conditions?: HilariousCondition[];
  CardType?: Type;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  AttributeType?: AttributeType;
  Enchantment?: null | string;
  Id?: string;
  Tiers?: Tier[];
}

export interface HilariousCondition {
  $type: ConditionType;
  CardType?: Type;
  IsNot?: boolean;
  Tags?: Tag[];
  Operator?: Operator;
  Sizes?: Size[];
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  AttributeType?: AttributeType;
  Enchantment?: string;
  Tiers?: Tier[];
  Conditions?: AmbitiousCondition[];
  IsSameAsPlayerHero?: boolean;
  Id?: string;
}

export interface AmbitiousCondition {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: CunningCondition[];
  Enchantment?: string;
  AttributeType?: AttributeType;
  Sizes?: Size[];
  IsNot?: boolean;
  Id?: string;
  IsSameAsPlayerHero?: boolean;
}

export interface CunningCondition {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Conditions?: IndigoCondition[];
  Enchantment?: string;
  IsNot?: boolean;
  Sizes?: Size[];
  Tiers?: Tier[];
  Id?: string;
}

export interface VFXConfig {
  VFXOverrideKey: null | string;
  VFXShouldPlay: boolean;
  VFXIsTakeover: boolean;
}

export interface V2CardAttributes {
  BuyPrice?: number;
  SellPrice?: number;
}

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

export interface AuraAction {
  $type: TentacledType;
  AttributeType: PurpleAttributeType;
  Operation: Operation;
  Value: TentacledValue;
  Target: TentacledTarget;
}

export enum TentacledType {
  TAuraActionCardModifyAttribute = "TAuraActionCardModifyAttribute",
  TAuraActionPlayerModifyAttribute = "TAuraActionPlayerModifyAttribute"
}

export enum PurpleAttributeType {
  AmmoMax = "AmmoMax",
  BurnApplyAmount = "BurnApplyAmount",
  BurnRemoveAmount = "BurnRemoveAmount",
  ChargeAmount = "ChargeAmount",
  CooldownMax = "CooldownMax",
  CritChance = "CritChance",
  Custom0 = "Custom_0",
  Custom1 = "Custom_1",
  Custom2 = "Custom_2",
  Custom3 = "Custom_3",
  Custom4 = "Custom_4",
  DamageAmount = "DamageAmount",
  DamageCrit = "DamageCrit",
  FreezeAmount = "FreezeAmount",
  HasteAmount = "HasteAmount",
  HealAmount = "HealAmount",
  HealthMax = "HealthMax",
  HealthRegen = "HealthRegen",
  Income = "Income",
  JoyApplyAmount = "JoyApplyAmount",
  Lifesteal = "Lifesteal",
  Multicast = "Multicast",
  PercentDamageReduction = "PercentDamageReduction",
  PoisonApplyAmount = "PoisonApplyAmount",
  PoisonRemoveAmount = "PoisonRemoveAmount",
  ReloadAmount = "ReloadAmount",
  RerollCostModifier = "RerollCostModifier",
  SellPrice = "SellPrice",
  ShieldApplyAmount = "ShieldApplyAmount",
  ShieldRemoveAmount = "ShieldRemoveAmount",
  SlowAmount = "SlowAmount"
}

export interface TentacledTarget {
  $type: SourceType;
  Conditions: TentacledCondition[] | AmbitiousConditions | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  TargetMode?: Origin;
  Origin?: PurpleOrigin;
  IncludeOrigin?: boolean;
}

export interface AmbitiousConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  AttributeType?: AttributeType;
  Conditions?: StickyCondition[];
  Sizes?: Size[];
  IsNot?: boolean;
  Enchantment?: null | string;
  Id?: string;
  IsSameAsPlayerHero?: boolean;
  CardType?: Type;
  Tiers?: Tier[];
}

export interface TentacledValue {
  $type: ComparisonValueType;
  Target?: StickyTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: PurpleModifier | null;
  Distinct?: boolean;
  Value?: number;
}

export interface StickyTarget {
  $type: SourceType;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  Conditions: TentacledCondition[] | CunningConditions | null;
  TargetMode?: Origin;
  Origin?: Origin;
  IncludeOrigin?: boolean;
}

export interface CunningConditions {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  Conditions?: MagentaCondition[];
  Sizes?: Size[];
  IsNot?: boolean;
  Tiers?: Tier[];
  Id?: string;
  Enchantment?: string;
  CardType?: Type;
  AttributeType?: AttributeType;
}

export interface MagentaCondition {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Conditions?: Condition[];
  Enchantment?: string;
  IsNot?: boolean;
  Sizes?: Size[];
  Tiers?: Tier[];
  Id?: string;
  CardType?: Type;
  AttributeType?: AttributeType;
}

export interface AuraPrerequisite {
  $type: PrerequisiteType;
  Subject: TentacledSubject;
  Comparison?: Comparison;
  Amount?: number;
}

export interface TentacledSubject {
  $type: SourceType;
  Conditions: MagentaConditions | null;
  TargetMode?: Origin;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  Origin?: PurpleOrigin;
  IncludeOrigin?: boolean;
}

export interface MagentaConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: ComparisonValue;
  Tags?: Tag[];
  Operator?: Operator;
  Tiers?: Tier[];
  IsNot?: boolean;
  Sizes?: Size[];
  Conditions?: FriskyCondition[];
  AttributeType?: AttributeType;
  Enchantment?: string;
  Id?: string;
  IsSameAsPlayerHero?: boolean;
}

export interface FriskyCondition {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: string;
  Tiers?: Tier[];
  IsNot?: boolean;
  Conditions?: PurpleCondition[];
  Sizes?: Size[];
  Id?: string;
}

export enum CardPackID {
  Core = "Core",
  DooleyCore = "Dooley_Core",
  JulesCore = "Jules_Core",
  MakCore = "Mak_Core",
  PygFrozenAssets = "Pyg_Frozen_Assets",
  PygmalienCore = "Pygmalien_Core",
  StelleCore = "Stelle_Core",
  Vanessa = "Vanessa",
  VanessaCore = "Vanessa_Core",
  VanessaMysteriesOfTheDeep = "Vanessa_Mysteries_of_the_Deep"
}

export interface CombatantType {
  $type: CombatantTypeType;
  Level: number;
}

export enum CombatantTypeType {
  TCombatantMonster = "TCombatantMonster"
}

export interface Enchantments {
  Golden?: Golden;
  Heavy?: Heavy;
  Icy?: Icy;
  Turbo?: Turbo;
  Shielded?: Shielded;
  Restorative?: Restorative;
  Toxic?: Toxic;
  Fiery?: Fiery;
  Shiny?: Shiny;
  Deadly?: Deadly;
  Radiant?: Radiant;
  Obsidian?: Obsidian;
}

export interface Deadly {
  Attributes: Attributes;
  Abilities: DeadlyAbilities;
  Auras: DeadlyAuras;
  Tags: any[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface DeadlyAbilities {
  e1?: PurpleE1;
  e2?: PurpleE2;
}

export interface PurpleE1 {
  Id: E1ID;
  Trigger: PurpleTrigger;
  ActiveIn: ActiveIn;
  Action: PurpleAction;
  Prerequisites: PurplePrerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface PurpleAction {
  $type: ActionType;
  Value?: Limit;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: Duration | null;
  TargetCount?: TargetCount | null;
  Target: IndigoTarget;
  Enchantment?: PurpleInternalDescription;
}

export enum PurpleInternalDescription {
  Deadly = "Deadly",
  Deadly1 = "Deadly 1",
  Deadly10 = "Deadly 10",
  Deadly2 = "Deadly 2",
  Deadly25 = "Deadly 25",
  Deadly2X = "Deadly 2x",
  Deadly50 = "Deadly 50",
  Empty = ""
}

export interface IndigoTarget {
  $type: SourceType;
  Conditions: FriskyConditions | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  TargetMode?: Origin;
  Origin?: Origin;
  IncludeOrigin?: boolean;
}

export interface FriskyConditions {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  AttributeType?: AttributeType;
  Conditions?: MischievousCondition[];
  Sizes?: Size[];
  IsNot?: boolean;
  Enchantment?: string;
  Id?: string;
  IsSameAsPlayerHero?: boolean;
}

export interface MischievousCondition {
  $type: ConditionType;
  Enchantment?: string;
  IsNot?: boolean;
  Sizes?: Size[];
  Tiers?: Tier[];
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Conditions?: BraggadociousCondition[];
  Id?: string;
}

export interface BraggadociousCondition {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
}

export enum E1ID {
  E1 = "e1",
  E3 = "e3"
}

export interface PurplePrerequisite {
  $type: PrerequisiteType;
  Subject?: TargetPlayerClass;
  Conditions?: PrerequisiteConditions;
  Comparison?: Comparison;
  Amount?: number;
}

export interface PurpleTrigger {
  $type: TriggerType;
  Subject?: IndigoTarget;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
  AttributeChanged?: AttributeType;
}

export interface PurpleE2 {
  Id: E2ID;
  Trigger: FluffyTrigger;
  ActiveIn: ActiveIn;
  Action: FluffyAction;
  Prerequisites: null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface FluffyAction {
  $type: ActionType;
  Value: TargetCount;
  AttributeType: AttributeType;
  Operation: Operation;
  Duration: Duration;
  TargetCount: null;
  Target: IndecentTarget;
}

export interface IndecentTarget {
  $type: SourceType;
  Origin?: Origin;
  TargetMode?: Origin;
  IncludeOrigin?: boolean;
  Conditions: MischievousConditions | null;
}

export interface MischievousConditions {
  $type: ConditionType;
  Conditions?: Condition1[];
  Tags?: Tag[];
  Operator?: Operator;
}

export interface Condition1 {
  $type: ConditionType;
  Conditions?: Condition[];
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
}

export enum E2ID {
  E2 = "e2",
  E3 = "e3",
  E4 = "e4",
  E5 = "e5",
  E6 = "e6"
}

export interface FluffyTrigger {
  $type: TriggerType;
  Subject: IndecentTarget;
  AttributeChanged?: AttributeType;
  ChangeType?: ChangeType;
}

export interface Attributes {}

export interface DeadlyAuras {
  e1?: FluffyE1;
  e?: E;
  e2?: FluffyE2;
}

export interface E {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: EAction;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface EAction {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: TargetCount;
  Target: HilariousTarget;
}

export interface HilariousTarget {
  $type: SourceType;
  ExcludeSelf?: boolean;
  Conditions: BraggadociousConditions | null;
  TargetMode?: Origin;
  TargetSection?: TargetSection;
}

export interface BraggadociousConditions {
  $type: ConditionType;
  Sizes?: Size[];
  IsNot?: boolean;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: StickyValue;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: Condition2[];
  Tiers?: Tier[];
  CardType?: Type;
  AttributeType?: AttributeType;
}

export interface StickyValue {
  $type: ComparisonValueType;
  Value?: number;
  Target?: TargetPlayerClass;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier | null;
}

export interface Condition2 {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  CardType?: Type;
  IsNot?: boolean;
  Enchantment?: string;
  Sizes?: Size[];
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
}

export interface FluffyE1 {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: TentacledAction;
  Prerequisites: FluffyPrerequisite[] | null;
  InternalName: string;
  InternalDescription: PurpleInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface TentacledAction {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: IndigoValue;
  Target: IndigoTarget;
}

export interface IndigoValue {
  $type: ComparisonValueType;
  Value?: number | number;
  Target?: AmbitiousTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: PurpleModifier | null;
}

export interface AmbitiousTarget {
  $type: SourceType;
  Conditions: Conditions1 | null;
  TargetMode?: Origin;
  ExcludeSelf?: boolean;
  TargetSection?: TargetSection;
}

export interface Conditions1 {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: StickyValue;
  Sizes?: Size[];
  IsNot?: boolean;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: Condition3[];
  Tiers?: Tier[];
  AttributeType?: AttributeType;
}

export interface Condition3 {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: string;
}

export interface FluffyPrerequisite {
  $type: PrerequisiteType;
  Subject: IndecentTarget;
  Comparison: Comparison;
  Amount: number;
}

export interface FluffyE2 {
  Id: string;
  ActiveIn: ActiveIn;
  Action: StickyAction;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface StickyAction {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: TargetCount;
  Target: IndecentTarget;
}

export enum HiddenTag {
  Active = "Active",
  Ammo = "Ammo",
  AmmoReference = "AmmoReference",
  Burn = "Burn",
  BurnReference = "BurnReference",
  Charge = "Charge",
  Cooldown = "Cooldown",
  Crit = "Crit",
  CritReference = "CritReference",
  Damage = "Damage",
  DamageReference = "DamageReference",
  EconomyReference = "EconomyReference",
  Experience = "Experience",
  Freeze = "Freeze",
  FreezeReference = "FreezeReference",
  Gold = "Gold",
  Haste = "Haste",
  HasteReference = "HasteReference",
  Heal = "Heal",
  HealReference = "HealReference",
  Health = "Health",
  HealthMax = "HealthMax",
  HealthReference = "HealthReference",
  Income = "Income",
  Joy = "Joy",
  JoyReference = "JoyReference",
  Lifesteal = "Lifesteal",
  Multicast = "Multicast",
  NonWeapon = "NonWeapon",
  Passive = "Passive",
  Poison = "Poison",
  PoisonReference = "PoisonReference",
  Regen = "Regen",
  RegenReference = "RegenReference",
  Shield = "Shield",
  ShieldReference = "ShieldReference",
  Slow = "Slow",
  SlowReference = "SlowReference",
  Toughness = "Toughness",
  Value = "Value"
}

export interface DeadlyLocalization {
  Tooltips: Tooltip[];
}

export interface Tooltip {
  Content: Title;
  TooltipType: HiddenTag;
  Prerequisites: null;
}

export interface Title {
  Key: string;
  Text: string;
}

export interface Fiery {
  Attributes: FieryAttributes;
  Abilities: FieryAbilities;
  Auras: FieryAuras;
  Tags: any[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface FieryAbilities {
  e1?: TentacledE1;
  e2?: TentacledE2;
  E1?: E1;
}

export interface E1 {
  Id: string;
  Trigger: E1Trigger;
  ActiveIn: ActiveIn;
  Action: E1Action;
  Prerequisites: null;
  Priority: Size;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface E1Action {
  $type: ActionType;
  ReferenceValue: null;
  Target: AmbitiousTarget;
}

export interface E1Trigger {
  $type: TriggerType;
}

export interface TentacledE1 {
  Id: E1ID;
  Trigger: TentacledTrigger;
  ActiveIn: ActiveIn;
  Action: IndigoAction | null;
  Prerequisites: PurplePrerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: ConditionInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface IndigoAction {
  $type: ActionType;
  ReferenceValue?: null;
  Target: CunningTarget;
  Value?: IndecentValue;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: Duration;
  TargetCount?: null;
  Enchantment?: ConditionInternalDescription;
}

export enum ConditionInternalDescription {
  Burn = "Burn",
  BurnEqualToYourRegeneration = "Burn equal to your Regeneration.",
  Empty = "",
  Fiery = "Fiery",
  Restorative = "Restorative",
  Restorative1 = "Restorative 1",
  Set = "set ",
  Shielded = "Shielded",
  Shielded1 = "Shielded 1",
  Toxic = "Toxic"
}

export interface CunningTarget {
  $type: SourceType;
  Conditions: Condition | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  TargetMode?: Origin;
  Origin?: Origin;
  IncludeOrigin?: boolean;
}

export interface IndecentValue {
  $type: ComparisonValueType;
  Value?: number;
  Target?: MagentaTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier | null;
}

export interface MagentaTarget {
  $type: SourceType;
  Conditions: Conditions2 | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
}

export interface Conditions2 {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: TentacledCondition[];
  Enchantment?: string;
  AttributeType?: AttributeType;
}

export interface TentacledTrigger {
  $type: TriggerType;
  Subject?: StickySubject;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
  CombatType?: null;
  AttributeChanged?: AttributeType;
}

export interface StickySubject {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: Conditions3 | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  Origin?: Origin;
  IncludeOrigin?: boolean;
}

export interface Conditions3 {
  $type: ConditionType;
  Tags?: Tag[];
  Operator?: Operator;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  IsSameAsPlayerHero?: boolean;
}

export interface TentacledE2 {
  Id: E2ID;
  Trigger: StickyTrigger;
  ActiveIn: ActiveIn;
  Action: IndecentAction;
  Prerequisites: The3_Prerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface IndecentAction {
  $type: ActionType;
  Value?: Limit;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: Duration;
  TargetCount?: null;
  Target: FriskyTarget;
  ReferenceValue?: null;
}

export interface FriskyTarget {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: Conditions4 | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
}

export interface Conditions4 {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: StickyValue;
  Tags?: Tag[];
  Operator?: Operator;
  AttributeType?: AttributeType;
  Sizes?: Size[];
  IsNot?: boolean;
  Tiers?: Tier[];
  Conditions?: Condition4[];
  Enchantment?: string;
}

export interface Condition4 {
  $type: ConditionType;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: Condition[];
  Enchantment?: ConditionInternalDescription;
}

export interface The3_Prerequisite {
  $type: PrerequisiteType;
  Subject: TargetPlayerClass;
}

export interface StickyTrigger {
  $type: TriggerType;
  Subject?: FriskyTarget;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
  AttributeChanged?: AttributeType;
}

export interface FieryAttributes {
  BurnApplyAmount?: number;
  Custom_4?: number;
  Custom_0?: number;
  Custom_1?: number;
}

export interface FieryAuras {
  e2?: StickyE2;
  e1?: StickyE1;
  e3?: E2Class;
  E2?: E2Class;
}

export interface E2Class {
  Id: E2IDEnum;
  ActiveIn: ActiveIn;
  Action: E2Action;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface E2Action {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: Limit;
  Target: FriskyTarget;
}

export enum E2IDEnum {
  E2 = "E2",
  E3 = "e3"
}

export interface StickyE1 {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: HilariousAction;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface HilariousAction {
  $type: TentacledType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: Limit;
  Target: CunningTarget;
}

export interface StickyE2 {
  Id: E2ID;
  ActiveIn: ActiveIn;
  Action: AmbitiousAction;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: FluffyInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface AmbitiousAction {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: HilariousValue;
  Target: LimitTarget;
}

export interface HilariousValue {
  $type: ComparisonValueType;
  Target?: CunningTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier | null;
  Value?: number;
  Distinct?: boolean;
}

export enum FluffyInternalDescription {
  Burn1ForEachAquaticOrToyItemYouHave = "Burn 1 for each Aquatic or Toy item you have.",
  Burn1ForEachNonWeaponItemYouHave = "Burn 1 for each non-Weapon item you have.",
  Empty = "",
  Heal12ForEachNonWeaponItemYouHave = "Heal 12 for each non-Weapon item you have.",
  Heal15ForEachAquaticOrToyItemYouHave = "Heal 15 for each Aquatic or Toy item you have.",
  InternalDescriptionSetsShield = "Sets Shield",
  InternalDescriptionSetsTheValueOfBurn = "Sets the value of Burn",
  InternalDescriptionSetsTheValueOfHeal = "Sets the value of Heal",
  InternalDescriptionSetsTheValueOfPoison = "Sets the value of poison",
  InternalDescriptionSetsTheValueOfShield = "Sets the value of Shield",
  Poison1ForEachAquaticOrToyItemYouHave = "Poison 1 for each Aquatic or Toy item you have.",
  Poison1ForEachNonWeaponItemYouHave = "Poison 1 for each non-Weapon item you have.",
  Restorative = "Restorative",
  SetsShield = "Sets shield",
  SetsTheHealOfTheItem = "Sets the heal of the item",
  SetsTheValueOfAbility1 = "Sets the value of Ability 1",
  SetsTheValueOfBurn = "Sets the value of burn",
  SetsTheValueOfHeal = "Sets the value of heal",
  SetsTheValueOfPoison = "Sets the value of Poison",
  SetsTheValueOfRestorativeDragonWhelp = "Sets the value of Restorative Dragon Whelp",
  SetsTheValueOfRestorativeSubmarineAbility = "Sets the value of Restorative Submarine Ability",
  SetsTheValueOfRestorativeSubmersible = "Sets the value of Restorative Submersible",
  SetsTheValueOfRestorativeTheBoulder = "Sets the value of Restorative The Boulder",
  SetsTheValueOfShield = "Sets the value of shield",
  SetsTheValueOfShieldApplyAmount = "Sets the value of ShieldApplyAmount",
  SetsTheValueOfShieldedTheBoulder = "Sets the value of Shielded The Boulder",
  Shield10ForEachAquaticOrToyItemYouHave = "Shield 10 for each Aquatic or Toy item you have.",
  Shield8ForEachNonWeaponItemYouHave = "Shield 8 for each non-Weapon item you have."
}

export interface Golden {
  Attributes: Attributes;
  Abilities: GoldenAbilities;
  Auras: GoldenAuras;
  Tags: Tag[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface GoldenAbilities {
  e1?: IndigoE1;
  e2?: IndigoE2;
}

export interface IndigoE1 {
  Id: E1ID;
  Trigger: IndigoTrigger;
  ActiveIn: ActiveIn;
  Action: CunningAction;
  Prerequisites: null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: TentacledInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface CunningAction {
  $type: ActionType;
  Value?: StickyValue;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: null;
  TargetCount?: null;
  Target?: TargetPlayerClass;
  TargetPlayer?: TargetPlayerClass;
  SpawnContext?: FluffySpawnContext;
}

export interface FluffySpawnContext {
  $type: SpawnContextType;
  Limit: TargetCount;
}

export enum TentacledInternalDescription {
  Empty = "",
  Golden0 = "Golden 0",
  Golden1 = "Golden 1",
  Golden100 = "Golden 100",
  Shiny = "Shiny",
  Shiny1 = "Shiny 1",
  WhenYouBuyAPropertyThisItemGains1234Value = "When you buy a Property, this item gains [1/2/3/4] value."
}

export interface IndigoTrigger {
  $type: TriggerType;
  Subject: HilariousTarget;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
}

export interface IndigoE2 {
  Id: E2ID;
  Trigger: IndecentTrigger;
  ActiveIn: ActiveIn;
  Action: MagentaAction;
  Prerequisites: null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface MagentaAction {
  $type: ActionType;
  TargetPlayer: TargetPlayerClass;
  SpawnContext: FluffySpawnContext;
}

export interface IndecentTrigger {
  $type: TriggerType;
  Subject: LimitTarget;
}

export interface GoldenAuras {
  e1?: IndecentE1;
  e3?: E1Class;
}

export interface IndecentE1 {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: FriskyAction;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: TentacledInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface FriskyAction {
  $type: TentacledType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: PurpleValue;
  Target: MischievousTarget;
}

export interface MischievousTarget {
  $type: SourceType;
  Conditions: Conditions5 | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  Origin?: Origin;
  TargetMode?: Origin;
  IncludeOrigin?: boolean;
}

export interface Conditions5 {
  $type: ConditionType;
  Sizes?: Size[];
  IsNot?: boolean;
  Tags?: Tag[];
  Operator?: Operator;
  Conditions?: Condition5[];
}

export interface Condition5 {
  $type: ConditionType;
  Id: string;
  IsNot: boolean;
}

export interface E1Class {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: MischievousAction;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface MischievousAction {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: TargetCount;
  Target: LimitTarget;
}

export interface Heavy {
  Attributes: HeavyAttributes;
  Abilities: HeavyAbilities;
  Auras: HeavyAuras;
  Tags: any[];
  HiddenTags: AttributeType[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface HeavyAbilities {
  e1?: HilariousE1;
  e2?: IndecentE2;
  "3"?: The3;
}

export interface The3 {
  Id: string;
  Trigger: The3_Trigger;
  ActiveIn: ActiveIn;
  Action: The3_Action;
  Prerequisites: The3_Prerequisite[];
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface The3_Action {
  $type: ActionType;
  Value: TargetCount;
  AttributeType: AttributeType;
  Operation: Operation;
  Duration: Duration | null;
  TargetCount: null;
  Target: LimitTarget;
}

export interface The3_Trigger {
  $type: TriggerType;
  Subject?: TargetPlayerClass;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
}

export interface HilariousE1 {
  Id: E1ID;
  Trigger: TentacledTrigger;
  ActiveIn: ActiveIn;
  Action: BraggadociousAction;
  Prerequisites: PurplePrerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: StickyInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface BraggadociousAction {
  $type: ActionType;
  Target: HilariousTarget;
  Enchantment?: string;
}

export enum StickyInternalDescription {
  Empty = "",
  Heavy = "Heavy",
  Heavy3 = "Heavy 3"
}

export interface IndecentE2 {
  Id: E2ID;
  Trigger: The3_Trigger;
  ActiveIn: ActiveIn;
  Action: Action1;
  Prerequisites: The3_Prerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action1 {
  $type: ActionType;
  Value?: TargetCount;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: Duration;
  TargetCount?: null;
  Target: MagentaTarget;
}

export interface HeavyAttributes {
  SlowTargets?: number;
  SlowAmount?: number;
  Custom_4?: number;
}

export interface HeavyAuras {
  e1?: E1Class;
}

export interface Icy {
  Attributes: IcyAttributes;
  Abilities: IcyAbilities;
  Auras: HeavyAuras;
  Tags: any[];
  HiddenTags: AttributeType[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface IcyAbilities {
  e1?: AmbitiousE1;
  e2?: The3;
  "3"?: The3;
}

export interface AmbitiousE1 {
  Id: E1ID;
  Trigger: HilariousTrigger;
  ActiveIn: ActiveIn;
  Action: Action2;
  Prerequisites: PurplePrerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: IndigoInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action2 {
  $type: ActionType;
  Target: AmbitiousTarget;
  Enchantment?: IndigoInternalDescription;
}

export enum IndigoInternalDescription {
  Empty = "",
  Icy = "Icy",
  Icy2 = "Icy 2"
}

export interface HilariousTrigger {
  $type: TriggerType;
  Subject?: IndigoSubject;
  AttributeType?: AttributeType;
  ChangeType?: ChangeType;
  CombatType?: null;
}

export interface IndigoSubject {
  $type: SourceType;
  TargetMode?: Origin;
  Conditions: Conditions6 | null;
  TargetSection?: TargetSection;
  ExcludeSelf?: boolean;
  Origin?: Origin;
  IncludeOrigin?: boolean;
}

export interface Conditions6 {
  $type: ConditionType;
  Tiers?: Tier[];
  IsNot?: boolean;
  Attribute?: AttributeType;
  ComparisonOperator?: Comparison;
  ComparisonValue?: TargetCount;
  Conditions?: Condition[];
  Tags?: Tag[];
  Operator?: Operator;
  Enchantment?: string;
  Sizes?: Size[];
  Id?: string;
  AttributeType?: AttributeType;
  IsSameAsPlayerHero?: boolean;
}

export interface IcyAttributes {
  FreezeTargets?: number;
  FreezeAmount?: number;
  Custom_4?: number;
  Custom_8?: number;
}

export interface Obsidian {
  Attributes: PurpleAttributes;
  Abilities: ObsidianAbilities;
  Auras: Attributes;
  Tags: any[];
  HiddenTags: AttributeType[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface ObsidianAbilities {
  e1?: CunningE1;
}

export interface CunningE1 {
  Id: E1ID;
  Trigger: E3Trigger;
  ActiveIn: ActiveIn;
  Action: BraggadociousAction;
  Prerequisites: E3Prerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface E3Prerequisite {
  $type: PrerequisiteType;
  Subject: LimitTarget;
  Comparison: Comparison;
  Amount: number;
}

export interface E3Trigger {
  $type: TriggerType;
  Subject?: MagentaTarget;
}

export interface PurpleAttributes {
  Lifesteal?: number;
}

export interface Radiant {
  Attributes: Attributes;
  Abilities: RadiantAbilities;
  Auras: Attributes;
  Tags: any[];
  HiddenTags: any[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface RadiantAbilities {
  e1?: MagentaE1;
  e2?: HilariousE2;
}

export interface MagentaE1 {
  Id: E1ID;
  Trigger: AmbitiousTrigger;
  ActiveIn: ActiveIn;
  Action: Action3;
  Prerequisites: E3Prerequisite[] | null;
  Priority: Priority;
  InternalName: E1InternalName;
  InternalDescription: IndecentInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action3 {
  $type: ActionType;
  Value?: TargetCount;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: null;
  TargetCount?: null;
  Target: TargetPlayer;
  Enchantment?: IndecentInternalDescription;
}

export enum IndecentInternalDescription {
  Empty = "",
  Radiant = "Radiant",
  WhenThisItemGainsFreezeRemoveFreezeFromIt = "When this item gains Freeze, remove Freeze from it."
}

export enum E1InternalName {
  InternalNameRadiant = "Radiant",
  Radiant = "Radiant ",
  RadiantScrapMetalAbility = "Radiant Scrap Metal Ability",
  RadiantUpgradeHammerAbility = "Radiant Upgrade Hammer Ability"
}

export interface AmbitiousTrigger {
  $type: TriggerType;
  Subject: TargetPlayer;
  AttributeChanged?: AttributeType;
  ChangeType?: ChangeType;
}

export interface HilariousE2 {
  Id: E2ID;
  Trigger: CunningTrigger;
  ActiveIn: ActiveIn;
  Action: The3_Action;
  Prerequisites: null;
  Priority: Priority;
  InternalName: E2InternalName;
  InternalDescription: HilariousInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: E2TranslationKey;
}

export enum HilariousInternalDescription {
  WhenThisItemGainsSlowRemoveSlowFromIt = "When this item gains Slow, remove Slow from it."
}

export enum E2InternalName {
  RadiantSlow = "Radiant Slow"
}

export enum E2TranslationKey {
  Db02Baf95Ec3866B3Bcf0761025Fd005 = "db02baf95ec3866b3bcf0761025fd005"
}

export interface CunningTrigger {
  $type: TriggerType;
  Subject: LimitTarget;
  AttributeChanged: AttributeType;
  ChangeType: ChangeType;
}

export interface Restorative {
  Attributes: RestorativeAttributes;
  Abilities: RestorativeAbilities;
  Auras: RestorativeAuras;
  Tags: any[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface RestorativeAbilities {
  e1?: TentacledE1;
  e3?: PurpleE3;
  e2?: TentacledE2;
}

export interface PurpleE3 {
  Id: E1ID;
  Trigger: E3Trigger;
  ActiveIn: ActiveIn;
  Action: Action4;
  Prerequisites: null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action4 {
  $type: ActionType;
  Value: TargetCount;
  AttributeType: AttributeType;
  Operation: Operation;
  Duration: Duration | null;
  TargetCount: null;
  Target: FriskyTarget;
}

export interface RestorativeAttributes {
  HealAmount?: number;
  Custom_4?: number;
  Custom_1?: number;
}

export interface RestorativeAuras {
  e1?: StickyE1;
  e2?: StickyE2;
  e3?: FluffyE3;
}

export interface FluffyE3 {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: Action5;
  Prerequisites: null;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action5 {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: Limit;
  Target: HilariousTarget;
}

export interface Shielded {
  Attributes: ShieldedAttributes;
  Abilities: ShieldedAbilities;
  Auras: ShieldedAuras;
  Tags: any[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface ShieldedAbilities {
  e1?: TentacledE1;
  e3?: TentacledE3;
  e2?: TentacledE2;
}

export interface TentacledE3 {
  Id: E1ID;
  Trigger: E3Trigger;
  ActiveIn: ActiveIn;
  Action: Action6;
  Prerequisites: null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action6 {
  $type: ActionType;
  Value: TargetCount;
  AttributeType: AttributeType;
  Operation: Operation;
  Duration: Duration | null;
  TargetCount: null;
  Target: HilariousTarget;
}

export interface ShieldedAttributes {
  ShieldApplyAmount?: number;
  Custom_4?: number;
  Custom_1?: number;
}

export interface ShieldedAuras {
  e2?: StickyE2;
  e1?: StickyE1;
  e3?: StickyE3;
}

export interface StickyE3 {
  Id: string;
  ActiveIn: ActiveIn;
  Action: Action7;
  Prerequisites: null;
  InternalName: E3InternalName;
  InternalDescription: FluffyInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: E3TranslationKey;
}

export interface Action7 {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: Limit;
  Target: LimitTarget;
}

export enum E3InternalName {
  ShieldedHandaxeAura = "Shielded Handaxe Aura",
  ShieldedSharkclawsAura = "Shielded Sharkclaws Aura",
  TooltipHandling = "Tooltip Handling"
}

export enum E3TranslationKey {
  A193D872E6Cb3A8Dc2D05Aedb98955C0 = "a193d872e6cb3a8dc2d05aedb98955c0",
  B7B4B93275C7490D6E2B0997872Ba2E1 = "b7b4b93275c7490d6e2b0997872ba2e1",
  The9Ed8516049000A0E1A90054E0Aab06Ce = "9ed8516049000a0e1a90054e0aab06ce"
}

export interface Shiny {
  Attributes: ShinyAttributes;
  Abilities: ShinyAbilities;
  Auras: ShinyAuras;
  Tags: any[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface ShinyAbilities {
  e1?: FriskyE1;
  e2?: IndigoE2;
}

export interface FriskyE1 {
  Id: E1ID;
  Trigger: E3Trigger;
  ActiveIn: ActiveIn;
  Action: Action8 | null;
  Prerequisites: E3Prerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: TentacledInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action8 {
  $type: ActionType;
  Enchantment?: TentacledInternalDescription;
  Target?: AmbitiousTarget;
  TargetPlayer?: TargetPlayerClass;
  SpawnContext?: FluffySpawnContext;
}

export interface ShinyAttributes {
  CritChance?: number;
  Multicast?: number;
  Custom_1?: number;
}

export interface ShinyAuras {
  e1?: MischievousE1;
  e2?: E4Class;
  e3?: E4Class;
  e4?: E4Class;
  e5?: E4Class;
  e6?: E4Class;
}

export interface MischievousE1 {
  Id: E1ID;
  ActiveIn: ActiveIn;
  Action: Action9;
  Prerequisites: TentacledPrerequisite[] | null;
  InternalName: string;
  InternalDescription: E4InternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action9 {
  $type: TentacledType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: HilariousValue;
  Target: CunningTarget;
}

export enum E4InternalDescription {
  Deadly25 = "Deadly 25",
  Empty = "",
  Golden1 = "Golden 1",
  Icy2 = "Icy 2",
  Shiny = "Shiny",
  Shiny1 = "Shiny 1",
  Shiny2 = "Shiny 2",
  ShinyNone = "Shiny None",
  ThisHasAura1MulticastForEachPropertyYouHave = "This has +{aura.1} Multicast for each Property you have.",
  TooltipHandling = "Tooltip Handling",
  XP2X = "XP 2x"
}

export interface TentacledPrerequisite {
  $type: PrerequisiteType;
  Subject: AmbitiousTarget;
  Comparison?: Comparison;
  Amount?: number;
}

export interface E4Class {
  Id: E2ID;
  ActiveIn: ActiveIn;
  Action: E4Action;
  Prerequisites: E3Prerequisite[] | null;
  InternalName: string;
  InternalDescription: E4InternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface E4Action {
  $type: ActionType;
  AttributeType: AttributeType;
  Operation: Operation;
  Value: AmbitiousValue;
  Target: IndecentTarget;
}

export interface AmbitiousValue {
  $type: ComparisonValueType;
  Target?: IndecentTarget;
  AttributeType?: AttributeType;
  DefaultValue?: number;
  Modifier?: ComparisonValueModifier | null;
  Value?: number | number;
}

export interface Toxic {
  Attributes: ToxicAttributes;
  Abilities: ToxicAbilities;
  Auras: FieryAuras;
  Tags: any[];
  HiddenTags: HiddenTag[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface ToxicAbilities {
  e1?: TentacledE1;
  e2?: AmbitiousE2;
  E1?: E1;
}

export interface AmbitiousE2 {
  Id: E2ID;
  Trigger: StickyTrigger;
  ActiveIn: ActiveIn;
  Action: Action10;
  Prerequisites: The3_Prerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: string;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action10 {
  $type: ActionType;
  Value?: TargetCount;
  AttributeType?: AttributeType;
  Operation?: Operation;
  Duration?: Duration;
  TargetCount?: null;
  Target: AmbitiousTarget;
  ReferenceValue?: null;
}

export interface ToxicAttributes {
  PoisonApplyAmount?: number;
  Custom_4?: number;
}

export interface Turbo {
  Attributes: TurboAttributes;
  Abilities: TurboAbilities;
  Auras: HeavyAuras;
  Tags: any[];
  HiddenTags: AttributeType[];
  Localization: DeadlyLocalization;
  HasAbilities: boolean;
  HasAuras: boolean;
}

export interface TurboAbilities {
  e1?: BraggadociousE1;
  e2?: IndecentE2;
  "3"?: The3;
}

export interface BraggadociousE1 {
  Id: E1ID;
  Trigger: TentacledTrigger;
  ActiveIn: ActiveIn;
  Action: Action11;
  Prerequisites: PurplePrerequisite[] | null;
  Priority: Priority;
  InternalName: string;
  InternalDescription: AmbitiousInternalDescription;
  MigrationData: string;
  VFXConfig: VFXConfig;
  TranslationKey: string;
}

export interface Action11 {
  $type: ActionType;
  Target: IndigoTarget;
  Enchantment?: AmbitiousInternalDescription;
}

export enum AmbitiousInternalDescription {
  Empty = "",
  Turbo = "Turbo",
  Turbo2 = "Turbo 2",
  Turbo3 = "Turbo 3"
}

export interface TurboAttributes {
  HasteTargets?: number;
  HasteAmount?: number;
  Custom_4?: number;
  Custom_8?: number;
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

export enum V2CardInternalDescription {
  AnyInvestmentHelps = "Any investment helps!",
  CloseTheCircusDownAndFreeAllTheAnimals = "Close the circus down and free all the animals.",
  Day1 = "Day 1",
  Empty = "",
  GainADiamondTierItem = "Gain a Diamond-tier item",
  HaveANiceDay = "Have a nice day :)",
  InternalDescriptionSellsItems = "Sells items",
  KeepTheWalletForYourself = "Keep the wallet for yourself.",
  SellsItems = "Sells Items",
  SideWithTheMerchantAndShooTheCustomerAway = "Side with the merchant and shoo the customer away.",
  SpendYourTimeLookingForSpareChangeInsteadOfInvesting = "Spend your time looking for spare change instead of investing.",
  TheCreatureHumsWithHappinessAndYouFeelAtPeace = "The creature hums with happiness and you feel at peace.",
  TheCreaturePurrsWithJoyAndYouFeelWarmInside = "The creature purrs with joy and you feel warm inside.",
  YouFeedTheCreatureAndItLeadsYouToAnItem = "You feed the creature and it leads you to an item!",
  YouOwnTheCircusWhatDoYouWantToDoWithIt = "You own the circus! What do you want to do with it?"
}

export interface V2CardLocalization {
  Title: Title;
  Description: Title | null;
  FlavorText: null;
  Tooltips: Tooltip[];
}

export interface Reward {
  SelectionContextRules: Rules | null;
  GoldReward: number;
  ExperienceReward: number;
}

export interface Rules {
  CanSelectMultiple: boolean;
  SelectionIsFree: boolean;
  CanExit: boolean;
  RerollRules: RerollRules | null;
  WillAutoSellOnExit: boolean;
  NextEncounterOnExit: null;
}

export interface RerollRules {
  TotalAllowedRerolls: number | null;
  CostIncrease: number;
  StartingCost: number;
  CostMax: null;
}

export interface SelectionContext {
  Rules: Rules;
}

export interface SelectionCriteria {
  $type: ConditionType;
  Tiers?: Tier[];
  IsNot?: boolean;
  Conditions?: SelectionCriteriaCondition[];
}

export interface SelectionCriteriaCondition {
  $type: ConditionType;
  Enchantment?: string;
  IsNot?: boolean;
  CardType?: Type;
  Conditions?: Condition6[];
}

export interface Condition6 {
  $type: ConditionType;
  Enchantment: string;
}

export interface Tiers {
  Gold?: TierInfo;
  Diamond: TierInfo;
  Bronze?: TierInfo;
  Silver?: TierInfo;
  Legendary?: TierInfo;
}

export interface TierInfo {
  Attributes: { [key: string]: number };
  AbilityIds: string[];
  AuraIds: string[];
  TooltipIds: number[];
}

export enum Version {
  The000 = "0.0.0",
  The100 = "1.0.0"
}
