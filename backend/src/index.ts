/**
 * Backend entry point for ttgifconv - TikTok to Telegram Sticker Converter
 */
import { buildApp } from './app.js';
import { config } from './config/env.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`🚀 Server running at http://${config.host}:${config.port}`);
    console.log(`📁 Uploads directory: ${config.tmpDir}`);
    console.log(`💾 Outputs directory: ${config.outputDir}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
