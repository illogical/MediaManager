/**
 * Media API routes
 *
 * Error Handling Note: The route handlers use error message string matching to distinguish
 * between different error types (404 vs 500). In production, consider migrating to custom
 * error classes or error codes for more reliable and maintainable error handling.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { mediaService } from "../../services/mediaService";
import { logService } from "../../services/logService";
import { MediaListQuerySchema, AddTagToMediaSchema } from "../schemas";

const media = new Hono();

/**
 * GET /api/media - List media files with filtering and sorting
 */
media.get("/", zValidator("query", MediaListQuerySchema), (c) => {
  logService.trace("GET /api/media called");

  try {
    const query = c.req.valid("query");
    const mediaFiles = mediaService.getMediaFiles(query);

    return c.json({
      status: 200,
      data: mediaFiles,
    });
  } catch (error) {
    logService.error("Failed to fetch media files", error as Error);
    return c.json(
      {
        status: 500,
        data: [],
      },
      500
    );
  }
});

/**
 * GET /api/media/:id - Get single media file by ID
 */
media.get("/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`GET /api/media/${id} called`);

  if (isNaN(id)) {
    return c.json(
      {
        status: 400,
        data: null,
      },
      400
    );
  }

  try {
    const media = mediaService.getMediaFileById(id);

    if (!media) {
      return c.json(
        {
          status: 404,
          data: null,
        },
        404
      );
    }

    return c.json({
      status: 200,
      data: media,
    });
  } catch (error) {
    logService.error("Failed to fetch media file", error as Error);
    return c.json(
      {
        status: 500,
        data: null,
      },
      500
    );
  }
});

/**
 * POST /api/media/:id/view - Increment view count for a media file
 */
media.post("/:id/view", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${id}/view called`);

  if (isNaN(id)) {
    return c.json(
      {
        status: 400,
        data: null,
      },
      400
    );
  }

  try {
    const result = mediaService.incrementViewCount(id);
    return c.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    logService.error("Failed to increment view count", err);

    // Check if it's a "not found" error (404) vs database error (500)
    if (err.message.includes("not found")) {
      return c.json(
        {
          status: 404,
          data: { view_count: 0 },
        },
        404
      );
    }

    return c.json(
      {
        status: 500,
        data: { view_count: 0 },
      },
      500
    );
  }
});

/**
 * POST /api/media/:id/like - Increment like count for a media file
 */
media.post("/:id/like", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${id}/like called`);

  if (isNaN(id)) {
    return c.json(
      {
        status: 400,
        data: null,
      },
      400
    );
  }

  try {
    const result = mediaService.incrementLikeCount(id);
    return c.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    logService.error("Failed to increment like count", err);

    // Check if it's a "not found" error (404) vs database error (500)
    if (err.message.includes("not found")) {
      return c.json(
        {
          status: 404,
          data: { like_count: 0 },
        },
        404
      );
    }

    return c.json(
      {
        status: 500,
        data: { like_count: 0 },
      },
      500
    );
  }
});

/**
 * POST /api/media/:id/dislike - Set like count to -1 for a media file
 */
media.post("/:id/dislike", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${id}/dislike called`);

  if (isNaN(id)) {
    return c.json(
      {
        status: 400,
        data: null,
      },
      400
    );
  }

  try {
    const result = mediaService.setDislike(id);
    return c.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    logService.error("Failed to set dislike", err);

    // Check if it's a "not found" error (404) vs database error (500)
    if (err.message.includes("not found")) {
      return c.json(
        {
          status: 404,
          data: { like_count: 0 },
        },
        404
      );
    }

    return c.json(
      {
        status: 500,
        data: { like_count: 0 },
      },
      500
    );
  }
});

/**
 * GET /api/media/:id/tags - Get all tags for a media file
 */
media.get("/:id/tags", (c) => {
  const mediaId = parseInt(c.req.param("id"));
  logService.trace(`GET /api/media/${mediaId}/tags called`);

  if (isNaN(mediaId)) {
    return c.json(
      {
        status: 400,
        data: [],
      },
      400
    );
  }

  const tags = mediaService.getTagsForMedia(mediaId);

  return c.json({
    status: 200,
    data: tags,
  });
});

/**
 * POST /api/media/:id/tags - Add tag to media file
 */
media.post("/:id/tags", zValidator("json", AddTagToMediaSchema), (c) => {
  const mediaId = parseInt(c.req.param("id"));
  logService.trace(`POST /api/media/${mediaId}/tags called`);

  if (isNaN(mediaId)) {
    return c.json(
      {
        status: 400,
        data: null,
      },
      400
    );
  }

  try {
    const body = c.req.valid("json");
    const tag = mediaService.addTagToMedia(mediaId, body.tagName);

    return c.json({
      status: 200,
      data: { tag },
    });
  } catch (error) {
    const err = error as Error;
    logService.error("Failed to add tag to media", err);

    // Check if it's a "not found" error (404) vs "already applied" error (409)
    if (err.message.includes("not found")) {
      return c.json(
        {
          status: 404,
          data: null,
        },
        404
      );
    } else if (err.message.includes("already applied")) {
      return c.json(
        {
          status: 409,
          data: null,
        },
        409
      );
    }

    return c.json(
      {
        status: 500,
        data: null,
      },
      500
    );
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
    return c.json(
      {
        status: 400,
        data: null,
      },
      400
    );
  }

  try {
    const result = mediaService.removeTagFromMedia(mediaId, tagId);
    return c.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    const err = error as Error;
    logService.error("Failed to remove tag from media", err);

    // Check if it's a "not found" error (404) vs database error (500)
    if (err.message.includes("not found")) {
      return c.json(
        {
          status: 404,
          data: { success: false },
        },
        404
      );
    }

    return c.json(
      {
        status: 500,
        data: { success: false },
      },
      500
    );
  }
});

export default media;
