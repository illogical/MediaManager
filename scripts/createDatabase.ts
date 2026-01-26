#!/usr/bin/env node

/**
 * Script to create the database schema
 * This script is idempotent - it can be run multiple times safely
 */

import { sqlService } from "../src/services/sqlService";
import { logService } from "../src/services/logService";

/**
 * Create all database tables
 */
function createTables(): void {
  logService.info("Creating database tables...");

  // MediaFiles table
  if (!sqlService.tableExists("MediaFiles")) {
    sqlService.execute(`
      CREATE TABLE MediaFiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_size INTEGER,
        mime_type TEXT,
        width INTEGER,
        height INTEGER,
        created_date DATETIME,
        view_count INTEGER DEFAULT 0,
        last_viewed DATETIME,
        like_count INTEGER DEFAULT 0,
        is_deleted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logService.info("Created table: MediaFiles");
  } else {
    logService.info("Table already exists: MediaFiles");
  }

  // Folders table
  if (!sqlService.tableExists("Folders")) {
    sqlService.execute(`
      CREATE TABLE Folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        last_selected DATETIME,
        default_sort TEXT DEFAULT 'created_date_desc',
        default_filter_type TEXT DEFAULT 'both',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logService.info("Created table: Folders");
  } else {
    logService.info("Table already exists: Folders");
  }

  // Tags table
  if (!sqlService.tableExists("Tags")) {
    sqlService.execute(`
      CREATE TABLE Tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logService.info("Created table: Tags");
  } else {
    logService.info("Table already exists: Tags");
  }

  // MediaTags junction table
  if (!sqlService.tableExists("MediaTags")) {
    sqlService.execute(`
      CREATE TABLE MediaTags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (media_id) REFERENCES MediaFiles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES Tags(id) ON DELETE CASCADE,
        UNIQUE(media_id, tag_id)
      )
    `);
    logService.info("Created table: MediaTags");
  } else {
    logService.info("Table already exists: MediaTags");
  }

  // ViewHistory table
  if (!sqlService.tableExists("ViewHistory")) {
    sqlService.execute(`
      CREATE TABLE ViewHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id INTEGER NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (media_id) REFERENCES MediaFiles(id) ON DELETE CASCADE
      )
    `);
    logService.info("Created table: ViewHistory");
  } else {
    logService.info("Table already exists: ViewHistory");
  }

  // Playlists table
  if (!sqlService.tableExists("Playlists")) {
    sqlService.execute(`
      CREATE TABLE Playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        last_accessed DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logService.info("Created table: Playlists");
  } else {
    logService.info("Table already exists: Playlists");
  }

  // PlaylistMediaOrder table
  if (!sqlService.tableExists("PlaylistMediaOrder")) {
    sqlService.execute(`
      CREATE TABLE PlaylistMediaOrder (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL,
        media_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (playlist_id) REFERENCES Playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (media_id) REFERENCES MediaFiles(id) ON DELETE CASCADE,
        UNIQUE(playlist_id, media_id),
        UNIQUE(playlist_id, sort_order)
      )
    `);
    logService.info("Created table: PlaylistMediaOrder");
  } else {
    logService.info("Table already exists: PlaylistMediaOrder");
  }

  // RandomizationSessions table
  if (!sqlService.tableExists("RandomizationSessions")) {
    sqlService.execute(`
      CREATE TABLE RandomizationSessions (
        id TEXT PRIMARY KEY,
        folder_path TEXT NOT NULL,
        filters_json TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        media_order TEXT NOT NULL,
        current_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logService.info("Created table: RandomizationSessions");
  } else {
    logService.info("Table already exists: RandomizationSessions");
  }

  // Config table
  if (!sqlService.tableExists("Config")) {
    sqlService.execute(`
      CREATE TABLE Config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logService.info("Created table: Config");
  } else {
    logService.info("Table already exists: Config");
  }
}

/**
 * Create database indexes
 */
function createIndexes(): void {
  logService.info("Creating database indexes...");

  const indexes = [
    {
      name: "idx_media_folder",
      table: "MediaFiles",
      sql: "CREATE INDEX IF NOT EXISTS idx_media_folder ON MediaFiles(folder_path)",
    },
    {
      name: "idx_media_last_viewed",
      table: "MediaFiles",
      sql: "CREATE INDEX IF NOT EXISTS idx_media_last_viewed ON MediaFiles(last_viewed)",
    },
    {
      name: "idx_media_like_count",
      table: "MediaFiles",
      sql: "CREATE INDEX IF NOT EXISTS idx_media_like_count ON MediaFiles(like_count)",
    },
    {
      name: "idx_media_view_count",
      table: "MediaFiles",
      sql: "CREATE INDEX IF NOT EXISTS idx_media_view_count ON MediaFiles(view_count)",
    },
    {
      name: "idx_media_created_date",
      table: "MediaFiles",
      sql: "CREATE INDEX IF NOT EXISTS idx_media_created_date ON MediaFiles(created_date)",
    },
    {
      name: "idx_tags_name",
      table: "Tags",
      sql: "CREATE INDEX IF NOT EXISTS idx_tags_name ON Tags(name)",
    },
    {
      name: "idx_mediatags_media",
      table: "MediaTags",
      sql: "CREATE INDEX IF NOT EXISTS idx_mediatags_media ON MediaTags(media_id)",
    },
    {
      name: "idx_mediatags_tag",
      table: "MediaTags",
      sql: "CREATE INDEX IF NOT EXISTS idx_mediatags_tag ON MediaTags(tag_id)",
    },
    {
      name: "idx_viewhistory_media",
      table: "ViewHistory",
      sql: "CREATE INDEX IF NOT EXISTS idx_viewhistory_media ON ViewHistory(media_id)",
    },
    {
      name: "idx_viewhistory_viewed",
      table: "ViewHistory",
      sql: "CREATE INDEX IF NOT EXISTS idx_viewhistory_viewed ON ViewHistory(viewed_at DESC)",
    },
    {
      name: "idx_playlist_order",
      table: "PlaylistMediaOrder",
      sql: "CREATE INDEX IF NOT EXISTS idx_playlist_order ON PlaylistMediaOrder(playlist_id, sort_order)",
    },
  ];

  for (const index of indexes) {
    sqlService.execute(index.sql);
    logService.info(`Created index: ${index.name}`);
  }
}

/**
 * Main function
 */
function main(): void {
  try {
    logService.info("Starting database creation...");

    // Connect to database
    sqlService.connect();

    // Create tables
    createTables();

    // Create indexes
    createIndexes();

    // Close database
    sqlService.close();

    logService.info("Database creation completed successfully");
    process.exit(0);
  } catch (error) {
    logService.error("Database creation failed", error as Error);
    sqlService.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
