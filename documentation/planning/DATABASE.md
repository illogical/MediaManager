# MediaManager Database Schema

This document defines the complete SQLite database schema for the MediaManager application.

## Overview

The database uses SQLite and consists of 8 tables:
- **MediaFiles**: Core table storing all media file metadata
- **Folders**: Configuration for folder paths and preferences
- **Tags**: Tag definitions and usage tracking.
- **MediaTags**: Junction table for many-to-many media-tag relationships
- **ViewHistory**: Tracks viewing history for each media file
- **Playlists**: Named collections of media
- **PlaylistMediaOrder**: Defines media order within playlists
- **RandomizationSessions**: Serializes random viewing sessions
- **Config**: Application-wide configuration key-value pairs

## Table Definitions

### MediaFiles Table

Stores metadata for all media files (images and videos).

```sql
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
    like_count INTEGER DEFAULT 0,  -- negative=dislike (-1), 0=undecided, positive=like count
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_folder ON MediaFiles(folder_path);
CREATE INDEX idx_media_last_viewed ON MediaFiles(last_viewed);
CREATE INDEX idx_media_like_count ON MediaFiles(like_count);
CREATE INDEX idx_media_view_count ON MediaFiles(view_count);
CREATE INDEX idx_media_created_date ON MediaFiles(created_date);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `folder_path`: Path to the folder containing this media file
- `file_name`: Name of the file (e.g., "IMG_001.jpg")
- `file_path`: Full absolute path to the file (unique)
- `file_size`: File size in bytes
- `mime_type`: MIME type of the file (e.g., "image/jpeg", "video/mp4")
- `width`: Image/video width in pixels
- `height`: Image/video height in pixels
- `created_date`: Original file creation date from filesystem
- `view_count`: Number of times this media has been viewed
- `last_viewed`: Timestamp of most recent view
- `like_count`: Like counter (-1=disliked, 0=undecided, positive=like count)
- `is_deleted`: Soft delete flag (set to 1 instead of deleting)
- `created_at`: Database record creation timestamp
- `updated_at`: Database record last update timestamp

### Folders Table

Stores configuration for indexed folders.

```sql
CREATE TABLE Folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    last_selected DATETIME,
    default_sort TEXT DEFAULT 'created_date_desc',
    default_filter_type TEXT DEFAULT 'both',  -- 'images', 'videos', 'both'
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `name`: Display name for the folder (e.g., "Vacation Photos")
- `path`: Absolute filesystem path (unique)
- `last_selected`: Last time this folder was selected by user
- `default_sort`: Default sort order for this folder
- `default_filter_type`: Default media type filter ('images', 'videos', 'both')
- `is_active`: Whether this folder is currently active/monitored
- `created_at`: When this folder was added to the system

### Tags Table

Stores tag definitions and usage statistics.

```sql
CREATE TABLE Tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_name ON Tags(name);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `name`: Tag name (unique, case-sensitive)
- `usage_count`: Number of media files with this tag (cached count)
- `created_at`: When this tag was first created

### MediaTags Table (Junction)

Many-to-many relationship between MediaFiles and Tags.

```sql
CREATE TABLE MediaTags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES MediaFiles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags(id) ON DELETE CASCADE,
    UNIQUE(media_id, tag_id)
);

CREATE INDEX idx_mediatags_media ON MediaTags(media_id);
CREATE INDEX idx_mediatags_tag ON MediaTags(tag_id);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `media_id`: Foreign key to MediaFiles
- `tag_id`: Foreign key to Tags
- `created_at`: When this tag was applied to this media
- **Constraint**: Each media-tag combination must be unique

### ViewHistory Table

Tracks every time a media file is viewed.

```sql
CREATE TABLE ViewHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES MediaFiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_viewhistory_media ON ViewHistory(media_id);
CREATE INDEX idx_viewhistory_viewed ON ViewHistory(viewed_at DESC);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `media_id`: Foreign key to MediaFiles
- `viewed_at`: Timestamp when media was viewed
- **Note**: Stores individual view events, not just counts

### Playlists Table

Stores user-created playlists.

```sql
CREATE TABLE Playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    last_accessed DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `name`: Playlist name (unique)
- `description`: Optional text description
- `last_accessed`: Last time this playlist was viewed
- `created_at`: When this playlist was created

### PlaylistMediaOrder Table

Defines the order of media files within playlists.

