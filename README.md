# MediaManager

A web-based multimedia viewer and organizer application designed for quickly browsing, tagging, and categorizing large collections of photos and videos with powerful randomization algorithms and intelligent filtering.

## Objective

MediaManager provides an immersive, content-first interface for reviewing media with a focus on:

- **Quick Navigation**: Swiftly browse through media collections with minimal UI overhead
- **Intelligent Organization**: Tag, filter, and sort media by multiple criteria
- **Smart Randomization**: Multiple algorithms to discover media based on viewing history and preferences
- **Session Persistence**: Resume exactly where you left off—folder, media, filters, and randomization order are remembered
- **Like/Dislike System**: Simple but powerful rating system to track preferences and inform randomization
- **Keyboard-Centric**: Fully navigable with keyboard shortcuts for power users

## Key Features

### Media Viewing & Navigation
- **Grid View**: Responsive thumbnail grid (auto-fit layout) with hover effects
- **Single Media View**: 
  - Automatic fit-to-viewport aspect ratio (no distortion)
  - Manual zoom with mouse scroll or touch pinch
  - Pan support when zoomed in
  - Next/Previous navigation (Arrow keys or UI buttons)
- **Carousel**: Horizontal filmstrip of thumbnails at the bottom for quick scanning
- **Overlay UI**: Slide-in navigation bars that hide during focused viewing (toggle with Space key)

### Organization & Filtering
- **Folder Configuration**: Select from multiple monitored folders containing images and/or videos
- **Tag System**: Add multiple tags to media with autocomplete support
  - Tags are searchable and filterable
  - View usage count for each tag
- **Smart Filters**:
  - By media type (Images, Videos, or Both)
  - By like status (Liked, Disliked, or Undecided)
  - By viewed status (Unviewed only)
  - By one or more tags (AND logic)
  - Combine multiple filters simultaneously

### Ratings & Tracking
- **Like Button**: Increments a counter (1, 2, 3...) each click to track preference intensity
- **Dislike Button**: Sets the rating to -1 (disliked), overriding any previous likes
- **Neutral State**: A count of 0 means the media hasn't been decided yet
- **View Count**: Tracks total number of times each media has been viewed
- **View History**: Last 20 viewed items with timestamps for quick return

### Randomization & Playlists
- **Multiple Randomization Algorithms**:
  - **Random**: Pure randomness (respects filters)
  - **Least Viewed**: Prioritizes unwatched or rarely viewed media
  - **Most Liked**: Prioritizes highly-rated content
  - **Most Viewed**: Shows popular media
  - **Unviewed Only**: Shows only media with zero views
- **Smart Exclusion**: All algorithms automatically skip disliked media
- **Session Serialization**: Random viewing sessions can be saved and resumed
- **Playlist Management**: Save randomization sequences as named playlists for reuse

### Sorting Options
- Most/Least viewed
- Most/Least recently viewed
- Most/Least recent by creation date
- Most liked

### Bulk Operations
- **Move Disliked**: Filter to show only disliked media with option to bulk move to trash for review

## How to Use


#### 5. Backend (Phase 4+)
See the documentation for Bun backend setup and integration.
  - View usage count for each tag
- **Smart Filters**:
  - By media type (Images, Videos, or Both)
  - By like status (Liked, Disliked, or Undecided)
  - By viewed status (Unviewed only)
  - By one or more tags (AND logic)
  - Combine multiple filters simultaneously

### Basic Workflow
1. **Select Folder**: Choose a folder from the left sidebar
2. **Apply Filters** (optional): Select media type, tags, or view status
3. **Choose Sort Order** (optional): Select how to order the media
4. **Browse**: Click media in grid to view full-screen, or use randomization
5. **Mark & Rate**: Use L key (Like), D key (Dislike), or T key (Tag) while viewing
6. **Resume Later**: Your session state is automatically saved

### Keyboard Shortcuts
- **Arrow Left/Right**: Previous/Next media
- **Space**: Toggle UI overlay visibility
- **L**: Like current media
- **D**: Dislike current media
- **T**: Add tag to current media
- **G**: Return to grid view
- **Escape**: Close dialogs
- **Plus/Minus**: Zoom in/out
- **0**: Reset zoom to fit

### Touch & VR Controls
- **Pinch-to-Zoom**: Standard touch zoom in single view
- **Swipe**: Horizontal swipe for Next/Previous
- **Drag Carousel**: Click-and-drag on carousel to scroll
- **VR Controllers**: Point-and-click drag support for carousel (standard web interactions)

## Tech Stack

