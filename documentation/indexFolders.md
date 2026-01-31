# Folder Analysis and Reporting Feature

## Overview

The folder indexing script now includes comprehensive pre-indexing analysis and reporting capabilities. This feature allows you to analyze what files will be indexed before making any changes to the database, and generates detailed HTML and JSON reports.

## New Functionality

### 1. Pre-Indexing Analysis

Before indexing, the system now:
- Scans all configured folders
- Analyzes file metadata (size, type, extension, etc.)
- Compares against existing database entries
- Identifies files to add, skip, or delete
- Measures performance timings for each operation

### 2. Test Mode (`--test` flag)

Run the script in test mode to analyze folders without making any database changes:

```bash
npm run index:folders -- --test
# or
tsx scripts/indexFolders.ts --test
```

**Test mode:**
- ✅ Scans all folders and collects metadata
- ✅ Generates JSON and HTML reports
- ❌ Does NOT add files to database
- ❌ Does NOT mark files as deleted
- ❌ Does NOT create folder records

### 3. Production Mode (default)

Run without the `--test` flag for normal operation:

```bash
npm run index:folders
# or
tsx scripts/indexFolders.ts
```

**Production mode:**
- ✅ Performs pre-indexing analysis
- ✅ Generates JSON and HTML reports
- ✅ Adds new files to database
- ✅ Marks missing files as deleted
- ✅ Creates/updates folder records

## Reports

Both test and production modes generate timestamped reports in the `/logs` directory:

### JSON Report
- Complete structured data
- All file metadata included
- Machine-readable format
- File naming: `analysis-report_YYYY-MM-DDTHH-MM-SS.json`

### HTML Report
- Visual dashboard with statistics
- Color-coded metrics
- File type breakdowns by category and extension
- Performance timing information
- Interactive design with hover effects

**HTML Report includes:**
- 📈 Summary statistics (total files, files to add/skip/delete)
- ⏱️ Performance metrics (total duration, average per folder)
- 📁 Per-folder details with breakdowns
- 📷 Image/video category statistics
- 🎨 File extension distributions
- 📄 File list (if ≤100 files) or link to JSON for larger lists

## Report Data

### Analysis Report Structure

```typescript
{
  timestamp: string;              // ISO timestamp
  totalFolders: number;           // Number of folders analyzed
  totalFilesOnDisk: number;       // Total files found
  totalFilesToAdd: number;        // New files to index
  totalFilesToSkip: number;       // Files already in DB
  totalFilesToDelete: number;     // Missing files to mark deleted
  folders: FolderAnalysisResult[];
  overallTiming: {
    totalMs: number;              // Total analysis time
    averageMsPerFolder: number;   // Average per folder
  };
}
```

### Per-Folder Analysis

```typescript
{
  folderName: string;
  folderPath: string;
  recursive: boolean;
  totalFilesOnDisk: number;
  filesAlreadyInDb: number;
  filesToAdd: FileAnalysis[];      // Detailed file metadata
  filesToDelete: string[];         // Paths of missing files
  filesByCategory: {
    image: number;
    video: number;
  };
  filesByExtension: {
    ".jpg": number,
    ".png": number,
    // ... etc
  };
  timing: {
    filesystemScanMs: number;      // Filesystem scan time
    databaseQueryMs: number;       // DB query time
    deletionMarkingMs: number;     // Deletion check time (optional)
    totalMs: number;               // Total folder analysis time
  };
}
```

### File Metadata

Each file includes:
- `filePath`: Full absolute path
- `fileName`: Base filename
- `folderPath`: Parent directory
- `mimeType`: MIME type (e.g., "image/jpeg")
- `extension`: File extension (e.g., ".jpg")
- `category`: "image" or "video"
- `createdDate`: ISO timestamp

## Supported File Types

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

## Performance Timing

The system measures and reports:

### Per-Folder Timing
- **Filesystem Scan**: Time to recursively scan directory
- **Database Query**: Time to query existing files
- **Deletion Check**: Time to identify missing files (existing folders only)
- **Total**: Combined time for folder analysis

### Overall Timing
- **Total Duration**: Complete analysis time for all folders
- **Average per Folder**: Mean time per folder

## Examples

### Test Mode Example

```bash
$ npm run index:folders -- --test

=== Folder Indexing Script ===
Config file: C:\...\data\folders.json
Mode: TEST (Analysis Only)
Loaded 2 folder(s) from config

🔍 Running analysis (no database changes)...

=== Analysis Complete ===
Total folders analyzed: 2
Total files on disk: 1,247
Files to add: 458
Files to skip (already in DB): 789
Files to delete (missing from disk): 12
Total duration: 2.34s

📊 Generating reports...
✅ Reports generated:
📄 JSON: file:///C:/path/to/logs/analysis-report_2026-01-30T20-15-30.json
🌐 HTML: file:///C:/path/to/logs/analysis-report_2026-01-30T20-15-30.html

ℹ️  No database changes were made (test mode)
```

### Production Mode Example

```bash
$ npm run index:folders

=== Folder Indexing Script ===
Config file: C:\...\data\folders.json
Mode: PRODUCTION (Full Indexing)
Loaded 2 folder(s) from config

🔍 Running pre-indexing analysis...

=== Pre-Indexing Analysis ===
Total folders: 2
Total files on disk: 1,247
Files to add: 458
Files to skip: 789
Files to delete: 12
Analysis duration: 2.34s

📊 Generating reports...
✅ Reports generated:
📄 JSON: file:///C:/path/to/logs/analysis-report_2026-01-30T20-20-45.json
🌐 HTML: file:///C:/path/to/logs/analysis-report_2026-01-30T20-20-45.html

💾 Starting database indexing...

=== Processing folder: My Photos ===
Path: C:\Photos
Recursive: true
Folder already exists in database (ID: 1)
Performing efficient file comparison...
Files in database: 789
Marked 12 missing files as deleted
Scan result - Added: 458, Skipped: 789, Errors: 0

=== Indexing completed successfully ===
Total duration (analysis + indexing): 5.67s
```

## Configuration

Folders are configured in `data/folders.json`:

```json
{
  "folders": [
    {
      "name": "My Photos",
      "path": "C:\\Photos",
      "recursive": true
    },
    {
      "name": "Videos",
      "path": "D:\\Videos",
      "recursive": false
    }
  ]
}
```

### Custom Config File

Use a custom configuration file:

```bash
npm run index:folders -- --config=path/to/custom.json --test
```

## Benefits

1. **Preview Changes**: See exactly what will be indexed before committing
2. **Performance Insights**: Understand scan times for large folders
3. **Audit Trail**: JSON reports provide complete record of indexing operations
4. **Visual Reporting**: HTML dashboard for quick overview
5. **Safe Testing**: Test mode prevents accidental database modifications
6. **Deletion Detection**: Identifies files that have been removed from disk

## Technical Details

### New Services

- **IndexFolderService**: Enhanced with `analyzeFolder()` and `analyzeFolders()` methods
- **ReportGenerationService**: Handles JSON and HTML report generation

### New Interfaces

- `FileAnalysis`: Complete file metadata
- `FolderAnalysisResult`: Per-folder analysis data
- `TimingBreakdown`: Performance metrics
- `AnalysisReport`: Complete analysis report structure

### Test Coverage

Comprehensive test suite in `src/tests/analysisAndReporting.test.ts`:
- Analysis without database modifications
- File detection (add/skip/delete)
- Recursive folder scanning
- Hidden file filtering
- Report generation (JSON and HTML)
- Metadata collection
- Multi-folder analysis

All tests pass ✅
