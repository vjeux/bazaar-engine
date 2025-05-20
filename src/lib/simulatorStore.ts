import {
  MonsterConfig,
  PlayerCardConfig,
  PlayerConfig,
  PlayerSkillConfig,
} from "@/engine/GameState";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { genCardsAndEncounters } from "./Data";
import { persist, StateStorage, createJSONStorage } from "zustand/middleware";
import { arrayMove } from "@dnd-kit/sortable";
import { AttributeType } from "@/types/cardTypes";
import { Tier } from "@/types/shared";
import { EnchantmentType } from "@/types/shared";
import { v4 as uuidv4 } from "uuid";
import { getInitialGameState2, run } from "@/engine/engine2/engine2Adapter";
import { GameState } from "@/engine/engine2/engine2";
import { Draft } from "immer";

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

type State = {
  playerConfig: PlayerConfig;
  enemyConfig: PlayerConfig;
  steps: GameState[];
  autoScroll: boolean;
  autoReset: boolean;
  battleSpeed: number;
  stepCount: number;
  editingCardIndex: number | null;
  isCalculatingWinrate: boolean;
  winrate: number | null;
  completedSimulations: number;
  targetSimulations: number;
  calculationId: string;
};

type Actions = {
  actions: {
    setPlayerConfig: (playerConfig: PlayerConfig) => void;
    setEnemyConfig: (enemyConfig: PlayerConfig) => void;
    setEnemyFromMonster: (monsterConfig: MonsterConfig) => void;
    addCard: (card: PlayerCardConfig, isEnemy?: boolean) => void;
    addSkill: (skill: PlayerSkillConfig, isEnemy?: boolean) => void;
    setAutoScroll: (autoScroll: boolean) => void;
    setAutoReset: (autoReset: boolean) => void;
    setBattleSpeed: (battleSpeed: number) => void;
    setStepCount: (stepCount: number) => void;
    recalculateSteps: () => void;
    removeCard: (cardIndex: number, isEnemy?: boolean) => void;
    removeSkill: (skillIndex: number, isEnemy?: boolean) => void;
    reset: () => void;
    moveCard: (oldIndex: number, newIndex: number, isEnemy?: boolean) => void;
    transferCardBetweenPlayers: (
      sourceIndex: number,
      targetIndex: number,
      isSourceEnemy: boolean,
      isTargetEnemy: boolean,
    ) => void;
    setCardAttributeOverrides: (
      cardIndex: number,
      attributeOverrides: Partial<Record<AttributeType, number>>,
      isEnemy?: boolean,
    ) => void;
    setCardEnchantment: (
      cardIndex: number,
      enchantment: EnchantmentType,
      isEnemy?: boolean,
    ) => void;
    setCardTier: (cardIndex: number, tier: Tier, isEnemy?: boolean) => void;
    setEditingCardIndex: (index: number | null) => void;
    calculateWinrate: (numSimulations?: number) => void;
    resetWinrateCalculation: () => void;
    clearPlayerBoard: (playerIdx: number) => void;
  };
};

const initialPlayer: PlayerConfig = {
  type: "player",
  health: 2000,
  healthRegen: 0,
  income: 0,
  gold: 0,
  cards: [],
  skills: [],
};

const initialEnemy: PlayerConfig = {
  type: "player",
  health: 400,
  healthRegen: 0,
  income: 0,
  gold: 0,
  cards: [],
  skills: [],
};

const initialMonster: MonsterConfig = {
  type: "monster",
  name: "Pyro",
  day: 1,
};

// Helper function to find monster in encounters data
function findMonsterInEncounters(monsterName: string, day: number) {
  // Find monster by both name and day to handle monsters with the same name across days
  for (const encounterDay of EncounterData.data) {
    // Check if this is the correct day
    if (encounterDay.day === day) {
      for (const group of encounterDay.groups) {
        for (const monster of group) {
          if (monster.cardName === monsterName) {
            return monster;
          }
        }
      }
    }
  }

  // If not found by day and name, try just by name as fallback
  for (const encounterDay of EncounterData.data) {
    for (const group of encounterDay.groups) {
      for (const monster of group) {
        if (monster.cardName === monsterName) {
          console.warn(`Monster "${monsterName}" found, but not on day ${day}`);
          return monster;
        }
      }
    }
  }

  throw new Error(`Monster "${monsterName}" not found in encounters data`);
}

