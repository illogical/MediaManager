/**
 * Tags API routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sqlService } from "../../services/sqlService";
import { logService } from "../../services/logService";
import { CreateTagSchema, AddTagToMediaSchema, type Tag, type ApiResponse } from "../schemas";

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

    const response: ApiResponse<Tag> = {
      status: 201,
      data: newTag!,
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

/**
 * POST /api/media/:id/tags - Add tag to media file
 */
tags.post("/media/:id", zValidator("json", AddTagToMediaSchema), (c) => {
  const mediaId = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${mediaId}/tags called`);

  if (isNaN(mediaId)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID" },
    };
    return c.json(response, 400);
  }

  const body = c.req.valid("json");

  try {
    // Check if media exists
    const media = sqlService.queryOne("SELECT id FROM MediaFiles WHERE id = ? AND is_deleted = 0", [mediaId]);

    if (!media) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    // Find or create tag
    const tag = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE name = ?", [body.tagName]);

    if (!tag) {
      // Tag doesn't exist, throw error (must use separate endpoint to create tags)
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Tag not found. Create the tag first using POST /api/tags" },
      };
      return c.json(response, 404);
    }

    // Check if relationship already exists
    const existing = sqlService.queryOne("SELECT * FROM MediaTags WHERE media_id = ? AND tag_id = ?", [
      mediaId,
      tag.id,
    ]);

    if (existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: "Tag already applied to this media" },
      };
      return c.json(response, 409);
    }

    // Add tag to media
    sqlService.execute("INSERT INTO MediaTags (media_id, tag_id) VALUES (?, ?)", [mediaId, tag.id]);

    logService.info(`Added tag '${body.tagName}' to media ID ${mediaId}`);

    const response: ApiResponse<{ success: boolean; tag: Tag }> = {
      status: 200,
      data: { success: true, tag },
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to add tag to media", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to add tag to media" },
    };
    return c.json(response, 500);
  }
});

/**
 * DELETE /api/media/:id/tags/:tagId - Remove tag from media file
 */
tags.delete("/media/:id/:tagId", (c) => {
  const mediaId = parseInt(c.req.param("id"));
  const tagId = parseInt(c.req.param("tagId"));
  logService.trace(`DELETE /api/media/${mediaId}/tags/${tagId} called`);

  if (isNaN(mediaId) || isNaN(tagId)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID or tag ID" },
    };
    return c.json(response, 400);
  }

  try {
    // Check if relationship exists
    const existing = sqlService.queryOne("SELECT * FROM MediaTags WHERE media_id = ? AND tag_id = ?", [mediaId, tagId]);

    if (!existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Tag not found on this media" },
      };
      return c.json(response, 404);
    }

    // Remove tag from media
    sqlService.execute("DELETE FROM MediaTags WHERE media_id = ? AND tag_id = ?", [mediaId, tagId]);

    logService.info(`Removed tag ID ${tagId} from media ID ${mediaId}`);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: { success: true },
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to remove tag from media", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to remove tag from media" },
    };
    return c.json(response, 500);
  }
});

/**
 * GET /api/media/:id/tags - Get all tags for a media file
 */
tags.get("/media/:id", (c) => {
  const mediaId = parseInt(c.req.param("id"));
  logService.trace(`GET /api/media/${mediaId}/tags called`);

  if (isNaN(mediaId)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID" },
    };
    return c.json(response, 400);
  }

  try {
    const results = sqlService.queryAll<Tag>(
      `
      SELECT t.* 
      FROM Tags t
      JOIN MediaTags mt ON t.id = mt.tag_id
      WHERE mt.media_id = ?
      ORDER BY t.name ASC
    `,
      [mediaId]
    );

    logService.info(`Retrieved ${results.length} tags for media ID ${mediaId}`);

    const response: ApiResponse<Tag[]> = {
      status: 200,
      data: results,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch tags for media", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch tags for media" },
    };
    return c.json(response, 500);
  }
});

export default tags;
