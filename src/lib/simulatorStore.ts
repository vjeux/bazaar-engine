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
  };
};

const initialPlayer: PlayerConfig = {
  type: "player",
  health: 2000,
  healthRegen: 0,
  cards: [],
  skills: [],
};
const initialMonster: MonsterConfig = {
  type: "monster",
  name: "Pyro",
};
const initialGameState = getInitialGameState(CardsData, EncounterData, [
  initialMonster,
  initialPlayer,
]);
const initialSteps = run(initialGameState, 100000);

const runWrapper = (monsterConfig: MonsterConfig, playerConfig: PlayerConfig) =>
  run(
    getInitialGameState(CardsData, EncounterData, [
      monsterConfig,
      playerConfig,
    ]),
    100000,
  );

const initialState: State = {
  playerConfig: initialPlayer,
  monsterConfig: initialMonster,
  steps: initialSteps,
  autoScroll: false,
  autoReset: false,
  battleSpeed: 1,
  stepCount: 0,
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
      },
    })),
    {
      name: "simulator",
      storage: createJSONStorage(() => persistentStorage),
      partialize: (state) => ({
        playerConfig: state.playerConfig,
        monsterConfig: state.monsterConfig,
        autoScroll: state.autoScroll,
        autoReset: state.autoReset,
        battleSpeed: state.battleSpeed,
        stepCount: state.stepCount,
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
