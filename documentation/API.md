# MediaManager API Documentation

## Overview

The MediaManager API is a REST API built with Hono that provides endpoints for managing media files, tags, playlists, and view history. The API runs on port 17102 and uses SQLite as the database.

## Base URL

```
http://localhost:17102
```

## Response Format

All API responses follow this standard format:

```json
{
  "status": 200,
  "data": { ... }
}
```

- `status`: HTTP status code
- `data`: Response payload (varies by endpoint)

Error responses:

```json
{
  "status": 404,
  "data": {
    "error": "Error message here"
  }
}
```

## Authentication

Currently, the API does not require authentication (permissive CORS for local development).

## Endpoints

### Health Check

#### GET /health

Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T05:59:53.270Z"
}
```

---

### Media Files

#### GET /api/media

List media files with filtering and sorting.

**Query Parameters:**
- `folder` (optional): Filter by folder path
- `type` (optional): Filter by type (`image`, `video`, `both`)
- `tags` (optional): Comma-separated tag names (OR logic)
- `sort` (optional): Sort order (default: `created_date_desc`)
  - `created_date_asc`, `created_date_desc`
  - `view_count_asc`, `view_count_desc`
  - `last_viewed_asc`, `last_viewed_desc`
  - `like_count_desc`
  - `file_name_asc`
- `limit` (optional): Number of results (1-100, default: 30)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl "http://localhost:17102/api/media?sort=like_count_desc&limit=10"
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "folder_path": "/test/photos",
      "file_name": "test1.jpg",
      "file_path": "/test/photos/test1.jpg",
      "file_size": 1024000,
      "mime_type": "image/jpeg",
      "width": 1920,
      "height": 1080,
      "created_date": null,
      "view_count": 1,
      "last_viewed": "2026-01-26 05:59:58",
      "like_count": 1,
      "is_deleted": 0,
      "created_at": "2026-01-26 05:59:06",
      "updated_at": "2026-01-26 05:59:58"
    }
  ]
}
```

**Note:** Only non-deleted media files (`is_deleted = 0`) are returned.

---

#### GET /api/media/:id

Get a single media file by ID.

**Example:**
```bash
curl http://localhost:17102/api/media/1
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "id": 1,
    "folder_path": "/test/photos",
    "file_name": "test1.jpg",
    ...
  }
}
```

---

#### POST /api/media/:id/view

Increment view count for a media file.

**Example:**
```bash
curl -X POST http://localhost:17102/api/media/1/view
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true,
    "view_count": 2
  }
}
```

**Side Effects:**
- Increments `view_count`
- Updates `last_viewed` timestamp
- Creates a `ViewHistory` entry

---

#### POST /api/media/:id/like

Increment like count for a media file.

**Example:**
```bash
curl -X POST http://localhost:17102/api/media/1/like
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true,
    "like_count": 2
  }
}
```

**Note:** Like count always increments (0→1→2→3...).

---

#### POST /api/media/:id/dislike

Set like count to -1 for a media file.

**Example:**
```bash
curl -X POST http://localhost:17102/api/media/1/dislike
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true,
    "like_count": -1
  }
}
```

**Note:** Dislike always sets `like_count` to -1, regardless of current value.

---

### Tags

#### GET /api/tags

List all tags.

**Example:**
```bash
curl http://localhost:17102/api/tags
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "test",
      "created_at": "2026-01-26 05:59:06"
    }
  ]
}
```

---

#### POST /api/tags

Create a new tag.

**Request Body:**
```json
{
  "name": "vacation"
}
```

**Example:**
```bash
curl -X POST http://localhost:17102/api/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "vacation"}'
```

**Response:**
```json
{
  "status": 201,
  "data": {
    "id": 3,
    "name": "vacation",
    "created_at": "2026-01-26 06:00:00"
  }
}
```

---

#### POST /api/tags/media/:id

Add a tag to a media file.

**Request Body:**
```json
{
  "tagName": "vacation"
}
```

**Example:**
```bash
curl -X POST http://localhost:17102/api/tags/media/1 \
  -H "Content-Type: application/json" \
  -d '{"tagName": "vacation"}'
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true,
    "tag": {
      "id": 3,
      "name": "vacation",
      "created_at": "2026-01-26 06:00:00"
    }
  }
}
```

**Note:** Tag must exist before adding to media. Returns 404 if tag doesn't exist.

---

#### GET /api/tags/media/:id

Get all tags for a media file.

**Example:**
```bash
curl http://localhost:17102/api/tags/media/1
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "test",
      "created_at": "2026-01-26 05:59:06"
    }
  ]
}
```

