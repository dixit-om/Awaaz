/**
 * Step 3 — Cloudinary connectivity test.
 * Verifies API credentials via Cloudinary Admin API ping (no upload).
 *
 * Usage: pnpm cloudinary:test
 */
import '../src/load-env.js';
import { verifyCloudinaryConnectivity } from '@awaaz/media';

try {
  await verifyCloudinaryConnectivity();
  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(`✗ Cloudinary connectivity failed: ${message}`);
  process.exit(1);
}
