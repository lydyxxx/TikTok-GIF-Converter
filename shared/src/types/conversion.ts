/**
 * Conversion pipeline types
 */

import type { CONVERSION_STAGES, ERROR_CODES, TELEGRAM_CONSTRAINTS } from '../constants.js';

/** Conversion stage type */
export type ConversionStage = (typeof CONVERSION_STAGES)[keyof typeof CONVERSION_STAGES];

/** Error code type */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Telegram constraints type */
export type TelegramConstraints = typeof TELEGRAM_CONSTRAINTS;

/** Media metadata from ffprobe */
export interface MediaMetadata {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Duration in seconds */
  duration: number;
  /** Frame rate (fps) */
  fps: number;
  /** Codec name */
  codec: string;
  /** Format name */
  format: string;
  /** Is animated (for WebP) */
  isAnimated: boolean;
  /** Number of frames */
  frameCount: number;
  /** Bitrate in bits per second */
  bitrate: number;
}

/** Conversion metadata (output) */
export interface ConversionMetadata {
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Output duration */
  duration: number;
  /** Output frame rate */
  fps: number;
  /** Output file size in bytes */
  fileSize: number;
  /** Output format */
  format: string;
  /** Output codec */
  codec: string;
  /** Compression pass number */
  compressionPass: number;
  /** Original input metadata */
  input: MediaMetadata;
}

/** Conversion options */
export interface ConversionOptions {
  /** Target frame rate (default: 30) */
  targetFps?: number;
  /** Initial bitrate in kbps (default: 500) */
  initialBitrate?: number;
  /** Minimum quality threshold (default: 0.5) */
  minQuality?: number;
  /** Maximum compression passes (default: 5) */
  maxPasses?: number;
}

/** Conversion progress event */
export interface ConversionProgress {
  stage: ConversionStage;
  progress: number; // 0-100
  message: string;
  metadata?: Partial<ConversionMetadata>;
}

/** API Error structure */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Compression result */
export interface CompressionResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  passes: number;
  finalBitrate: number;
  finalFps: number;
  warnings: string[];
}