### Vite Vanilla TypeScript Template
- This project uses the official [Vite vanilla-ts template](https://vitejs.dev/guide/#scaffolding-your-first-vite-project) for a modern, fast, and minimal TypeScript setup.
- All scripts (`dev`, `build`, `preview`) are run via Bun for maximum speed and compatibility.

### Frontend

### Backend (Phase 4+)
- **Runtime**: Bun.js (TypeScript-first JavaScript runtime)
- **Database**: SQLite (serverless, file-based)
- **API**: REST with JSON
- **File Access**: Server-side filesystem scanning for media discovery

### Development Approach
- **Phase 1-3**: Frontend-only with mock data and localStorage
- **Phase 4+**: Full-stack with Bun.js backend integration
- **Images First**: Video support added in later phases

## Project Structure

```
MediaManager/
├── documentation/
│   └── planning/
│       ├── SPECIFICATION.md      # Complete feature specification
│       ├── DATABASE.md            # Database schema documentation
│       ├── DESIGN.md              # UI/UX design specs
│       ├── CODING-STANDARDS.md    # Development guidelines
│       └── TASKS.md               # Phased implementation tasks
├── src/
│   ├── main.ts                   # App entry point
│   ├── main.css                  # Global styles & theme
│   ├── components/               # UI components
│   │   ├── UIOverlay.ts
│   │   ├── ThumbnailGrid.ts
│   │   ├── SingleMediaView.ts
│   │   ├── Carousel.ts
│   │   ├── LeftSidebar.ts
│   │   ├── TagDialog.ts
│   │   ├── ViewHistory.ts
│   │   └── ...
│   ├── lib/                      # Utilities & services
│   │   ├── mockData.ts          # Development mock data
│   │   ├── storage.ts           # localStorage helpers
│   │   ├── api.ts               # API client (Phase 4+)
│   │   ├── filtering.ts         # Filter logic
│   │   ├── sorting.ts           # Sort logic
│   │   └── ...
│   └── types/                    # TypeScript interfaces
│       └── index.ts
├── server/                       # Backend (Phase 4+)
│   ├── index.ts                 # Bun.js server
│   ├── services/
│   │   ├── database.ts
│   │   ├── scanner.ts           # Media discovery
│   │   ├── thumbnails.ts        # Thumbnail generation
│   │   └── randomizer.ts
│   └── routes/
│       ├── media.ts
│       ├── tags.ts
│       ├── folders.ts
│       ├── playlists.ts
│       └── ...
├── index.html
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

## Development Phases

### Phase 1: UI Foundations & Core Viewer
Build core frontend components with mock data:
- CSS theme with glassmorphism
- UI shell with overlay system
- Thumbnail grid, single view, carousel components
- Keyboard navigation

### Phase 2: Interactivity & Mock Persistence
Add user interactions and localStorage persistence:
- Like/Dislike/Tag buttons
- Mock data generator
- localStorage handlers
- Tag autocomplete dialog

### Phase 3: Selection & Filtering
Implement sidebar and filtering:
- Folder selection
- Tag filtering
- Sort options
- View history display

### Phase 4: Backend Integration (Bun.js)
Build REST API and integrate with frontend:
- SQLite database setup
- Media discovery (folder scanning)
- Thumbnail generation
- API endpoints for all operations

### Phase 5: Randomization & Playlists
Implement intelligent algorithms:
- Multiple randomization algorithms
- Session serialization
- Playlist management
- "Resume where left off" functionality

### Phase 6: Video Support
Add video player and video-specific features:
- Video format detection
- Video thumbnail generation
- HTML5 video player
- Duration display and controls

### Phase 7-8: Polish & Testing
Final refinements, accessibility, and testing:
- Performance optimization
- Accessibility audit (WCAG 2.1 AA)
- Comprehensive test suite
- Documentation

## Database Schema

The application uses SQLite with 9 tables:

| Table | Purpose |
|-------|---------|
| **MediaFiles** | Core media file metadata (path, size, dimensions, like count, view count) |
| **Folders** | Monitored folder configurations and preferences |
| **Tags** | Tag definitions and usage counts |
| **MediaTags** | Many-to-many relationship between media and tags |
| **ViewHistory** | Individual view events for each media file |
| **Playlists** | Named collections of media |
| **PlaylistMediaOrder** | Media ordering within playlists |
| **RandomizationSessions** | Serialized randomization state for resuming sessions |
| **Config** | Application-wide configuration key-value pairs |

See [DATABASE.md](documentation/planning/DATABASE.md) for complete schema definitions.

## API Endpoints (Phase 4+)

### Media Operations
- `GET /api/media` - List with filters and sorting
- `GET /api/media/:id` - Single media details
- `POST /api/media/:id/view` - Increment view count
- `POST /api/media/:id/like` - Like media
- `POST /api/media/:id/dislike` - Dislike media
- `GET /api/media/:id/file` - Serve media file
- `GET /api/thumbnails/:id` - Serve thumbnail

### Tag Operations
- `GET /api/tags` - All tags with counts
- `POST /api/media/:id/tags` - Add tags
- `DELETE /api/media/:id/tags/:tagName` - Remove tag

### Playlists
- `GET /api/playlists` - List playlists
- `GET /api/playlists/:id` - Single playlist
- `POST /api/playlists` - Create playlist
- `DELETE /api/playlists/:id` - Delete playlist

### Randomization
- `POST /api/randomize` - Create random session
- `GET /api/randomize/:sessionId` - Resume session

### Other
- `GET /api/folders` - Configured folders
- `GET /api/history` - Last 20 viewed items
- `POST /api/scan` - Manual folder scan
- `POST /api/media/bulk/delete-disliked` - Move disliked to trash

See [SPECIFICATION.md](documentation/planning/SPECIFICATION.md) for complete API documentation.

## UI/UX Design

### Design Philosophy
- **Content-First**: Maximize media display area; UI hides during viewing
- **Immersive**: Medium-dark theme with glassmorphism effects
- **Smooth**: Subtle animations and transitions throughout
- **Accessible**: Full keyboard navigation, screen reader support

### Color Palette
- **Primary Background**: HSL(220, 15%, 10%) - Near black
- **Overlay Background**: HSLA(220, 15%, 15%, 0.8) with backdrop blur
- **Accent**: HSL(210, 100%, 60%) - Electric blue

### Layout
- **Full-Screen Media**: Images/videos scale to fit viewport without distortion
- **Top Action Bar**: Like, dislike, tag, randomize, previous/next buttons
- **Left Navigation**: Folder selection, tag filtering, sort options
- **Bottom Carousel**: Horizontal filmstrip of next media

## Configuration

### Folder Configuration
Edit `config/folders.json` on the server to add media folders:

```json
{
  "folders": [
    {
      "name": "Vacation Photos",
      "path": "/absolute/path/to/vacation/photos",
      "enabled": true
    }
  ],
  "thumbnailCacheSize": 1000,
  "scanOnStartup": false
}
```

## Planned Features (Post-MVP)

### Performance
- Virtual scrolling for 1000+ item grids
- Database query optimization
- Lazy thumbnail loading
- Pagination for large folders

### Advanced Organization
- Smart collections (Unreviewed, Favorites, Recently Added)
- Batch operations UI
- Full-text search by filename or tag
- Notes and annotations
- 5-star rating system

### Enhancements
- Slideshow mode with Ken Burns effect
- EXIF data display
- Side-by-side comparison mode
- Duplicate detection (perceptual hashing)
- Auto-tagging based on EXIF location/date

### Infrastructure
- PWA support (install as app, offline capability)
- Backup and export functionality
- Cloud sync (optional)
- Database migrations system
- Comprehensive testing suite
- Docker support

See [SPECIFICATION.md](documentation/planning/SPECIFICATION.md#future-considerations) for complete list.

# Getting Started

## Prerequisites
- Node.js 16+ or Bun
- Git (for cloning)

## Installation (Phase 1-3, Frontend Only)
```bash

### Quick Start (Vite + Bun)

#### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- Node.js 16+ (for some Vite plugins, optional)
- Git

#### 1. Install dependencies
```bash
bun install
```

### 2. Start the development server
```bash
bun run dev
```
This runs Vite's dev server at http://localhost:5173 (default).

### 3. Build for production
```bash
bun run build
```
The output will be in the `dist/` directory.

### 4. Preview the production build
```bash
bun run preview
```
This serves the built app locally for testing.

## With Backend (Phase 4+)
```bash
# Install Bun (https://bun.sh)
curl -fsSL https://bun.sh/install | bash

# Install backend dependencies
cd server
bun install

# Run the server
bun run dev
```

# Documentation

- [SPECIFICATION.md](documentation/planning/SPECIFICATION.md) - Complete feature specification and API docs
- [DATABASE.md](documentation/planning/DATABASE.md) - Database schema and design
- [DESIGN.md](documentation/planning/DESIGN.md) - UI/UX design specifications
- [CODING-STANDARDS.md](documentation/planning/CODING-STANDARDS.md) - Development guidelines
- [TASKS.md](documentation/planning/TASKS.md) - Detailed implementation roadmap
