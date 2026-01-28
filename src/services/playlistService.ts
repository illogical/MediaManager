/**
 * Playlist Service - Handles playlist operations
 */

import { sqlService } from "./sqlService";
import { logService } from "./logService";
import type { Playlist } from "../api/schemas";

export class PlaylistService {
  /**
   * Get all playlists ordered by name
   */
  getAllPlaylists(): Playlist[] {
    logService.trace("PlaylistService.getAllPlaylists() called");

    try {
      const playlists = sqlService.queryAll<Playlist>("SELECT * FROM Playlists ORDER BY name ASC");

      logService.info(`Retrieved ${playlists.length} playlists`);

      return playlists;
    } catch (error) {
      logService.error("Failed to fetch playlists", error as Error);
      throw error;
    }
  }

  /**
   * Get a single playlist by ID
   */
  getPlaylistById(id: number): Playlist | null {
    logService.trace(`PlaylistService.getPlaylistById(${id}) called`);

    try {
      const playlist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

      if (!playlist) {
        logService.warn(`Playlist not found: ${id}`);
        return null;
      }

      logService.info(`Retrieved playlist: ${playlist.name}`);

      return playlist;
    } catch (error) {
      logService.error("Failed to fetch playlist", error as Error);
      throw error;
    }
  }

  /**
   * Get a playlist with its media items
   */
  getPlaylistWithMedia(id: number): { playlist: Playlist; media: unknown[] } | null {
    logService.trace(`PlaylistService.getPlaylistWithMedia(${id}) called`);

    try {
      const playlist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

      if (!playlist) {
        logService.warn(`Playlist not found: ${id}`);
        return null;
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

      return { playlist, media };
    } catch (error) {
      logService.error("Failed to fetch playlist with media", error as Error);
      throw error;
    }
  }

  /**
   * Create a new playlist
   * Throws error if playlist already exists
   */
  createPlaylist(name: string, description?: string): Playlist {
    logService.trace(`PlaylistService.createPlaylist("${name}") called`);

    try {
      // Check if playlist already exists
      const existing = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE name = ?", [name]);

      if (existing) {
        logService.warn(`Playlist already exists: ${name}`);
        throw new Error("Playlist already exists");
      }

      // Create new playlist - convert empty description to null
      const result = sqlService.execute("INSERT INTO Playlists (name, description) VALUES (?, ?)", [
        name,
        description ?? null,
      ]);

      logService.info(`Created playlist: ${name}`);

      const newPlaylist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [
        result.lastInsertRowid,
      ]);

      if (!newPlaylist) {
        throw new Error("Failed to retrieve created playlist");
      }

      return newPlaylist;
    } catch (error) {
      logService.error("Failed to create playlist", error as Error);
      throw error;
    }
  }

