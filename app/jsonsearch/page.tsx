"use client";

import { useState } from "react";
import React from "react";
import { useGameData } from "../../src/lib/Data";
import type { Card } from "../../src/types/cardTypes";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { ScrollArea } from "../../src/components/ui/scroll-area";
import { Label } from "../../src/components/ui/label";
import * as jmespath from "jmespath";
import { CARDS_VERSION } from "@/lib/constants";
import { JSONPath } from "jsonpath-plus";
import { Switch } from "@/components/ui/switch";

export default function JsonSearchPage() {
  const {
    cardsData,
    isLoading: isGameDataLoading,
    error: gameDataError,
  } = useGameData();

  const cards = cardsData?.[CARDS_VERSION] ?? [];

  const [searchPath, setSearchPath] = useState<string>("");
  const [result, setResult] = useState<Card[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [useJsonPathPlus, setUseJsonPathPlus] = useState<boolean>(false);

  const searchCards = () => {
    if (!searchPath) {
      setErrorMessage("Please enter a valid query.");
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);

      // Use selected search method to search the JSON data
      let searchResults;
      try {
        if (useJsonPathPlus) {
          // Use JSONPath-Plus
          searchResults = JSONPath({ path: searchPath, json: cards });
        } else {
          // Use JMESPath
          searchResults = jmespath.search(cards, searchPath);
        }
      } catch (error) {
        console.warn("Search error:", error);
        setErrorMessage(
          `Invalid ${useJsonPathPlus ? "JSONPath" : "JMESPath"} query syntax.`,
        );
        setResult([]);
        setIsSearching(false);
        return;
      }

      if (!searchResults) {
        setErrorMessage("No items found matching the query.");
        setResult([]);
        setIsSearching(false);
        return;
      }

      // Set the results
      setResult(searchResults);
      setErrorMessage(
        searchResults.length === 0 ? "No items found matching the query." : "",
      );
    } catch (errorObj) {
      console.error("Error searching:", errorObj);
      setErrorMessage("An error occurred while searching.");
      setResult([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-background text-foreground flex h-[calc(100dvh-64px)] w-full flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="search-path">
            {useJsonPathPlus ? "JSONPath" : "JMESPath"} Query
          </Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="query-toggle" className="text-sm">
              JMESPath
            </Label>
            <Switch
              id="query-toggle"
              checked={useJsonPathPlus}
              onCheckedChange={setUseJsonPathPlus}
            />
            <Label htmlFor="query-toggle" className="text-sm">
              JSONPath
            </Label>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            id="search-path"
            placeholder={`Enter ${useJsonPathPlus ? "JSONPath" : "JMESPath"} query`}
            value={searchPath}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchPath(e.target.value);
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                searchCards();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={searchCards}
            disabled={isGameDataLoading || !searchPath || isSearching}
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        <div className="text-muted-foreground pt-2 text-xs">
          <p>Example queries:</p>
          {useJsonPathPlus ? (
            <ul className="flex list-inside list-disc flex-col gap-1">
              <li>
                <code>{`$[?(@.$type=='TCardSkill')]`}</code> - All skill cards
              </li>
              <li>
                <code>{`$[?(@.Tags.indexOf('Damage') !== -1)]`}</code> - Cards
                with the Damage tag
              </li>
              <li>
                <code>{`$[?(@.Localization.Title.Text.indexOf('Fire') !== -1)]`}</code>{" "}
                - Cards with &apos;Fire&apos; in the title
              </li>
              <li>
                <code>{`$[?(@.Attributes.DamageAmount > 5)]`}</code> - Cards
                with damage greater than 5
              </li>
            </ul>
          ) : (
            <ul className="flex list-inside list-disc flex-col gap-1">
              <li>
                <code>{`[?"$type"=='TCardSkill']`}</code> - All skill cards
              </li>
              <li>
                <code>{`[?contains(to_string(Tags), 'Damage')]`}</code> - Cards
                with the Damage tag
              </li>
              <li>
                <code>{`[?contains(Localization.Title.Text, 'Fire')]`}</code> -
                Cards with &apos;Fire&apos; in the title
              </li>
              <li>
                <code>{`[?Attributes.DamageAmount > '5']`}</code> - Cards with
                damage greater than 5
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="bg-muted/50 rounded-md">
        <ScrollArea>
          {isGameDataLoading ? (
            <div className="p-4">Loading game data...</div>
          ) : gameDataError ? (
            <div className="p-4 text-red-500">Error loading game data</div>
          ) : result.length > 0 ? (
            <div className="p-4">
              <h2 className="text-lg font-semibold">
                Results ({result.length} items)
              </h2>
              <pre className="bg-background mt-4 max-h-[80vh] overflow-auto rounded-md p-2 text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : hasSearched ? (
            <div className="p-4">No results found</div>
          ) : (
            <div className="p-4">Enter a query to find cards</div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
