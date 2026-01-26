/**
 * MediaManager API Server
 * Hono-based REST API server running on port 17102
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { sqlService } from "../services/sqlService";
import { logService } from "../services/logService";
import media from "./routes/media";
import tags from "./routes/tags";
import folders from "./routes/folders";
import history from "./routes/history";
import playlists from "./routes/playlists";

const app = new Hono();

// Enable CORS for local development
app.use(
  "/*",
  cors({
    origin: "*", // Permissive for local dev
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  logService.trace(`${c.req.method} ${c.req.url}`);
  await next();
  const elapsed = Date.now() - start;
  logService.info(`${c.req.method} ${c.req.url} - ${c.res.status} (${elapsed}ms)`);
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount API routes
app.route("/api/media", media);
app.route("/api/tags", tags);
app.route("/api/folders", folders);
app.route("/api/history", history);
app.route("/api/playlists", playlists);

// 404 handler
app.notFound((c) => {
  return c.json({ status: 404, data: { error: "Not found" } }, 404);
});

// Error handler
app.onError((err, c) => {
  logService.error("Unhandled error", err);
  return c.json({ status: 500, data: { error: "Internal server error" } }, 500);
});

// Start server
const PORT = 17102;

// Connect to database
sqlService.connect();

logService.info(`Starting MediaManager API server on port ${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});

logService.info(`Server is listening on http://localhost:${PORT}`);
