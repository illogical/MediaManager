/**
 * Randomizer Service - Handles media randomization with various prioritization algorithms
 */

import { logService } from "./logService";
import type { MediaFile } from "../api/schemas";

export type PrioritizationAlgorithm = 
  | "random"
  | "unviewed_first"
  | "least_viewed"
  | "most_liked"
  | "most_viewed"
  | "oldest_first";

export interface RandomizedMedia {
  id: number;
  idx: number;
}

export class RandomizerService {
  /**
   * Randomize media files based on the selected algorithm
   * @param mediaFiles Array of media files to randomize
   * @param algorithm Prioritization algorithm to use
   * @param excludeDisliked Whether to exclude disliked media (like_count < 0)
   * @returns Array of objects with media ID and sort index
   */
  randomize(
    mediaFiles: MediaFile[],
    algorithm: PrioritizationAlgorithm = "random",
    excludeDisliked: boolean = true
  ): RandomizedMedia[] {
    logService.trace(`RandomizerService.randomize() called with algorithm: ${algorithm}`);
    logService.info(`Processing ${mediaFiles.length} media files, excludeDisliked: ${excludeDisliked}`);

    try {
      // Filter out disliked media if requested
      let filteredMedia = excludeDisliked 
        ? mediaFiles.filter(media => media.like_count >= 0)
        : [...mediaFiles];

      if (filteredMedia.length === 0) {
        logService.warn("No media files after filtering");
        return [];
      }

      // Apply the selected algorithm
      let sortedMedia: MediaFile[];
      switch (algorithm) {
        case "random":
          sortedMedia = this.shuffleRandom(filteredMedia);
          break;
        case "unviewed_first":
          sortedMedia = this.prioritizeUnviewed(filteredMedia);
          break;
        case "least_viewed":
          sortedMedia = this.prioritizeLeastViewed(filteredMedia);
          break;
        case "most_liked":
          sortedMedia = this.prioritizeMostLiked(filteredMedia);
          break;
        case "most_viewed":
          sortedMedia = this.prioritizeMostViewed(filteredMedia);
          break;
        case "oldest_first":
          sortedMedia = this.prioritizeOldestFirst(filteredMedia);
          break;
        default:
          logService.error(`Unknown algorithm: ${algorithm}`);
          throw new Error(`Unknown prioritization algorithm: ${algorithm}`);
      }

      // Map to output format with index
      const result = sortedMedia.map((media, idx) => ({
        id: media.id,
        idx: idx
      }));

      logService.info(`Randomization complete: ${result.length} media files ordered`);
      return result;
    } catch (error) {
      logService.error("Failed to randomize media files", error as Error);
      throw error;
    }
  }