// Helper function to convert monster to player config
function convertMonsterToPlayerConfig(
  monsterConfig: MonsterConfig,
): PlayerConfig {
  try {
    const monster = findMonsterInEncounters(
      monsterConfig.name,
      monsterConfig.day,
    );

    // Create cards from monster items (non-skills)
    const cards: PlayerCardConfig[] = monster.items.map((item) => ({
      cardId: item.card.id,
      tier: item.tierType,
      enchantment: item.enchantmentType,
    }));

    // Create skills from monster skills
    const skills: PlayerSkillConfig[] = monster.skills.map((item) => ({
      cardId: item.card.id,
      tier: item.tierType,
    }));

    // Create player config from monster data
    return {
      type: "player",
      health: monster.health,
      healthRegen: 0,
      income: 0,
      gold: 0,
      cards,
      skills,
    };
  } catch (error) {
    console.error("Error converting monster to player config:", error);
    // Return default enemy config if conversion fails
    return { ...initialEnemy };
  }
}

const runWrapper = (
  enemyConfig: PlayerConfig,
  playerConfig: PlayerConfig,
  randomSeed: number = 1,
) => {
  // Create the initial game state with Engine2 compatibility
  const initialState = getInitialGameState2(
    CardsData,
    EncounterData,
    [enemyConfig, playerConfig],
    randomSeed,
  );

  // Run the simulation with Engine2
  return run(initialState, 10000);
};

// Initial monster converted to player config for enemy
const initialEnemyFromMonster = convertMonsterToPlayerConfig(initialMonster);

const initialSteps = runWrapper(initialEnemyFromMonster, initialPlayer);

const initialState: State = {
  playerConfig: initialPlayer,
  enemyConfig: initialEnemyFromMonster,
  steps: initialSteps,
  autoScroll: false,
  autoReset: false,
  battleSpeed: 1,
  stepCount: 0,
  editingCardIndex: null,
  isCalculatingWinrate: false,
  winrate: null,
  completedSimulations: 0,
  targetSimulations: 100,
  calculationId: "",
};

// Helper to generate random ID
const generateCalculationId = () => uuidv4();

// URL Persistance
const persistentStorage: StateStorage = {
  getItem: (key): string => {
    const searchParams = new URLSearchParams(window.location.hash.slice(1));
    const storedValue = searchParams.get(key) ?? "";
    return JSON.parse(storedValue);
  },
  setItem: (key, newValue): void => {
    const searchParams = new URLSearchParams(window.location.hash.slice(1));
    searchParams.set(key, JSON.stringify(newValue));
    window.location.hash = searchParams.toString();
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(window.location.hash.slice(1));
    searchParams.delete(key);
    window.location.hash = searchParams.toString();
  },
};

// Run simulation and recalculate winrate if enabled
const runSimulationAndUpdateWinrate = (
  state: Draft<State>,
  actions: Actions["actions"],
) => {
  // Run the simulation and update steps
  state.steps = runWrapper(state.enemyConfig, state.playerConfig);

  // If winrate calculation is enabled, schedule recalculation after current update completes
  if (
    state.isCalculatingWinrate ||
    (state.winrate !== null && state.targetSimulations > 0)
  ) {
    // Need setTimeout to ensure UI updates properly between state changes
    const simCount = state.targetSimulations;
    setTimeout(() => actions.calculateWinrate(simCount), 0);
  }
};

