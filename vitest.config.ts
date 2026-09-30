import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The simulator plays every game out many times over; a slow runner needs longer than five seconds for it.
    testTimeout: 60_000,
  },
});
