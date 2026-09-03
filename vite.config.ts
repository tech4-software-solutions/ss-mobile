import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { stripeDevPlugin } from "./src/plugins/stripe-dev";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/",
    build: {
      sourcemap: mode === "development" ? "inline" : false,
      minify: mode !== "development",
    },
    plugins: [
      react(),
      tailwindcss(),
      stripeDevPlugin(env.STRIPE_SECRET_KEY, Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
    },
  };
});
