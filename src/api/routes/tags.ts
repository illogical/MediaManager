/**
 * Tags API routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sqlService } from "../../services/sqlService";
import { logService } from "../../services/logService";
import { CreateTagSchema, type Tag, type ApiResponse } from "../schemas";

const tags = new Hono();

/**
 * GET /api/tags - List all tags
 */
tags.get("/", (c) => {
  logService.trace("GET /api/tags called");

  try {
    const results = sqlService.queryAll<Tag>("SELECT * FROM Tags ORDER BY name ASC");

    logService.info(`Retrieved ${results.length} tags`);

    const response: ApiResponse<Tag[]> = {
      status: 200,
      data: results,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch tags", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch tags" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/tags - Create a new tag
 */
tags.post("/", zValidator("json", CreateTagSchema), (c) => {
  logService.trace("POST /api/tags called");

  const body = c.req.valid("json");

  try {
    // Check if tag already exists
    const existing = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE name = ?", [body.name]);

    if (existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: "Tag already exists" },
      };
      return c.json(response, 409);
    }

    // Create new tag
    const result = sqlService.execute("INSERT INTO Tags (name) VALUES (?)", [body.name]);

    logService.info(`Created tag: ${body.name}`);

    const newTag = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE id = ?", [result.lastInsertRowid]);

    if (!newTag) {
      throw new Error("Failed to retrieve created tag");
    }

    const response: ApiResponse<Tag> = {
      status: 201,
      data: newTag,
    };

    return c.json(response, 201);
  } catch (error) {
    logService.error("Failed to create tag", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to create tag" },
    };
    return c.json(response, 500);
  }
});

export default tags;
