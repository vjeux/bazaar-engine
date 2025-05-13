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
) => {
  const t0 = performance.now();
  const steps = run(
    getInitialGameState(CardsData, EncounterData, [
      monsterConfig,
      playerConfig,
    ]),
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

export const useSimulatorStore = create<State & Actions>()(
  persist(
    immer((set) => ({
      ...initialState,
      actions: {
        setPlayerConfig: (playerConfig: PlayerConfig) =>
          set((state) => {
            state.playerConfig = playerConfig;
            state.steps = runWrapper(state.monsterConfig, playerConfig);
          }),
        setMonsterConfig: (monsterConfig: MonsterConfig) =>
          set((state) => {
            state.monsterConfig = monsterConfig;
            state.steps = runWrapper(monsterConfig, state.playerConfig);
            state.stepCount = 0;
          }),
        addPlayerCard: (card: PlayerCardConfig) =>
          set((state) => {
            (state.playerConfig.cards ??= []).push(card);
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
          }),
        addPlayerSkill: (skill: PlayerSkillConfig) =>
          set((state) => {
            (state.playerConfig.skills ??= []).push(skill);
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
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
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
          }),
        removePlayerCard: (cardIndex: number) =>
          set((state) => {
            state.playerConfig.cards?.splice(cardIndex, 1);
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
          }),
        removePlayerSkill: (skillIndex: number) =>
          set((state) => {
            state.playerConfig.skills?.splice(skillIndex, 1);
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
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
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
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
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
          }),
        setCardEnchantment: (cardIndex: number, enchantment: EnchantmentType) =>
          set((state) => {
            if (state.playerConfig.cards?.[cardIndex]) {
              state.playerConfig.cards[cardIndex].enchantment = enchantment;
            }
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
          }),
        setCardTier: (cardIndex: number, tier: Tier) =>
          set((state) => {
            if (state.playerConfig.cards?.[cardIndex]) {
              state.playerConfig.cards[cardIndex].tier = tier;
              state.playerConfig.cards[cardIndex].attributeOverrides = {};
            }
            state.steps = runWrapper(state.monsterConfig, state.playerConfig);
          }),
        setEditingCardIndex: (index: number | null) =>
          set((state) => {
            state.editingCardIndex = index;
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
