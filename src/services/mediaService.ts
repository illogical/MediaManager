/**
 * Media Service - Handles media and tag operations
 */

import { sqlService } from "./sqlService";
import { logService } from "./logService";
import type {
  MediaFile,
  MediaFileWithTags,
  MediaListQuery,
  Tag,
  ApiResponse,
} from "../api/schemas";

export class MediaService {
  /**
   * Get media files with optional filtering and sorting, including tags for each media file
   */
  getMediaFiles(query: MediaListQuery): ApiResponse<MediaFileWithTags[]> {
    logService.trace("MediaService.getMediaFiles() called");
    logService.info(`Query params: ${JSON.stringify(query)}`);

    const { folder, type, tags, sort, limit, offset } = query;

    try {
      let sql = `
        SELECT DISTINCT m.* 
        FROM MediaFiles m
        WHERE m.is_deleted = 0
      `;

      const params: unknown[] = [];

      // Filter by folder
      if (folder) {
        sql += " AND m.folder_path = ?";
        params.push(folder);
        logService.trace(`Filtering by folder: ${folder}`);
      }

      // Filter by type (mime_type)
      if (type && type !== "both") {
        if (type === "image") {
          sql += " AND m.mime_type LIKE 'image/%'";
          logService.trace("Filtering by type: image");
        } else if (type === "video") {
          sql += " AND m.mime_type LIKE 'video/%'";
          logService.trace("Filtering by type: video");
        }
      }

      // Filter by tags (OR logic)
      if (tags) {
        const tagNames = tags.split(",").map((t) => t.trim());
        sql += `
          AND m.id IN (
            SELECT mt.media_id 
            FROM MediaTags mt
            JOIN Tags t ON mt.tag_id = t.id
            WHERE t.name IN (${tagNames.map(() => "?").join(",")})
          )
        `;
        params.push(...tagNames);
        logService.trace(`Filtering by tags: ${tagNames.join(", ")}`);
      }

      // Apply sorting
      const sortMap: Record<string, string> = {
        created_date_asc: "m.created_date ASC",
        created_date_desc: "m.created_date DESC",
        view_count_asc: "m.view_count ASC",
        view_count_desc: "m.view_count DESC",
        last_viewed_asc: "m.last_viewed ASC",
        last_viewed_desc: "m.last_viewed DESC",
        like_count_desc: "m.like_count DESC",
        file_name_asc: "m.file_name ASC",
      };

      sql += ` ORDER BY ${sortMap[sort] || sortMap.created_date_desc}`;
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);

      logService.trace(`Sort: ${sort}, Limit: ${limit}, Offset: ${offset}`);

      const mediaFiles = sqlService.queryAll<MediaFile>(sql, params);

      // Fetch tags for each media file
      const mediaFilesWithTags: MediaFileWithTags[] = mediaFiles.map((media) => {
        const mediaTags = this.getTagsForMedia(media.id);
        return {
          ...media,
          tags: mediaTags,
        };
      });

      logService.info(`Retrieved ${mediaFilesWithTags.length} media files with tags`);

      return {
        status: 200,
        message: `Successfully retrieved ${mediaFilesWithTags.length} media files`,
        data: mediaFilesWithTags,
      };
    } catch (error) {
      logService.error("Failed to fetch media files", error as Error);
      return {
        status: 500,
        message: "Failed to fetch media files",
        data: [],
      };
    }
  }

  /**
   * Get a single media file by ID, including tags
   */
  getMediaFileById(id: number): ApiResponse<MediaFileWithTags | null> {
    logService.trace(`MediaService.getMediaFileById(${id}) called`);

    try {
      const media = sqlService.queryOne<MediaFile>(
        "SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0",
        [id]
      );

      if (!media) {
        logService.warn(`Media file not found: ${id}`);
        return {
          status: 404,
          message: "Media file not found",
          data: null,
        };
      }

      // Fetch tags for the media file
      const tags = this.getTagsForMedia(media.id);

      const mediaWithTags: MediaFileWithTags = {
        ...media,
        tags,
      };

      logService.info(`Retrieved media file: ${media.file_name} with ${tags.length} tags`);

      return {
        status: 200,
        message: "Successfully retrieved media file",
        data: mediaWithTags,
      };
    } catch (error) {
      logService.error("Failed to fetch media file", error as Error);
      return {
        status: 500,
        message: "Failed to fetch media file",
        data: null,
      };
    }
  }

  /**
   * Get all tags for a specific media file
   */
  getTagsForMedia(mediaId: number): Tag[] {
    logService.trace(`MediaService.getTagsForMedia(${mediaId}) called`);

    try {
      const tags = sqlService.queryAll<Tag>(
        `
        SELECT t.* 
        FROM Tags t
        JOIN MediaTags mt ON t.id = mt.tag_id
        WHERE mt.media_id = ?
        ORDER BY t.name ASC
      `,
        [mediaId]
      );

      logService.trace(`Retrieved ${tags.length} tags for media ID ${mediaId}`);
      return tags;
    } catch (error) {
      logService.error(`Failed to fetch tags for media ${mediaId}`, error as Error);
      return [];
    }
  }

  /**
   * Increment view count for a media file and record in view history
   */
  incrementViewCount(id: number): ApiResponse<{ view_count: number }> {
    logService.trace(`MediaService.incrementViewCount(${id}) called`);

    try {
      // Check if media exists
      const media = sqlService.queryOne<MediaFile>(
        "SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0",
        [id]
      );

      if (!media) {
        logService.warn(`Media file not found for view count increment: ${id}`);
        return {
          status: 404,
          message: "Media file not found",
          data: { view_count: 0 },
        };
      }

      // Increment view count and update last_viewed
      sqlService.execute(
        `
        UPDATE MediaFiles 
        SET view_count = view_count + 1, 
            last_viewed = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [id]
      );

      // Insert into ViewHistory
      sqlService.execute("INSERT INTO ViewHistory (media_id) VALUES (?)", [id]);

      const newViewCount = media.view_count + 1;
      logService.info(`Incremented view count for media: ${media.file_name} to ${newViewCount}`);

      return {
        status: 200,
        message: "View count incremented successfully",
        data: { view_count: newViewCount },
      };
    } catch (error) {
      logService.error("Failed to increment view count", error as Error);
      return {
        status: 500,
        message: "Failed to increment view count",
        data: { view_count: 0 },
      };
    }
  }

  /**
   * Increment like count for a media file
   */
  incrementLikeCount(id: number): ApiResponse<{ like_count: number }> {
    logService.trace(`MediaService.incrementLikeCount(${id}) called`);

    try {
      // Check if media exists
      const media = sqlService.queryOne<MediaFile>(
        "SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0",
        [id]
      );

      if (!media) {
        logService.warn(`Media file not found for like count increment: ${id}`);
        return {
          status: 404,
          message: "Media file not found",
          data: { like_count: 0 },
        };
      }

      // Always increment like_count
      const newLikeCount = media.like_count + 1;
      sqlService.execute(
        `
        UPDATE MediaFiles 
        SET like_count = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [newLikeCount, id]
      );

      logService.info(`Incremented like count for media: ${media.file_name} to ${newLikeCount}`);

      return {
        status: 200,
        message: "Like count incremented successfully",
        data: { like_count: newLikeCount },
      };
    } catch (error) {
      logService.error("Failed to increment like count", error as Error);
      return {
        status: 500,
        message: "Failed to increment like count",
        data: { like_count: 0 },
      };
    }
  }

  /**
   * Set like count to -1 (dislike) for a media file
   */
  setDislike(id: number): ApiResponse<{ like_count: number }> {
    logService.trace(`MediaService.setDislike(${id}) called`);

    try {
      // Check if media exists
      const media = sqlService.queryOne<MediaFile>(
        "SELECT * FROM MediaFiles WHERE id = ? AND is_deleted = 0",
        [id]
      );

      if (!media) {
        logService.warn(`Media file not found for dislike: ${id}`);
        return {
          status: 404,
          message: "Media file not found",
          data: { like_count: 0 },
        };
      }

      // Set like_count to -1
      sqlService.execute(
        `
        UPDATE MediaFiles 
        SET like_count = -1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [id]
      );

      logService.info(`Set dislike for media: ${media.file_name}`);

      return {
        status: 200,
        message: "Dislike set successfully",
        data: { like_count: -1 },
      };
    } catch (error) {
      logService.error("Failed to set dislike", error as Error);
      return {
        status: 500,
        message: "Failed to set dislike",
        data: { like_count: 0 },
      };
    }
  }

  /**
   * Add tag to media file (creates tag if it doesn't exist)
   */
  addTagToMedia(mediaId: number, tagName: string): ApiResponse<{ tag: Tag }> {
    logService.trace(`MediaService.addTagToMedia(${mediaId}, "${tagName}") called`);

    try {
      // Check if media exists
      const mediaCheck = sqlService.queryOne(
        "SELECT id FROM MediaFiles WHERE id = ? AND is_deleted = 0",
        [mediaId]
      );

      if (!mediaCheck) {
        logService.warn(`Media file not found for adding tag: ${mediaId}`);
        return {
          status: 404,
          message: "Media file not found",
          data: { tag: { id: 0, name: "", created_at: "" } },
        };
      }

      // Find or create tag
      let tag = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE name = ?", [tagName]);

      if (!tag) {
        // Tag doesn't exist, create it
        logService.info(`Creating new tag: ${tagName}`);
        const result = sqlService.execute("INSERT INTO Tags (name) VALUES (?)", [tagName]);
        tag = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE id = ?", [
          result.lastInsertRowid,
        ]);

        if (!tag) {
          throw new Error("Failed to create tag");
        }
      }

      // Check if relationship already exists
      const existing = sqlService.queryOne(
        "SELECT * FROM MediaTags WHERE media_id = ? AND tag_id = ?",
        [mediaId, tag.id]
      );

      if (existing) {
        logService.warn(`Tag '${tagName}' already applied to media ${mediaId}`);
        return {
          status: 409,
          message: "Tag already applied to this media",
          data: { tag },
        };
      }

      // Add tag to media
      sqlService.execute("INSERT INTO MediaTags (media_id, tag_id) VALUES (?, ?)", [
        mediaId,
        tag.id,
      ]);

      logService.info(`Added tag '${tagName}' to media ID ${mediaId}`);

      return {
        status: 200,
        message: "Tag added to media successfully",
        data: { tag },
      };
    } catch (error) {
      logService.error("Failed to add tag to media", error as Error);
      return {
        status: 500,
        message: "Failed to add tag to media",
        data: { tag: { id: 0, name: "", created_at: "" } },
      };
    }
  }

  /**
   * Remove tag from media file
   */
  removeTagFromMedia(mediaId: number, tagId: number): ApiResponse<{ success: boolean }> {
    logService.trace(`MediaService.removeTagFromMedia(${mediaId}, ${tagId}) called`);

    try {
      // Check if relationship exists
      const existing = sqlService.queryOne(
        "SELECT * FROM MediaTags WHERE media_id = ? AND tag_id = ?",
        [mediaId, tagId]
      );

      if (!existing) {
        logService.warn(`Tag ${tagId} not found on media ${mediaId}`);
        return {
          status: 404,
          message: "Tag not found on this media",
          data: { success: false },
        };
      }

      // Remove tag from media
      sqlService.execute("DELETE FROM MediaTags WHERE media_id = ? AND tag_id = ?", [
        mediaId,
        tagId,
      ]);

      logService.info(`Removed tag ID ${tagId} from media ID ${mediaId}`);

      return {
        status: 200,
        message: "Tag removed from media successfully",
        data: { success: true },
      };
    } catch (error) {
      logService.error("Failed to remove tag from media", error as Error);
      return {
        status: 500,
        message: "Failed to remove tag from media",
        data: { success: false },
      };
    }
  }

  /**
   * Get all tags
   */
  getAllTags(): ApiResponse<Tag[]> {
    logService.trace("MediaService.getAllTags() called");

    try {
      const tags = sqlService.queryAll<Tag>("SELECT * FROM Tags ORDER BY name ASC");

      logService.info(`Retrieved ${tags.length} tags`);

      return {
        status: 200,
        message: `Successfully retrieved ${tags.length} tags`,
        data: tags,
      };
    } catch (error) {
      logService.error("Failed to fetch tags", error as Error);
      return {
        status: 500,
        message: "Failed to fetch tags",
        data: [],
      };
    }
  }

  /**
   * Create a new tag
   */
  createTag(name: string): ApiResponse<Tag | null> {
    logService.trace(`MediaService.createTag("${name}") called`);

    try {
      // Check if tag already exists
      const existing = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE name = ?", [name]);

      if (existing) {
        logService.warn(`Tag already exists: ${name}`);
        return {
          status: 409,
          message: "Tag already exists",
          data: null,
        };
      }

      // Create new tag
      const result = sqlService.execute("INSERT INTO Tags (name) VALUES (?)", [name]);

      logService.info(`Created tag: ${name}`);

      const newTag = sqlService.queryOne<Tag>("SELECT * FROM Tags WHERE id = ?", [
        result.lastInsertRowid,
      ]);

      if (!newTag) {
        throw new Error("Failed to retrieve created tag");
      }

      return {
        status: 201,
        message: "Tag created successfully",
        data: newTag,
      };
    } catch (error) {
      logService.error("Failed to create tag", error as Error);
      return {
        status: 500,
        message: "Failed to create tag",
        data: null,
      };
    }
  }
}

// Export singleton instance
export const mediaService = new MediaService();
