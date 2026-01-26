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
}

// Export singleton instance with default database path
export const sqlService = new SqlService("./media-manager.db");
