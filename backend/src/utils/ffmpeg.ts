/**
 * FFmpeg and ffprobe utility functions
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { promisify } from 'util';

const ffmpegProbe = promisify(ffmpeg.ffprobe);

interface MediaProbeResult {
  width: number;
  height: number;
  duration: number;
  fps: number;
  codec: string;
  format: string;
  isAnimated: boolean;
  frameCount: number;
  bitrate: number;
}

export interface FFmpegStatus {
  available: boolean;
  version?: string;
}

/**
 * Check if FFmpeg is available and get version
 */
export async function checkFFmpeg(): Promise<FFmpegStatus> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err || !formats) {
        resolve({ available: false });
      } else {
        const ffmpegVersion = (ffmpeg as any).version || 'unknown';
        resolve({ available: true, version: ffmpegVersion });
      }
    });
  });
}

/**
 * Get media metadata using ffprobe
 */
export async function getMediaMetadata(filePath: string) {
  try {
    const metadata: any = await ffmpegProbe(filePath);

    const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
    const format = metadata.format;

    if (!videoStream) {
      throw new Error('No video stream found in file');
    }

    // Более надёжное определение анимированного WebP
    // Проверяем несколько признаков:
    const isWebP = videoStream.codec_name === 'webp' || format.format_name?.includes('webp');
    const hasMultipleFrames = videoStream.nb_frames && videoStream.nb_frames > 1;
    const hasDuration = format.duration && format.duration > 0.1;
    const isWebpPipe = format.format_name === 'webp_pipe';
    
    // Для WebP: если нет длительности или 1 кадр - это статичное изображение
    const isAnimated = isWebP && (hasMultipleFrames || hasDuration || isWebpPipe);

    const probedMetadata: MediaProbeResult = {
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      duration: format.duration || 0,
      fps: videoStream.r_frame_rate
        ? parseFps(videoStream.r_frame_rate)
        : (videoStream.avg_frame_rate
            ? parseFps(videoStream.avg_frame_rate)
            : 30),
      codec: videoStream.codec_name || 'unknown',
      format: format.format_name || 'unknown',
      isAnimated,
      frameCount: videoStream.nb_frames || 1,
      bitrate: format.bit_rate ? parseInt(format.bit_rate, 10) : 0,
    };

    if (shouldUseSharpWebpFallback(filePath, probedMetadata)) {
      return await getWebpMetadataWithSharp(filePath);
    }

    return probedMetadata;
  } catch (error) {
    if (isWebpFile(filePath)) {
      return await getWebpMetadataWithSharp(filePath);
    }

    throw new Error(`Failed to probe media file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function isWebpFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.webp';
}

function shouldUseSharpWebpFallback(filePath: string, metadata: MediaProbeResult): boolean {
  return isWebpFile(filePath) && (metadata.width <= 0 || metadata.height <= 0 || metadata.frameCount <= 0);
}

async function getWebpMetadataWithSharp(filePath: string): Promise<MediaProbeResult> {
  try {
    const metadata = await sharp(filePath, { animated: true }).metadata();
    const frameCount = metadata.pages || 1;
    const width = metadata.width || 0;
    const height = metadata.pageHeight || metadata.height || 0;
    const delays = metadata.delay || [];
    const totalDelayMs = delays.reduce((sum, delay) => sum + delay, 0);
    const averageDelayMs = delays.length > 0 ? totalDelayMs / delays.length : 0;
    const fps = averageDelayMs > 0 ? Math.max(1, Math.round(1000 / averageDelayMs)) : 30;

    return {
      width,
      height,
      duration: totalDelayMs > 0 ? totalDelayMs / 1000 : 0,
      fps,
      codec: 'webp',
      format: 'webp',
      isAnimated: frameCount > 1,
      frameCount,
      bitrate: 0,
    };
  } catch (error) {
    throw new Error(`Failed to read WebP metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse FPS from fraction string (e.g., "30/1" -> 30)
 */
function parseFps(fpsStr: string): number {
  const [num, den] = fpsStr.split('/').map(Number);
  if (den && den > 0) {
    return Math.round(num / den);
  }
  return 30;
}

/**
 * Convert media file to WebM format
 */
export function convertToWebM(
  inputPath: string,
  outputPath: string,
  options: {
    width: number;
    height: number;
    duration?: number;
    fps?: number;
    bitrate?: number;
    crf?: number;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const preparedInput = await prepareInputForConversion(inputPath);

      const ffmpegArgs = buildVp9Args(preparedInput, options);

      if (typeof options.crf === 'number' && typeof options.bitrate === 'number') {
        await runTwoPassEncode(ffmpegArgs, outputPath);
      } else {
        await runFfmpeg([...ffmpegArgs, outputPath]);
      }

      await preparedInput.cleanup();
      resolve();
    })().catch(reject);
  });
}

