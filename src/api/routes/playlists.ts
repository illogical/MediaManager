/**
 * Playlists API routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { playlistService } from "../../services/playlistService";
import { logService } from "../../services/logService";
import {
  CreatePlaylistSchema,
  UpdatePlaylistSchema,
  ReorderPlaylistSchema,
  type Playlist,
  type ApiResponse,
} from "../schemas";

const playlists = new Hono();

/**
 * GET /api/playlists - List all playlists
 */
playlists.get("/", (c) => {
  logService.trace("GET /api/playlists called");

  try {
    const results = playlistService.getAllPlaylists();

    const response: ApiResponse<Playlist[]> = {
      status: 200,
      data: results,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch playlists", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch playlists" },
    };
    return c.json(response, 500);
  }
});

/**
 * GET /api/playlists/:id - Get single playlist with media
 */
playlists.get("/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`GET /api/playlists/${id} called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid playlist ID" },
    };
    return c.json(response, 400);
  }

  try {
    const result = playlistService.getPlaylistWithMedia(id);

    if (!result) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }

    const response: ApiResponse<{ playlist: Playlist; media: unknown[] }> = {
      status: 200,
      data: result,
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to fetch playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to fetch playlist" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/playlists - Create a new playlist
 */
playlists.post("/", zValidator("json", CreatePlaylistSchema), (c) => {
  logService.trace("POST /api/playlists called");

  const body = c.req.valid("json");

  try {
    const newPlaylist = playlistService.createPlaylist(body.name, body.description);

    const response: ApiResponse<Playlist> = {
      status: 201,
      data: newPlaylist,
    };

    return c.json(response, 201);
  } catch (error) {
    const err = error as Error;
    if (err.message === "Playlist already exists") {
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: "Playlist already exists" },
      };
      return c.json(response, 409);
    }
    logService.error("Failed to create playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to create playlist" },
    };
    return c.json(response, 500);
  }
});

/**
 * PUT /api/playlists/:id - Update playlist name/description
 */
playlists.put("/:id", zValidator("json", UpdatePlaylistSchema), (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`PUT /api/playlists/${id} called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid playlist ID" },
    };
    return c.json(response, 400);
  }

  const body = c.req.valid("json");

  try {
    const updatedPlaylist = playlistService.updatePlaylist(id, body);

    const response: ApiResponse<Playlist> = {
      status: 200,
      data: updatedPlaylist,
    };

    return c.json(response);
  } catch (error) {
    const err = error as Error;
    if (err.message === "Playlist not found") {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }
    if (err.message === "No fields to update") {
      const response: ApiResponse<{ error: string }> = {
        status: 400,
        data: { error: "No fields to update" },
      };
      return c.json(response, 400);
    }
    logService.error("Failed to update playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to update playlist" },
    };
    return c.json(response, 500);
  }
});

/**
 * DELETE /api/playlists/:id - Delete a playlist
 */
playlists.delete("/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`DELETE /api/playlists/${id} called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid playlist ID" },
    };
    return c.json(response, 400);
  }

  try {
    const result = playlistService.deletePlaylist(id);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: result,
    };

    return c.json(response);
  } catch (error) {
    const err = error as Error;
    if (err.message === "Playlist not found") {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }
    logService.error("Failed to delete playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to delete playlist" },
    };
    return c.json(response, 500);
  }
});

/**
 * POST /api/playlists/:id/media/:mediaId - Add media to playlist
 */
playlists.post("/:id/media/:mediaId", (c) => {
  const id = parseInt(c.req.param("id"));
  const mediaId = parseInt(c.req.param("mediaId"));
  logService.trace(`POST /api/playlists/${id}/media/${mediaId} called`);

  if (isNaN(id) || isNaN(mediaId)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid playlist ID or media ID" },
    };
    return c.json(response, 400);
  }

  try {
    const result = playlistService.addMediaToPlaylist(id, mediaId);

    const response: ApiResponse<{ success: boolean; sort_order: number }> = {
      status: 200,
      data: result,
    };

    return c.json(response);
  } catch (error) {
    const err = error as Error;
    if (err.message === "Playlist not found") {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }
    if (err.message === "Media file not found") {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }
    if (err.message === "Media already in playlist") {
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: "Media already in playlist" },
      };
      return c.json(response, 409);
    }
    logService.error("Failed to add media to playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to add media to playlist" },
    };
    return c.json(response, 500);
  }
});

/**
 * DELETE /api/playlists/:id/media/:mediaId - Remove media from playlist
 */
playlists.delete("/:id/media/:mediaId", (c) => {
  const id = parseInt(c.req.param("id"));
  const mediaId = parseInt(c.req.param("mediaId"));
  logService.trace(`DELETE /api/playlists/${id}/media/${mediaId} called`);

  if (isNaN(id) || isNaN(mediaId)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid playlist ID or media ID" },
    };
    return c.json(response, 400);
  }

  try {
    const result = playlistService.removeMediaFromPlaylist(id, mediaId);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: result,
    };

    return c.json(response);
  } catch (error) {
    const err = error as Error;
    if (err.message === "Media not found in playlist") {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media not found in playlist" },
      };
      return c.json(response, 404);
    }
    logService.error("Failed to remove media from playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to remove media from playlist" },
    };
    return c.json(response, 500);
  }
});

/**
 * PUT /api/playlists/:id/reorder - Reorder media in playlist
 */
playlists.put("/:id/reorder", zValidator("json", ReorderPlaylistSchema), (c) => {
  const id = parseInt(c.req.param("id"));
  logService.trace(`PUT /api/playlists/${id}/reorder called`);

  if (isNaN(id)) {
    const response: ApiResponse<{ error: string }> = {
      status: 400,
      data: { error: "Invalid playlist ID" },
    };
    return c.json(response, 400);
  }

  const body = c.req.valid("json");

  try {
    const result = playlistService.reorderPlaylistMedia(id, body.mediaIds);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: result,
    };

    return c.json(response);
  } catch (error) {
    const err = error as Error;
    if (err.message === "Playlist not found") {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }
    logService.error("Failed to reorder playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to reorder playlist" },
    };
    return c.json(response, 500);
  }
});

export default playlists;
