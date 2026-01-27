/**
 * View History API routes
 */

import { Hono } from "hono";
import { historyService } from "../../services/historyService";
import { logService } from "../../services/logService";

const history = new Hono();

/**
 * GET /api/history - Get last 20 viewed items
 */
history.get("/", (c) => {
  logService.trace("GET /api/history called");

  const response = historyService.getViewHistory();
  return c.json(response, response.status as 200 | 500);
});

export default history;
