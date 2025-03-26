import { createVitest, startVitest } from "vitest/node";
import apiItems from "../json/items.json" with { type: "json" };
import { Item } from "../types/apiItems.ts";

const items: Item[] = apiItems.data as Item[];

const vitest = await createVitest(
  "test",
  {
    watch: false
  },
  {}, // override Vite config
  {} // custom Vitest options
);

try {
  const result = await vitest.start(["peggy"]);

  // Collect all failed tasks
  const parseToCardTasks = result.testModules[0].task.tasks[0].tasks;

  // Filter for failing tasks
  const failingTasks = parseToCardTasks.filter(
    (task) => task.result.state === "fail"
  );

  // Take the first failing task
  const firstFailingTask = failingTasks[2];

  // Get the different parts needed for llm to generate solution
  const stack = firstFailingTask.result.errors[0].stack;
  const errorMessage = firstFailingTask.result.errors[0].message;
  const expected = firstFailingTask.result.errors[0].expected;
  const actual = firstFailingTask.result.errors[0].actual;

  // Get peggy code, read file
  const peggyCode = await Deno.readTextFile("src/tooltipParser.pegjs");

  // Read peggy documentation from file
  const peggyDoc = await Deno.readTextFile(
    "src/testAutomation/documentation.html"
  );

  const systemPrompt =
    `` +
    `You are an experienced software engineer\n` +
    `You are an expert in parsing and generating code\n` +
    `You are an expert in pegjs and peggy\n` +
    `You are building a program that takes tooltips of a card game and your goal is to generate the internal json representation of the card.\n` +
    `You are going to be given a tooltip and the expected card json.\n` +
    `Your goal is to write a generalizable peggy/pegjs parser that can parse the tooltip and generate the json.\n` +
    `The parser should be able to handle many different tooltips, and should be modular and reusable.\n` +
    `You will also be given the error message and stack trace of the test that failed.\n` +
    `When responding, you should only respond with the whole code of the parser.`;

  // Get the card name from task name
  const cardName = firstFailingTask.name.split("-")[0];

  console.log("Card name:", cardName);

  // Get the tooltip by filtering items
  const tooltips = JSON.stringify(
    items.find((item) => item.name.toLowerCase() === cardName.toLowerCase())
      ?.unifiedTooltips
  );

  console.log("Tooltip:", tooltips);

  // Create prompt by combining everything
  const prompt =
    `<systemPrompt>\n${systemPrompt}\n</systemPrompt>\n\n` +
    `<tooltips>\n${tooltips}\n</tooltips>\n\n` +
    `<cardName>\n${cardName}\n</cardName>\n\n` +
    `<peggyCode>\n${peggyCode}\n</peggyCode>\n\n` +
    `<peggyDoc>\n${peggyDoc}\n</peggyDoc>\n\n` +
    `<errorMessage>\n${errorMessage}\n</errorMessage>\n\n` +
    `<stackTrace>\n${stack}\n</stackTrace>\n\n` +
    `<expected>\n${expected}\n</expected>\n\n` +
    `<actual>\n${actual}\n</actual>\n\n`;

  // Store prompt in file
  await Deno.writeTextFile("src/testAutomation/prompt.txt", prompt);

  // write test result to file
  // const cache: any[] = [];
  // await Deno.writeTextFile(
  //   "test-result.json",
  //   JSON.stringify(result, (key, value) => {
  //     if (typeof value === "object" && value !== null) {
  //       // Duplicate reference found, discard key
  //       if (cache.includes(value)) return;

  //       // Store value in our collection
  //       cache.push(value);
  //     }
  //     return value;
  //   })
  // );

  console.log("Prompt written to prompt.txt");
} catch (err) {
  console.log("Error starting Vitest:", err);
} finally {
  await vitest.close();
}