export const useSimulatorStore = create<State & Actions>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      actions: {
        setPlayerConfig: (playerConfig: PlayerConfig) =>
          set((state) => {
            state.playerConfig = playerConfig;
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setEnemyConfig: (enemyConfig: PlayerConfig) =>
          set((state) => {
            state.enemyConfig = enemyConfig;
            state.stepCount = 0;
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setEnemyFromMonster: (monsterConfig: MonsterConfig) =>
          set((state) => {
            state.enemyConfig = convertMonsterToPlayerConfig(monsterConfig);
            state.stepCount = 0;
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        addCard: (card: PlayerCardConfig, isEnemy: boolean = false) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            (config.cards ??= []).push(card);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        addSkill: (skill: PlayerSkillConfig, isEnemy: boolean = false) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            (config.skills ??= []).push(skill);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setAutoScroll: (autoScroll: boolean) =>
          set((state) => {
            state.autoScroll = autoScroll;
          }),
        setAutoReset: (autoReset: boolean) =>
          set((state) => {
            state.autoReset = autoReset;
          }),
        setBattleSpeed: (battleSpeed: number) =>
          set((state) => {
            state.battleSpeed = battleSpeed;
          }),
        setStepCount: (stepCount: number) =>
          set((state) => {
            state.stepCount = stepCount;
          }),
        recalculateSteps: () =>
          set((state) => {
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        removeCard: (cardIndex: number, isEnemy: boolean = false) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            config.cards?.splice(cardIndex, 1);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        removeSkill: (skillIndex: number, isEnemy: boolean = false) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            config.skills?.splice(skillIndex, 1);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        reset: () => {
          set(initialState);
        },
        moveCard: (
          oldIndex: number,
          newIndex: number,
          isEnemy: boolean = false,
        ) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            const newCards = arrayMove(config.cards ?? [], oldIndex, newIndex);
            config.cards = newCards;
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        transferCardBetweenPlayers: (
          sourceIndex: number,
          targetIndex: number = -1, // -1 means add to the end
          isSourceEnemy: boolean = false,
          isTargetEnemy: boolean = false,
        ) =>
          set((state) => {
            // Get source and target configs
            const sourceConfig = isSourceEnemy
              ? state.enemyConfig
              : state.playerConfig;
            const targetConfig = isTargetEnemy
              ? state.enemyConfig
              : state.playerConfig;

            // Ensure cards arrays exist
            if (
              !sourceConfig.cards ||
              sourceConfig.cards.length <= sourceIndex
            ) {
              return; // Source card doesn't exist
            }

            // Initialize target cards array if needed
            targetConfig.cards = targetConfig.cards || [];

            // Get the card to transfer
            const cardToTransfer = sourceConfig.cards[sourceIndex];

            // Remove from source
            sourceConfig.cards.splice(sourceIndex, 1);

            // Add to target at specific index or end
            if (
              targetIndex === -1 ||
              targetIndex >= targetConfig.cards.length
            ) {
              targetConfig.cards.push(cardToTransfer);
            } else {
              targetConfig.cards.splice(targetIndex, 0, cardToTransfer);
            }

            // Recalculate simulation
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setCardAttributeOverrides: (
          cardIndex: number,
          attributeOverrides: Partial<Record<AttributeType, number>>,
          isEnemy: boolean = false,
        ) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.cards?.[cardIndex]) {
              config.cards[cardIndex].attributeOverrides = attributeOverrides;
            }
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setCardEnchantment: (
          cardIndex: number,
          enchantment: EnchantmentType,
          isEnemy: boolean = false,
        ) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.cards?.[cardIndex]) {
              const card = config.cards[cardIndex];
              card.enchantment = enchantment;
              card.attributeOverrides = {};
            }
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setCardTier: (
          cardIndex: number,
          tier: Tier,
          isEnemy: boolean = false,
        ) =>
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.cards?.[cardIndex]) {
              config.cards[cardIndex].tier = tier;
              config.cards[cardIndex].attributeOverrides = {};
            }
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setEditingCardIndex: (index: number | null) =>
          set((state) => {
            state.editingCardIndex = index;
          }),
        calculateWinrate: (numSimulations = 100) => {
          const state = get();
          const enemyConfig = { ...state.enemyConfig };
          const playerConfig = { ...state.playerConfig };

          // Generate a new calculation ID
          const calculationId = generateCalculationId();

          // Reset winrate calculation state
          set((state) => {
            state.isCalculatingWinrate = true;
            state.winrate = null;
            state.targetSimulations = numSimulations;
            state.completedSimulations = 0;
            state.calculationId = calculationId;
          });

          let playerWins = 0;
          let currentSeed = 0;

          // Process simulations in batches to allow UI updates
          const processBatch = () => {
            // Get the current calculation ID to check if we should continue
            const currentState = get();
            const currentCalculationId = currentState.calculationId;

            // If the calculation ID has changed, this calculation is obsolete
            if (currentCalculationId !== calculationId) {
              return;
            }

            // Process a small batch of simulations (10 at a time)
            const batchSize = 10;
            const endSeed = Math.min(currentSeed + batchSize, numSimulations);

            for (let seed = currentSeed; seed < endSeed; seed++) {
              const steps = runWrapper(enemyConfig, playerConfig, seed);
              const winner = steps.at(-1)?.winner;

              // Count wins
              if (winner === "Player" || winner === "Draw") {
                playerWins++;
              }
            }

            // Update UI with progress (only if this calculation is still valid)
            set((state) => {
              if (state.calculationId === calculationId) {
                state.completedSimulations = endSeed;
              }
            });

            // If there are more simulations to run, schedule the next batch
            if (endSeed < numSimulations) {
              currentSeed = endSeed;
              setTimeout(processBatch, 0);
            } else {
              // All done, calculate final winrate (only if this calculation is still valid)
              const finalWinrate = playerWins / numSimulations;
              set((state) => {
                if (state.calculationId === calculationId) {
                  state.winrate = finalWinrate;
                  state.isCalculatingWinrate = false;
                }
              });
            }
          };

          // Start the first batch
          setTimeout(processBatch, 0);
        },
        resetWinrateCalculation: () =>
          set((state) => {
            state.isCalculatingWinrate = false;
            state.winrate = null;
            state.completedSimulations = 0;
            // Reset the calculation ID when canceling calculations
            state.calculationId = "";
          }),
        clearPlayerBoard: (playerIdx: number) =>
          set((state) => {
            // Clear player's cards and skills based on playerIdx
            if (playerIdx === 0) {
              // Enemy
              state.enemyConfig.cards = [];
              state.enemyConfig.skills = [];
            } else if (playerIdx === 1) {
              // Player
              state.playerConfig.cards = [];
              state.playerConfig.skills = [];
            }

            // Recalculate steps after clearing
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
      },
    })),
    {
      name: "simulator",
      storage: createJSONStorage(() => persistentStorage),
      partialize: (state) => ({
        playerConfig: state.playerConfig,
        enemyConfig: state.enemyConfig,
      }),
      merge: (persistedState: unknown, currentState: State & Actions) => {
        const typedState = persistedState as Partial<State>;
        // Simply recalculate steps
        const newSteps = runWrapper(
          typedState.enemyConfig as PlayerConfig,
          typedState.playerConfig as PlayerConfig,
        );
        return {
          ...currentState,
          ...typedState,
          steps: newSteps,
        };
      },
    },
  ),
);

export const useSteps = () => useSimulatorStore((state) => state.steps);
export const useAutoScroll = () =>
  useSimulatorStore((state) => state.autoScroll);
export const useAutoReset = () => useSimulatorStore((state) => state.autoReset);
export const useBattleSpeed = () =>
  useSimulatorStore((state) => state.battleSpeed);
export const useStepCount = () => useSimulatorStore((state) => state.stepCount);
export const useEditingCardIndex = () =>
  useSimulatorStore((state) => state.editingCardIndex);
export const useWinrateCalculation = () => {
  const isCalculating = useSimulatorStore(
    (state) => state.isCalculatingWinrate,
  );
  const winrate = useSimulatorStore((state) => state.winrate);
  const total = useSimulatorStore((state) => state.targetSimulations);
  const completed = useSimulatorStore((state) => state.completedSimulations);
  const progress = completed / (total || 1);

  return { isCalculating, winrate, progress, total, completed };
};

// For backward compatibility
export const addPlayerCard = (card: PlayerCardConfig) =>
  useSimulatorStore.getState().actions.addCard(card, false);
export const addPlayerSkill = (skill: PlayerSkillConfig) =>
  useSimulatorStore.getState().actions.addSkill(skill, false);
export const addEnemyCard = (card: PlayerCardConfig) =>
  useSimulatorStore.getState().actions.addCard(card, true);
export const addEnemySkill = (skill: PlayerSkillConfig) =>
  useSimulatorStore.getState().actions.addSkill(skill, true);
export const removePlayerCard = (cardIndex: number) =>
  useSimulatorStore.getState().actions.removeCard(cardIndex, false);
export const removePlayerSkill = (skillIndex: number) =>
  useSimulatorStore.getState().actions.removeSkill(skillIndex, false);
export const removeEnemyCard = (cardIndex: number) =>
  useSimulatorStore.getState().actions.removeCard(cardIndex, true);
export const removeEnemySkill = (skillIndex: number) =>
  useSimulatorStore.getState().actions.removeSkill(skillIndex, true);
