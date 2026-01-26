/**
 * Playlists API routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sqlService } from "../../services/sqlService";
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
    const results = sqlService.queryAll<Playlist>("SELECT * FROM Playlists ORDER BY name ASC");

    logService.info(`Retrieved ${results.length} playlists`);

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
    const playlist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

    if (!playlist) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }

    // Get media in playlist
    const media = sqlService.queryAll(
      `
      SELECT m.*, pmo.sort_order
      FROM MediaFiles m
      JOIN PlaylistMediaOrder pmo ON m.id = pmo.media_id
      WHERE pmo.playlist_id = ? AND m.is_deleted = 0
      ORDER BY pmo.sort_order ASC
    `,
      [id]
    );

    logService.info(`Retrieved playlist: ${playlist.name} with ${media.length} items`);

    const response: ApiResponse<{ playlist: Playlist; media: unknown[] }> = {
      status: 200,
      data: { playlist, media },
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
    // Check if playlist already exists
    const existing = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE name = ?", [body.name]);

    if (existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: "Playlist already exists" },
      };
      return c.json(response, 409);
    }

    // Create new playlist
    const result = sqlService.execute("INSERT INTO Playlists (name, description) VALUES (?, ?)", [
      body.name,
      body.description || null,
    ]);

    logService.info(`Created playlist: ${body.name}`);

    const newPlaylist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [result.lastInsertRowid]);

    const response: ApiResponse<Playlist> = {
      status: 201,
      data: newPlaylist!,
    };

    return c.json(response, 201);
  } catch (error) {
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
    // Check if playlist exists
    const existing = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

    if (!existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }

    // Update playlist
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    if (body.name) {
      updateFields.push("name = ?");
      updateValues.push(body.name);
    }

    if (body.description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(body.description || null);
    }

    if (updateFields.length === 0) {
      const response: ApiResponse<{ error: string }> = {
        status: 400,
        data: { error: "No fields to update" },
      };
      return c.json(response, 400);
    }

    updateValues.push(id);
    sqlService.execute(`UPDATE Playlists SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);

    logService.info(`Updated playlist: ${body.name || existing.name}`);

    const updatedPlaylist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

    const response: ApiResponse<Playlist> = {
      status: 200,
      data: updatedPlaylist!,
    };

    return c.json(response);
  } catch (error) {
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
    // Check if playlist exists
    const existing = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

    if (!existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }

    // Delete playlist (cascade will handle PlaylistMediaOrder)
    sqlService.execute("DELETE FROM Playlists WHERE id = ?", [id]);

    logService.info(`Deleted playlist: ${existing.name}`);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: { success: true },
    };

    return c.json(response);
  } catch (error) {
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
    // Check if playlist exists
    const playlist = sqlService.queryOne("SELECT * FROM Playlists WHERE id = ?", [id]);

    if (!playlist) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }

    // Check if media exists
    const media = sqlService.queryOne("SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0", [mediaId]);

    if (!media) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media file not found" },
      };
      return c.json(response, 404);
    }

    // Check if already in playlist
    const existing = sqlService.queryOne("SELECT * FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?", [
      id,
      mediaId,
    ]);

    if (existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 409,
        data: { error: "Media already in playlist" },
      };
      return c.json(response, 409);
    }

    // Get next sort order
    const maxOrder = sqlService.queryOne<{ max_order: number | null }>(
      "SELECT MAX(sort_order) as max_order FROM PlaylistMediaOrder WHERE playlist_id = ?",
      [id]
    );

    const nextOrder = (maxOrder?.max_order ?? -1) + 1;

    // Add media to playlist
    sqlService.execute("INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)", [
      id,
      mediaId,
      nextOrder,
    ]);

    logService.info(`Added media ID ${mediaId} to playlist ID ${id} at position ${nextOrder}`);

    const response: ApiResponse<{ success: boolean; sort_order: number }> = {
      status: 200,
      data: { success: true, sort_order: nextOrder },
    };

    return c.json(response);
  } catch (error) {
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
    // Check if relationship exists
    const existing = sqlService.queryOne("SELECT * FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?", [
      id,
      mediaId,
    ]);

    if (!existing) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Media not found in playlist" },
      };
      return c.json(response, 404);
    }

    // Remove media from playlist
    sqlService.execute("DELETE FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?", [id, mediaId]);

    logService.info(`Removed media ID ${mediaId} from playlist ID ${id}`);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: { success: true },
    };

    return c.json(response);
  } catch (error) {
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
    // Check if playlist exists
    const playlist = sqlService.queryOne("SELECT * FROM Playlists WHERE id = ?", [id]);

    if (!playlist) {
      const response: ApiResponse<{ error: string }> = {
        status: 404,
        data: { error: "Playlist not found" },
      };
      return c.json(response, 404);
    }

    // Delete all current entries for this playlist
    sqlService.execute("DELETE FROM PlaylistMediaOrder WHERE playlist_id = ?", [id]);

    // Insert new ordering
    for (let i = 0; i < body.mediaIds.length; i++) {
      sqlService.execute("INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)", [
        id,
        body.mediaIds[i],
        i,
      ]);
    }

    logService.info(`Reordered playlist ID ${id} with ${body.mediaIds.length} items`);

    const response: ApiResponse<{ success: boolean }> = {
      status: 200,
      data: { success: true },
    };

    return c.json(response);
  } catch (error) {
    logService.error("Failed to reorder playlist", error as Error);
    const response: ApiResponse<{ error: string }> = {
      status: 500,
      data: { error: "Failed to reorder playlist" },
    };
    return c.json(response, 500);
  }
});

export default playlists;
