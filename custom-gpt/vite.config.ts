import { defineConfig, loadEnv } from "vite";
import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin,
} from "@remix-run/dev";
import tsconfigPaths from "vite-tsconfig-paths";
import { getLoadContext } from "./load-context";

declare module "@remix-run/cloudflare" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      cloudflareDevProxyVitePlugin({
        getLoadContext,
        // Pass environment variables to the dev proxy
        persist: {
          path: '.wrangler'
        }
      }),
      remix({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
      tsconfigPaths(),
    ],
    ssr: {
      resolve: {
        conditions: ["workerd", "worker", "browser"],
      },
    },
    resolve: {
      mainFields: ["browser", "module", "main"],
    },
    build: {
      minify: true,
    },
    // Make sure environment variables are available
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});
