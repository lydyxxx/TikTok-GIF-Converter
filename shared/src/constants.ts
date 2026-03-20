/**
 * Telegram sticker constraints
 * @see https://core.telegram.org/stickers#video-stickers
 */
export const TELEGRAM_CONSTRAINTS = {
  /** Maximum width in pixels */
  MAX_WIDTH: 512,
  /** Maximum height in pixels */
  MAX_HEIGHT: 512,
  /** One side must be exactly this size */
  REQUIRED_SIDE: 512,
  /** Maximum duration in seconds */
  MAX_DURATION: 3,
  /** Maximum file size in bytes (256 KB) */
  MAX_FILE_SIZE: 256 * 1024,
  /** Supported input formats */
  INPUT_FORMATS: ['gif', 'webp'] as const,
  /** Output format */
  OUTPUT_FORMAT: 'webm' as const,
  /** Output codec */
  OUTPUT_CODEC: 'vp9' as const,
} as const;

/** Conversion stage identifiers */
export const CONVERSION_STAGES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  INSPECTING: 'inspecting',
  VALIDATING: 'validating',
  CONVERTING: 'converting',
  COMPRESSING: 'compressing',
  VERIFYING: 'verifying',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

/** Error codes for API responses */
export const ERROR_CODES = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  STATIC_WEBP: 'STATIC_WEBP',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  COMPRESSION_FAILED: 'COMPRESSION_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
