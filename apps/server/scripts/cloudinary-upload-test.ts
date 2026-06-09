/**
 * Step 4 — Temporary upload validation.
 *
 * Usage: pnpm cloudinary:upload-test
 *
 * Pipeline:
 *   Local sample PNG → MediaService → CloudinaryAdapter → Cloudinary → metadata
 */
import '../src/load-env.js';
import { runUploadPipelineTest } from './lib/upload-pipeline-test.js';

try {
  console.log('Running upload pipeline test (isolated from complaint UI)...\n');

  const result = await runUploadPipelineTest();

  console.log('✓ Upload pipeline test passed\n');
  console.log('Upload result:');
  console.log(`  publicId:     ${result.publicId}`);
  console.log(`  secureUrl:    ${result.secureUrl}`);
  console.log(`  resourceType: ${result.resourceType}`);
  console.log(`  bytes:        ${result.bytes}`);
  console.log(`  format:       ${result.format}`);
  console.log('');
  console.log('Cloudinary Media Library:');
  console.log(`  folder:       ${result.mediaLibraryFolder}`);
  console.log(`  asset URL:    ${result.secureUrl}`);
  console.log('');
  console.log(
    'Open your Cloudinary dashboard → Media Library and browse the folder above to confirm the file is visible.',
  );
  console.log('');
  console.log('Test fixtures (DB only, not production UI):');
  console.log(`  complaintId:  ${result.complaintId}`);
  console.log(`  mediaAssetId: ${result.mediaAssetId}`);

  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(`✗ Upload pipeline test failed: ${message}`);
  process.exit(1);
}
