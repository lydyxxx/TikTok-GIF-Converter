/**
 * Conversion pipeline service
 */
import fs from 'fs';
import path from 'path';
import { getMediaMetadata, convertToWebM, getFileSize } from '../utils/ffmpeg.js';
import { config } from '../config/env.js';
import type { 
  MediaMetadata, 
  ConversionMetadata, 
  ConversionOptions,
  CompressionResult,
  ConversionProgress 
} from '@ttgifconv/shared';
import { CONVERSION_STAGES, TELEGRAM_CONSTRAINTS, ERROR_CODES } from '@ttgifconv/shared';

/**
 * Validate uploaded file
 */
export async function validateFile(filePath: string, fileName: string): Promise<{
  valid: boolean;
  error?: { code: string; message: string };
  format?: 'gif' | 'webp';
}> {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  
  if (!['gif', 'webp'].includes(ext)) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_FILE_TYPE,
        message: `Unsupported file type: ${ext}. Only .gif and .webp are supported.`,
      },
    };
  }

  // Check if file exists and is readable
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.CORRUPTED_FILE,
        message: 'File is corrupted or not accessible',
      },
    };
  }

  // Get metadata to check if WebP is animated
  try {
    const metadata = await getMediaMetadata(filePath);
    
    if (ext === 'webp' && !metadata.isAnimated) {
      return {
        valid: false,
        error: {
          code: ERROR_CODES.STATIC_WEBP,
          message: 'Uploaded WebP is not animated. Only animated WebP is supported.',
        },
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.CORRUPTED_FILE,
        message: 'Failed to read file metadata. File may be corrupted.',
      },
    };
  }

  return {
    valid: true,
    format: ext as 'gif' | 'webp',
  };
}

/**
 * Calculate target dimensions for Telegram sticker
 */
export function calculateDimensions(width: number, height: number): { width: number; height: number } {
  void width;
  void height;

  return {
    width: TELEGRAM_CONSTRAINTS.REQUIRED_SIDE,
    height: TELEGRAM_CONSTRAINTS.REQUIRED_SIDE,
  };
}

export function getOutputPath(fileId: string): string {
  return path.join(config.outputDir, `${fileId}.webm`);
}

export function calculateTargetBitrate(duration: number): number {
  const safeDuration = Math.max(duration || 0, 0.5);
  const sizeBudgetBits = TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE * 8 * 0.92;
  const targetKbps = Math.floor(sizeBudgetBits / safeDuration / 1000);

  return Math.max(config.defaultBitrate, Math.min(targetKbps, 2500));
}

export function calculateTargetFps(sourceFps: number): number {
  const normalizedFps = Number.isFinite(sourceFps) && sourceFps > 0 ? sourceFps : config.defaultFps;
  return Math.max(1, Math.min(Math.round(normalizedFps), config.defaultFps));
}

const QUALITY_CRF_STEPS = [6, 10, 14, 18, 22, 26, 30] as const;

/**
 * Main conversion pipeline with iterative compression
 */
export async function convertFile(
  fileId: string,
  inputFile: string,
  inputMetadata: MediaMetadata,
  onProgress?: (progress: ConversionProgress) => void
): Promise<{
  success: boolean;
  outputPath?: string;
  metadata?: ConversionMetadata;
  warnings: string[];
  error?: { code: string; message: string };
}> {
  const warnings: string[] = [];
  const targetFps = calculateTargetFps(inputMetadata.fps);
  const options: ConversionOptions = {
    targetFps,
    initialBitrate: calculateTargetBitrate(inputMetadata.duration),
    minQuality: config.minQuality,
    maxPasses: config.maxCompressionPasses,
  };

  try {
    // Stage 1: Inspecting
    onProgress?.({
      stage: CONVERSION_STAGES.INSPECTING,
      progress: 10,
      message: 'Анализ метаданных файла...',
      metadata: { input: inputMetadata },
    });

    // Stage 2: Validating
    onProgress?.({
      stage: CONVERSION_STAGES.VALIDATING,
      progress: 20,
      message: 'Проверка файла...',
    });

    // Calculate dimensions
    const { width: targetWidth, height: targetHeight } = calculateDimensions(
      inputMetadata.width,
      inputMetadata.height
    );

    // Calculate duration (cap at 3 seconds)
    const targetDuration = Math.min(inputMetadata.duration, TELEGRAM_CONSTRAINTS.MAX_DURATION);
    if (inputMetadata.duration > TELEGRAM_CONSTRAINTS.MAX_DURATION) {
      warnings.push(`Длительность обрезана с ${inputMetadata.duration.toFixed(1)}с до ${TELEGRAM_CONSTRAINTS.MAX_DURATION}с`);
    }

    // Stage 3: Converting
    onProgress?.({
      stage: CONVERSION_STAGES.CONVERTING,
      progress: 40,
      message: `Конвертация в WebM (${targetWidth}x${targetHeight})...`,
      metadata: {
        width: targetWidth,
        height: targetHeight,
        duration: targetDuration,
        fps: options.targetFps || 30,
      } as Partial<ConversionMetadata>,
    });

    // Stage 4: Compressing (iterative)
    onProgress?.({
      stage: CONVERSION_STAGES.COMPRESSING,
      progress: 70,
      message: 'Сжатие до 256 KB...',
    });

    const compressionResult = await iterativeCompression(
      inputFile,
      fileId,
      {
        width: targetWidth,
        height: targetHeight,
        duration: targetDuration,
        fps: options.targetFps || targetFps,
        bitrate: options.initialBitrate,
      },
      warnings
    );

    if (!compressionResult.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.COMPRESSION_FAILED,
          message: 'Не удалось сжать файл до 256 KB после нескольких попыток',
        },
        warnings,
      };
    }

    // Stage 5: Verifying
    onProgress?.({
      stage: CONVERSION_STAGES.VERIFYING,
      progress: 90,
      message: 'Финальная проверка...',
    });

    // Verify output
    const outputMetadata = await getMediaMetadata(compressionResult.filePath);
    const finalSize = await getFileSize(compressionResult.filePath);

    const verification = verifyOutput(outputMetadata, finalSize);
    if (!verification.valid) {
      warnings.push(...verification.warnings);
    }

    // Build final metadata
    const metadata: ConversionMetadata = {
      width: outputMetadata.width,
      height: outputMetadata.height,
      duration: outputMetadata.duration,
      fps: outputMetadata.fps,
      fileSize: finalSize,
      format: 'webm',
      codec: outputMetadata.codec,
      compressionPass: compressionResult.passes,
      input: inputMetadata,
    };

    // Stage 6: Complete
    onProgress?.({
      stage: CONVERSION_STAGES.COMPLETE,
      progress: 100,
      message: 'Конвертация завершена!',
      metadata,
    });

    // Move to outputs directory
    const finalPath = getOutputPath(fileId);
    await fs.promises.rename(compressionResult.filePath, finalPath);

    return {
      success: true,
      outputPath: finalPath,
      metadata,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.CONVERSION_FAILED,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка конвертации',
      },
      warnings,
    };
  }
}

