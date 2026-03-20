/**
 * Fastify application builder
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import { checkFFmpeg } from './utils/ffmpeg.js';

const __filename = fileURLToPath(import.meta.url);

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'debug' : 'info',
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: config.nodeEnv === 'development' ? ['http://localhost:5173', 'http://localhost:3000'] : true,
    credentials: true,
  });

  await app.register(formbody);
  
  await app.register(multipart, {
    limits: {
      fileSize: config.maxFileSize,
    },
  });

  // Serve static files from outputs directory
  await app.register(staticPlugin, {
    root: config.outputDir,
    prefix: '/outputs/',
  });

  // Register routes
  await registerRoutes(app);

  // Check FFmpeg availability on startup
  const ffmpegStatus = await checkFFmpeg();
  if (!ffmpegStatus.available) {
    app.log.warn('FFmpeg is not available. Conversion will fail.');
  } else {
    app.log.info(`FFmpeg version: ${ffmpegStatus.version}`);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Shutting down on ${signal}...`);
      await app.close();
      process.exit(0);
    });
  });

  return app;
}
