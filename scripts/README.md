# Database Scripts

This directory contains standalone scripts for creating and seeding the MediaManager database.

## Scripts

### `createDatabase.ts`

Creates the database schema according to the specification in `documentation/planning/DATABASE.md`.

**Features:**
- Idempotent: Can be run multiple times safely without errors
- Creates all tables with proper indexes and foreign key constraints
- Fail-fast: Exits with error code 1 on failure
- Detailed logging with millisecond timestamps

**Usage:**
```bash
npm run db:create
```

**What it creates:**
- MediaFiles table (with mime_type and file_size fields)
- Folders table
- Tags table
- MediaTags junction table
- ViewHistory table
- Playlists table
- PlaylistMediaOrder table
- RandomizationSessions table
- Config table
- All necessary indexes

### `seedDatabase.ts`

Seeds the database with sample data from `seedData.json`.

**Features:**
- Idempotent: Can be run multiple times safely without duplicating data
- Loads seed data from JSON file
- Checks for existing records before inserting
- Fail-fast: Exits with error code 1 on failure
- Requires database to exist (run `createDatabase.ts` first)
- Detailed logging with millisecond timestamps

**Usage:**
```bash
npm run db:seed

# Or specify a custom seed data file
npm run db:seed -- /path/to/custom-seed-data.json
```

**Seed Data Format:**

See `seedData.json` for the expected format. The JSON file should contain:
- `folders`: Array of folder configurations
- `mediaFiles`: Array of media file records
- `tags`: Array of tags
- `mediaTags`: Array of media-tag relationships
- `playlists`: Array of playlists
- `config`: Array of configuration key-value pairs

### Combined Setup

Run both scripts in sequence:

```bash
npm run db:setup
```

This is equivalent to:
```bash
npm run db:create && npm run db:seed
```

## Services

The scripts use the following service layers located in `src/services/`:

### `logService.ts`

Simple logging service with millisecond timestamps in ISO 8601 format.

**Features:**
- INFO, WARN, ERROR log levels
- Automatic timestamp formatting with milliseconds
- Stack trace logging for errors

### `sqlService.ts`

Database service for SQL CRUD operations.

**Features:**
- Connection management
- Query helpers (execute, queryOne, queryAll)
- Transaction support
- Table existence checking
- Foreign key support enabled
- Error handling and logging

### `seedDatabaseService.ts`

Service for seeding the database with data.

**Features:**
- Idempotent seeding (checks for existing records)
- Dependency-aware seeding order
- Support for all database tables
- Detailed logging for each operation

## Database Location

The database is created as `media-manager.db` in the project root directory. This file is ignored by git (see `.gitignore`).

## Error Handling

All scripts follow a "fail-fast" approach:
- Exit with code 0 on success
- Exit with code 1 on failure
- Log detailed error messages with stack traces
- Close database connections before exiting

## Examples

### Fresh setup
```bash
npm run db:setup
```

### Re-run safely (idempotent)
```bash
npm run db:create  # No error, logs "Table already exists"
npm run db:seed    # No error, logs "already exists" for each record
```

### Test fail-fast behavior
```bash
rm media-manager.db
npm run db:seed    # Fails with error: Database does not exist
```
