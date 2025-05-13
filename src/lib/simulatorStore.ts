import { GameState, run } from "@/engine/Engine";
import {
  getInitialGameState,
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
const { Cards: CardsData, Encounters: EncounterData } =
  await genCardsAndEncounters();

type State = {
  playerConfig: PlayerConfig;
  monsterConfig: MonsterConfig;
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
};

type Actions = {
  actions: {
    setPlayerConfig: (playerConfig: PlayerConfig) => void;
    setMonsterConfig: (monsterConfig: MonsterConfig) => void;
    addPlayerCard: (card: PlayerCardConfig) => void;
    addPlayerSkill: (skill: PlayerSkillConfig) => void;
    setAutoScroll: (autoScroll: boolean) => void;
    setAutoReset: (autoReset: boolean) => void;
    setBattleSpeed: (battleSpeed: number) => void;
    setStepCount: (stepCount: number) => void;
    recalculateSteps: () => void;
    removePlayerCard: (cardIndex: number) => void;
    removePlayerSkill: (skillIndex: number) => void;
    reset: () => void;
    movePlayerCard: (oldIndex: number, newIndex: number) => void;
    setCardAttributeOverrides: (
      cardIndex: number,
      attributeOverrides: Partial<Record<AttributeType, number>>,
    ) => void;
    setCardEnchantment: (
      cardIndex: number,
      enchantment: EnchantmentType,
    ) => void;
    setCardTier: (cardIndex: number, tier: Tier) => void;
    setEditingCardIndex: (index: number | null) => void;
    calculateWinrate: (numSimulations?: number) => void;
    resetWinrateCalculation: () => void;
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
const initialMonster: MonsterConfig = {
  type: "monster",
  name: "Pyro",
  day: 1,
};

const runWrapper = (
  monsterConfig: MonsterConfig,
  playerConfig: PlayerConfig,
  randomSeed: number = 1,
) => {
  const t0 = performance.now();
  const steps = run(
    getInitialGameState(
      CardsData,
      EncounterData,
      [monsterConfig, playerConfig],
      randomSeed,
    ),
    100000,
  );
  const t1 = performance.now();
  console.log(`Running simulation took ${t1 - t0} milliseconds`);
  return steps;
};
const initialSteps = runWrapper(initialMonster, initialPlayer);

const initialState: State = {
  playerConfig: initialPlayer,
  monsterConfig: initialMonster,
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
};

// URL Persistance
const persistentStorage: StateStorage = {
  getItem: (key): string => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    const storedValue = searchParams.get(key) ?? "";
    return JSON.parse(storedValue);
  },
  setItem: (key, newValue): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.set(key, JSON.stringify(newValue));
    location.hash = searchParams.toString();
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.delete(key);
    location.hash = searchParams.toString();
  },
};

// Run simulation and recalculate winrate if enabled
const runSimulationAndUpdateWinrate = (
  state: State,
  actions: Actions["actions"],
) => {
  // Run the simulation and update steps
  state.steps = runWrapper(state.monsterConfig, state.playerConfig);

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
        setMonsterConfig: (monsterConfig: MonsterConfig) =>
          set((state) => {
            state.monsterConfig = monsterConfig;
            state.stepCount = 0;
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        addPlayerCard: (card: PlayerCardConfig) =>
          set((state) => {
            (state.playerConfig.cards ??= []).push(card);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        addPlayerSkill: (skill: PlayerSkillConfig) =>
          set((state) => {
            (state.playerConfig.skills ??= []).push(skill);
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
        removePlayerCard: (cardIndex: number) =>
          set((state) => {
            state.playerConfig.cards?.splice(cardIndex, 1);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        removePlayerSkill: (skillIndex: number) =>
          set((state) => {
            state.playerConfig.skills?.splice(skillIndex, 1);
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        reset: () => {
          set(initialState);
        },
        movePlayerCard: (oldIndex: number, newIndex: number) =>
          set((state) => {
            const newCards = arrayMove(
              state.playerConfig.cards ?? [],
              oldIndex,
              newIndex,
            );
            state.playerConfig.cards = newCards;
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setCardAttributeOverrides: (
          cardIndex: number,
          attributeOverrides: Partial<Record<AttributeType, number>>,
        ) =>
          set((state) => {
            if (state.playerConfig.cards?.[cardIndex]) {
              state.playerConfig.cards[cardIndex].attributeOverrides =
                attributeOverrides;
            }
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setCardEnchantment: (cardIndex: number, enchantment: EnchantmentType) =>
          set((state) => {
            if (state.playerConfig.cards?.[cardIndex]) {
              const card = state.playerConfig.cards[cardIndex];
              card.enchantment = enchantment;
              card.attributeOverrides = {};
            }
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setCardTier: (cardIndex: number, tier: Tier) =>
          set((state) => {
            if (state.playerConfig.cards?.[cardIndex]) {
              state.playerConfig.cards[cardIndex].tier = tier;
              state.playerConfig.cards[cardIndex].attributeOverrides = {};
            }
            runSimulationAndUpdateWinrate(state, get().actions);
          }),
        setEditingCardIndex: (index: number | null) =>
          set((state) => {
            state.editingCardIndex = index;
          }),
        calculateWinrate: (numSimulations = 100) => {
          const state = get();
          const monsterConfig = { ...state.monsterConfig };
          const playerConfig = { ...state.playerConfig };

          // Reset winrate calculation state
          set((state) => {
            state.isCalculatingWinrate = true;
            state.winrate = null;
            state.targetSimulations = numSimulations;
            state.completedSimulations = 0;
          });

          let playerWins = 0;
          let currentSeed = 0;

          // Process simulations in batches to allow UI updates
          const processBatch = () => {
            // Process a small batch of simulations (10 at a time)
            const batchSize = 10;
            const endSeed = Math.min(currentSeed + batchSize, numSimulations);

            for (let seed = currentSeed; seed < endSeed; seed++) {
              const steps = runWrapper(monsterConfig, playerConfig, seed);
              const winner = steps.at(-1)?.winner;

              // Count wins
              if (winner === "Player" || winner === "Draw") {
                playerWins++;
              }
            }

            // Update UI with progress
            set((state) => {
              state.completedSimulations = endSeed;
            });

            // If there are more simulations to run, schedule the next batch
            if (endSeed < numSimulations) {
              currentSeed = endSeed;
              setTimeout(processBatch, 0);
            } else {
              // All done, calculate final winrate
              const finalWinrate = playerWins / numSimulations;
              set((state) => {
                state.winrate = finalWinrate;
                state.isCalculatingWinrate = false;
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
            state.targetSimulations = 0;
            state.completedSimulations = 0;
          }),
      },
    })),
    {
      name: "simulator",
      storage: createJSONStorage(() => persistentStorage),
      partialize: (state) => ({
        playerConfig: state.playerConfig,
        monsterConfig: state.monsterConfig,
      }),
      merge: (persistedState: unknown, currentState: State & Actions) => {
        const typedState = persistedState as Partial<State>;
        // Simply recalculate steps
        const newSteps = runWrapper(
          typedState.monsterConfig as MonsterConfig,
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
