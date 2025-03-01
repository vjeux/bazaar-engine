import {
  Ability,
  AbilityAction,
  ActionType,
  Trigger,
  TriggerType,
  Value,
  ValueType,
  Target,
  Subject,
  ActiveIn,
  Priority,
  SourceType,
  Origin,
  TargetSection
} from "./types/cardTypes";

/**
 * Interface for the analyzed tooltip structure
 */
interface AnalyzedTooltip {
  original: string;
  trigger: string;
  subject: string | null;
  action: string | null;
  modifiers: string[];
}

/**
 * Represents a partially constructed card ability component
 * that can be combined with others to form a complete ability
 */
interface PartialCardComponent {
  type: "trigger" | "subject" | "action" | "modifier";
  data: Partial<Trigger | Subject | AbilityAction | Value>; // More specific than any
}

// Map of trigger text to partial trigger objects
const TRIGGER_MAPPING: Record<string, Partial<Trigger>> = {
  "When you": {
    $type: TriggerType.TTriggerOnPlayerAttributeChanged
  },
  "When your": {
    $type: TriggerType.TTriggerOnCardAttributeChanged
  },
  "At the start": {
    $type: TriggerType.TTriggerOnDayStarted
  },
  "The first time": {
    $type: TriggerType.TTriggerOnPlayerAttributeChanged
  },
  "While you": {
    // This is actually more of an aura condition than a trigger
    $type: TriggerType.TTriggerOnPlayerAttributeChanged
  }
};

// Map of action text to partial action objects
const ACTION_MAPPING: Record<string, Partial<AbilityAction>> = {
  Burn: {
    $type: ActionType.TActionPlayerBurnApply
  },
  Charge: {
    $type: ActionType.TActionCardCharge
  },
  Shield: {
    $type: ActionType.TActionPlayerShieldApply
  },
  Heal: {
    $type: ActionType.TActionPlayerHeal
  },
  "Deal damage": {
    $type: ActionType.TActionPlayerDamage
  },
  Freeze: {
    $type: ActionType.TActionCardFreeze
  },
  Slow: {
    $type: ActionType.TActionCardSlow
  },
  Haste: {
    $type: ActionType.TActionCardHaste
  },
  gain: {
    $type: ActionType.TActionPlayerModifyAttribute
  }
};

// Map of subject text to partial subject/target objects
const SUBJECT_MAPPING: Record<string, Partial<Target | Subject>> = {
  this: {
    $type: SourceType.TTargetCardSelf
  },
  "adjacent items": {
    $type: SourceType.TTargetCardPositional,
    TargetMode: Origin.Neighbor
  },
  weapons: {
    $type: SourceType.TTargetCardSection,
    TargetSection: TargetSection.SelfHand
    // TODO: Would need conditions for weapon tag
  },
  items: {
    $type: SourceType.TTargetCardSection,
    TargetSection: TargetSection.SelfHand
  },
  enemy: {
    $type: SourceType.TTargetPlayer,
    TargetMode: Origin.Opponent
  }
};

// Common values for modifiers
const MODIFIER_PATTERNS = [
  {
    pattern: /(\d+)/, // Matches one or more digits, capturing them as a group
    createValue: (match: string): Value => ({
      $type: ValueType.TFixedValue,
      Value: parseInt(match)
    })
  },
  {
    pattern: /(\d+)-(\d+)/, // Matches two groups of digits separated by a hyphen (e.g., "1-3")
    createValue: (match: string): Value => {
      const [min, max] = match.split("-").map(Number);
      return {
        $type: ValueType.TRangeValue,
        MinValue: min,
        MaxValue: max
      };
    }
  }
];

// Common triggers that start tooltips
const TRIGGERS: string[] = Object.keys(TRIGGER_MAPPING);

/**
 * Split the text into
 */
