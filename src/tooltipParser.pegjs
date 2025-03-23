// Global initializer
{{
  // Import lodash
  const _ = require("lodash");
  //import _ from "lodash";

  // Helper functions used within the grammar
  function extractNumbers(input) {
    let content = input;

    // If input contains parentheses, extract the content within them
    const match = input.match(/\(\s*([^)]*?)\s*\)/);
    if (match && match[1]) {
      content = match[1];
    }

    // Split the content by either '»' or '/' and process each item
    return content
      .split(/[»/]/)
      .map((item) => {
        // Remove whitespace and an optional leading '+'
        const s = item.trim().replace(/^\+/, "");

        // Check for multiplier values ending with 'x'
        const multiplierMatch = s.match(/^(\d+(?:\.\d+)?)x$/i);
        if (multiplierMatch) {
          return parseFloat(multiplierMatch[1]);
        }

        // Check for percentage values ending with '%'
        const percentageMatch = s.match(/^(\d+(?:\.\d+)?)%$/);
        if (percentageMatch) {
          return parseFloat(percentageMatch[1]);
        }

        // Check for plain numbers
        const numberMatch = s.match(/^(\d+(?:\.\d+)?)$/);
        if (numberMatch) {
          return parseFloat(numberMatch[1]);
        }

        // If none of the expected patterns match, return NaN
        return NaN;
      })
      .filter((num) => !isNaN(num));
  }

  const TierInt = {
    Bronze: 0,
    Silver: 1,
    Gold: 2,
    Diamond: 3,
    Legendary: 4
  };

  function cfTier(item, values, construct_function) {
    const startingIndex = TierInt[item.startingTier];
    let tiers = Object.keys(TierInt);
    // Filter out all tiers where the item doesn't have a tooltip
    tiers = tiers
      .slice(startingIndex)
      .filter((tier) => item.tiers[tier].tooltips.length > 0);

    let result = {};

    values.forEach((value, index) => {
      if (index < tiers.length) {
        const tier = tiers[index];
        result = _.merge(result, construct_function(item, tier, values, index));
      }
    });

    return result;
  }

  function constructTierInfos(item, attribute_type, values) {
    const startingIndex = TierInt[item.startingTier];
    let tiers = Object.keys(TierInt);
    // Filter out all tiers where the item doesn't have a tooltip
    tiers = tiers
      .slice(startingIndex)
      .filter((tier) => item.tiers[tier].tooltips.length > 0);

    // For every tier, create a TierInfo object
    const tierInfos = {};
    values.forEach((value, index) => {
      tierInfos[tiers[index]] = {
        Attributes: {
          [attribute_type]: value
        }
      };
    });

    // Return partial card object
    return {
      Tiers: tierInfos
    };
  }
}}

// Per parse initializer
{
  const ITEM = options.item;
  const abilityIndex = options.abilityIndex;
  const auraIndex = options.auraIndex;
}

// The main rule - a tooltip is either a stat tooltip, an action tooltip, or a composite tooltip with possible nesting
Tooltip
  = StatTooltip
  / NormalActionTooltip

// AttributeType matches all known attribute types used in the game
AttributeType
  = "Ammo"i
  / "AmmoMax"i
  / "Burn"i
  / "BurnApplyAmount"i
  / "BurnRemoveAmount"i
  / "BuyPrice"i
  / "ChargeAmount"i
  / "CooldownMax"i
  / "Counter"i
  / "CritChance"i
  / "Custom_0"i
  / "Custom_1"i
  / "Custom_2"i
  / "Custom_3"i
  / "Custom_4"i
  / "Custom_5"i
  / "DamageAmount"i
  / "DamageCrit"i
  / "Experience"i
  / "Freeze"i
  / "FreezeAmount"i
  / "FreezeTargets"i
  / "Gold"i
  / "Haste"i
  / "HasteAmount"i
  / "HealAmount"i
  / "Health"i
  / "HealthMax"i
  / "HealthRegen"i
  / "Income"i
  / "Joy"i
  / "JoyApplyAmount"i
  / "Level"i
  / "Lifesteal"i
  / "Multicast"i
  / "PercentDamageReduction"i
  / "Poison"i
  / "PoisonApplyAmount"i
  / "PoisonRemoveAmount"i
  / "Prestige"i
  / "ReloadAmount"i
  / "RerollCostModifier"i
  / "SellPrice"i
  / "Shield"i
  / "ShieldApplyAmount"i
  / "ShieldRemoveAmount"i
  / "Slow"i
  / "SlowAmount"i

// TagType matches all item tags used in the game
TagType
  = "Apparel"i
  / "Aquatic"i
  / "Burn"i
  / "Core"i
  / "Damage"i
  / "Dinosaur"i
  / "Dragon"i
  / "Food"i
  / "Freeze"i
  / "Friend"i
  / "Haste"i
  / "Heal"i
  / "Joy"i
  / "Loot"i
  / "Merchant"i
  / "Poison"i
  / "Potion"i
  / "Property"i
  / "Ray"i
  / "Shield"i
  / "Slow"i
  / "Tech"i
  / "Tool"i
  / "Toy"i
  / "Unsellable"i
  / "Vehicle"i
  / "Weapon"i

