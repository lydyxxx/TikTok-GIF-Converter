/**
 * History routes (optional server-side history)
 * Primary history storage is client-side IndexedDB
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HistoryListResponse } from '@ttgifconv/shared';

/**
 * Get history (placeholder - client manages history in IndexedDB)
 */
export async function historyHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // Return empty history - client manages history in IndexedDB
  const response: HistoryListResponse = {
    entries: [],
    total: 0,
  };

  reply.send(response);
}

/**
 * Delete history entry
 */
export async function historyDeleteHandler(
  _request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  // Client-side deletion only
  reply.send({ success: true });
}

/**
 * Re-convert from history
 */
export async function historyReconvertHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // Client needs to re-upload the file
  reply.send({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Re-conversion requires re-uploading the file',
    },
  });
}
