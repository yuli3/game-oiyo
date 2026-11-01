import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * processSprite({
 *   inputPath: string,
 *   outputPath: string,
 *   targetSizes: number[], // e.g. [64, 128, 256]
 *   tolerance: number, // 0 - 255 (distance in RGB space)
 *   feather: number // pixels to smooth edges
 * })
 */
export async function makeTransparentSprite({
  inputPath,
  outputDir,
  baseName,
  sizes = [64, 128, 256],
  tolerance = 28,
  feather = 1.5,
}) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Extract raw RGBA
  const raw = await image.ensureAlpha().raw().toBuffer();

  // Background color sampling from corners (top-left, top-right, bottom-left, bottom-right)
  const sampleIndices = [
    0, // top-left
    (width - 1) * 4, // top-right
    (height - 1) * width * 4, // bottom-left
    ((height - 1) * width + (width - 1)) * 4, // bottom-right
  ];

  let avgR = 0, avgG = 0, avgB = 0;
  for (const idx of sampleIndices) {
    avgR += raw[idx];
    avgG += raw[idx + 1];
    avgB += raw[idx + 2];
  }
  const bgR = avgR / sampleIndices.length;
  const bgG = avgG / sampleIndices.length;
  const bgB = avgB / sampleIndices.length;

  const totalPixels = width * height;
  const alphaBuffer = Buffer.alloc(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = raw[offset];
    const g = raw[offset + 1];
    const b = raw[offset + 2];

    // Color distance in Euclidean space
    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );

    if (dist <= tolerance) {
      alphaBuffer[i] = 0; // Pure background
    } else if (dist <= tolerance + 35) {
      // Smooth feathering zone
      const ratio = (dist - tolerance) / 35;
      alphaBuffer[i] = Math.round(ratio * 255);
    } else {
      alphaBuffer[i] = 255; // Foreground
    }
  }

  // Create RGBA image with new alpha
  for (let i = 0; i < totalPixels; i++) {
    raw[i * 4 + 3] = alphaBuffer[i];
  }

  // Trim transparent edges and keep aspect ratio in square canvas
  const processed = sharp(raw, {
    raw: {
      width,
      height,
      channels: 4,
    },
  }).trim();

  const trimmedBuffer = await processed.toBuffer({ resolveWithObject: true });
  const trimmedWidth = trimmedBuffer.info.width;
  const trimmedHeight = trimmedBuffer.info.height;

  // Create square transparent canvas
  const maxDim = Math.max(trimmedWidth, trimmedHeight);
  const squareBase = await sharp(trimmedBuffer.data, {
    raw: {
      width: trimmedWidth,
      height: trimmedHeight,
      channels: 4,
    },
  })
    .extend({
      top: Math.floor((maxDim - trimmedHeight) / 2),
      bottom: Math.ceil((maxDim - trimmedHeight) / 2),
      left: Math.floor((maxDim - trimmedWidth) / 2),
      right: Math.ceil((maxDim - trimmedWidth) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const results = [];

  // Export each requested size in WebP and PNG
  for (const size of sizes) {
    const pngPath = path.join(outputDir, `${baseName}-${size}.png`);
    const webpPath = path.join(outputDir, `${baseName}-${size}.webp`);

    await sharp(squareBase)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 95, compressionLevel: 9 })
      .toFile(pngPath);

    await sharp(squareBase)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toFile(webpPath);

    results.push({ size, pngPath, webpPath });
  }

  // Also write canonical default (e.g. 128px) as baseName.png and baseName.webp
  const defaultPng = path.join(outputDir, `${baseName}.png`);
  const defaultWebp = path.join(outputDir, `${baseName}.webp`);
  await sharp(squareBase)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 95 })
    .toFile(defaultPng);
  await sharp(squareBase)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95, alphaQuality: 100 })
    .toFile(defaultWebp);

  console.log(`[process-sprite] Successfully generated ${baseName} in ${sizes.join(', ')}px (PNG & WebP)`);
  return { defaultPng, defaultWebp, variants: results };
}

// CLI execution check
if (process.argv[1]?.endsWith('process-sprite-transparency.mjs')) {
  const [, , input, outDir, name] = process.argv;
  if (input && outDir && name) {
    makeTransparentSprite({
      inputPath: input,
      outputDir: outDir,
      baseName: name,
    })
      .then((res) => console.log('Done:', res))
      .catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
      });
  }
}