/**
 * Iterative compression until file size <= 256 KB
 */
async function iterativeCompression(
  inputPath: string,
  fileId: string,
  options: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    bitrate?: number;
  },
  warnings: string[]
): Promise<CompressionResult> {
  let currentBitrate = options.bitrate || 500;
  const currentFps = options.fps;
  let pass = 0;
  const maxBitrateAdjustments = 3;
  let bestAttempt: { filePath: string; fileSize: number; crf: number; bitrate: number } | null = null;

  for (let bitrateAdjustment = 0; bitrateAdjustment < maxBitrateAdjustments; bitrateAdjustment++) {
    for (const crf of QUALITY_CRF_STEPS) {
      pass++;
      const outputPath = path.join(config.tmpDir, `${fileId}_pass${pass}.webm`);

      await convertToWebM(inputPath, outputPath, {
        width: options.width,
        height: options.height,
        duration: options.duration,
        fps: currentFps,
        bitrate: currentBitrate,
        crf,
      });

      const fileSize = await getFileSize(outputPath);

      if (!bestAttempt || fileSize < bestAttempt.fileSize) {
        bestAttempt = { filePath: outputPath, fileSize, crf, bitrate: currentBitrate };
      }

      if (fileSize <= TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE) {
        await cleanupOtherPasses(fileId, outputPath);
        return {
          success: true,
          filePath: outputPath,
          fileSize,
          passes: pass,
          finalBitrate: currentBitrate,
          finalFps: currentFps,
          warnings,
        };
      }
    }

    currentBitrate = Math.max(250, Math.floor(currentBitrate * 0.82));
  }

  if (!bestAttempt) {
    throw new Error('No compression attempts were produced');
  }

  warnings.push(`Достигнут минимальный порог качества (${pass} попыток)`);
  await cleanupOtherPasses(fileId, bestAttempt.filePath);

  return {
    success: bestAttempt.fileSize <= TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE,
    filePath: bestAttempt.filePath,
    fileSize: bestAttempt.fileSize,
    passes: pass,
    finalBitrate: currentBitrate,
    finalFps: currentFps,
    warnings,
  };
}

/**
 * Clean up temporary pass files
 */
async function cleanupOtherPasses(fileId: string, keepPath: string) {
  const files = await fs.promises.readdir(config.tmpDir);

  for (const file of files) {
    if (!file.startsWith(`${fileId}_pass`) || path.join(config.tmpDir, file) === keepPath) {
      continue;
    }

    try {
      await fs.promises.unlink(path.join(config.tmpDir, file));
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Verify output meets Telegram constraints
 */
export function verifyOutput(
  metadata: MediaMetadata,
  fileSize: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (metadata.width > TELEGRAM_CONSTRAINTS.MAX_WIDTH) {
    warnings.push(`Ширина ${metadata.width}px превышает лимит ${TELEGRAM_CONSTRAINTS.MAX_WIDTH}px`);
  }

  if (metadata.height > TELEGRAM_CONSTRAINTS.MAX_HEIGHT) {
    warnings.push(`Высота ${metadata.height}px превышает лимит ${TELEGRAM_CONSTRAINTS.MAX_HEIGHT}px`);
  }

  if (metadata.duration > TELEGRAM_CONSTRAINTS.MAX_DURATION) {
    warnings.push(`Длительность ${metadata.duration.toFixed(1)}с превышает лимит ${TELEGRAM_CONSTRAINTS.MAX_DURATION}с`);
  }

  if (fileSize > TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE) {
    warnings.push(`Размер ${Math.round(fileSize / 1024)}KB превышает лимит 256KB`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Clean up temporary files
 */
export async function cleanupFile(filePath: string) {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore errors
  }
}
