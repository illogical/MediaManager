# Folder Indexing Script

## Overview

The folder indexing script (`scripts/indexFolders.ts`) allows you to index media files from multiple folder paths into the MediaManager database. It efficiently handles existing folders by comparing files between the filesystem and database.

## Features

- **Batch Indexing**: Index multiple folders from a single configuration file
- **Efficient File Comparison**: For existing folders, the script:
  - Identifies new files and adds them to the database
  - Identifies missing files and marks them as deleted (soft delete)
  - Skips existing files to avoid duplicates
- **Recursive Scanning**: Support for both recursive and non-recursive folder scanning
- **CLI Support**: Override default configuration via command-line arguments
- **Idempotent**: Safe to run multiple times on the same folders

## Usage

### Using Default Configuration

```bash
npm run index:folders
```

This will use the default configuration file at `data/folders.json`.

### Using Custom Configuration

```bash
npm run index:folders -- --config=/path/to/custom-config.json
```

## Configuration Format

Create a JSON file with the following structure:

```json
{
  "folders": [
    {
      "name": "My Photos",
      "path": "/home/user/photos",
      "recursive": true
    },
    {
      "name": "Videos",
      "path": "/home/user/videos",
      "recursive": false
    }
  ]
}
```

### Configuration Options

- `name` (string, required): Display name for the folder
- `path` (string, required): Absolute path to the folder
- `recursive` (boolean, optional): Whether to scan subdirectories (default: false)

## How It Works

### First Run (New Folder)

1. Creates folder entry in the `Folders` table
2. Scans the directory for supported media files
3. Adds all discovered files to the `MediaFiles` table

### Subsequent Runs (Existing Folder)

1. Detects that folder already exists in database
2. Performs efficient file comparison:
   - Scans the filesystem for current files
   - Checks which files still exist on disk
   - Marks missing files as deleted (`is_deleted = 1`)
   - Adds any new files discovered
   - Skips files that already exist

## Supported File Types

- **Images**: .jpg, .jpeg, .png, .gif, .bmp, .webp
- **Videos**: .mp4, .webm, .mov, .avi, .mkv

## Examples

### Example 1: Index a Single Folder

```json
{
  "folders": [
    {
      "name": "Family Photos",
      "path": "/home/user/Pictures/Family",
      "recursive": true
    }
  ]
}
```

### Example 2: Index Multiple Folders

```json
{
  "folders": [
    {
      "name": "Photos 2023",
      "path": "/media/photos/2023",
      "recursive": false
    },
    {
      "name": "Photos 2024",
      "path": "/media/photos/2024",
      "recursive": false
    },
    {
      "name": "Videos",
      "path": "/media/videos",
      "recursive": true
    }
  ]
}
```

## Notes

- The script uses soft deletes (`is_deleted = 1`) for missing files, preserving metadata like view counts and tags
- Hidden files and folders (starting with `.`) are automatically skipped
- The script requires the folders to exist on the filesystem before indexing
- All paths should be absolute paths
- The database connection is automatically managed by the script

## Troubleshooting

### "Directory does not exist" Error

Make sure the folder path in your configuration exists and is accessible.

### "Folder already exists" Warning

This is normal behavior when re-running the script. The script will proceed with file comparison.

### Files Not Being Added

Check that:
1. Files have supported extensions
2. Files are not hidden (don't start with `.`)
3. Files are not already in the database

## Related Scripts

- `npm run db:create` - Create the database schema
- `npm run db:seed` - Seed the database with sample data
- `npm run db:setup` - Create and seed the database in one command