function buildVp9Args(
  preparedInput: Awaited<ReturnType<typeof prepareInputForConversion>>,
  options: {
    width: number;
    height: number;
    duration?: number;
    fps?: number;
    bitrate?: number;
    crf?: number;
  }
): string[] {
  const args = [
    '-y',
    ...preparedInput.inputOptions,
    '-i', preparedInput.inputPath,
    '-an',
    '-vf', `scale=${options.width}:${options.height}:flags=lanczos`,
    '-r', String(options.fps || preparedInput.fps || 30),
    '-pix_fmt', 'yuva420p',
    '-c:v', 'libvpx-vp9',
    '-quality', 'good',
    '-speed', '0',
    '-tile-columns', '0',
    '-frame-parallel', '0',
    '-auto-alt-ref', '1',
    '-lag-in-frames', '25',
    '-g', '9999',
  ];

  if (options.duration) {
    args.push('-t', String(options.duration));
  }

  if (typeof options.crf === 'number') {
    args.push('-crf', String(options.crf));
  }

  if (typeof options.bitrate === 'number') {
    args.push('-b:v', `${options.bitrate}k`, '-minrate', '0', '-maxrate', `${options.bitrate}k`);
  }

  return args;
}

async function runTwoPassEncode(baseArgs: string[], outputPath: string): Promise<void> {
  const passLogFile = path.join(os.tmpdir(), `ttgifconv-pass-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null';

  try {
    await runFfmpeg([
      ...baseArgs,
      '-pass', '1',
      '-passlogfile', passLogFile,
      '-f', 'webm',
      nullSink,
    ]);

    await runFfmpeg([
      ...baseArgs,
      '-pass', '2',
      '-passlogfile', passLogFile,
      outputPath,
    ]);
  } finally {
    await cleanupPasslogFiles(passLogFile);
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
    });
  });
}

async function cleanupPasslogFiles(passLogFile: string): Promise<void> {
  const passlogDir = path.dirname(passLogFile);
  const passlogPrefix = path.basename(passLogFile);
  const files = await fs.promises.readdir(passlogDir).catch(() => [] as string[]);

  await Promise.all(files
    .filter((file) => file.startsWith(passlogPrefix))
    .map(async (file) => {
      await fs.promises.unlink(path.join(passlogDir, file)).catch(() => {});
    }));
}

async function prepareInputForConversion(inputPath: string): Promise<{
  inputPath: string;
  inputOptions: string[];
  fps: number;
  cleanup: () => Promise<void>;
}> {
  if (!isWebpFile(inputPath)) {
    return {
      inputPath,
      inputOptions: [],
      fps: 30,
      cleanup: async () => {},
    };
  }

  const metadata = await getWebpMetadataWithSharp(inputPath);

  if (!metadata.isAnimated || metadata.frameCount <= 1) {
    return {
      inputPath,
      inputOptions: [],
      fps: metadata.fps,
      cleanup: async () => {},
    };
  }

  const framesDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ttgifconv-webp-'));

  try {
    for (let frameIndex = 0; frameIndex < metadata.frameCount; frameIndex++) {
      const framePath = path.join(framesDir, `frame-${String(frameIndex + 1).padStart(4, '0')}.png`);
      await sharp(inputPath, { page: frameIndex, pages: 1 }).png().toFile(framePath);
    }

    return {
      inputPath: path.join(framesDir, 'frame-%04d.png'),
      inputOptions: ['-framerate', String(metadata.fps), '-start_number', '1'],
      fps: metadata.fps,
      cleanup: async () => {
        await fs.promises.rm(framesDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await fs.promises.rm(framesDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.promises.stat(filePath);
  return stats.size;
}
