import type { Cards } from "../types/cardTypes.ts";
import type {
  EncounterDays,
  FlattenedEncounter,
} from "../types/encounterTypes.ts";
import { CARDS_VERSION } from "./constants.ts";
import { useEffect, useState } from "react";
import { getFlattenedEncounters } from "../engine/GameState.ts";
import { useQuery } from "@tanstack/react-query";
import ValidSkillIds from "../../public/json/ValidSkillIds.json";
import ValidItemIds from "../../public/json/ValidItemIds.json";

// Database configuration
const DB_NAME = "bazaar-engine";
const DB_VERSION = 1;
const CARDS_STORE = "cards";
const ENCOUNTERS_STORE = "encounters";
const VERSION_STORE = "version";
const VERSION_KEY = "currentVersion";

// Filter cards for valid names
function filterValidCards(cards: Cards): Cards {
  const filteredCards = {
    ...cards,
    [CARDS_VERSION]: cards[CARDS_VERSION].filter((card) => {
      const cardId = card.Id;
      return ValidSkillIds.includes(cardId) || ValidItemIds.includes(cardId);
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

// Initialize the database
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("Your browser doesn't support IndexedDB"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(CARDS_STORE)) {
        db.createObjectStore(CARDS_STORE);
      }

      if (!db.objectStoreNames.contains(ENCOUNTERS_STORE)) {
        db.createObjectStore(ENCOUNTERS_STORE);
      }

      if (!db.objectStoreNames.contains(VERSION_STORE)) {
        db.createObjectStore(VERSION_STORE);
      }
    };
  });
}

// Get data from IndexedDB
async function getFromIndexedDB<T>(
  storeName: string,
  key: string,
): Promise<T | null> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error(`Error reading from IndexedDB store ${storeName}`);
        resolve(null);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (e) {
    console.error(`Error accessing IndexedDB for store ${storeName}:`, e);
    return null;
  }
}

// Save data to IndexedDB
async function saveToIndexedDB<T>(
  storeName: string,
  key: string,
  data: T,
): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.warn(
          `Failed to save to IndexedDB store ${storeName}:`,
          request.error,
        );
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (e) {
    console.warn("Failed to save to IndexedDB:", e);
  }
}

// Get stored version from IndexedDB
async function getStoredVersion(): Promise<string | null> {
  return getFromIndexedDB<string>(VERSION_STORE, VERSION_KEY);
}

// Save version to IndexedDB
async function saveVersion(version: string): Promise<void> {
  return saveToIndexedDB(VERSION_STORE, VERSION_KEY, version);
}

export async function genCardsAndEncounters(): Promise<{
  Cards: Cards;
  Encounters: EncounterDays;
}> {
  // Check if we're running in a browser environment
  if (typeof window === "undefined") {
    // Server-side or testing environment - directly import JSON files
    const cards: Cards = (await import("../../public/json/cards.json"))
      .default as Cards;
    const encounters = await import(
      "../../public/json/monsterEncounterDays.json"
    );

    // Filter cards before returning
    const filteredCards = filterValidCards(cards);

    return {
      Cards: filteredCards,
      Encounters: encounters.default as EncounterDays,
    };
  }

  const storedVersion = await getStoredVersion();
  const isVersionMatch = storedVersion === CARDS_VERSION;

  let cards: Cards | null = null;
  let encounters: EncounterDays | null = null;

  // Only use cached data if the version matches
  if (isVersionMatch) {
    cards = await getFromIndexedDB<Cards>(CARDS_STORE, CARDS_VERSION);
    encounters = await getFromIndexedDB<EncounterDays>(
      ENCOUNTERS_STORE,
      CARDS_VERSION,
    );
  }

  if (!cards) {
    cards = await fetchJSON<Cards>(`/json/cards.json`);
    // Filter cards before storing in IndexedDB
    cards = filterValidCards(cards);
    await saveToIndexedDB(CARDS_STORE, CARDS_VERSION, cards);
  }

  if (!encounters) {
    encounters = await fetchJSON<EncounterDays>(
      `/json/monsterEncounterDays.json`,
    );
    await saveToIndexedDB(ENCOUNTERS_STORE, CARDS_VERSION, encounters);
  }

  // Update the version if we fetched new data or the version was different
  if (!isVersionMatch) {
    await saveVersion(CARDS_VERSION);
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
