import path from "node:path"
import { fileURLToPath } from "node:url"
import { searchForWorkspaceRoot, type UserConfig } from "vite"

const frontendRoot = fileURLToPath(new URL(".", import.meta.url))

export function mfConfig(port: number): UserConfig {
  return {
    esbuild: { jsx: "automatic" },
    resolve: {
      alias: {
        "@shekel/api": path.join(frontendRoot, "packages/api/src/index.ts"),
        "@shekel/contracts": path.join(frontendRoot, "packages/contracts/src/index.ts"),
        "@shekel/fixtures": path.join(frontendRoot, "packages/fixtures/src/index.ts"),
        "@shekel/ui": path.join(frontendRoot, "packages/ui/src/index.tsx"),
      },
    },
    optimizeDeps: {
      exclude: ["@shekel/api", "@shekel/contracts", "@shekel/fixtures", "@shekel/ui"],
    },
    server: {
      host: "localhost",
      port,
      strictPort: true,
      cors: true,
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
      fs: {
        allow: [frontendRoot, searchForWorkspaceRoot(process.cwd())],
      },
    },
  }
}
