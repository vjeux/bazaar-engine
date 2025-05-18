# Engine2: EventBus + Command Pattern Implementation

This directory contains a reimplementation of the game engine using the EventBus and Command patterns for better separation of concerns, maintainability, and testability.

## Architecture Overview

The Engine2 implementation adopts event-driven architecture with the Command pattern for state changes:

1. **EventBus**: Central messaging system that decouples components
2. **Commands**: Encapsulated state change operations
3. **Event Handlers**: Logic that responds to events and triggers commands

## Key Components

### EventBus (`eventHandlers.ts`)

The EventBus acts as a central messaging system that enables loose coupling between components. It is initialized within the `Engine2` constructor and a reference to the `GameState` is provided to it, allowing event handlers to access and modify the game state. It provides:

- Publishing events with data (`emit` method)
- Subscribing to events with handler functions (`on` method with priority)
- Unsubscribing from events (`off` method)
- Testing functions to conditionally handle events
- Priority-based event handling (Immediate, Highest, High, Medium, Low, Lowest)

### CardLocationID (`engine2.ts`)

Rather than passing separate player and card indices, we now use a `CardLocationID` type:

```typescript
type CardLocationID = {
  playerIdx: number;
  location: "board" | "stash";
  cardIdx: number;
};
```

This encapsulates card identification and makes the API more consistent.

### Commands (`commands.ts`)

Commands are self-contained operations that perform specific state changes. Each command:

- Implements the `Command` interface
- Encapsulates a single logical operation
- May trigger additional events upon execution

Key examples:

- `ModifyCardAttributeCommand`: Changes a card attribute value
- `ModifyPlayerAttributeCommand`: Changes a player attribute value
- `DamagePlayerCommand`: Applies damage to a player and handles shields
- `FireCardCommand`: Triggers a card's firing sequence
- `AddCardCommand`: Adds a card to the board
- `RemoveCardCommand`: Removes a card from the board
- `ProcessTickCommand`: Updates the game state for each tick

### Event Handlers (`eventHandlers.ts`)

Event handlers respond to events by creating and executing commands. They contain the business logic for game mechanics:

- `handleGameTick`: Processes what happens each tick (poison, burn, regen, cooldowns)
- `setupEventHandlers`: Registers card abilities to appropriate events
- `processSandstorm`: Applies environmental damage over time
- `processCardCooldowns`: Manages card firing and multicasts

### Targeting System (`targeting.ts`)

The targeting module handles the complex logic of determining which cards or players are affected by abilities:

- `getTargetCards`: Resolves target cards based on positioning, attributes, or other criteria
- `getTargetPlayers`: Resolves target players based on targeting configuration
- `testCardConditions`: Checks if cards meet condition requirements
- `testPlayerConditions`: Checks if players meet condition requirements

### Prerequisites (`prereq.ts`)

The prerequisites system determines whether abilities should trigger:

- `createPrerequisitesCheck`: Creates a function to check if prerequisites are met
- `checkPrerequisite`: Tests individual prerequisites

## Event Flow

1. The game starts with the engine's `run` method or individual `processTick` calls.
2. On first tick, a `game:fightStarted` event is emitted.
3. Each tick emits a `game:tick` event, which triggers the following cascade:

   - Process poison damage and health regeneration (every 1000ms)
   - Process burn damage (every 500ms)
   - Process card cooldowns and emit the fire card events
   - Process sandstorm damage
   - Check for player deaths

4. When a card is ready to fire:

   - A `card:fired` event is emitted
   - Registered event handlers for that card respond by executing appropriate commands. Other card's abilities can also responds to events like `card:itemused`
   - Commands may emit additional events (e.g., `player:damaged`, `player:attributeChanged`)

5. Actions like dealing damage create additional events like `player:damaged` which can trigger other abilities

## Card Registration and Firing

Cards register their abilities to the EventBus when the game starts:

1. Each card's abilities are analyzed and mapped to appropriate event types
2. Abilities include:
   - Trigger conditions (e.g., on tick, on card fired)
   - Prerequisites that must be met
   - Actions to perform
   - Priority level

When a card's cooldown reaches its maximum:

1. The card fires and may perform multicasts if configured
2. Ammo is decremented if applicable
3. The card's internal cooldown is reset

## Internal Cooldown System

> ⚠️ **Warning**: The internal cooldown system is not fully implemented yet.

Cards have internal cooldown mechanics to limit firing frequency:

- Most cards have an internal cooldown for max firing per second
- Cards can be affected by status effects like Freeze (prevents firing), Slow (half speed), and Haste (double speed)
- Multicast abilities trigger multiple times with a delay between each cast

## Benefits of this Architecture

- **Separation of concerns**: Each component has a specific responsibility
- **Testability**: Components can be tested in isolation
- **Maintainability**: Easier to add new features or fix bugs
- **Readability**: Code flow is clearer and more explicit
- **Extensibility**: New event types or commands can be added with minimal changes

## Usage Example

```typescript
// Create engine
const engine = new Engine2(initialGameState);

// Run the game for 10 ticks
const gameStates = engine.run(10);
// The 'game:fightStarted' event is emitted automatically on the first tick within the run method.

// Or process ticks individually
engine.processTick();

// Get the current game state (returns a deep copy)
const currentState = engine.getGameState();
```


## Attribute Snapshot System

The engine implements an attribute snapshot system where changes to attributes are not applied immediately but are instead staged as "drafts" and applied at the beginning of the next tick. This system provides several benefits:

- **Atomicity**: All attribute changes within a tick are applied together at the beginning of the next tick, ensuring atomic updates
- **Consistency**: When reading attributes within a tick, you get consistent values throughout the tick
- **Predictability**: Effects and ability calculations can depend on the state at the beginning of the tick

### How it works

1. At the beginning of each tick, the system:
   - Applies all draft changes from the previous tick
   - Takes a snapshot of the current state of all attributes

2. During the tick:
   - All attribute changes are made to draft values, not directly to actual attributes
   - Commands and events use the draft values for calculations via `getCardAttribute` and `getPlayerAttribute`

3. At the beginning of the next tick, the process repeats, applying all drafted changes

### Implementation

The system uses:
- `attributeSnapshots` in GameState to store the beginning-of-tick snapshot
- `attributeDraft` in Player and BoardCard to store pending changes
- Helper functions to get the effective value of an attribute (draft → snapshot → current)

### Usage

When modifying attributes, always use the provided commands:
- `ModifyCardAttributeCommand` - Updates a card attribute draft
- `ModifyPlayerAttributeCommand` - Updates a player attribute draft

When reading attributes, always use:
- `getCardAttribute` - Gets the current effective value of a card attribute
- `getPlayerAttribute` - Gets the current effective value of a player attribute
