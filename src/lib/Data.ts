import pako from "pako";
import type { Cards } from "../types/cardTypes.ts";
import type {
  EncounterDays,
  FlattenedEncounter,
} from "../types/encounterTypes.ts";
import { CARDS_VERSION } from "./constants.ts";
import { useEffect, useState } from "react";
import { getFlattenedEncounters } from "../engine/GameState.ts";
import { useQuery } from "@tanstack/react-query";
import ValidSkillNames from "../../public/json/ValidSkillNames.json";
import ValidItemNames from "../../public/json/ValidItemNames.json";

// Storage keys
const VERSION_KEY = "storedVersion";
const CARDS_KEY = "Cards";
const ENCOUNTERS_KEY = "Encounters";

// Filter cards for valid names
function filterValidCards(cards: Cards): Cards {
  const filteredCards = {
    ...cards,
    [CARDS_VERSION]: cards[CARDS_VERSION].filter((card) => {
      const cardName = card.Localization.Title.Text;
      return (
        ValidSkillNames.includes(cardName) || ValidItemNames.includes(cardName)
      );
    }),
  };
  return filteredCards;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function getFromLocalStorage<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;

  const storage = localStorage.getItem(key);
  if (!storage) return null;

  try {
    const compressed = new Uint8Array(JSON.parse(storage));
    return JSON.parse(pako.inflate(compressed, { to: "string" })) as T;
  } catch (e) {
    console.error(`Error parsing data from localStorage for key ${key}:`, e);
    return null;
  }
}

function saveToLocalStorage<T>(key: string, data: T): void {
  if (typeof localStorage === "undefined") return;

  try {
    const compressed = JSON.stringify([...pako.deflate(JSON.stringify(data))]);
    localStorage.setItem(key, compressed);
  } catch (e) {
    // Ignore quota errors
    console.warn("Failed to save to localStorage:", e);
  }
}

function getStoredVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(VERSION_KEY);
}

function saveVersion(version: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(VERSION_KEY, version);
}

export async function genCardsAndEncounters(): Promise<{
  Cards: Cards;
  Encounters: EncounterDays;
}> {
  const storedVersion = getStoredVersion();
  const isVersionMatch = storedVersion === CARDS_VERSION;

  let cards: Cards | null = null;
  let encounters: EncounterDays | null = null;

  // Only use cached data if the version matches
  if (isVersionMatch) {
    cards = getFromLocalStorage<Cards>(CARDS_KEY);
    encounters = getFromLocalStorage<EncounterDays>(ENCOUNTERS_KEY);
  }

  if (!cards) {
    cards = await fetchJSON<Cards>(
      process.env.NEXT_PUBLIC_HOST_URL + "/json/cards.json",
    );
    // Filter cards before storing in localStorage
    cards = filterValidCards(cards);
    saveToLocalStorage(CARDS_KEY, cards);
  }

  if (!encounters) {
    encounters = await fetchJSON<EncounterDays>(
      process.env.NEXT_PUBLIC_HOST_URL + "/json/monsterEncounterDays.json",
    );
    saveToLocalStorage(ENCOUNTERS_KEY, encounters);
  }

  // Update the version if we fetched new data or the version was different
  if (!isVersionMatch) {
    saveVersion(CARDS_VERSION);
  }

  return { Cards: cards, Encounters: encounters };
}

export function getCardId(cardName: string, Cards: Cards): string {
  const card = Cards[CARDS_VERSION].find(
    (card) => card.Localization.Title.Text === cardName,
  );
  if (!card) {
    throw new Error(`Card "${cardName}" not found`);
  }
  return card.Id;
}

export function useGameData() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["gameData", CARDS_VERSION],
    queryFn: genCardsAndEncounters,
    staleTime: Infinity,
  });

  const [flattenedEncounters, setFlattenedEncounters] = useState<
    FlattenedEncounter[]
  >([]);

  useEffect(() => {
    if (data?.Encounters) {
      setFlattenedEncounters(getFlattenedEncounters(data.Encounters));
    }
  }, [data?.Encounters]);

  return {
    cardsData: data?.Cards || null,
    encounterData: data?.Encounters || null,
    flattenedEncounters,
    isLoading,
    error,
  };
}
