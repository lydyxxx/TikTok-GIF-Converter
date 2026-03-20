import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { TELEGRAM_CONSTRAINTS } from '@ttgifconv/shared';
import { calculateDimensions, cleanupFile, convertFile, getOutputPath } from '../services/conversion';
import { convertToWebM, getFileSize, getMediaMetadata } from '../utils/ffmpeg';

const fixturePath = path.resolve(process.cwd(), '..', 'котикl.webp');
const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map(async (filePath) => {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore cleanup failures in tests
      }
    })
  );
});

describe('animated WebP support', () => {
  it('reads real metadata from animated WebP files', async () => {
    const metadata = await getMediaMetadata(fixturePath);

    expect(metadata.isAnimated).toBe(true);
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
  });

  it('converts animated WebP files to non-empty WebM output', async () => {
    const outputPath = path.join(os.tmpdir(), `animated-webp-${Date.now()}.webm`);
    tempPaths.push(outputPath);

    await convertToWebM(fixturePath, outputPath, {
      width: 512,
      height: 512,
      fps: 30,
      bitrate: 500,
    });

    const fileSize = await getFileSize(outputPath);
    expect(fileSize).toBeGreaterThan(0);
  });

  it('preserves aspect ratio and uses the size budget efficiently', async () => {
    const inputMetadata = await getMediaMetadata(fixturePath);
    const expectedDimensions = calculateDimensions(inputMetadata.width, inputMetadata.height);
    const fileId = `quality-${Date.now()}`;
    const outputPath = getOutputPath(fileId);
    tempPaths.push(outputPath);

    const result = await convertFile(fileId, fixturePath, inputMetadata);

    expect(result.success).toBe(true);
    expect(result.metadata?.width).toBe(inputMetadata.width);
    expect(result.metadata?.height).toBe(inputMetadata.height);
    expect(result.metadata?.fps).toBe(inputMetadata.fps);
    expect(result.metadata?.fileSize).toBeLessThanOrEqual(TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE);
    expect(result.metadata?.fileSize).toBeGreaterThan(30 * 1024);

    await cleanupFile(outputPath);
  });
});
