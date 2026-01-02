# Objective

A web application with the primary focus of displaying photos and videos and quickly swiping through them to view/preview them, like or dislike, tag them. The main differentiating feature will be multiple options for robust randomization for viewing the media files. The user should be able to review media content, via thumbnail previews, and return to where they had last left off (which item was last viewed but also the sort order and applied filters to media file queue).

For images only, by default they should be displayed to fit full-page without affecting the image’s original aspect ratio. Users should be able to pinch to zoom otherwise use the mouse scroll wheel to zoom in and out.

Videos should be zoomed to fit full-page without affecting the original aspect ratio
# Tech Stack

## Frontend
- **Framework**: Vanilla HTML, CSS, and TypeScript
- **Build Tool**: Vite
- **Styling**: Modern CSS with CSS Grid and Flexbox, glassmorphism effects
- **State Management**: Custom TypeScript classes with localStorage persistence

## Backend
- **Runtime**: Bun.js
- **Database**: SQLite
- **API**: REST API with JSON responses
- **File System**: Server-side filesystem access for media scanning and serving

## Development Approach
- Phase 1-3: Frontend-only with mock data and localStorage
- Phase 4+: Full-stack integration with Bun.js backend
- Images first, video support in later phases
# Features

- [ ]  Configuration JSON schema for selected folder locations that contain images and/or videos to display as options on the website’s navigation bar
- [ ]  Track a view history that tracks the last time the photo or video was viewed and how many times it was viewed
- [ ]  Ability to tag images and videos
    - [ ]  Auto-complete for adding existing tags
- [ ]  Ability to like or dislike media files
    - [ ]  Like button increments a counter (1, 2, 3, etc.) each time clicked
    - [ ]  Dislike button sets the counter to -1 regardless of current value
    - [ ]  Counter value of 0 means undecided/neutral
    - [ ]  Visual feedback shows current like count on the button
- [ ]  Ability to filter by folder and by tag
- [ ]  Ability to filter by images or videos and remember the choice for each selected folder
- [ ]  Ability to filter by likes or dislikes
- [ ]  Ability to view a view history list
    - [ ]  Displays the last 20 viewed items
- [ ]  Custom algorithm for randomly choosing an image or video to play
    - [ ]  Ability to store the randomization as a named playlist
    - [ ]  Support for selecting from a list a playlists
- [ ]  Ability to take action only disliked images and videos in bulk
    - [ ]  A filter to view and select disliked content along with a delete button that will accept an array of file paths and will move them to a temporary directory to be reviewed later
- [ ]  Ability to start where the user had left off
    - [ ]  Remember the last viewed folder and image or video
        - [ ]  Need to serialize details such as folder path, media type, sort order, and/or additional filters to be able to apply them again next the page is visited
        - [ ]  Needs to serialize the current randomization order (store in a lookup table of order to media ID)

## Inputs Supported

- **Mouse & Keyboard**
    - Click to select/open, drag to scroll carousel.
    - Scroll wheel: Vertical scroll in grid, Zoom in/out in single view, Horizontal scroll in Carousel.
    - Arrow keys for navigation (Next/Previous).
- **Touch**
    - Tap to select, swipe to scroll.
    - Pinch-to-zoom in single view.
    - Horizontal swipe for Next/Previous in single view.
- **VR (WebXR)**
    - Support for VR controllers (pointers).
    - Trigger/Grip click and drag for scrolling Carousel.
    - Thumbstick/Touchpad horizontal axis for Carousel scrolling.
    - Next/Previous media buttons on controllers.

## Zoom Logic (Single Media View)

The single media view should automatically scale the image to fit the viewport while maintaining aspect ratio:
- **Portrait Orientation Image**: Scales so the top and bottom edges match the window height.
- **Landscape Orientation Image**: Scales so the left and right edges match the window width.
- **Dynamic Resizing**: The image should re-evaluate these constraints if the window is resized.
- **Manual Zoom**: Users can override the default "Fit" scale using scroll wheel or pinch gestures.

## Randomization

The randomization algorithm should prioritize least-viewed images and videos and ignore disliked images and videos. In addition to the sort orders and filters I want to have available, I want to support a few different randomization algorithms.

Media will be viewed based upon a selected folder path, a file type filter (images or videos), and optional applied tags for filtering. The randomization options should be able to be applied to the current media file filters (randomize just the currently-filtered lists of content).

### Support for Starting from Where the User Left Off

