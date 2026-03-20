/**
 * API Response types for the conversion service
 */

import type { ConversionStage, HistoryEntry, ConversionMetadata, ApiError } from './index.js';

/** Base API response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  ffmpeg: {
    available: boolean;
    version?: string;
  };
  ffprobe: {
    available: boolean;
    version?: string;
  };
}

/** Upload response */
export interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** Conversion progress response */
export interface ConversionProgressResponse {
  fileId: string;
  stage: ConversionStage;
  progress?: number; // 0-100
  message: string;
  metadata?: Partial<ConversionMetadata>;
}

/** Conversion result response */
export interface ConversionResultResponse {
  success: boolean;
  fileId: string;
  downloadUrl: string;
  metadata: ConversionMetadata;
  warnings: string[];
  error?: ApiError;
}

/** History list response */
export interface HistoryListResponse {
  entries: HistoryEntry[];
  total: number;
}

/** Re-convert from history request */
export interface ReconvertRequest {
  historyId: string;
}
