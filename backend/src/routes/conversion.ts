/**
 * Conversion routes
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { validateFile, convertFile, getOutputPath } from '../services/conversion.js';
import { getMediaMetadata } from '../utils/ffmpeg.js';
import type { ConversionResultResponse } from '@ttgifconv/shared';
import { ERROR_CODES } from '@ttgifconv/shared';

const pipelineAsync = promisify(pipeline);

/**
 * Upload file handler
 */
export async function uploadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_FILE_TYPE,
          message: 'No file uploaded',
        },
      });
    }

    // Generate unique file ID
    const fileId = uuidv4();
    const ext = path.extname(data.filename);
    const tempPath = path.join(config.tmpDir, `${fileId}${ext}`);

    // Save file to temp directory
    const writeStream = fs.createWriteStream(tempPath);
    await pipelineAsync(data.file, writeStream);

    // Validate file
    const validation = await validateFile(tempPath, data.filename);
    
    if (!validation.valid) {
      // Clean up invalid file
      await fs.promises.unlink(tempPath).catch(() => {});
      
      return reply.code(400).send({
        success: false,
        error: validation.error,
      });
    }

    const response = {
      fileId,
      fileName: data.filename,
      fileSize: fs.statSync(tempPath).size,
      mimeType: data.mimetype,
    };

    reply.send(response);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to upload file',
      },
    });
  }
}

/**
 * Convert file handler
 */
export async function convertHandler(
  request: FastifyRequest<{ Params: { fileId: string } }>,
  reply: FastifyReply
) {
  const { fileId } = request.params;

  try {
    // Find input file (we store with original extension)
    const inputFiles = await fs.promises.readdir(config.tmpDir);
    const inputFile = inputFiles.find((f) => f.startsWith(fileId));

    if (!inputFile) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found. Please upload again.',
        },
      });
    }

    const inputPath = path.join(config.tmpDir, inputFile);

    // Get input metadata
    const inputMetadata = await getMediaMetadata(inputPath);

    // Run conversion
    const result = await convertFile(fileId, inputPath, inputMetadata);

    if (!result.success) {
      // Clean up input file
      await fs.promises.unlink(inputPath).catch(() => {});

      return reply.code(400).send({
        success: false,
        error: result.error,
        warnings: result.warnings,
      });
    }

    const response: ConversionResultResponse = {
      success: true,
      fileId,
      downloadUrl: `/api/download/${fileId}`,
      metadata: result.metadata!,
      warnings: result.warnings,
    };

    // Clean up input file after successful conversion
    await fs.promises.unlink(inputPath).catch(() => {});

    reply.send(response);
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Conversion failed',
      },
    });
  }
}

/**
 * Download file handler
 */
export async function downloadHandler(
  request: FastifyRequest<{ Params: { fileId: string } }>,
  reply: FastifyReply
) {
  const { fileId } = request.params;
  const filePath = getOutputPath(fileId);

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    const fileBuffer = await fs.promises.readFile(filePath);
    
    reply.header('Content-Type', 'video/webm');
    reply.header('Content-Disposition', `attachment; filename="${fileId}.webm"`);
    reply.send(fileBuffer);
  } catch {
    reply.code(404).send({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      },
    });
  }
}
