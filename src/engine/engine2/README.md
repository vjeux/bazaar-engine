# Engine2: EventBus + Command Pattern Implementation

This directory contains a reimplementation of the game engine using the EventBus and Command patterns for better separation of concerns, maintainability, and testability.

## Architecture Overview

The Engine2 implementation adopts event-driven architecture with the Command pattern for state changes:

1. **EventBus**: Central messaging system that decouples components
2. **Commands**: Encapsulated state change operations
3. **Event Handlers**: Logic that responds to events and triggers commands

## Key Components

### EventBus (`engine2.ts`)

The EventBus acts as a central messaging system that enables loose coupling between components. It allows for:

- Publishing events with data
- Subscribing to events with handler functions
- Unsubscribing from events

### BoardCardID (`engine2.ts`)

Rather than passing separate player and card indices, we now use a `BoardCardID` type:

```typescript
type BoardCardID = {
  playerID: number;
  cardID: number;
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
- `DamagePlayerCommand`: Applies damage to a player
- `TriggerCardCommand`: Triggers a card's abilities

### Event Handlers (`eventHandlers.ts`)

Event handlers respond to events by creating and executing commands. They contain the business logic that was previously in the monolithic engine. Examples:

- `handleGameTick`: Processes what happens each tick
- `handleCardTriggered`: Processes card trigger logic
- `handlePlayerDamaged`: Responds to player damage events

### Targeting System (`targeting.ts`)

The targeting module handles the complex logic of determining which cards or players are affected by abilities:

- `getTargetCards`: Resolves target cards based on targeting configuration
- `getTargetPlayers`: Resolves target players based on targeting configuration
- `testCardConditions`/`testPlayerConditions`: Checks if targets meet condition requirements

## Event Flow

1. Events are emitted (e.g., `game:tick`, `card:triggered`)
2. Event handlers respond by creating commands
3. Commands execute, changing game state
4. Commands may emit additional events
5. The cycle continues

## Benefits of this Architecture

- **Separation of concerns**: Each component has a specific responsibility
- **Testability**: Components can be tested in isolation
- **Maintainability**: Easier to add new features or fix bugs
- **Readability**: Code flow is clearer and more explicit
- **Extensibility**: New event types or commands can be added with minimal changes

## Usage Example

```typescript
// Create engine
const engine = createEngine(initialGameState);

// Run the game for 10 ticks
const gameStates = engine.run(10);

// Or process ticks individually
engine.processTick();
``` 