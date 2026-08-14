import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true
  },
  resolve: {
    alias: {
      "@dsh-mobile/protocol": fileURLToPath(new URL("./packages/protocol/src/index.ts", import.meta.url)),
      "@dsh-mobile/mock-dsh-host": fileURLToPath(new URL("./packages/mock-dsh-host/src/index.ts", import.meta.url))
    }
  }
});
