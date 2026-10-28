import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export default defineConfig({
  // Relative assets work both at / and at a GitHub Pages repository subpath.
  base: "./",
  server: { proxy: { "/api/music": "http://127.0.0.1:3210" } },
  plugins: [
    react(),
    {
      name: "reipod-private-test-music",
      apply: "serve",
      configureServer(server) {
        // Private test files live outside public/, so they never enter the production build.
        server.middlewares.use((request, response, next) => {
          const match = request.url
            ?.split("?")[0]
            .match(/^\/__test-music\/(catalog\.json|jay-[12]\.m4a)$/);
          if (!match) {
            next();
            return;
          }
          if (request.method !== "GET" && request.method !== "HEAD") {
            response.statusCode = 405;
            response.end();
            return;
          }
          void readFile(resolve(".local/test-music", match[1]))
            .then((data) => {
              response.setHeader(
                "Content-Type",
                match[1].endsWith(".json")
                  ? "application/json; charset=utf-8"
                  : "audio/mp4",
              );
              response.setHeader("Cache-Control", "no-store");
              response.end(request.method === "HEAD" ? undefined : data);
            })
            .catch(() => {
              response.statusCode = 404;
              response.end(
                "Test music is not installed on this development machine.",
              );
            });
        });
      },
    },
  ],
  build: { target: ["es2022", "safari16"] },
});
