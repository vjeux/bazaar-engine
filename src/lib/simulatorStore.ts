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
import type { CardLocationID } from "@/engine/engine2/engine2";
import {
  initSimulationWorker,
  calculateWinrate as calculateWorkerWinrate,
  cancelCalculation,
} from "./workers/simulationService";

const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

export type State = {
  playerConfig: PlayerConfig;
  enemyConfig: PlayerConfig;
  selectedMonster: MonsterConfig | "custom";
  steps: GameState[];
  autoScroll: boolean;
  autoReset: boolean;
  battleSpeed: number;
  stepCount: number;
  editingCardLocation: CardLocationID | null;
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
    setEnemyToEmptyPlayer: () => void;
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
    setSkillTier: (skillIndex: number, tier: Tier, isEnemy?: boolean) => void;
    setEditingCardLocation: (location: CardLocationID | null) => void;
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
    throw error;
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
  selectedMonster: initialMonster,
  steps: initialSteps,
  autoScroll: false,
  autoReset: false,
  battleSpeed: 1,
  stepCount: 0,
  editingCardLocation: null,
  isCalculatingWinrate: false,
  winrate: null,
  completedSimulations: 0,
  targetSimulations: 10,
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
const runSimulationAndUpdateWinrate = () => {
  const state = useSimulatorStore.getState();
  const actions = state.actions;
  // Run the simulation and update steps
  useSimulatorStore.setState((state) => {
    state.steps = runWrapper(state.enemyConfig, state.playerConfig);
  });

  // If winrate calculation is enabled, schedule recalculation after current update completes
  if (
    state.isCalculatingWinrate ||
    (state.winrate !== null && state.targetSimulations > 0)
  ) {
    // Need setTimeout to ensure UI updates properly between state changes
    const simCount = state.targetSimulations;
    actions.calculateWinrate(simCount);
  }
};

// Initialize worker when module loads
let workerInitialized = false;
let workerInitializationPromise: Promise<void> | null = null;

async function initializeWorker() {
  try {
    if (workerInitializationPromise) {
      return workerInitializationPromise;
    }

    // Create a promise we can reuse
    workerInitializationPromise = (async () => {
      // Use CardsData and EncounterData that are already loaded
      // This avoids passing large amounts of data to the worker, and resolves some window undefined issues with the worker and indexeddb
      await initSimulationWorker(CardsData, EncounterData);
      workerInitialized = true;
    })();

    return workerInitializationPromise;
  } catch (error) {
    console.error("Error initializing worker:", error);
    workerInitializationPromise = null;
    throw error;
  }
}

export const useSimulatorStore = create<State & Actions>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      actions: {
        setPlayerConfig: (playerConfig: PlayerConfig) => {
          set((state) => {
            state.playerConfig = playerConfig;
          });
          runSimulationAndUpdateWinrate();
        },
        setEnemyConfig: (enemyConfig: PlayerConfig) => {
          set((state) => {
            state.enemyConfig = enemyConfig;
            state.stepCount = 0;
            state.selectedMonster = "custom";
          });
          runSimulationAndUpdateWinrate();
        },
        setEnemyFromMonster: (monsterConfig: MonsterConfig) => {
          set((state) => {
            state.enemyConfig = convertMonsterToPlayerConfig(monsterConfig);
            state.selectedMonster = monsterConfig;
            state.stepCount = 0;
          });
          runSimulationAndUpdateWinrate();
        },
        setEnemyToEmptyPlayer: () => {
          set((state) => {
            state.enemyConfig = initialEnemy;
            state.selectedMonster = "custom";
            state.stepCount = 0;
          });
          runSimulationAndUpdateWinrate();
        },
        addCard: (card: PlayerCardConfig, isEnemy: boolean = false) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            (config.cards ??= []).push(card);
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        addSkill: (skill: PlayerSkillConfig, isEnemy: boolean = false) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            (config.skills ??= []).push(skill);
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
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
        recalculateSteps: () => {
          set(() => {
            // The actual recalculation happens within runSimulationAndUpdateWinrate,
            // which is called after the state update.
          });
          runSimulationAndUpdateWinrate();
        },
        removeCard: (cardIndex: number, isEnemy: boolean = false) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            config.cards?.splice(cardIndex, 1);
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        removeSkill: (skillIndex: number, isEnemy: boolean = false) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            config.skills?.splice(skillIndex, 1);
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        reset: () => {
          set(initialState);
          runSimulationAndUpdateWinrate();
        },
        moveCard: (
          oldIndex: number,
          newIndex: number,
          isEnemy: boolean = false,
        ) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            const newCards = arrayMove(config.cards ?? [], oldIndex, newIndex);
            config.cards = newCards;
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        transferCardBetweenPlayers: (
          sourceIndex: number,
          targetIndex: number = -1, // -1 means add to the end
          isSourceEnemy: boolean = false,
          isTargetEnemy: boolean = false,
        ) => {
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
              return;
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

            state.selectedMonster = "custom";

            // Recalculate simulation
          });
          runSimulationAndUpdateWinrate();
        },
        setCardAttributeOverrides: (
          cardIndex: number,
          attributeOverrides: Partial<Record<AttributeType, number>>,
          isEnemy: boolean = false,
        ) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.cards?.[cardIndex]) {
              config.cards[cardIndex].attributeOverrides = attributeOverrides;
            }
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        setCardEnchantment: (
          cardIndex: number,
          enchantment: EnchantmentType,
          isEnemy: boolean = false,
        ) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.cards?.[cardIndex]) {
              const card = config.cards[cardIndex];
              card.enchantment = enchantment;
              card.attributeOverrides = {};
            }
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        setCardTier: (
          cardIndex: number,
          tier: Tier,
          isEnemy: boolean = false,
        ) => {
          set((state) => {
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.cards?.[cardIndex]) {
              config.cards[cardIndex].tier = tier;
              config.cards[cardIndex].attributeOverrides = {};
            }
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        setSkillTier: (
          skillIndex: number,
          tier: Tier,
          isEnemy: boolean = false,
        ) => {
          set((state) => {
            console.log("setting skill tier", skillIndex, tier, isEnemy);
            const config = isEnemy ? state.enemyConfig : state.playerConfig;
            if (config.skills?.[skillIndex]) {
              config.skills[skillIndex].tier = tier;
            }
            if (isEnemy) {
              state.selectedMonster = "custom";
            }
          });
          runSimulationAndUpdateWinrate();
        },
        setEditingCardLocation: (location: CardLocationID | null) =>
          set((state) => {
            state.editingCardLocation = location;
          }),
        calculateWinrate: async (numSimulations = 10) => {
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

          try {
            // Initialize worker if not already done, using direct JSON loading
            if (!workerInitialized) {
              await initializeWorker();
            }

            // Use the worker to calculate winrate with progress updates
            const winrate = await calculateWorkerWinrate(
              enemyConfig,
              playerConfig,
              numSimulations,
              calculationId,
              (progress) => {
                // Update progress
                set((state) => {
                  state.completedSimulations = Math.floor(
                    progress * numSimulations,
                  );
                });
              },
            );

            // Update final winrate (only if this calculation is still valid)
            set((state) => {
              if (state.calculationId === calculationId) {
                state.winrate = winrate;
                state.isCalculatingWinrate = false;
                state.completedSimulations = numSimulations;
              }
            });
          } catch (error) {
            console.error("Error calculating winrate:", error);

            // Handle error state
            set((state) => {
              if (state.calculationId === calculationId) {
                state.isCalculatingWinrate = false;
                // Keep winrate as null to indicate failure
              }
            });
          }
        },
        resetWinrateCalculation: () => {
          // Cancel the current calculation in the worker
          cancelCalculation();

          // Update the store state
          set((state) => {
            state.isCalculatingWinrate = false;
            state.winrate = null;
            state.completedSimulations = 0;
            state.calculationId = "";
          });
        },
        clearPlayerBoard: (playerIdx: number) => {
          set((state) => {
            // Clear player's cards and skills based on playerIdx
            if (playerIdx === 0) {
              // Enemy
              state.enemyConfig.cards = [];
              state.enemyConfig.skills = [];
              state.selectedMonster = "custom";
            } else if (playerIdx === 1) {
              // Player
              state.playerConfig.cards = [];
              state.playerConfig.skills = [];
            }

            // Recalculate steps after clearing
          });
          runSimulationAndUpdateWinrate();
        },
      },
    })),
    {
      name: "simulator",
      storage: createJSONStorage(() => persistentStorage),
      partialize: (state) => ({
        playerConfig: state.playerConfig,
        enemyConfig: state.enemyConfig,
        selectedMonster: state.selectedMonster,
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
export const useEditingCardLocation = () =>
  useSimulatorStore((state) => state.editingCardLocation);
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
export const useSelectedMonster = () =>
  useSimulatorStore((state) => state.selectedMonster);

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
