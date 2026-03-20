/**
 * Conversion pipeline service tests
 */
import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { calculateDimensions, calculateTargetBitrate, calculateTargetFps, getOutputPath, verifyOutput } from '../../src/services/conversion';
import { TELEGRAM_CONSTRAINTS } from '../../shared/src/constants';

let app: Awaited<ReturnType<typeof buildApp>>;
const downloadFixtureId = 'download-fixture';
const downloadFixturePath = getOutputPath(downloadFixtureId);
const downloadFixtureBuffer = Buffer.from('test-webm-content');

describe('Conversion Service', () => {
  beforeAll(async () => {
    await fs.promises.mkdir(path.dirname(downloadFixturePath), { recursive: true });
    await fs.promises.writeFile(downloadFixturePath, downloadFixtureBuffer);
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await fs.promises.unlink(downloadFixturePath).catch(() => {});
  });

  describe('calculateDimensions', () => {
    it('should force landscape media to exactly 512x512', () => {
      const result = calculateDimensions(1920, 1080);
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });

    it('should force portrait media to exactly 512x512', () => {
      const result = calculateDimensions(1080, 1920);
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });

    it('should keep square media at exactly 512x512', () => {
      const result = calculateDimensions(512, 512);
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });

    it('should upscale small media to exactly 512x512', () => {
      const result = calculateDimensions(344, 284);
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });

    it('should downscale wide media to exactly 512x512', () => {
      const result = calculateDimensions(1000, 500);
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });
  });

  describe('output paths', () => {
    it('uses the API file id for the output file path', () => {
      expect(getOutputPath('abc-123')).toMatch(/abc-123\.webm$/);
    });
  });

  describe('bitrate planning', () => {
    it('allocates more bitrate to shorter stickers within the size budget', () => {
      expect(calculateTargetBitrate(1)).toBeGreaterThan(calculateTargetBitrate(3));
      expect(calculateTargetBitrate(1)).toBeLessThanOrEqual(2500);
      expect(calculateTargetBitrate(3)).toBeGreaterThanOrEqual(500);
    });
  });

  describe('fps planning', () => {
    it('preserves lower source fps instead of forcing 30fps', () => {
      expect(calculateTargetFps(10)).toBe(10);
      expect(calculateTargetFps(30)).toBe(30);
      expect(calculateTargetFps(60)).toBe(30);
    });
  });

  describe('verifyOutput', () => {
    it('should pass valid output', () => {
      const result = verifyOutput(
        {
          width: 512,
          height: 512,
          duration: 2.5,
          fps: 30,
          codec: 'vp9',
          format: 'webm',
          isAnimated: true,
          frameCount: 75,
          bitrate: 500000,
        },
        200 * 1024
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about oversized width', () => {
      const result = verifyOutput(
        {
          width: 600,
          height: 400,
          duration: 2,
          fps: 30,
          codec: 'vp9',
          format: 'webm',
          isAnimated: true,
          frameCount: 60,
          bitrate: 500000,
        },
        200 * 1024
      );

      expect(result.valid).toBe(false);
      expect(result.warnings.some((w: string) => w.includes('Ширина'))).toBe(true);
    });

    it('should warn about oversized duration', () => {
      const result = verifyOutput(
        {
          width: 512,
          height: 512,
          duration: 5,
          fps: 30,
          codec: 'vp9',
          format: 'webm',
          isAnimated: true,
          frameCount: 150,
          bitrate: 500000,
        },
        200 * 1024
      );

      expect(result.valid).toBe(false);
      expect(result.warnings.some((w: string) => w.includes('Длительность'))).toBe(true);
    });

    it('should warn about oversized file', () => {
      const result = verifyOutput(
        {
          width: 512,
          height: 512,
          duration: 2,
          fps: 30,
          codec: 'vp9',
          format: 'webm',
          isAnimated: true,
          frameCount: 60,
          bitrate: 500000,
        },
        300 * 1024
      );

      expect(result.valid).toBe(false);
      expect(result.warnings.some((w: string) => w.includes('Размер'))).toBe(true);
    });
  });

  describe('download endpoint', () => {
    it('returns the converted file bytes for an existing file id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/download/${downloadFixtureId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('video/webm');
      expect(response.rawPayload).toEqual(downloadFixtureBuffer);
    });
  });
});
