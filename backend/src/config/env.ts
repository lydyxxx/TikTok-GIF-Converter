/**
 * Environment configuration
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  host: string;
  maxFileSize: number;
  tmpDir: string;
  outputDir: string;
  defaultFps: number;
  defaultBitrate: number;
  maxCompressionPasses: number;
  minQuality: number;
}

export const config: Config = {
  nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '127.0.0.1',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  tmpDir: process.env.TMP_DIR || path.resolve(__dirname, '../../tmp'),
  outputDir: process.env.OUTPUT_DIR || path.resolve(__dirname, '../../outputs'),
  defaultFps: parseInt(process.env.DEFAULT_FPS || '30', 10),
  defaultBitrate: parseInt(process.env.DEFAULT_BITRATE || '500', 10), // kbps
  maxCompressionPasses: parseInt(process.env.MAX_COMPRESSION_PASSES || '5', 10),
  minQuality: parseFloat(process.env.MIN_QUALITY || '0.5'),
};

// Ensure directories exist
import fs from 'fs';
[config.tmpDir, config.outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
