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
