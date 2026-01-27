/**
 * Folders API routes
 */

import { Hono } from "hono";
import { sqlService } from "../../services/sqlService";
import { logService } from "../../services/logService";
import { type Folder, type ApiResponse } from "../schemas";

const folders = new Hono();

/**
 * GET /api/folders - List all folders
 */
folders.get("/", (c) => {
  logService.trace("GET /api/folders called");

  try {
    const results = sqlService.queryAll<Folder>("SELECT * FROM Folders ORDER BY name ASC");

    logService.info(`Retrieved ${results.length} folders`);

    const response: ApiResponse<Folder[]> = {
      status: 200,
      message: `Successfully retrieved ${results.length} folders`,
      data: results,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch folders", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      message: "Failed to fetch folders",
      data: { error: "Failed to fetch folders" },
    };
    return c.json(response, 500);
  }
});

export default folders;
