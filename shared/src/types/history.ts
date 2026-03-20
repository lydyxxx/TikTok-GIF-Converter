/**
 * History persistence types
 */

import type { ConversionMetadata } from './conversion.js';

/** History entry stored in IndexedDB */
export interface HistoryEntry {
  /** Unique identifier */
  id: string;
  /** Original file name */
  originalName: string;
  /** Original format (gif/webp) */
  originalFormat: 'gif' | 'webp';
  /** Conversion timestamp */
  timestamp: number;
  /** Output metadata */
  metadata: ConversionMetadata;
  /** Output file as Blob (for download) */
  outputBlob?: Blob;
  /** Output blob URL (transient, not stored) */
  outputBlobUrl?: string;
  /** Preview thumbnail as data URL */
  thumbnailDataUrl?: string;
  /** Warnings from conversion */
  warnings: string[];
}

/** History entry without blob (for listing) */
export interface HistoryEntrySummary {
  id: string;
  originalName: string;
  originalFormat: 'gif' | 'webp';
  timestamp: number;
  metadata: ConversionMetadata;
  outputBlob?: Blob;
  thumbnailDataUrl?: string;
  warnings: string[];
}

/** IndexedDB database schema */
export interface HistoryDB {
  version: number;
  storeName: string;
}

/** History actions */
export type HistoryAction = 
  | { type: 'ADD'; entry: HistoryEntry }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' };