```sql
CREATE TABLE PlaylistMediaOrder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    media_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES Playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES MediaFiles(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, media_id),
    UNIQUE(playlist_id, sort_order)
);

CREATE INDEX idx_playlist_order ON PlaylistMediaOrder(playlist_id, sort_order);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `playlist_id`: Foreign key to Playlists
- `media_id`: Foreign key to MediaFiles
- `sort_order`: Position of this media in the playlist (0-indexed)
- **Constraints**: 
  - Each media can only appear once per playlist
  - Each sort_order position must be unique per playlist

### RandomizationSessions Table

Stores randomization sessions for resuming where user left off.

```sql
CREATE TABLE RandomizationSessions (
    id TEXT PRIMARY KEY,  -- UUID
    folder_path TEXT NOT NULL,
    filters_json TEXT NOT NULL,  -- JSON string of applied filters
    algorithm TEXT NOT NULL,  -- 'random', 'least_viewed', 'most_liked', etc.
    media_order TEXT NOT NULL,  -- JSON array of media IDs in random order
    current_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `id`: UUID string as primary key
- `folder_path`: Folder path this session applies to
- `filters_json`: JSON string containing all applied filters
- `algorithm`: Randomization algorithm used ('random', 'least_viewed', 'most_liked', 'most_viewed', 'unviewed_only')
- `media_order`: JSON array of media IDs in the randomized order
- `current_index`: Current position in the randomized sequence
- `created_at`: When this session was created
- `last_accessed`: Last time this session was accessed (for cleanup)

**Example filters_json:**
```json
{
  "type": "image",
  "tags": ["vacation", "beach"],
  "excludeDisliked": true,
  "unviewedOnly": false
}
```

**Example media_order:**
```json
[42, 17, 93, 8, 54, 125, 67]
```

### Config Table

Application-wide configuration key-value store.

```sql
CREATE TABLE Config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `key`: Configuration key (primary key)
- `value`: Configuration value (stored as text, parse as needed)
- `updated_at`: Last time this config was updated

**Example Configuration Keys:**
- `thumbnail_cache_size`: Maximum thumbnail cache size in MB
- `max_view_history`: Maximum number of view history entries to keep
- `last_session_state`: JSON string of last session state
- `ui_preferences`: JSON string of UI preferences

## Folder Configuration JSON

While most configuration is stored in the database, folder paths are configured via a JSON file on the server:

**File Location**: `config/folders.json`

```json
{
  "folders": [
    {
      "name": "Vacation Photos",
      "path": "/absolute/path/to/vacation/photos",
      "enabled": true
    },
    {
      "name": "Family Videos",
      "path": "/absolute/path/to/family/videos",
      "enabled": true
    }
  ]
}
```

**Schema:**
- `folders`: Array of folder configurations
  - `name`: Display name
  - `path`: Absolute filesystem path
  - `enabled`: Whether to scan/monitor this folder
- `thumbnailCacheSize`: Maximum number of thumbnails to cache
- `scanOnStartup`: Whether to automatically scan folders on server startup

## Database Migrations

For future schema updates, consider using a migration system:

1. **Version tracking**: Add a `schema_version` to Config table
2. **Migration files**: Numbered SQL files (001_initial.sql, 002_add_duration.sql, etc.)
3. **Rollback support**: Keep both UP and DOWN migrations
4. **Backup strategy**: Always backup database before migrations

## Performance Considerations

### Indexes

All critical query paths are indexed:
- Media lookup by folder, view count, like count, date
- Tag lookups by name
- Junction table lookups by both foreign keys
- View history by media and timestamp

### Query Optimization Tips

1. **Use prepared statements** to prevent SQL injection and improve performance
2. **Batch inserts** when scanning large folders
3. **VACUUM** database periodically to reclaim space
4. **ANALYZE** after bulk operations to update query planner statistics
5. **Consider WAL mode** for better concurrent read/write performance:
   ```sql
   PRAGMA journal_mode = WAL;
   ```

### Data Integrity

1. **Foreign key constraints** are enabled (must set `PRAGMA foreign_keys = ON;`)
2. **Cascade deletes** ensure orphaned records are cleaned up
3. **Unique constraints** prevent duplicate entries
4. **Soft deletes** (`is_deleted` flag) preserve history while hiding deleted files


## Testing

Use Vitest and test each component and backend functionality.

### Sample Data

For development and testing, populate with sample data:

```sql
-- Insert test folders
INSERT INTO Folders (name, path) VALUES ('Test Photos', '/test/photos');

-- Insert test media files
INSERT INTO MediaFiles (folder_path, filename, file_path, file_size, mime_type, width, height)
VALUES ('/test/photos', 'test1.jpg', '/test/photos/test1.jpg', 1024000, 'image/jpeg', 1920, 1080);

-- Insert test tags
INSERT INTO Tags (name, color) VALUES ('test', '#3b82f6');

-- Link media to tags
INSERT INTO MediaTags (media_id, tag_id) VALUES (1, 1);
```

### Integration Tests

Test critical database operations:
- Insert/update/delete media files
- Tag operations (add, remove, search)
- View history tracking
- Playlist creation and ordering
- Randomization session management
- Query performance with large datasets (1000+ records)