  /**
   * Update a playlist's name and/or description
   */
  updatePlaylist(id: number, updates: { name?: string; description?: string }): Playlist {
    logService.trace(`PlaylistService.updatePlaylist(${id}) called`);

    try {
      // Check if playlist exists
      const existing = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

      if (!existing) {
        logService.warn(`Playlist not found for update: ${id}`);
        throw new Error("Playlist not found");
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (updates.name !== undefined) {
        updateFields.push("name = ?");
        updateValues.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push("description = ?");
        updateValues.push(updates.description ?? null);
      }

      if (updateFields.length === 0) {
        logService.warn("No fields to update");
        throw new Error("No fields to update");
      }

      updateValues.push(id);
      sqlService.execute(`UPDATE Playlists SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);

      logService.info(`Updated playlist: ${updates.name || existing.name}`);

      const updatedPlaylist = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

      if (!updatedPlaylist) {
        throw new Error("Failed to retrieve updated playlist");
      }

      return updatedPlaylist;
    } catch (error) {
      logService.error("Failed to update playlist", error as Error);
      throw error;
    }
  }

  /**
   * Delete a playlist
   */
  deletePlaylist(id: number): { success: boolean } {
    logService.trace(`PlaylistService.deletePlaylist(${id}) called`);

    try {
      // Check if playlist exists
      const existing = sqlService.queryOne<Playlist>("SELECT * FROM Playlists WHERE id = ?", [id]);

      if (!existing) {
        logService.warn(`Playlist not found for deletion: ${id}`);
        throw new Error("Playlist not found");
      }

      // Delete playlist (cascade will handle PlaylistMediaOrder)
      sqlService.execute("DELETE FROM Playlists WHERE id = ?", [id]);

      logService.info(`Deleted playlist: ${existing.name}`);

      return { success: true };
    } catch (error) {
      logService.error("Failed to delete playlist", error as Error);
      throw error;
    }
  }

  /**
   * Add media to playlist
   */
  addMediaToPlaylist(playlistId: number, mediaId: number): { success: boolean; sort_order: number } {
    logService.trace(`PlaylistService.addMediaToPlaylist(${playlistId}, ${mediaId}) called`);

    try {
      // Check if playlist exists
      const playlist = sqlService.queryOne("SELECT * FROM Playlists WHERE id = ?", [playlistId]);

      if (!playlist) {
        logService.warn(`Playlist not found: ${playlistId}`);
        throw new Error("Playlist not found");
      }

      // Check if media exists
      const media = sqlService.queryOne("SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0", [mediaId]);

      if (!media) {
        logService.warn(`Media file not found: ${mediaId}`);
        throw new Error("Media file not found");
      }

      // Check if already in playlist
      const existing = sqlService.queryOne("SELECT * FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?", [
        playlistId,
        mediaId,
      ]);

      if (existing) {
        logService.warn(`Media ${mediaId} already in playlist ${playlistId}`);
        throw new Error("Media already in playlist");
      }

      // Get next sort order
      const maxOrder = sqlService.queryOne<{ max_order: number | null }>(
        "SELECT MAX(sort_order) as max_order FROM PlaylistMediaOrder WHERE playlist_id = ?",
        [playlistId]
      );

      const nextOrder = (maxOrder?.max_order ?? -1) + 1;

      // Add media to playlist
      sqlService.execute("INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)", [
        playlistId,
        mediaId,
        nextOrder,
      ]);

      logService.info(`Added media ID ${mediaId} to playlist ID ${playlistId} at position ${nextOrder}`);

      return { success: true, sort_order: nextOrder };
    } catch (error) {
      logService.error("Failed to add media to playlist", error as Error);
      throw error;
    }
  }

  /**
   * Remove media from playlist
   */
  removeMediaFromPlaylist(playlistId: number, mediaId: number): { success: boolean } {
    logService.trace(`PlaylistService.removeMediaFromPlaylist(${playlistId}, ${mediaId}) called`);

    try {
      // Check if relationship exists
      const existing = sqlService.queryOne("SELECT * FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?", [
        playlistId,
        mediaId,
      ]);

      if (!existing) {
        logService.warn(`Media ${mediaId} not found in playlist ${playlistId}`);
        throw new Error("Media not found in playlist");
      }

      // Remove media from playlist
      sqlService.execute("DELETE FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?", [
        playlistId,
        mediaId,
      ]);

      logService.info(`Removed media ID ${mediaId} from playlist ID ${playlistId}`);

      return { success: true };
    } catch (error) {
      logService.error("Failed to remove media from playlist", error as Error);
      throw error;
    }
  }

  /**
   * Reorder media in a playlist
   */
  reorderPlaylistMedia(playlistId: number, mediaIds: number[]): { success: boolean } {
    logService.trace(`PlaylistService.reorderPlaylistMedia(${playlistId}) called`);

    try {
      // Check if playlist exists
      const playlist = sqlService.queryOne("SELECT * FROM Playlists WHERE id = ?", [playlistId]);

      if (!playlist) {
        logService.warn(`Playlist not found: ${playlistId}`);
        throw new Error("Playlist not found");
      }

      // Build transaction statements
      const statements = [
        {
          sql: "DELETE FROM PlaylistMediaOrder WHERE playlist_id = ?",
          params: [playlistId],
        },
      ];

      // Add INSERT statements for each media item
      for (let i = 0; i < mediaIds.length; i++) {
        statements.push({
          sql: "INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)",
          params: [playlistId, mediaIds[i], i],
        });
      }

      // Execute all statements in a transaction
      sqlService.executeMany(statements);

      logService.info(`Reordered playlist ID ${playlistId} with ${mediaIds.length} items`);

      return { success: true };
    } catch (error) {
      logService.error("Failed to reorder playlist", error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const playlistService = new PlaylistService();