This randomization needs to support being serialized so that it can be remembered where the user had left off. We want to track the concept of a placeholder so that the last-viewed media file can be displayed when the web site next loads or a new session is started.

### Randomization Methods

- Choose any random media file ignoring all disliked
- These will all ignore the disliked files
    - Randomize a list of media that has never been viewed before
    - Prioritize the least-played file(s)
        - Creates a randomized list starting with files with the lowest play count
    - Prioritize the most-liked files
        - The like button will be stored as an integer where each time the like button is clicked for an media file, the integer will be incremented.
    - Prioritize the most-played files

## Sort Order

 It should have an option to sort by:

- Most viewed
- Least viewed (including unviewed)
- Most recently viewed
- Least recently viewed
- Most and least recent by creation date
- Most liked

# Available Filters

- Liked or disliked
    - When filtered by dislikes, provide an option to “delete” (or move) all that are marked as disliked
- Unviewed (image or video with zero views)
- Videos, images, or both
- By tag(s)

# Layout

- [ ]  Ability to hide the navigation to focus on content. The interface will be like an overlay where the footer slides in from the top and a left nav that slides in from the left when the user clicks on the content and slides out if the content is clicked again.
    - [ ]  Click or tap to display the navigation and menus
- [ ]  Navigation for selecting a folder path by name, selecting tags for filtering, and selecting filters such as media type. Also a way to select a playlist name instead of a folder.
    - [ ]  A left navigation bar for selecting which folder’s images and/or videos should be displayed and the sort order, and image and or/video filter
- [ ]  A top menu bar that contains the buttons for liking, disliking, tagging, randomizing, display the previous or next image or video.
- [ ]  **Carousel Component**
    - [ ]  Full-width horizontal strip, typically at the bottom or as a dedicated view mode.
    - [ ]  Supports click-and-drag (mouse) or swipe (touch) to scroll.
    - [ ]  Scroll wheel support for horizontal movement.
    - [ ]  VR controller drag-to-scroll support.
- [ ]  Ability to view a grid of image and/or video preview thumbnails for the selected folder and the ability to click on an image or video to select it and display it full-screen
- [ ]  Ability to go back from viewing a photo or video to viewing the grid of previews for the selected folder

# Dependencies

## Database Schema (SQLite)

The complete database schema with all table definitions, indexes, and constraints is documented in [DATABASE.md](DATABASE.md).

**Summary of Tables:**
- **MediaFiles**: Core table storing all media file metadata
- **Folders**: Configuration for folder paths and preferences  
- **Tags**: Tag definitions and usage tracking
- **MediaTags**: Junction table for many-to-many media-tag relationships
- **ViewHistory**: Tracks viewing history for each media file
- **Playlists**: Named collections of media
- **PlaylistMediaOrder**: Defines media order within playlists
- **RandomizationSessions**: Serializes random viewing sessions
- **Config**: Application-wide configuration key-value pairs

See [DATABASE.md](DATABASE.md) for complete SQL definitions, field descriptions, and performance considerations.

## Folder Configuration JSON

