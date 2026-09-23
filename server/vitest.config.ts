import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "../src") } },
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    // Tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/inventrack_test?schema=public",
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      NODE_ENV: "test",
      LOGIN_RATE_LIMIT: "1000",
      TZ: "Asia/Singapore",
    },
  },
});
