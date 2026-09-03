import type { Plugin, ViteDevServer } from "vite";

/** Dev-only fallback — disabled when Supabase is configured (production path). */
export function stripeDevPlugin(secretKey: string | undefined, supabaseConfigured: boolean): Plugin {
  return {
    name: "stripe-dev",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      if (!secretKey || supabaseConfigured) return;

      server.middlewares.use("/api/stripe/create-payment-intent", (req, res) => {
        const host = req.headers.host ?? "";
        const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
        if (!isLocal) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Dev payment endpoint is localhost only" }));
          return;
        }
        res.statusCode = 503;
        res.end(JSON.stringify({ error: "Configure Supabase for secure checkout" }));
      });
    },
  };
}
