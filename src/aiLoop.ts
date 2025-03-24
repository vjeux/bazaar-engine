import { CoreMessage, generateText, tool } from "ai";
import z from "zod";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { createVitest, startVitest } from "vitest/node";

const vitest = await createVitest(
  "test",
  { watch: false }, // override test config
  {}, // override Vite config
  {} // custom Vitest options
);

try {
  const result = await vitest.start(["peggy"]);

  console.log("Vitest result:", result);
} catch (err) {
  console.log("Error starting Vitest:", err);
} finally {
  await vitest.close();
}

// exit to avoid running below code
process.exit();

const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: "http://localhost:1234/v1"
});

const messages: CoreMessage[] = [];

const { response } = await generateText({
  model: lmstudio("gemma-3-27b-it"),
  tools: {
    weather: tool({
      description: "Get the weather in a location",
      parameters: z.object({
        location: z.string().describe("The location to get the weather for")
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10
      })
    })
  },
  prompt:
    "What is the weather in San Francisco and what attractions should I visit? Give me the top 3 attractions.",
  maxSteps: 2
});

console.log("Response:", response);
