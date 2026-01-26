/**
 * Media API routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sqlService } from "../../services/sqlService";
import { logService } from "../../services/logService";
import { MediaListQuerySchema, AddTagToMediaSchema, type MediaFile, type Tag, type ApiResponse } from "../schemas";

const media = new Hono();

/**
 * GET /api/media - List media files with filtering and sorting
 */
media.get("/", zValidator("query", MediaListQuerySchema), (c) => {
  logService.trace("GET /api/media called");

  const query = c.req.valid("query");
  const { folder, type, tags, sort, limit, offset } = query;

  try {
    let sql = `
      SELECT DISTINCT m.* 
      FROM MediaFiles m
      WHERE m.is_deleted = 0
    `;

    const params: unknown[] = [];

    // Filter by folder
    if (folder) {
      sql += " AND m.folder_path = ?";
      params.push(folder);
    }

    // Filter by type (mime_type)
    if (type && type !== "both") {
      if (type === "image") {
        sql += " AND m.mime_type LIKE 'image/%'";
      } else if (type === "video") {
        sql += " AND m.mime_type LIKE 'video/%'";
      }
    }

    // Filter by tags (OR logic)
    if (tags) {
      const tagNames = tags.split(",").map((t) => t.trim());
      sql += `
        AND m.id IN (
          SELECT mt.media_id 
          FROM MediaTags mt
          JOIN Tags t ON mt.tag_id = t.id
          WHERE t.name IN (${tagNames.map(() => "?").join(",")})
        )
      `;
      params.push(...tagNames);
    }

    // Apply sorting
    const sortMap: Record<string, string> = {
      created_date_asc: "m.created_date ASC",
      created_date_desc: "m.created_date DESC",
      view_count_asc: "m.view_count ASC",
      view_count_desc: "m.view_count DESC",
      last_viewed_asc: "m.last_viewed ASC",
      last_viewed_desc: "m.last_viewed DESC",
      like_count_desc: "m.like_count DESC",
      file_name_asc: "m.file_name ASC",
    };

    sql += ` ORDER BY ${sortMap[sort] || sortMap.created_date_desc}`;
    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const results = sqlService.queryAll<MediaFile>(sql, params);

    logService.info(`Retrieved ${results.length} media files`);

    const response: ApiResponse<MediaFile[]> = {
      status: 200,
      data: results,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch media files", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch media files" },
    };
    return c.json(response, 500);
  }
});

/**
 * GET /api/media/:id - Get single media file by ID
 */
media.get("/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`GET /api/media/${id} called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID" },
    };
    return c.json(response, 400);
  }

  try {
    const result = sqlService.queryOne<MediaFile>("SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0", [id]);

    if (!result) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    logService.info(`Retrieved media file: ${result.file_name}`);

    const response: ApiResponse<MediaFile> = {
      status: 200,
      data: result,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch media file", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch media file" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/media/:id/view - Increment view count for a media file
 */
media.post("/:id/view", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${id}/view called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID" },
    };
    return c.json(response, 400);
  }

  try {
    // Check if media exists
    const media = sqlService.queryOne<MediaFile>("SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0", [id]);

    if (!media) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    // Increment view count and update last_viewed
    sqlService.execute(
      `
      UPDATE MediaFiles 
      SET view_count = view_count + 1, 
          last_viewed = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [id]
    );

    // Insert into ViewHistory
    sqlService.execute("INSERT INTO ViewHistory (media_id) VALUES (?)", [id]);

    logService.info(`Incremented view count for media: ${media.file_name}`);

    const response: ApiResponse<{ success: boolean; view_count: number }> = {
      status: 200,
      data: { success: true, view_count: media.view_count + 1 },
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to increment view count", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to increment view count" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/media/:id/like - Increment like count for a media file
 */
media.post("/:id/like", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${id}/like called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID" },
    };
    return c.json(response, 400);
  }

  try {
    // Check if media exists
    const media = sqlService.queryOne<MediaFile>("SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0", [id]);

    if (!media) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    // Always increment like_count
    const newLikeCount = media.like_count + 1;
    sqlService.execute(
      `
      UPDATE MediaFiles 
      SET like_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [newLikeCount, id]
    );

    logService.info(`Incremented like count for media: ${media.file_name} to ${newLikeCount}`);

    const response: ApiResponse<{ success: boolean; like_count: number }> = {
      status: 200,
      data: { success: true, like_count: newLikeCount },
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to increment like count", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to increment like count" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/media/:id/dislike - Set like count to -1 for a media file
 */
media.post("/:id/dislike", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${id}/dislike called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid media ID" },
    };
    return c.json(response, 400);
  }

  try {
    // Check if media exists
    const media = sqlService.queryOne<MediaFile>("SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0", [id]);

    if (!media) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    // Set like_count to -1
    sqlService.execute(
      `
      UPDATE MediaFiles 
      SET like_count = -1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [id]
    );

    logService.info(`Set dislike for media: ${media.file_name}`);

    const response: ApiResponse<{ success: boolean; like_count: number }> = {
      status: 200,
      data: { success: true, like_count: -1 },
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to set dislike", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to set dislike" },
    };
    return c.json(response, 500);
  }
});

/**
 * GET /api/media/:id/tags - Get all tags for a media file
 */
media.get("/:id/tags", (c) => {
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

/**
 * POST /api/media/:id/tags - Add tag to media file
 */
media.post("/:id/tags", zValidator("json", AddTagToMediaSchema), (c) => {
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
    const mediaCheck = sqlService.queryOne("SELECT id FROM MediaFiles WHERE id = ? AND is_deleted = 0", [mediaId]);

    if (!mediaCheck) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    // Find tag
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
media.delete("/:id/tags/:tagId", (c) => {
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

export default media;