---

#### DELETE /api/tags/media/:id/:tagId

Remove a tag from a media file.

**Example:**
```bash
curl -X DELETE http://localhost:17102/api/tags/media/1/1
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true
  }
}
```

---

### Folders

#### GET /api/folders

List all configured folders.

**Example:**
```bash
curl http://localhost:17102/api/folders
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Test Photos",
      "path": "/test/photos",
      "last_selected": null,
      "default_sort": "created_date_desc",
      "default_filter_type": "both",
      "is_active": 1,
      "created_at": "2026-01-26 05:59:06"
    }
  ]
}
```

---

### View History

#### GET /api/history

Get the last 20 viewed items.

**Example:**
```bash
curl http://localhost:17102/api/history
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "media_id": 1,
      "viewed_at": "2026-01-26 05:59:58",
      "file_name": "test1.jpg",
      "file_path": "/test/photos/test1.jpg"
    }
  ]
}
```

---

### Playlists

#### GET /api/playlists

List all playlists.

**Example:**
```bash
curl http://localhost:17102/api/playlists
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "Test Playlist",
      "description": "A test playlist for development",
      "last_accessed": null,
      "created_at": "2026-01-26 05:59:06"
    }
  ]
}
```

---

#### GET /api/playlists/:id

Get a playlist with its media items.

**Example:**
```bash
curl http://localhost:17102/api/playlists/1
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "playlist": {
      "id": 1,
      "name": "Test Playlist",
      "description": "A test playlist for development",
      "last_accessed": null,
      "created_at": "2026-01-26 05:59:06"
    },
    "media": [
      {
        "id": 1,
        "folder_path": "/test/photos",
        "file_name": "test1.jpg",
        ...
        "sort_order": 0
      }
    ]
  }
}
```

---

#### POST /api/playlists

Create a new playlist.

**Request Body:**
```json
{
  "name": "My Favorites",
  "description": "My favorite photos"
}
```

**Example:**
```bash
curl -X POST http://localhost:17102/api/playlists \
  -H "Content-Type: application/json" \
  -d '{"name": "My Favorites", "description": "My favorite photos"}'
```

**Response:**
```json
{
  "status": 201,
  "data": {
    "id": 2,
    "name": "My Favorites",
    "description": "My favorite photos",
    "last_accessed": null,
    "created_at": "2026-01-26 06:00:00"
  }
}
```

---

#### PUT /api/playlists/:id

Update a playlist's name or description.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Example:**
```bash
curl -X PUT http://localhost:17102/api/playlists/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "id": 1,
    "name": "Updated Name",
    ...
  }
}
```

---

#### DELETE /api/playlists/:id

Delete a playlist.

**Example:**
```bash
curl -X DELETE http://localhost:17102/api/playlists/1
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true
  }
}
```

---

#### POST /api/playlists/:id/media/:mediaId

Add a media file to a playlist.

**Example:**
```bash
curl -X POST http://localhost:17102/api/playlists/1/media/1
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true,
    "sort_order": 0
  }
}
```

---

#### DELETE /api/playlists/:id/media/:mediaId

Remove a media file from a playlist.

**Example:**
```bash
curl -X DELETE http://localhost:17102/api/playlists/1/media/1
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true
  }
}
```

---

#### PUT /api/playlists/:id/reorder

Reorder media in a playlist.

**Request Body:**
```json
{
  "mediaIds": [3, 1, 2]
}
```

**Example:**
```bash
curl -X PUT http://localhost:17102/api/playlists/1/reorder \
  -H "Content-Type: application/json" \
  -d '{"mediaIds": [3, 1, 2]}'
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "success": true
  }
}
```

**Note:** This accepts a full reorder payload - all media IDs in the desired order.

---

## Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (invalid parameters) |
| 404  | Not Found |
| 409  | Conflict (duplicate entry) |
| 500  | Internal Server Error |

## Soft Delete

Media files are soft-deleted using the `is_deleted` flag. All endpoints automatically filter out deleted media (`is_deleted = 0`). To implement permanent deletion, you'll need to add a separate endpoint that physically removes the file and database record.

## Running the Server

```bash
# Start the server
npm run server

# Setup database (if not done already)
npm run db:setup
```

The server will start on http://localhost:17102.

## Development

The API uses:
- **Hono**: Fast web framework
- **Zod**: Runtime type validation
- **better-sqlite3**: SQLite database driver
- **TypeScript**: Type safety

All endpoints include:
- Request validation using Zod schemas
- Trace logging for debugging
- Standard response format
- Proper error handling
