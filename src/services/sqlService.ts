/**
 * SQL Service for database CRUD operations
 */

import Database from "better-sqlite3";
import { logService } from "./logService";

export class SqlService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = "./media-manager.db") {
    this.dbPath = dbPath;
  }

  /**
   * Connect to the database
   */
  connect(): void {
    logService.trace("SqlService.connect() called");
    if (this.db) {
      logService.warn("Database already connected");
      return;
    }

    try {
      this.db = new Database(this.dbPath);
      // Enable foreign keys
      this.db.pragma("foreign_keys = ON");
      logService.info(`Connected to database: ${this.dbPath}`);
    } catch (error) {
      logService.error("Failed to connect to database", error as Error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    logService.trace("SqlService.close() called");
    if (this.db) {
      this.db.close();
      this.db = null;
      logService.info("Database connection closed");
    }
  }

  /**
   * Get database instance (throws if not connected)
   */
  getDb(): Database.Database {
    if (!this.db) {
      const error = new Error("Database not connected. Call connect() first.");
      logService.error(error.message);
      throw error;
    }
    return this.db;
  }

  /**
   * Execute a SQL statement (DDL or non-SELECT DML)
   */
  execute(sql: string, params: unknown[] = []): Database.RunResult {
    logService.trace(`SqlService.execute() called with SQL: ${sql.substring(0, 100)}...`);
    try {
      const stmt = this.getDb().prepare(sql);
      const result = stmt.run(...params);
      return result;
    } catch (error) {
      logService.error(`Failed to execute SQL: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  executeMany(statements: Array<{ sql: string; params?: unknown[] }>): void {
    const transaction = this.getDb().transaction(() => {
      for (const stmt of statements) {
        this.execute(stmt.sql, stmt.params || []);
      }
    });

    try {
      transaction();
      logService.info(`Executed ${statements.length} statements in transaction`);
    } catch (error) {
      logService.error("Transaction failed", error as Error);
      throw error;
    }
  }

  /**
   * Query single row
   */
  queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
    logService.trace(`SqlService.queryOne() called with SQL: ${sql.substring(0, 100)}...`);
    try {
      const stmt = this.getDb().prepare(sql);
      return stmt.get(...params) as T | undefined;
    } catch (error) {
      logService.error(`Failed to query one: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * Query multiple rows
   */
  queryAll<T>(sql: string, params: unknown[] = []): T[] {
    logService.trace(`SqlService.queryAll() called with SQL: ${sql.substring(0, 100)}...`);
    try {
      const stmt = this.getDb().prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      logService.error(`Failed to query all: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * Check if a table exists
   */
  tableExists(tableName: string): boolean {
    const result = this.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Check if database file exists and has tables
   */
  databaseExists(): boolean {
    if (!this.db) {
      return false;
    }

    const tables = this.queryAll<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'");
    return tables.length > 0;
  }

  /**
   * Create MediaFiles table if it doesn't exist
   */
  createMediaFilesTable(): void {
    if (!this.tableExists("MediaFiles")) {
      this.execute(`
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
  }

  /**
   * Create Folders table if it doesn't exist
   */
  createFoldersTable(): void {
    if (!this.tableExists("Folders")) {
      this.execute(`
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
  }

  /**
   * Create Tags table if it doesn't exist
   */
  createTagsTable(): void {
    if (!this.tableExists("Tags")) {
      this.execute(`
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
  }

  /**
   * Create MediaTags junction table if it doesn't exist
   */
  createMediaTagsTable(): void {
    if (!this.tableExists("MediaTags")) {
      this.execute(`
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
  }

  /**
   * Create ViewHistory table if it doesn't exist
   */
  createViewHistoryTable(): void {
    if (!this.tableExists("ViewHistory")) {
      this.execute(`
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
  }

  /**
   * Create Playlists table if it doesn't exist
   */
  createPlaylistsTable(): void {
    if (!this.tableExists("Playlists")) {
      this.execute(`
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
  }

  /**
   * Create PlaylistMediaOrder table if it doesn't exist
   */
  createPlaylistMediaOrderTable(): void {
    if (!this.tableExists("PlaylistMediaOrder")) {
      this.execute(`
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
  }

  /**
   * Create RandomizationSessions table if it doesn't exist
   */
  createRandomizationSessionsTable(): void {
    if (!this.tableExists("RandomizationSessions")) {
      this.execute(`
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
  }

  /**
   * Create Config table if it doesn't exist
   */
  createConfigTable(): void {
    if (!this.tableExists("Config")) {
      this.execute(`
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
   * Create all database tables
   */
  createAllTables(): void {
    logService.info("Creating all database tables...");
    this.createMediaFilesTable();
    this.createFoldersTable();
    this.createTagsTable();
    this.createMediaTagsTable();
    this.createViewHistoryTable();
    this.createPlaylistsTable();
    this.createPlaylistMediaOrderTable();
    this.createRandomizationSessionsTable();
    this.createConfigTable();
  }

  /**
   * Create database indexes
   */
  createIndexes(): void {
    logService.info("Creating database indexes...");

    const indexes = [
      {
        name: "idx_media_folder",
        sql: "CREATE INDEX IF NOT EXISTS idx_media_folder ON MediaFiles(folder_path)",
      },
      {
        name: "idx_media_last_viewed",
        sql: "CREATE INDEX IF NOT EXISTS idx_media_last_viewed ON MediaFiles(last_viewed)",
      },
      {
        name: "idx_media_like_count",
        sql: "CREATE INDEX IF NOT EXISTS idx_media_like_count ON MediaFiles(like_count)",
      },
      {
        name: "idx_media_view_count",
        sql: "CREATE INDEX IF NOT EXISTS idx_media_view_count ON MediaFiles(view_count)",
      },
      {
        name: "idx_media_created_date",
        sql: "CREATE INDEX IF NOT EXISTS idx_media_created_date ON MediaFiles(created_date)",
      },
      {
        name: "idx_tags_name",
        sql: "CREATE INDEX IF NOT EXISTS idx_tags_name ON Tags(name)",
      },
      {
        name: "idx_mediatags_media",
        sql: "CREATE INDEX IF NOT EXISTS idx_mediatags_media ON MediaTags(media_id)",
      },
      {
        name: "idx_mediatags_tag",
        sql: "CREATE INDEX IF NOT EXISTS idx_mediatags_tag ON MediaTags(tag_id)",
      },
      {
        name: "idx_viewhistory_media",
        sql: "CREATE INDEX IF NOT EXISTS idx_viewhistory_media ON ViewHistory(media_id)",
      },
      {
        name: "idx_viewhistory_viewed",
        sql: "CREATE INDEX IF NOT EXISTS idx_viewhistory_viewed ON ViewHistory(viewed_at DESC)",
      },
      {
        name: "idx_playlist_order",
        sql: "CREATE INDEX IF NOT EXISTS idx_playlist_order ON PlaylistMediaOrder(playlist_id, sort_order)",
      },
    ];

    for (const index of indexes) {
      this.execute(index.sql);
      logService.info(`Created index: ${index.name}`);
    }
  }
}

// Export singleton instance with default database path
export const sqlService = new SqlService("./media-manager.db");