  /**
   * Pure random shuffle using Fisher-Yates algorithm
   */
  private shuffleRandom(mediaFiles: MediaFile[]): MediaFile[] {
    const result = [...mediaFiles];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Prioritize unviewed media (last_viewed is null), then shuffle the rest
   */
  private prioritizeUnviewed(mediaFiles: MediaFile[]): MediaFile[] {
    const unviewed = mediaFiles.filter(m => m.last_viewed === null);
    const viewed = mediaFiles.filter(m => m.last_viewed !== null);

    const shuffledUnviewed = this.shuffleRandom(unviewed);
    const shuffledViewed = this.shuffleRandom(viewed);

    return [...shuffledUnviewed, ...shuffledViewed];
  }

  /**
   * Sort by view_count ascending, with secondary sort by last_viewed ascending
   * for tied counts, then shuffle within same counts
   */
  private prioritizeLeastViewed(mediaFiles: MediaFile[]): MediaFile[] {
    return this.sortWithTieBreaker(
      mediaFiles,
      (a, b) => a.view_count - b.view_count,
      (a, b) => this.compareDates(a.last_viewed, b.last_viewed)
    );
  }

  /**
   * Sort by like_count descending, with secondary sort by view_count ascending
   * for tied counts, then shuffle within same counts
   */
  private prioritizeMostLiked(mediaFiles: MediaFile[]): MediaFile[] {
    return this.sortWithTieBreaker(
      mediaFiles,
      (a, b) => b.like_count - a.like_count,
      (a, b) => a.view_count - b.view_count
    );
  }

  /**
   * Sort by view_count descending, with secondary sort by last_viewed descending
   * for tied counts, then shuffle within same counts
   */
  private prioritizeMostViewed(mediaFiles: MediaFile[]): MediaFile[] {
    return this.sortWithTieBreaker(
      mediaFiles,
      (a, b) => b.view_count - a.view_count,
      (a, b) => -this.compareDates(a.last_viewed, b.last_viewed)
    );
  }

  /**
   * Sort by last_viewed ascending (oldest first), handling nulls
   * Nulls (never viewed) come first, then shuffle within groups
   */
  private prioritizeOldestFirst(mediaFiles: MediaFile[]): MediaFile[] {
    const neverViewed = mediaFiles.filter(m => m.last_viewed === null);
    const viewed = mediaFiles.filter(m => m.last_viewed !== null);

    // Sort viewed by last_viewed ascending
    const sortedViewed = viewed.sort((a, b) => 
      this.compareDates(a.last_viewed, b.last_viewed)
    );

    const shuffledNeverViewed = this.shuffleRandom(neverViewed);

    return [...shuffledNeverViewed, ...sortedViewed];
  }

  /**
   * Helper to sort with primary comparator, secondary tie-breaker, and random shuffle within ties
   */
  private sortWithTieBreaker(
    mediaFiles: MediaFile[],
    primaryComparator: (a: MediaFile, b: MediaFile) => number,
    secondaryComparator: (a: MediaFile, b: MediaFile) => number
  ): MediaFile[] {
    // Group by primary value
    const groups = new Map<number, MediaFile[]>();
    
    for (const media of mediaFiles) {
      const key = primaryComparator(media, mediaFiles[0]) === 0 ? 0 : media.view_count || media.like_count;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(media);
    }

    // Sort each group by secondary comparator, then shuffle within sub-groups
    const result: MediaFile[] = [];
    const sortedGroups = [...mediaFiles].sort((a, b) => {
      const primary = primaryComparator(a, b);
      if (primary !== 0) return primary;
      return secondaryComparator(a, b);
    });

    // Group by both primary and secondary keys for final shuffle
    const finalGroups = new Map<string, MediaFile[]>();
    for (const media of sortedGroups) {
      const primaryKey = this.getPrimaryKey(media, primaryComparator);
      const secondaryKey = this.getSecondaryKey(media, secondaryComparator);
      const key = `${primaryKey}-${secondaryKey}`;
      
      if (!finalGroups.has(key)) {
        finalGroups.set(key, []);
      }
      finalGroups.get(key)!.push(media);
    }

    // Shuffle within each final group and combine
    for (const [_, group] of finalGroups) {
      result.push(...this.shuffleRandom(group));
    }

    return result;
  }

  /**
   * Helper to get primary key for grouping
   */
  private getPrimaryKey(media: MediaFile, comparator: (a: MediaFile, b: MediaFile) => number): number {
    return media.view_count || media.like_count || 0;
  }

  /**
   * Helper to get secondary key for grouping
   */
  private getSecondaryKey(media: MediaFile, comparator: (a: MediaFile, b: MediaFile) => number): string {
    return media.last_viewed || "null";
  }

  /**
   * Compare two date strings, handling nulls
   * @returns -1 if a < b, 0 if equal, 1 if a > b
   */
  private compareDates(a: string | null, b: string | null): number {
    if (a === null && b === null) return 0;
    if (a === null) return -1;
    if (b === null) return 1;
    return a.localeCompare(b);
  }
}

export const randomizerService = new RandomizerService();
