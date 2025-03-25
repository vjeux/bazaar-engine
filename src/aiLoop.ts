import { CoreMessage, generateText, tool } from "ai";
import z from "zod";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { createGoogleGenerativeAI } from "@ai-sdk/google";


let model;

switch (process.env.PROVIDER) {
  case "google": {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    });
    model = google("models/gemini-2.0-flash");
    break;
  }
  case "lmstudio": {
    const lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: "http://localhost:1234/v1"
    });
    model = lmstudio("gemma-3-27b-it");
    break;
  }
  default:
    throw new Error("Unsupported provider specified in .env");
}

const messages: CoreMessage[] = [];

const { response } = await generateText({
  model: model,
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
  system:
    "You are a helpful assistant which can answer questions about the weather and suggest attractions. You can also call the weather tool to get the current temperature in a location.",
  prompt:
    "What is the weather in San Francisco and what attractions should I visit? Give me the top 3 attractions.",
  maxSteps: 2
});

console.log("Response:", response);