export function extractSubjectAction(text: string): {
  subject: string | null;
  action: string | null;
  modifiers: string[];
  trigger: string | null;
  prerequisites?: string | null;
} {
  const allowedActions = [
    "heal",
    "draw",
    "slow",
    "freeze",
    "poison",
    "burn",
    "haste",
    "charge",
    "shield"
  ];
  const allowedSubjects = ["enemies", "weapons", "target"];

  // Build regex patterns that only match these allowed strings.
  const actionsRegex = allowedActions.join("|");
  const subjectsRegex = allowedSubjects.join("|");

  const patterns: Array<{
    regex: RegExp;
    handler: (match: { [key: string]: string }) => {
      subject: string | null;
      action: string | null;
      modifiers: string[];
      trigger: string | null;
      prerequisites: string | null;
    };
  }> = [
    {
      // Pattern: "Action subject for modifier" e.g. "slow enemies for 2 seconds"
      regex: new RegExp(
        `^(?<action>${actionsRegex})\\s+(?<subject>${subjectsRegex})\\s+for\\s+(?<modifier>.+)$`,
        "i"
      ),
      handler: ({ action, subject, modifier }) => ({
        subject,
        action,
        modifiers: [modifier],
        trigger: null, // No trigger in this pattern, probably on cooldown
        prerequisites: null // No prerequisites in this pattern
      })
    },
    {
      // Pattern: "Subject action modifier" e.g. "enemies take 2 damage"
      regex: new RegExp(
        `^(?<subject>${subjectsRegex})\\s+(?<action>${actionsRegex})\\s+(?<modifier>.+)$`,
        "i"
      ),
      handler: ({ subject, action, modifier }) => ({
        subject,
        action,
        modifiers: [modifier],
        trigger: null,
        prerequisites: null
      })
    },
    {
      // Pattern: "Action modifier" e.g. "heal 2"
      regex: new RegExp(`^(?<action>${actionsRegex})\\s+(?<modifier>.+)$`, "i"),
      handler: ({ action, modifier }) => ({
        subject: "target", // Default subject if none provided.
        action,
        modifiers: [modifier],
        trigger: null,
        prerequisites: null
      })
    }
  ];

  for (const { regex, handler } of patterns) {
    const match = text.match(regex);
    if (match && match.groups) {
      return handler(match.groups);
    }
  }

  // Default to nothing found
  throw new Error(`Could not extract subject, action etc. from: ${text}`);
}

/**
 * Analyze a single tooltip into components.
 * @param tooltip The tooltip text to analyze
 * @returns An object with the analyzed tooltip components
 */
export function analyzeTooltip(tooltip: string): AnalyzedTooltip {
  const result: AnalyzedTooltip = {
    original: tooltip,
    trigger: "On cooldown", // Default trigger
    subject: null,
    action: null,
    modifiers: []
  };

  // Check for explicit triggers
  let remaining = tooltip;
  for (const trigger of TRIGGERS) {
    if (tooltip.startsWith(trigger)) {
      result.trigger = tooltip.split(",")[0];
      remaining = tooltip.substring(result.trigger.length + 1).trim();
      if (!remaining) {
        remaining = tooltip.substring(result.trigger.length).trim();
      }
      break;
    }
  }

  // Extract subject and action
  const { subject, action, modifiers } = extractSubjectAction(remaining);
  result.subject = subject;
  result.action = action;
  result.modifiers = modifiers;

  return result;
}

/**
 * Convert a trigger string to a partial trigger object
 * @param triggerText The trigger text from the tooltip
 * @returns A partial trigger object or undefined if no match
 */
export function mapTriggerToPartial(
  triggerText: string
): PartialCardComponent | undefined {
  // Check for exact matches in our mapping
  for (const [key, value] of Object.entries(TRIGGER_MAPPING)) {
    if (triggerText.startsWith(key)) {
      return {
        type: "trigger",
        data: { ...value }
      };
    }
  }

  // Default trigger if no match found
  return {
    type: "trigger",
    data: {
      $type: TriggerType.TTriggerOnCardFired
    }
  };
}

/**
 * Convert a subject string to a partial subject/target object
 * @param subjectText The subject text from the tooltip
 * @returns A partial subject/target object or undefined if no match
 */
export function mapSubjectToPartial(
  subjectText: string | null
): PartialCardComponent | undefined {
  if (!subjectText) return undefined;

  // Check for exact matches in our mapping
  for (const [key, value] of Object.entries(SUBJECT_MAPPING)) {
    if (subjectText === key || subjectText.includes(key)) {
      return {
        type: "subject",
        data: { ...value }
      };
    }
  }

  // Default subject if no match found
  return {
    type: "subject",
    data: {
      $type: SourceType.TTargetCardSelf
    }
  };
}

/**
 * Convert an action string to a partial action object
 * @param actionText The action text from the tooltip
 * @returns A partial action object or undefined if no match
 */
