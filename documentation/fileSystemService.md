# FileSystemService Usage Guide

## Overview
The `FileSystemService` is a new service for scanning directories and indexing media files into the database.

## Features
- Scans directories for supported media file extensions
- Optional recursive scanning
- Extracts file metadata (size, MIME type, created date)
- Uses absolute file paths
- Skips hidden files and existing database entries
- Batch inserts for optimal database performance
- Comprehensive logging throughout

## Supported File Extensions

### Images
- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.bmp`
- `.webp`

### Videos
- `.mp4`
- `.webm`
- `.mov`
- `.avi`
- `.mkv`

## Usage Examples

### Basic Non-Recursive Scan
```typescript
import { FileSystemService } from "./services/fileSystemService";
import { sqlService } from "./services/sqlService";

// Initialize the service
const fileSystemService = new FileSystemService(sqlService);

// Scan a directory (non-recursive by default)
const result = fileSystemService.scan("/path/to/media/folder");

console.log(`Added: ${result.filesAdded}`);
console.log(`Skipped: ${result.filesSkipped}`);
console.log(`Errors: ${result.errors}`);
```

### Recursive Scan
```typescript
// Scan directory and all subdirectories
const result = fileSystemService.scan("/path/to/media/folder", { 
  recursive: true 
});
```

## Return Value

The `scan()` method returns a `ScanResult` object:

```typescript
interface ScanResult {
  filesAdded: number;    // Count of new files added to database
  filesSkipped: number;  // Count of files already in database
  errors: number;        // Count of errors encountered
}
```

## Behavior

### What Gets Indexed
- Only files with supported extensions
- Only files that don't already exist in the database (based on file_path)
- Visible files (non-hidden)

### What Gets Skipped
- Hidden files (names starting with `.`)
- Files with unsupported extensions
- Files already in the database
- Folders (logged as warning in non-recursive mode, scanned in recursive mode)

### Database Fields
When a file is added, the following fields are populated:
- `folder_path`: Absolute path to the folder containing the file
- `file_name`: Name of the file
- `file_path`: Absolute path to the file
- `file_size`: Size in bytes
- `mime_type`: MIME type based on extension
- `created_date`: File creation date
- `width`: Set to NULL (for future enhancement)
- `height`: Set to NULL (for future enhancement)
- `view_count`: Set to 0
- `like_count`: Set to 0
- `is_deleted`: Set to 0

## Testing

Run the included demo script:
```bash
npx tsx scripts/demoFileSystemService.ts
```

Run the unit tests:
```bash
npm test -- src/tests/fileSystemService.test.ts
```

## Performance Considerations

- Files are inserted in batches of 100 for optimal database performance
- The service uses transactions for batch inserts
- Existing files are checked individually before batching

## Logging

The service provides comprehensive logging:
- **TRACE**: Debug-level details (hidden files, unsupported types, database queries)
- **INFO**: Operation progress (scan start, files found, batch inserts, completion)
- **WARN**: Warnings (folder encountered in non-recursive mode, metadata extraction failures)
- **ERROR**: Errors (directory not found, scan failures, database errors)

## Future Enhancements

- Width and height extraction from image/video files
- Additional file metadata extraction
- More file format support
- Progress callbacks for long-running scans
