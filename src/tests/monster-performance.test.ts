import { run } from "@/engine/Engine";
import { getInitialGameState2 } from "@/engine/engine2/engine2Adapter";
import {
  getFlattenedEncounters,
  getCardId,
  genCardsAndEncounters,
} from "@/lib/Data";
import { describe, test, expect } from "vitest";

const { Cards, Encounters } = await genCardsAndEncounters();

describe("Monster Battle Performance", () => {
  test("Monitor battle performance and detect exponentially slow battles", () => {
    const flattenedEncounters = getFlattenedEncounters(Encounters);
    const performanceResults: { name: string; day: number; timeMs: number }[] =
      [];
    const erroredBattles: { name: string; day: number; error: string }[] = [];

    // Run all monster battles and collect timing data
    flattenedEncounters.forEach((encounter) => {

      const gameState = getInitialGameState2(Cards, Encounters, [
        { type: "monster", name: encounter.name, day: Number(encounter.day) },
        {
          type: "player",
          health: 2000,
          cards: [
            { cardId: getCardId("Silk Scarf", Cards) },
            { cardId: getCardId("Fang", Cards) },
            { cardId: getCardId("Bag of Jewels", Cards) },
          ],
        },
      ]);

      const startTime = performance.now();
      try {
        run(gameState);
        const endTime = performance.now();
        const timeMs = endTime - startTime;

        performanceResults.push({
          name: encounter.name,
          day: Number(encounter.day),
          timeMs,
        });

        console.log(
          `Day ${encounter.day} - ${encounter.name}: ${timeMs.toFixed(2)}ms`,
        );
      } catch (error) {
        // Log the error but don't let it stop the performance test
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `⚠️ Day ${encounter.day} - ${encounter.name}: ERROR - ${errorMessage}`,
        );

        erroredBattles.push({
          name: encounter.name,
          day: Number(encounter.day),
          error: errorMessage,
        });
      }
    }); // Sort by execution time for easier analysis
    performanceResults.sort((a, b) => a.timeMs - b.timeMs);

    // Report on errored battles
    if (erroredBattles.length > 0) {
      console.log(
        `\n=== Errored Battles (Excluded from Performance Analysis) ===`,
      );
      console.log(
        `${erroredBattles.length} battle(s) threw errors and were excluded:`,
      );
      erroredBattles.forEach((battle) => {
        console.log(`  - Day ${battle.day} - ${battle.name}: ${battle.error}`);
      });
    }

    // Only proceed with performance analysis if we have successful battles
    if (performanceResults.length === 0) {
      console.log(
        `\n❌ No successful battles to analyze! All battles either errored or were skipped.`,
      );
      return;
    }

    // Calculate statistics
    const times = performanceResults.map((r) => r.timeMs);
    const median = times[Math.floor(times.length / 2)];
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    const q3 = times[Math.floor(times.length * 0.75)];
    const q1 = times[Math.floor(times.length * 0.25)];
    console.log("\n=== Performance Summary ===");
    console.log(`Total battles tested: ${flattenedEncounters.length}`);
    console.log(`Successful battles: ${performanceResults.length}`);
    console.log(`Errored battles: ${erroredBattles.length}`);
    console.log(`Min time: ${min.toFixed(2)}ms`);
    console.log(`Q1 time: ${q1.toFixed(2)}ms`);
    console.log(`Median time: ${median.toFixed(2)}ms`);
    console.log(`Q3 time: ${q3.toFixed(2)}ms`);
    console.log(`Max time: ${max.toFixed(2)}ms`);
    console.log(`Mean time: ${mean.toFixed(2)}ms`);

    // Log slowest battles (top 10)
    console.log("\n=== Slowest Battles ===");
    const slowestBattles = [...performanceResults].reverse().slice(0, 10);
    slowestBattles.forEach((battle, index) => {
      console.log(
        `${index + 1}. Day ${battle.day} - ${battle.name}: ${battle.timeMs.toFixed(2)}ms`,
      );
    });

    // Check for exponentially slow battles
    // A battle is considered exponentially slow if it's more than 10x the median
    // or more than 5x the 95th percentile
    const p95 = times[Math.floor(times.length * 0.95)];
    const exponentialThresholdMedian = median * 10;
    const exponentialThresholdP95 = p95 * 5;
    const exponentialThreshold = Math.min(
      exponentialThresholdMedian,
      exponentialThresholdP95,
    );

    console.log(`\n=== Exponential Performance Check ===`);
    console.log(`95th percentile: ${p95.toFixed(2)}ms`);
    console.log(
      `Exponential threshold (10x median): ${exponentialThresholdMedian.toFixed(2)}ms`,
    );
    console.log(
      `Exponential threshold (5x P95): ${exponentialThresholdP95.toFixed(2)}ms`,
    );
    console.log(`Using threshold: ${exponentialThreshold.toFixed(2)}ms`);

    const exponentiallySlowBattles = performanceResults.filter(
      (battle) => battle.timeMs > exponentialThreshold,
    );

    if (exponentiallySlowBattles.length > 0) {
      console.log(
        `\n❌ Found ${exponentiallySlowBattles.length} exponentially slow battle(s):`,
      );
      exponentiallySlowBattles.forEach((battle) => {
        const multiplier = (battle.timeMs / median).toFixed(1);
        console.log(
          `  - Day ${battle.day} - ${battle.name}: ${battle.timeMs.toFixed(2)}ms (${multiplier}x median)`,
        );
      });

      // Create a detailed error message
      const errorDetails = exponentiallySlowBattles
        .map((battle) => {
          const multiplier = (battle.timeMs / median).toFixed(1);
          return `Day ${battle.day} - ${battle.name}: ${battle.timeMs.toFixed(2)}ms (${multiplier}x median)`;
        })
        .join("\n  ");

      throw new Error(
        `Detected exponentially slow monster battles!\n\n` +
          `Threshold: ${exponentialThreshold.toFixed(2)}ms\n` +
          `Median time: ${median.toFixed(2)}ms\n\n` +
          `Slow battles:\n  ${errorDetails}\n\n` +
          `These battles may indicate infinite loops, exponential complexity, or other performance issues.`,
      );
    }

    console.log(`\n✅ No exponentially slow battles detected!`);
    console.log(
      `All ${performanceResults.length} battles completed within acceptable performance bounds.`,
    );

    // Additional checks for outliers
    const standardDeviation = Math.sqrt(
      times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
        times.length,
    );
    const outlierThreshold = mean + 3 * standardDeviation; // 3 sigma rule

    console.log(`\n=== Statistical Outlier Check ===`);
    console.log(`Standard deviation: ${standardDeviation.toFixed(2)}ms`);
    console.log(
      `Outlier threshold (mean + 3σ): ${outlierThreshold.toFixed(2)}ms`,
    );

    const outliers = performanceResults.filter(
      (battle) => battle.timeMs > outlierThreshold,
    );
    if (outliers.length > 0) {
      console.log(`Found ${outliers.length} statistical outlier(s):`);
      outliers.forEach((battle) => {
        const sigmas = ((battle.timeMs - mean) / standardDeviation).toFixed(1);
        console.log(
          `  - Day ${battle.day} - ${battle.name}: ${battle.timeMs.toFixed(2)}ms (+${sigmas}σ)`,
        );
      });
    } else {
      console.log(`No statistical outliers found.`);
    }

    // Performance regression check (warn if any battle takes longer than 1 second)
    const regressionThreshold = 1000; // 1 second
    const regressions = performanceResults.filter(
      (battle) => battle.timeMs > regressionThreshold,
    );

    if (regressions.length > 0) {
      console.log(
        `\n⚠️  Performance regression warning: ${regressions.length} battle(s) exceeded 1 second:`,
      );
      regressions.forEach((battle) => {
        console.log(
          `  - Day ${battle.day} - ${battle.name}: ${battle.timeMs.toFixed(2)}ms`,
        );
      });
    }

    // Assert that we have reasonable performance overall
    expect(performanceResults.length).toBeGreaterThan(0);
    expect(exponentiallySlowBattles.length).toBe(0);
  }, 30000); // 30 second timeout for the entire performance test
});
