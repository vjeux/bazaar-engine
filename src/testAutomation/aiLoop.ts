import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// Load environment variables from .env file
import "jsr:@std/dotenv/load";

// Read prompt.txt file
const promptText = await Deno.readTextFile("src/testAutomation/prompt.txt");

// Extract system prompt from the prompt.txt file
const systemPromptMatch = promptText.match(
  /<systemPrompt>(.*?)<\/systemPrompt>/s
);
const systemPrompt = systemPromptMatch ? systemPromptMatch[1].trim() : "";

let model;

switch (Deno.env.get("PROVIDER")) {
  case "google": {
    const google = createGoogleGenerativeAI({
      apiKey: Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY")
    });
    model = google("models/gemini-2.5-pro-exp-03-25");
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
    throw new Error(
      "Unsupported provider specified in .env:" + Deno.env.get("PROVIDER")
    );
}

console.log("Sending prompt to model...");
const result = await generateText({
  model: model,
  system: systemPrompt,
  prompt: promptText,
  maxSteps: 5
});

console.log("Received response from model");

// Write the response to answer.txt
await Deno.writeTextFile("src/testAutomation/answer.txt", result.text);
console.log("Response written to: src/testAutomation/answer.txt");
