/**
 * View History API routes
 */

import { Hono } from "hono";
import { historyService } from "../../services/historyService";
import { logService } from "../../services/logService";
import type { ApiResponse, ViewHistory } from "../schemas";

const history = new Hono();

/**
 * GET /api/history - Get last 20 viewed items
 */
history.get("/", (c) => {
  logService.trace("GET /api/history called");

  try {
    const data = historyService.getViewHistory();
    const response: ApiResponse<ViewHistory[]> = {
      status: 200,
      data,
    };
    return c.json(response, 200);
  } catch (error) {
    logService.error("Failed to fetch view history", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch view history" },
    };
    return c.json(response, 500);
  }
});

export default history;
