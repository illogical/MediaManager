/**
 * Zod validation schemas for API requests and responses
 */

import { z } from "zod";

// MediaFile schemas
export const MediaFileSchema = z.object({
  id: z.number(),
  folder_path: z.string(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number().nullable(),
  mime_type: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  created_date: z.string().nullable(),
  view_count: z.number(),
  last_viewed: z.string().nullable(),
  like_count: z.number(),
  is_deleted: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MediaListQuerySchema = z.object({
  folder: z.string().optional(),
  type: z.enum(["image", "video", "both"]).optional(),
  tags: z.string().optional(), // Comma-separated tag names
  sort: z
    .enum([
      "created_date_asc",
      "created_date_desc",
      "view_count_asc",
      "view_count_desc",
      "last_viewed_asc",
      "last_viewed_desc",
      "like_count_desc",
      "file_name_asc",
    ])
    .optional()
    .default("created_date_desc"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Tag schemas
export const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const AddTagToMediaSchema = z.object({
  tagName: z.string().min(1).max(100),
});

// Folder schemas
export const FolderSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  last_selected: z.string().nullable(),
  default_sort: z.string(),
  default_filter_type: z.string(),
  is_active: z.number(),
  created_at: z.string(),
});

export const CreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().min(1),
  recursive: z.boolean().optional().default(false),
});

// ViewHistory schemas
export const ViewHistorySchema = z.object({
  id: z.number(),
  media_id: z.number(),
  viewed_at: z.string(),
  file_name: z.string().optional(),
  file_path: z.string().optional(),
});

// Playlist schemas
export const PlaylistSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  last_accessed: z.string().nullable(),
  created_at: z.string(),
});

export const CreatePlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const UpdatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export const ReorderPlaylistSchema = z.object({
  mediaIds: z.array(z.number()),
});

// MediaFile with tags
export const MediaFileWithTagsSchema = MediaFileSchema.extend({
  tags: z.array(TagSchema).optional(),
});

// Response wrapper
export const ApiResponseSchema = z.object({
  status: z.number(),
  data: z.unknown(),
});

// Type exports
export type MediaFile = z.infer<typeof MediaFileSchema>;
export type MediaFileWithTags = z.infer<typeof MediaFileWithTagsSchema>;
export type MediaListQuery = z.infer<typeof MediaListQuerySchema>;
export type Tag = z.infer<typeof TagSchema>;
export type CreateTag = z.infer<typeof CreateTagSchema>;
export type AddTagToMedia = z.infer<typeof AddTagToMediaSchema>;
export type Folder = z.infer<typeof FolderSchema>;
export type ViewHistory = z.infer<typeof ViewHistorySchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type CreatePlaylist = z.infer<typeof CreatePlaylistSchema>;
export type UpdatePlaylist = z.infer<typeof UpdatePlaylistSchema>;
export type ReorderPlaylist = z.infer<typeof ReorderPlaylistSchema>;
export type CreateFolder = z.infer<typeof CreateFolderSchema>;
export type ApiResponse<T = unknown> = {
  status: number;
  data: T;
};
