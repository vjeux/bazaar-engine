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
import jsonata from "jsonata";
import { CARDS_VERSION } from "@/lib/constants";
import { JSONPath } from "jsonpath-plus";
import { Tabs, TabsList, TabsTrigger } from "../../src/components/ui/tabs";

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
  const [queryEngine, setQueryEngine] = useState<
    "jmespath" | "jsonpath" | "jsonata"
  >("jmespath");

  const searchCards = async () => {
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
        if (queryEngine === "jsonpath") {
          // Use JSONPath-Plus
          searchResults = JSONPath({ path: searchPath, json: cards });
        } else if (queryEngine === "jsonata") {
          // Use JSONata
          const expression = jsonata(searchPath);
          searchResults = await expression.evaluate(cards);
        } else {
          // Use JMESPath
          searchResults = jmespath.search(cards, searchPath);
        }
      } catch (error) {
        console.warn("Search error:", error);
        setErrorMessage(
          `Invalid ${
            queryEngine === "jsonpath"
              ? "JSONPath"
              : queryEngine === "jsonata"
                ? "JSONata"
                : "JMESPath"
          } query syntax.`,
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

      // Ensure the result is an array
      const resultsArray = Array.isArray(searchResults)
        ? searchResults
        : [searchResults];

      // Set the results
      setResult(resultsArray);
      setErrorMessage(
        resultsArray.length === 0 ? "No items found matching the query." : "",
      );
    } catch (errorObj) {
      console.error("Error searching:", errorObj);
      setErrorMessage("An error occurred while searching.");
      setResult([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Get examples based on selected query engine
  const getExamples = () => {
    if (queryEngine === "jsonpath") {
      return (
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>
            <code>{`$[?(@.$type=='TCardSkill')]`}</code> - All skill cards
          </li>
          <li>
            <code>{`$[?(@.Tags.indexOf('Damage') !== -1)]`}</code> - Cards with
            the Damage tag
          </li>
          <li>
            <code>{`$[?(@.Localization.Title.Text.indexOf('Fire') !== -1)]`}</code>{" "}
            - Cards with &apos;Fire&apos; in the title
          </li>
          <li>
            <code>{`$[?(@.Attributes.DamageAmount > 5)]`}</code> - Cards with
            damage greater than 5
          </li>
        </ul>
      );
    } else if (queryEngine === "jsonata") {
      return (
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>
            <code>{`[$[$type='TCardSkill']]`}</code> - All skill cards
          </li>
          <li>
            <code>{`[$[Tags[Damage in $]]]`}</code> - Cards with the Damage tag
          </li>
          <li>
            <code>{`[$[Localization.Title.Text ~> $contains('Fire')]]`}</code> -
            Cards with &apos;Fire&apos; in the title
          </li>
          <li>
            <code>{`[$[Attributes.DamageAmount > 5]]`}</code> - Cards with
            damage greater than 5
          </li>
        </ul>
      );
    } else {
      return (
        <ul className="flex list-inside list-disc flex-col gap-1">
          <li>
            <code>{`[?"$type"=='TCardSkill']`}</code> - All skill cards
          </li>
          <li>
            <code>{`[?contains(to_string(Tags), 'Damage')]`}</code> - Cards with
            the Damage tag
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
      );
    }
  };

  return (
    <div className="bg-background text-foreground flex h-[calc(100dvh-64px)] w-full flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Tabs
          value={queryEngine}
          onValueChange={(value: string) =>
            setQueryEngine(value as "jmespath" | "jsonpath" | "jsonata")
          }
          className="w-full"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="search-path">Query Engine</Label>
            <TabsList>
              <TabsTrigger value="jmespath">JMESPath</TabsTrigger>
              <TabsTrigger value="jsonpath">JSONPath</TabsTrigger>
              <TabsTrigger value="jsonata">JSONata</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <div className="flex gap-2">
          <Input
            id="search-path"
            placeholder={`Enter ${
              queryEngine === "jsonpath"
                ? "JSONPath"
                : queryEngine === "jsonata"
                  ? "JSONata"
                  : "JMESPath"
            } query`}
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
          {getExamples()}
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
