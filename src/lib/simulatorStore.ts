import { GameState, run } from "@/engine/Engine";
import {
  getInitialGameState,
  MonsterConfig,
  PlayerCardConfig,
  PlayerConfig,
  PlayerSkillConfig,
} from "@/engine/GameState";
import { Card } from "@/types/cardTypes";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { genCardsAndEncounters } from "./Data";
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
  setPlayerConfig: (playerConfig: PlayerConfig) => void;
  setMonsterConfig: (monsterConfig: MonsterConfig) => void;
  addPlayerCard: (card: PlayerCardConfig) => void;
  addPlayerSkill: (skill: PlayerSkillConfig) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setAutoReset: (autoReset: boolean) => void;
  setBattleSpeed: (battleSpeed: number) => void;
  setStepCount: (stepCount: number) => void;
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

export const useSimulatorStore = create<State & Actions>()(
  immer((set) => ({
    ...initialState,
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
  })),
);
