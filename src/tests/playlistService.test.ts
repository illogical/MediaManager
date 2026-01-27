/**
 * PlaylistService unit tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlaylistService } from "../services/playlistService";
import { sqlService } from "../services/sqlService";
import type { Playlist } from "../api/schemas";

// Mock the sqlService
vi.mock("../services/sqlService", () => {
  return {
    sqlService: {
      queryAll: vi.fn(),
      queryOne: vi.fn(),
      execute: vi.fn(),
    },
    SqlService: vi.fn(),
  };
});

// Mock the logService
vi.mock("../services/logService", () => {
  return {
    logService: {
      trace: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe("PlaylistService", () => {
  let playlistService: PlaylistService;
  const mockSqlService = vi.mocked(sqlService);

  beforeEach(() => {
    playlistService = new PlaylistService();
    vi.clearAllMocks();
  });

  describe("getAllPlaylists", () => {
    it("should return all playlists ordered by name", () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Favorites",
          description: "My favorites",
          created_at: "2024-01-01T00:00:00Z",
          last_accessed: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "Vacation",
          description: null,
          created_at: "2024-01-02T00:00:00Z",
          last_accessed: "2024-01-02T00:00:00Z",
        },
      ];

      mockSqlService.queryAll.mockReturnValue(mockPlaylists);

      const result = playlistService.getAllPlaylists();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockPlaylists);
      expect(mockSqlService.queryAll).toHaveBeenCalledWith("SELECT * FROM Playlists ORDER BY name ASC");
    });

    it("should return empty array when no playlists found", () => {
      mockSqlService.queryAll.mockReturnValue([]);

      const result = playlistService.getAllPlaylists();

      expect(result).toHaveLength(0);
    });

    it("should throw on database errors", () => {
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.getAllPlaylists()).toThrow("Database error");
    });
  });

  describe("getPlaylistById", () => {
    it("should return playlist when found", () => {
      const mockPlaylist: Playlist = {
        id: 1,
        name: "Favorites",
        description: "My favorites",
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(mockPlaylist);

      const result = playlistService.getPlaylistById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe("Favorites");
    });

    it("should return null when playlist not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = playlistService.getPlaylistById(999);

      expect(result).toBeNull();
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.getPlaylistById(1)).toThrow("Database error");
    });
  });

  describe("getPlaylistWithMedia", () => {
    it("should return playlist with media items", () => {
      const mockPlaylist: Playlist = {
        id: 1,
        name: "Favorites",
        description: "My favorites",
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      const mockMedia = [
        {
          id: 1,
          file_name: "test1.jpg",
          sort_order: 0,
        },
        {
          id: 2,
          file_name: "test2.jpg",
          sort_order: 1,
        },
      ];

      mockSqlService.queryOne.mockReturnValue(mockPlaylist);
      mockSqlService.queryAll.mockReturnValue(mockMedia);

      const result = playlistService.getPlaylistWithMedia(1);

      expect(result).not.toBeNull();
      expect(result?.playlist.id).toBe(1);
      expect(result?.media).toHaveLength(2);
    });

    it("should return null when playlist not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      const result = playlistService.getPlaylistWithMedia(999);

      expect(result).toBeNull();
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue({
        id: 1,
        name: "Favorites",
      });
      mockSqlService.queryAll.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.getPlaylistWithMedia(1)).toThrow("Database error");
    });
  });

  describe("createPlaylist", () => {
    it("should create a new playlist", () => {
      const mockPlaylist: Playlist = {
        id: 1,
        name: "New Playlist",
        description: "Test description",
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne
        .mockReturnValueOnce(undefined) // playlist doesn't exist
        .mockReturnValueOnce(mockPlaylist); // newly created playlist

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.createPlaylist("New Playlist", "Test description");

      expect(result.name).toBe("New Playlist");
      expect(result.description).toBe("Test description");
      expect(mockSqlService.execute).toHaveBeenCalledWith("INSERT INTO Playlists (name, description) VALUES (?, ?)", [
        "New Playlist",
        "Test description",
      ]);
    });

    it("should create playlist without description", () => {
      const mockPlaylist: Playlist = {
        id: 1,
        name: "New Playlist",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValueOnce(undefined).mockReturnValueOnce(mockPlaylist);

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.createPlaylist("New Playlist");

      expect(result.name).toBe("New Playlist");
      expect(result.description).toBeNull();
    });

    it("should throw if playlist already exists", () => {
      const existingPlaylist: Playlist = {
        id: 1,
        name: "Existing",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(existingPlaylist);

      expect(() => playlistService.createPlaylist("Existing")).toThrow("Playlist already exists");
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.createPlaylist("Test")).toThrow("Database error");
    });
  });

  describe("updatePlaylist", () => {
    it("should update playlist name", () => {
      const existingPlaylist: Playlist = {
        id: 1,
        name: "Old Name",
        description: "Old description",
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      const updatedPlaylist: Playlist = {
        ...existingPlaylist,
        name: "New Name",
      };

      mockSqlService.queryOne.mockReturnValueOnce(existingPlaylist).mockReturnValueOnce(updatedPlaylist);

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.updatePlaylist(1, { name: "New Name" });

      expect(result.name).toBe("New Name");
      expect(mockSqlService.execute).toHaveBeenCalledWith("UPDATE Playlists SET name = ? WHERE id = ?", [
        "New Name",
        1,
      ]);
    });

    it("should update playlist description", () => {
      const existingPlaylist: Playlist = {
        id: 1,
        name: "Test",
        description: "Old description",
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      const updatedPlaylist: Playlist = {
        ...existingPlaylist,
        description: "New description",
      };

      mockSqlService.queryOne.mockReturnValueOnce(existingPlaylist).mockReturnValueOnce(updatedPlaylist);

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.updatePlaylist(1, { description: "New description" });

      expect(result.description).toBe("New description");
    });

    it("should update both name and description", () => {
      const existingPlaylist: Playlist = {
        id: 1,
        name: "Old Name",
        description: "Old description",
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      const updatedPlaylist: Playlist = {
        ...existingPlaylist,
        name: "New Name",
        description: "New description",
      };

      mockSqlService.queryOne.mockReturnValueOnce(existingPlaylist).mockReturnValueOnce(updatedPlaylist);

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.updatePlaylist(1, {
        name: "New Name",
        description: "New description",
      });

      expect(result.name).toBe("New Name");
      expect(result.description).toBe("New description");
    });

    it("should throw if playlist not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => playlistService.updatePlaylist(999, { name: "Test" })).toThrow("Playlist not found");
    });

    it("should throw if no fields to update", () => {
      const existingPlaylist: Playlist = {
        id: 1,
        name: "Test",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(existingPlaylist);

      expect(() => playlistService.updatePlaylist(1, {})).toThrow("No fields to update");
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue({
        id: 1,
        name: "Test",
      });
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.updatePlaylist(1, { name: "Test" })).toThrow("Database error");
    });
  });

  describe("deletePlaylist", () => {
    it("should delete a playlist", () => {
      const existingPlaylist: Playlist = {
        id: 1,
        name: "To Delete",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        last_accessed: "2024-01-01T00:00:00Z",
      };

      mockSqlService.queryOne.mockReturnValue(existingPlaylist);
      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.deletePlaylist(1);

      expect(result.success).toBe(true);
      expect(mockSqlService.execute).toHaveBeenCalledWith("DELETE FROM Playlists WHERE id = ?", [1]);
    });

    it("should throw if playlist not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => playlistService.deletePlaylist(999)).toThrow("Playlist not found");
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue({
        id: 1,
        name: "Test",
      });
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.deletePlaylist(1)).toThrow("Database error");
    });
  });

  describe("addMediaToPlaylist", () => {
    it("should add media to playlist", () => {
      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1, name: "Playlist" }) // playlist exists
        .mockReturnValueOnce({ id: 1, file_name: "test.jpg" }) // media exists
        .mockReturnValueOnce(undefined) // not already in playlist
        .mockReturnValueOnce({ max_order: 2 }); // current max order

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.addMediaToPlaylist(1, 1);

      expect(result.success).toBe(true);
      expect(result.sort_order).toBe(3);
      expect(mockSqlService.execute).toHaveBeenCalledWith(
        "INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)",
        [1, 1, 3]
      );
    });

    it("should add media to empty playlist with sort_order 0", () => {
      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1, name: "Playlist" })
        .mockReturnValueOnce({ id: 1, file_name: "test.jpg" })
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ max_order: null }); // empty playlist

      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.addMediaToPlaylist(1, 1);

      expect(result.sort_order).toBe(0);
    });

    it("should throw if playlist not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => playlistService.addMediaToPlaylist(999, 1)).toThrow("Playlist not found");
    });

    it("should throw if media not found", () => {
      // media not found - playlist exists but media doesn't
      mockSqlService.queryOne.mockReturnValueOnce({ id: 1, name: "Playlist" });
      mockSqlService.queryOne.mockReturnValueOnce(undefined);

      expect(() => playlistService.addMediaToPlaylist(1, 999)).toThrow("Media file not found");
    });

    it("should throw if media already in playlist", () => {
      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1, name: "Playlist" })
        .mockReturnValueOnce({ id: 1, file_name: "test.jpg" })
        .mockReturnValueOnce({ playlist_id: 1, media_id: 1 }); // already in playlist

      expect(() => playlistService.addMediaToPlaylist(1, 1)).toThrow("Media already in playlist");
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne
        .mockReturnValueOnce({ id: 1, name: "Playlist" })
        .mockReturnValueOnce({ id: 1, file_name: "test.jpg" })
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ max_order: 2 });
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.addMediaToPlaylist(1, 1)).toThrow("Database error");
    });
  });

  describe("removeMediaFromPlaylist", () => {
    it("should remove media from playlist", () => {
      mockSqlService.queryOne.mockReturnValue({
        playlist_id: 1,
        media_id: 1,
      });
      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const result = playlistService.removeMediaFromPlaylist(1, 1);

      expect(result.success).toBe(true);
      expect(mockSqlService.execute).toHaveBeenCalledWith(
        "DELETE FROM PlaylistMediaOrder WHERE playlist_id = ? AND media_id = ?",
        [1, 1]
      );
    });

    it("should throw if media not in playlist", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => playlistService.removeMediaFromPlaylist(1, 1)).toThrow("Media not found in playlist");
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue({
        playlist_id: 1,
        media_id: 1,
      });
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.removeMediaFromPlaylist(1, 1)).toThrow("Database error");
    });
  });

  describe("reorderPlaylistMedia", () => {
    it("should reorder playlist media", () => {
      mockSqlService.queryOne.mockReturnValue({ id: 1, name: "Playlist" });
      mockSqlService.execute.mockReturnValue({
        changes: 1,
        lastInsertRowid: 1,
      });

      const mediaIds = [3, 1, 2];
      const result = playlistService.reorderPlaylistMedia(1, mediaIds);

      expect(result.success).toBe(true);
      // Should be called 4 times: 1 DELETE + 3 INSERTs
      expect(mockSqlService.execute).toHaveBeenCalledTimes(4);
      expect(mockSqlService.execute).toHaveBeenNthCalledWith(
        1,
        "DELETE FROM PlaylistMediaOrder WHERE playlist_id = ?",
        [1]
      );
      expect(mockSqlService.execute).toHaveBeenNthCalledWith(
        2,
        "INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)",
        [1, 3, 0]
      );
      expect(mockSqlService.execute).toHaveBeenNthCalledWith(
        3,
        "INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)",
        [1, 1, 1]
      );
      expect(mockSqlService.execute).toHaveBeenNthCalledWith(
        4,
        "INSERT INTO PlaylistMediaOrder (playlist_id, media_id, sort_order) VALUES (?, ?, ?)",
        [1, 2, 2]
      );
    });

    it("should throw if playlist not found", () => {
      mockSqlService.queryOne.mockReturnValue(undefined);

      expect(() => playlistService.reorderPlaylistMedia(999, [1, 2, 3])).toThrow("Playlist not found");
    });

    it("should throw on database errors", () => {
      mockSqlService.queryOne.mockReturnValue({ id: 1, name: "Playlist" });
      mockSqlService.execute.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => playlistService.reorderPlaylistMedia(1, [1, 2, 3])).toThrow("Database error");
    });
  });
});
