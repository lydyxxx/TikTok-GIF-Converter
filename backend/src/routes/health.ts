/**
 * Health check endpoint
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkFFmpeg } from '../utils/ffmpeg.js';
import type { HealthResponse } from '@ttgifconv/shared';

export async function healthHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const ffmpegStatus = await checkFFmpeg();

    const response: HealthResponse = {
      status: ffmpegStatus.available ? 'ok' : 'degraded',
      version: '0.1.0',
      ffmpeg: ffmpegStatus,
      ffprobe: ffmpegStatus,
    };

    reply.send(response);
  } catch {
    reply.code(500).send({
      status: 'degraded',
      version: '0.1.0',
      ffmpeg: { available: false },
      ffprobe: { available: false },
    });
  }
}
