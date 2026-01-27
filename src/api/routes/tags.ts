/**
 * Tags API routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { mediaService } from "../../services/mediaService";
import { logService } from "../../services/logService";
import { CreateTagSchema } from "../schemas";

const tags = new Hono();

/**
 * GET /api/tags - List all tags
 */
tags.get("/", (c) => {
  logService.trace("GET /api/tags called");

  try {
    const tagsData = mediaService.getAllTags();
    return c.json({
      status: 200,
      data: tagsData,
    });
  } catch (error) {
    logService.error("Failed to fetch tags", error as Error);
    return c.json({
      status: 500,
      data: [],
    }, 500);
  }
});

/**
 * POST /api/tags - Create a new tag (or return existing tag if it already exists)
 * Returns 201 Created status for both new and existing tags (idempotent behavior).
 * This simplifies the response without requiring clients to distinguish creation from retrieval.
 */
tags.post("/", zValidator("json", CreateTagSchema), (c) => {
  logService.trace("POST /api/tags called");

  try {
    const body = c.req.valid("json");
    const tag = mediaService.createTag(body.name);

    return c.json({
      status: 201,
      data: tag,
    }, 201);
  } catch (error) {
    logService.error("Failed to create tag", error as Error);
    
    return c.json({
      status: 500,
      data: null,
    }, 500);
  }
});

export default tags;
