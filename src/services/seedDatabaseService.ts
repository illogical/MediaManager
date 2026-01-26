/**
 * Service for seeding the database with sample data
 */

import { SqlService } from "./sqlService";
import { logService } from "./logService";

export interface SeedData {
  folders?: Array<{
    name: string;
    path: string;
    default_sort?: string;
    default_filter_type?: string;
    is_active?: number;
  }>;
  mediaFiles?: Array<{
    folder_path: string;
    file_name: string;
    file_path: string;
    file_size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    created_date?: string;
    view_count?: number;
    last_viewed?: string;
    like_count?: number;
    is_deleted?: number;
  }>;
  tags?: Array<{
    name: string;
  }>;
  mediaTags?: Array<{
    media_id: number;
    tag_id: number;
  }>;
  playlists?: Array<{
    name: string;
    description?: string;
  }>;
  config?: Array<{
    key: string;
    value: string;
  }>;
}

export class SeedDatabaseService {
  constructor(private sqlService: SqlService) {}

  /**
   * Seed folders table
   */
  private seedFolders(folders: SeedData["folders"]): void {
    if (!folders || folders.length === 0) {
      logService.info("No folders to seed");
      return;
    }

    for (const folder of folders) {
      // Check if folder already exists
      const existing = this.sqlService.queryOne("SELECT id FROM Folders WHERE path = ?", [folder.path]);

      if (existing) {
        logService.info(`Folder already exists: ${folder.path}`);
        continue;
      }

      this.sqlService.execute(
        `INSERT INTO Folders (name, path, default_sort, default_filter_type, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          folder.name,
          folder.path,
          folder.default_sort || "created_date_desc",
          folder.default_filter_type || "both",
          folder.is_active ?? 1,
        ]
      );
      logService.info(`Seeded folder: ${folder.name}`);
    }
  }

  /**
   * Seed media files table
   */
  private seedMediaFiles(mediaFiles: SeedData["mediaFiles"]): void {
    if (!mediaFiles || mediaFiles.length === 0) {
      logService.info("No media files to seed");
      return;
    }

    for (const media of mediaFiles) {
      // Check if media file already exists
      const existing = this.sqlService.queryOne("SELECT id FROM MediaFiles WHERE file_path = ?", [media.file_path]);

      if (existing) {
        logService.info(`Media file already exists: ${media.file_path}`);
        continue;
      }

      this.sqlService.execute(
        `INSERT INTO MediaFiles (folder_path, file_name, file_path, file_size, mime_type, 
         width, height, created_date, view_count, last_viewed, like_count, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          media.folder_path,
          media.file_name,
          media.file_path,
          media.file_size || null,
          media.mime_type || null,
          media.width || null,
          media.height || null,
          media.created_date || null,
          media.view_count || 0,
          media.last_viewed || null,
          media.like_count || 0,
          media.is_deleted || 0,
        ]
      );
      logService.info(`Seeded media file: ${media.file_name}`);
    }
  }

  /**
   * Seed tags table
   */
  private seedTags(tags: SeedData["tags"]): void {
    if (!tags || tags.length === 0) {
      logService.info("No tags to seed");
      return;
    }

    for (const tag of tags) {
      // Check if tag already exists
      const existing = this.sqlService.queryOne("SELECT id FROM Tags WHERE name = ?", [tag.name]);

      if (existing) {
        logService.info(`Tag already exists: ${tag.name}`);
        continue;
      }

      this.sqlService.execute("INSERT INTO Tags (name) VALUES (?)", [tag.name]);
      logService.info(`Seeded tag: ${tag.name}`);
    }
  }

  /**
   * Seed media tags junction table
   */
  private seedMediaTags(mediaTags: SeedData["mediaTags"]): void {
    if (!mediaTags || mediaTags.length === 0) {
      logService.info("No media tags to seed");
      return;
    }

    for (const mediaTag of mediaTags) {
      // Check if relationship already exists
      const existing = this.sqlService.queryOne("SELECT id FROM MediaTags WHERE media_id = ? AND tag_id = ?", [
        mediaTag.media_id,
        mediaTag.tag_id,
      ]);

      if (existing) {
        logService.info(
          `Media tag relationship already exists: media_id=${mediaTag.media_id}, tag_id=${mediaTag.tag_id}`
        );
        continue;
      }

      this.sqlService.execute("INSERT INTO MediaTags (media_id, tag_id) VALUES (?, ?)", [
        mediaTag.media_id,
        mediaTag.tag_id,
      ]);
      logService.info(`Seeded media tag: media_id=${mediaTag.media_id}, tag_id=${mediaTag.tag_id}`);
    }
  }

  /**
   * Seed playlists table
   */
  private seedPlaylists(playlists: SeedData["playlists"]): void {
    if (!playlists || playlists.length === 0) {
      logService.info("No playlists to seed");
      return;
    }

    for (const playlist of playlists) {
      // Check if playlist already exists
      const existing = this.sqlService.queryOne("SELECT id FROM Playlists WHERE name = ?", [playlist.name]);

      if (existing) {
        logService.info(`Playlist already exists: ${playlist.name}`);
        continue;
      }

      this.sqlService.execute("INSERT INTO Playlists (name, description) VALUES (?, ?)", [
        playlist.name,
        playlist.description || null,
      ]);
      logService.info(`Seeded playlist: ${playlist.name}`);
    }
  }

  /**
   * Seed config table
   */
  private seedConfig(config: SeedData["config"]): void {
    if (!config || config.length === 0) {
      logService.info("No config entries to seed");
      return;
    }

    for (const entry of config) {
      // Check if config key already exists
      const existing = this.sqlService.queryOne("SELECT key FROM Config WHERE key = ?", [entry.key]);

      if (existing) {
        logService.info(`Config key already exists: ${entry.key}`);
        continue;
      }

      this.sqlService.execute("INSERT INTO Config (key, value) VALUES (?, ?)", [entry.key, entry.value]);
      logService.info(`Seeded config: ${entry.key}`);
    }
  }

  /**
   * Seed all data from seed data object
   */
  seed(data: SeedData): void {
    try {
      logService.info("Starting database seeding...");

      // Seed in order of dependencies
      this.seedFolders(data.folders);
      this.seedMediaFiles(data.mediaFiles);
      this.seedTags(data.tags);
      this.seedMediaTags(data.mediaTags);
      this.seedPlaylists(data.playlists);
      this.seedConfig(data.config);

      logService.info("Database seeding completed successfully");
    } catch (error) {
      logService.error("Database seeding failed", error as Error);
      throw error;
    }
  }
}
