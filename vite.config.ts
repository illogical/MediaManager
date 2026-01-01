import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@types": path.resolve(__dirname, "./src/types"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

