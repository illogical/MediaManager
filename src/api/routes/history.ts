/**
 * View History API routes
 */

import { Hono } from "hono";
import { sqlService } from "../../services/sqlService";
import { logService } from "../../services/logService";
import { type ViewHistory, type ApiResponse } from "../schemas";

const history = new Hono();

/**
 * GET /api/history - Get last 20 viewed items
 */
history.get("/", (c) => {
  logService.trace("GET /api/history called");

  try {
    const results = sqlService.queryAll<ViewHistory>(
      `
      SELECT 
        vh.id, 
        vh.media_id, 
        vh.viewed_at,
        m.file_name,
        m.file_path
      FROM ViewHistory vh
      JOIN MediaFiles m ON vh.media_id = m.id
      WHERE m.is_deleted = 0
      ORDER BY vh.viewed_at DESC
      LIMIT 20
    `
    );

    logService.info(`Retrieved ${results.length} history entries`);

    const response: ApiResponse<ViewHistory[]> = {
      status: 200,
      data: results,
    };

    return c.json(response);
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