Stored in `config/folders.json` on the server:

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
  ],
  "thumbnailCacheSize": 1000,
  "scanOnStartup": false
}
```

## REST API Endpoints

### Media Endpoints

#### GET /api/media
Get filtered and sorted media list.

**Query Parameters:**
- `folder` (optional): Folder path to filter by
- `type` (optional): 'image', 'video', or 'both' (default: 'both')
- `tags` (optional): Comma-separated tag names
- `sort` (optional): 'view_count_asc', 'view_count_desc', 'last_viewed_asc', 'last_viewed_desc', 'created_date_asc', 'created_date_desc', 'like_count_desc'
- `liked` (optional): 'true' (like_count > 0), 'false' (like_count < 0), or omit for all
- `unviewed` (optional): 'true' to filter only view_count = 0
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "media": [
    {
      "id": 1,
      "filename": "IMG_001.jpg",
      "filePath": "/vacation/IMG_001.jpg",
      "folderPath": "/vacation",
      "mimeType": "image/jpeg",
      "width": 1920,
      "height": 1080,
      "fileSize": 2048576,
      "createdDate": "2025-12-01T10:30:00Z",
      "viewCount": 5,
      "lastViewed": "2025-12-25T14:20:00Z",
      "likeCount": 3,
      "tags": ["vacation", "beach"]
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

#### GET /api/media/:id
Get single media file with full metadata.

**Response:**
```json
{
  "id": 1,
  "filename": "IMG_001.jpg",
  "filePath": "/vacation/IMG_001.jpg",
  "folderPath": "/vacation",
  "mimeType": "image/jpeg",
  "width": 1920,
  "height": 1080,
  "fileSize": 2048576,
  "fileHash": "abc123def456",
  "createdDate": "2025-12-01T10:30:00Z",
  "viewCount": 5,
  "lastViewed": "2025-12-25T14:20:00Z",
  "likeCount": 3,
  "tags": ["vacation", "beach"],
  "thumbnailUrl": "/api/thumbnails/1"
}
```

#### POST /api/media/:id/view
Increment view count and update last_viewed timestamp.

**Response:**
```json
{
  "success": true,
  "viewCount": 6,
  "lastViewed": "2026-01-02T15:30:00Z"
}
```

#### POST /api/media/:id/like
Increment like count by 1.

**Response:**
```json
{
  "success": true,
  "likeCount": 4
}
```

#### POST /api/media/:id/dislike
Set like count to -1.

**Response:**
```json
{
  "success": true,
  "likeCount": -1
}
```

#### GET /api/media/:id/file
Serve the actual media file (image or video).

**Response:** Binary file stream with appropriate Content-Type header

#### GET /api/thumbnails/:id
Serve thumbnail image for media file.

**Query Parameters:**
- `size` (optional): 'small' (200px), 'medium' (400px), 'large' (800px) - default: 'medium'

**Response:** Binary image stream (JPEG)

### Tag Endpoints

#### GET /api/tags
Get all tags with usage counts.

**Query Parameters:**
- `search` (optional): Filter tags by name (fuzzy search)
- `limit` (optional): Max results (default: 100)

**Response:**
```json
{
  "tags": [
    {
      "id": 1,
      "name": "vacation",
      "color": "#3b82f6",
      "usageCount": 45
    },
    {
      "id": 2,
      "name": "beach",
      "color": "#10b981",
      "usageCount": 23
    }
  ]
}
```

#### POST /api/media/:id/tags
Add tag(s) to media file.

**Request Body:**
```json
{
  "tags": ["vacation", "summer"]
}
```

**Response:**
```json
{
  "success": true,
  "tags": ["vacation", "beach", "summer"]
}
```

#### DELETE /api/media/:id/tags/:tagName
Remove tag from media file.

**Response:**
```json
{
  "success": true,
  "tags": ["vacation", "summer"]
}
```

### History Endpoints

#### GET /api/history
Get last 20 viewed media items.

**Response:**
```json
{
  "history": [
    {
      "mediaId": 42,
      "filename": "IMG_042.jpg",
      "thumbnailUrl": "/api/thumbnails/42",
      "viewedAt": "2026-01-02T15:30:00Z"
    }
  ]
}
```

### Randomization Endpoints

#### POST /api/randomize
Create a randomized media session.

**Request Body:**
```json
{
  "folderPath": "/vacation",
  "algorithm": "least_viewed",
  "filters": {
    "type": "image",
    "tags": ["vacation"],
    "excludeDisliked": true,
    "unviewedOnly": false
  }
}
```

**Algorithms:** 'random', 'least_viewed', 'most_liked', 'most_viewed', 'unviewed_only'

**Response:**
```json
{
  "sessionId": "abc-123-def-456",
  "mediaIds": [42, 17, 93, 8, 54],
  "totalCount": 5,
  "currentIndex": 0
}
```

#### GET /api/randomize/:sessionId
Get existing randomization session.

**Response:**
```json
{
  "sessionId": "abc-123-def-456",
  "mediaIds": [42, 17, 93, 8, 54],
  "currentIndex": 2,
  "totalCount": 5
}
```

### Playlist Endpoints

#### GET /api/playlists
Get all playlists.

**Response:**
```json
{
  "playlists": [
    {
      "id": 1,
      "name": "Favorites 2025",
      "description": "Best photos from 2025",
      "mediaCount": 42,
      "lastAccessed": "2026-01-01T12:00:00Z"
    }
  ]
}
```

#### GET /api/playlists/:id
Get playlist with media order.

**Response:**
```json
{
  "id": 1,
  "name": "Favorites 2025",
  "description": "Best photos from 2025",
  "media": [
    {
      "id": 42,
      "filename": "IMG_042.jpg",
      "sortOrder": 0,
      "thumbnailUrl": "/api/thumbnails/42"
    }
  ]
}
```

#### POST /api/playlists
Create or update playlist.

**Request Body:**
```json
{
  "name": "Favorites 2025",
  "description": "Best photos from 2025",
  "mediaIds": [42, 17, 93]
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Favorites 2025",
  "success": true
}
```

#### DELETE /api/playlists/:id
Delete playlist.

**Response:**
```json
{
  "success": true
}
```

### Folder Endpoints

#### GET /api/folders
Get configured folders.

**Response:**
```json
{
  "folders": [
    {
      "id": 1,
      "name": "Vacation Photos",
      "path": "/vacation",
      "mediaCount": 150,
      "lastSelected": "2026-01-01T10:00:00Z",
      "defaultSort": "created_date_desc",
      "defaultFilterType": "both"
    }
  ]
}
```

#### POST /api/scan
Trigger manual folder scan.

**Request Body:**
```json
{
  "folderPath": "/vacation"
}
```

**Response:**
```json
{
  "success": true,
  "scanned": 25,
  "added": 5,
  "updated": 2,
  "removed": 1
}
```

### Bulk Operations

#### POST /api/media/bulk/delete-disliked
Move all disliked media files to temporary directory.

**Request Body:**
```json
{
  "folderPath": "/vacation"
}
```

**Response:**
```json
{
  "success": true,
  "movedCount": 12,
  "tempDirectory": "/temp/trash/2026-01-02"
}
```

### Error Response Format

All endpoints return errors in this format:

```json
{
  "error": true,
  "message": "Media file not found",
  "code": "MEDIA_NOT_FOUND",
  "status": 404
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (invalid parameters)
- 404: Not Found
- 500: Internal Server Error

## localStorage Schema

Used for temporary persistence during Phase 1-3 (before backend integration):

```typescript
interface LocalStorageSchema {
  // Current session state
  currentSession: {
    folderId: number | null;
    folderPath: string | null;
    playlistId: number | null;
    currentMediaId: number | null;
    currentIndex: number;
    viewMode: 'grid' | 'single' | 'carousel';
    filters: {
      type: 'image' | 'video' | 'both';
      tags: string[];
      liked: boolean | null;  // true=liked, false=disliked, null=all
      unviewed: boolean;
    };
    sort: string;
    randomizationSessionId: string | null;
  };
  
  // UI preferences
  uiPreferences: {
    overlayVisible: boolean;
    gridDensity: 'compact' | 'comfortable' | 'spacious';
    autoHideTimeout: number;  // milliseconds, 0=never
    theme: 'dark' | 'light';
  };
  
  // Mock data for development (Phase 1-3)
  mockMediaFiles: MediaFile[];
  mockTags: Tag[];
  mockViewHistory: ViewHistoryEntry[];
  mockPlaylists: Playlist[];
}
```

**Storage Keys:**
- `mediamanager:session` - Current session state
- `mediamanager:ui` - UI preferences
- `mediamanager:mock:media` - Mock media data
- `mediamanager:mock:tags` - Mock tag data
- `mediamanager:mock:history` - Mock view history
- `mediamanager:mock:playlists` - Mock playlists

# Video Player Requirements

*Note: Video support is planned for Phase 6. This section serves as a placeholder for future planning.*

## Supported Formats
- **Primary**: MP4 (H.264 video, AAC audio)
- **Secondary**: WebM (VP9 video, Opus audio)
- **Optional**: MOV (if browser supports)

## Player Features (To Be Specified)
- [ ] Fit-to-viewport aspect ratio (same logic as images)
- [ ] Play/Pause controls
- [ ] Seek bar with preview thumbnails (optional)
- [ ] Volume control
- [ ] Playback speed control
- [ ] Fullscreen support
- [ ] Autoplay preference (off by default)
- [ ] Loop option
- [ ] Keyboard shortcuts (Space=play/pause, Arrow keys=seek)

## Thumbnail Generation Strategy (To Be Planned)
- [ ] Decide: Server-side (ffmpeg) vs client-side (video-seek)
- [ ] Thumbnail extraction timing (e.g., frame at 10% duration)
- [ ] Thumbnail cache location (filesystem vs database blob)
- [ ] Cache size limits and eviction policy
- [ ] Lazy generation vs pre-generation during scan

## Technical Considerations
- [ ] Video codec detection and format validation
- [ ] Streaming vs progressive download
- [ ] Buffer management for large files
- [ ] Mobile device playback compatibility
- [ ] Hardware acceleration support

# Future Considerations

Features and improvements to consider for post-MVP releases:

## Performance Optimizations
- **Virtual Scrolling**: For grid view with 1000+ media files
  - Render only visible items plus buffer
  - Dynamically load/unload thumbnails based on viewport
  - Consider libraries like `react-window` or custom implementation
- **Database Query Optimization**:
  - Profile slow queries with EXPLAIN ANALYZE
  - Consider materialized views for complex randomization
  - Add database query caching layer
  - Pre-compute frequently accessed aggregations
- **Thumbnail Caching Strategy**:
  - Implement LRU cache with configurable size limit
  - Progressive JPEG for faster perceived loading
  - Consider WebP format for better compression
  - Lazy loading with intersection observer
  - Preload next/previous thumbnails in sequence
- **Pagination Strategy**:
  - Limit initial grid load to 100-200 items
  - Implement infinite scroll or "Load More" button
  - Consider cursor-based pagination for large datasets

## VR/WebXR Support (Low Priority)
- **Current Status**: Phase 5 task, deferred to post-MVP
- **Approach**: Rely on virtual browser VR environments
  - Standard click-and-drag should work in virtual browsers
  - May inherit standard web controller interactions
  - Test with Meta Quest Browser, Firefox Reality, etc.
- **If Custom VR Implementation Needed**:
  - WebXR Device API for controller input
  - 3D spatial UI layout considerations
  - Hand tracking for gesture controls
  - Performance optimization for 90fps rendering

## Advanced Features
- **Smart Collections**: Auto-generated collections
  - "Unreviewed" (view_count = 0)
  - "Favorites" (like_count >= threshold)
  - "Recently Added" (created_at within last N days)
  - "Needs Attention" (untagged, unviewed, etc.)
- **Batch Operations UI**:
  - Multi-select in grid view with checkboxes
  - Bulk tagging, liking, deletion
  - Select all/none/inverse
  - Keyboard shortcuts (Shift+Click for range select)
- **Search Functionality**:
  - Full-text search by filename
  - Tag search with boolean operators (AND/OR/NOT)
  - Search by date range
  - Search by media properties (resolution, file size, etc.)
- **Notes and Annotations**:
  - Free-text notes field per media file
  - Markdown support for formatting
  - Search within notes
- **Rating System**:
  - 5-star rating as alternative/supplement to like/dislike
  - Filter and sort by rating
- **Slideshow Mode**:
  - Auto-advance with configurable delay (3s, 5s, 10s)
  - Shuffle option
  - Ken Burns effect (pan and zoom) for images
- **EXIF Data Display**:
  - Camera make/model, lens, settings (f-stop, shutter, ISO)
  - GPS location with map preview
  - Date taken vs file date
  - Copyright and author info
- **Comparison Mode**:
  - Side-by-side view of 2 images
  - Useful for choosing between similar photos
  - Quick keyboard shortcuts to pick left/right
- **Smart Randomization**:
  - Machine learning from user behavior
  - Deprioritize frequently skipped tags
  - Boost tags that correlate with likes
  - Time-of-day preferences

## Multi-Device and Sync
- **PWA Support**:
  - Install as standalone app
  - Offline capability with service workers
  - Background sync for view history
- **Backup and Export**:
  - Export SQLite database for backup
  - Import/export playlists as JSON
  - Backup configuration files
- **Cloud Sync** (Optional):
  - Sync view history, likes, tags across devices
  - Requires cloud backend (Firebase, Supabase, etc.)
  - Conflict resolution strategy

## Media Management
- **Duplicate Detection**:
  - Perceptual hashing (pHash, dHash)
  - Flag visually similar images
  - Group duplicates with "Keep Best" option
- **Metadata Extraction**:
  - Auto-tag based on EXIF location (city, country)
  - Auto-tag based on date (year, season, month)
  - Extract and index IPTC keywords
- **File Organization**:
  - Rename files based on patterns
  - Move files between folders
  - Auto-organize by date/tag structure

## Accessibility Improvements
- **Screen Reader Support**: Comprehensive ARIA implementation
- **Keyboard Navigation**: Full app navigable without mouse
- **Voice Control**: Integration with Web Speech API
- **High Contrast Mode**: Alternative color schemes
- **Text Scaling**: Support for browser zoom and text size preferences

## Technical Infrastructure
- **Database Migrations**: Versioned schema updates with rollback
- **Error Tracking**: Integration with Sentry or similar
- **Analytics**: Privacy-friendly usage analytics
- **Automated Testing**: Comprehensive unit, integration, E2E tests
- **CI/CD Pipeline**: Automated builds and deployments
- **Docker Support**: Containerized deployment option