export function mapActionToPartial(
  actionText: string | null
): PartialCardComponent | undefined {
  if (!actionText) return undefined;

  // Check for exact matches in our mapping
  for (const [key, value] of Object.entries(ACTION_MAPPING)) {
    if (actionText === key || actionText.includes(key)) {
      return {
        type: "action",
        data: { ...value }
      };
    }
  }

  // Default action if no match found
  return {
    type: "action",
    data: {
      $type: ActionType.TActionPlayerDamage
    }
  };
}

/**
 * Convert modifier strings to partial value objects
 * @param modifiers The modifier texts from the tooltip
 * @returns An array of partial value objects
 */
export function mapModifiersToPartials(
  modifiers: string[]
): PartialCardComponent[] {
  const result: PartialCardComponent[] = [];

  for (const modifier of modifiers) {
    // Check for numeric patterns
    for (const { pattern, createValue } of MODIFIER_PATTERNS) {
      const match = modifier.match(pattern);
      if (match) {
        result.push({
          type: "modifier",
          data: createValue(match[0])
        });
        break;
      }
    }
  }

  // Add a default value if we didn't find any
  if (result.length === 0) {
    result.push({
      type: "modifier",
      data: {
        $type: ValueType.TFixedValue,
        Value: 1
      }
    });
  }

  return result;
}

/**
 * Convert an analyzed tooltip to partial card component objects
 * @param tooltip The analyzed tooltip
 * @returns An array of partial card components
 */
export function convertTooltipToPartials(
  tooltip: AnalyzedTooltip
): PartialCardComponent[] {
  const result: PartialCardComponent[] = [];

  // Map trigger
  const triggerComponent = mapTriggerToPartial(tooltip.trigger);
  if (triggerComponent) result.push(triggerComponent);

  // Map subject
  const subjectComponent = mapSubjectToPartial(tooltip.subject);
  if (subjectComponent) result.push(subjectComponent);

  // Map action
  const actionComponent = mapActionToPartial(tooltip.action);
  if (actionComponent) result.push(actionComponent);

  // Map modifiers
  const modifierComponents = mapModifiersToPartials(tooltip.modifiers);
  result.push(...modifierComponents);

  return result;
}

/**
 * Build a complete Ability object from partial components
 * @param components The partial components to combine
 * @param id Optional ID for the ability
 * @returns A complete Ability object
 */
export function buildAbilityFromPartials(
  components: PartialCardComponent[],
  id: string = `ability_${Date.now()}`
): Ability {
  // Default ability structure
  const ability: Ability = {
    Id: id,
    Trigger: {
      $type: TriggerType.TTriggerOnCardSelected
    } as Trigger,
    ActiveIn: ActiveIn.HandOnly,
    Action: {
      $type: ActionType.TActionCardModifyAttribute
    } as AbilityAction,
    Prerequisites: null,
    Priority: Priority.Medium,
    InternalName: `Internal${id}`,
    InternalDescription: null,
    MigrationData: "",
    VFXConfig: null,
    TranslationKey: `translation.${id}`
  };

  // Apply each component to the ability
  for (const component of components) {
    switch (component.type) {
      case "trigger":
        ability.Trigger = { ...ability.Trigger, ...component.data };
        break;
      case "action":
        ability.Action = { ...ability.Action, ...component.data };
        break;
      case "subject":
        // Handle subject based on where it needs to go (could be in Trigger.Subject or Action.Target)
        // TODO probably does not work
        if (
          component.data.$type &&
          component.data.$type.toString().includes("Target")
        ) {
          ability.Action.Target = component.data as Target;
        } else {
          if (!ability.Trigger.Subject) {
            ability.Trigger.Subject = {} as Subject;
          }
          ability.Trigger.Subject = {
            ...ability.Trigger.Subject,
            ...component.data
          };
        }
        break;
      case "modifier":
        // Handle modifier based on where it needs to go (usually in Action.Value)
        ability.Action.Value = component.data as Value;
        break;
    }
  }

  return ability;
}

/**
 * Process a tooltip string into a complete card Ability
 * @param tooltip The tooltip text to process
 * @returns A complete Ability object
 */
export function tooltipToAbility(tooltip: string): Ability {
  const analyzed = analyzeTooltip(tooltip);
  const partials = convertTooltipToPartials(analyzed);
  return buildAbilityFromPartials(partials);
}
