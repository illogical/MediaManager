/**
 * Media API routes
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

  const query = c.req.valid("query");
  const response = mediaService.getMediaFiles(query);

  return c.json(response, response.status as 200 | 500);
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

  const response = mediaService.getMediaFileById(id);
  return c.json(response, response.status as 200 | 404 | 500);
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

  const response = mediaService.incrementViewCount(id);
  return c.json(response, response.status as 200 | 404 | 500);
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

  const response = mediaService.incrementLikeCount(id);
  return c.json(response, response.status as 200 | 404 | 500);
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

  const response = mediaService.setDislike(id);
  return c.json(response, response.status as 200 | 404 | 500);
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

  const body = c.req.valid("json");
  const response = mediaService.addTagToMedia(mediaId, body.tagName);

  return c.json(response, response.status as 200 | 404 | 409 | 500);
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

  const response = mediaService.removeTagFromMedia(mediaId, tagId);
  return c.json(response, response.status as 200 | 404 | 500);
});

export default media;
