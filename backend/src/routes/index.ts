/**
 * Main routes index
 */
import type { FastifyInstance } from 'fastify';
import { healthHandler } from './health.js';
import { uploadHandler, convertHandler, downloadHandler } from './conversion.js';
import { historyHandler, historyDeleteHandler, historyReconvertHandler } from './history.js';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/api/health', healthHandler);

  // File upload
  app.post('/api/upload', uploadHandler);

  // Conversion
  app.post('/api/convert/:fileId', convertHandler);

  // Download
  app.get('/api/download/:fileId', downloadHandler);

  // History (client-side, but we provide an endpoint for server-side history if needed)
  app.get('/api/history', historyHandler);
  app.delete('/api/history/:id', historyDeleteHandler);
  app.post('/api/history/reconvert', historyReconvertHandler);

  // 404 handler
  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    
    // Handle multipart errors
    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds limit (50MB)',
        },
      });
    }

    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
    });
  });
}