// StatType matches the possible stat types (ammo, cooldown)
StatType
  = "ammo"i
  / "cooldown"i

// StatTooltip parses tooltips like "ammo (10)" or "cooldown (2) seconds"
StatTooltip
  = stat:StatType _ values:Numbers remaining:$(.*)? {
      // If cooldown
      switch (stat.toLowerCase()) {
        case "cooldown":
          values = values.map((value) => value * 1000);
          return constructTierInfos(ITEM, "CooldownMax", values);
        case "ammo":
          return constructTierInfos(ITEM, "AmmoMax", values);
        default:
          throw new Error("Unknown stat type: " + stat);
      }
    }

// ActionType matches all possible action types
ActionType
  = "burn"i { return "TActionPlayerBurnApply"; }
  / "deal"i { return "TActionPlayerDamage"; }
  / "heal"i { return "TActionPlayerHeal"; }
  / "poison"i { return "TActionPlayerPoisonApply"; }
  / "shield"i { return "TActionPlayerShieldApply"; }
  / "freeze"i { return "TActionCardFreeze"; }
  / "haste"i { return "TActionCardHaste"; }
  / "slow"i { return "TActionCardSlow"; }

// NormalActionTooltip parses tooltips like "deal 10 damage" or "heal 5"
NormalActionTooltip
  = actionType:ActionType _ amount:Numbers ("." / " damage."i)? {
      // Create TierInfo with DamageAmount attribute
      const tiers_card = constructTierInfos(ITEM, "DamageAmount", amount);
      // Append AbilityIds to the card object
      Object.keys(tiers_card.Tiers).forEach((tier) => {
        tiers_card.Tiers[tier].AbilityIds = {
          [abilityIndex]: `${abilityIndex}`
        };
      });
      // Set startingTier multicast to 1
      tiers_card.Tiers[ITEM.startingTier].Attributes.Multicast = 1;
      // Add ampty AuraIds
      Object.keys(tiers_card.Tiers).forEach((tier) => {
        tiers_card.Tiers[tier].AuraIds = {};
      });
      // Add tooltip
      Object.keys(tiers_card.Tiers).forEach((tier) => {
        tiers_card.Tiers[tier].TooltipIds = {
          [abilityIndex]: abilityIndex
        };
      });
      // Create card object with the action
      const ability_card = {
        Abilities: {
          [abilityIndex]: {
            Action: {
              $type: actionType,
              ReferenceValue: null,
              Target: {
                $type: "TTargetPlayerRelative",
                TargetMode: [
                  "TActionPlayerHeal",
                  "TActionPlayerShieldApply"
                ].includes(actionType)
                  ? "Self"
                  : "Opponent",
                Conditions: null
              }
            },
            ActiveIn: "HandOnly",
            Id: `${abilityIndex}`,
            Prerequisites: null,
            Trigger: {
              $type: "TTriggerOnCardFired"
            }
          }
        },
        Auras: {}
      };

      return _.merge(ability_card, tiers_card);
    }

WhenSource
  = "any item"i
  / "one of your items"i
  / "the Core gains"i
  / "this or an adjacent item"i
  / ("this"i _? "item"i?)

Trigger = "When"i _ source:WhenSource

// Adjacent Heal items gain (10/15/20/25) Heal for the fight.
// Adjacent Shield items gain (10/15/20/25) Shield for the fight.
// Adjacent Shield items gain (3/6/9/12) Shield for the fight.
// Adjacent Shield items gain (5/10) Shield for the fight.
// Adjacent Shield items permanently gain (+1/+2/+3/+4) Shield.
// Adjacent Weapons gain (5/10) Damage for the fight.
// Adjacent Weapons permanently gain (+1/+2/+3/+4) Damage.
// Adjacent items gain (+10%/+15%/+20%) crit chance for the fight.
// Adjacent items gain (2%/4%/6%/8%) Crit Chance for the fight.
// Adjacent items gain (2%/4%/6%/8%) Crit chance for the fight.
// Adjacent items permanently gain (1%/2%/3%/4%) Crit chance.
// Adjacent weapons gain (10/15/20/25) Damage for the fight.
// Adjacent weapons gain (3/6/9/12) damage for the fight.
Target
  = "items"
  / TagType " items"
  / "weapons"i

AdjacentTarget
  = "Adjacent"i
    _
    target:Target
    (_ permanent:"permanently")?
    _
    "gain"
    _
    amount:Numbers
    _
    attribute:AttributeType
    _?
    forFight:"for the fight."? {
      // Start by creating TierInfos with Custom_x attributes
      tiers = cfTier(ITEM, amount, (item, tier, values, index) => {
        const tierInfo = {
          Attributes: {
            [`Custom_${index}`]: values[index]
          }
        };
      });
      // Now create the ability
      // TODO
    }

// Numbers matches a number pattern, either a single number or a parenthesized list
Numbers
  = "(" values:$[^)]+ ")" { return extractNumbers("(" + values + ")"); }
  / value:$([+-]? [0-9]+ (. [0-9]+)? [x%]?) { return extractNumbers(value); }

// Whitespace pattern
_ "whitespace" = [ \t\n\r]*
