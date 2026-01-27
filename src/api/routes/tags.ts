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

  const response = mediaService.getAllTags();
  return c.json(response, response.status as 200 | 500);
});

/**
 * POST /api/tags - Create a new tag
 */
tags.post("/", zValidator("json", CreateTagSchema), (c) => {
  logService.trace("POST /api/tags called");

  const body = c.req.valid("json");
  const response = mediaService.createTag(body.name);

  return c.json(response, response.status as 201 | 409 | 500);
});

export default tags;
