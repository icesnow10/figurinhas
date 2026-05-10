// Precomputes face embeddings for the brazil country folder using
// @vladmandic/face-api in Node (tfjs-node + canvas patch).
//
// Output: resources/data/embeddings-brazil.json
//
// Requires native build tools (tfjs-node + canvas). Works on macOS / Linux
// out of the box; on Windows you need MSVC Build Tools installed.
// If the install fails, the alternative path documented in the branch README
// is to drive the figurinhas-test sandbox via a browser to generate the bundle.
//
// Install (one-time): npm install --save-dev @tensorflow/tfjs-node canvas
// Run:                 npm run generate-embeddings-brazil

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const COUNTRY = 'brazil';
const IMG_DIR = path.join(ROOT, 'public', 'countries', COUNTRY);
const MODELS_DIR = path.join(ROOT, 'public', 'models');
const OUT_FILE = path.join(ROOT, 'resources', 'data', 'embeddings-brazil.json');

async function main() {
  const tf = require('@tensorflow/tfjs-node');
  const faceapi = require('@vladmandic/face-api');
  const { Canvas, Image, ImageData, loadImage } = require('canvas');
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

  console.log(`tfjs backend: ${tf.getBackend()}`);

  console.log('loading models from', MODELS_DIR);
  await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR);

  const files = fs.readdirSync(IMG_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  console.log(`processing ${files.length} images from ${IMG_DIR}`);

  const FIG_DATA_PATH = path.join(ROOT, 'resources', 'data', 'figurinhas.ts');
  const figSrc = fs.readFileSync(FIG_DATA_PATH, 'utf8');
  // Map filename → sticker code via the IMAGENS_REAIS map in figurinhas.ts
  const codeByFile = new Map();
  const imagensRealRe = /'([A-Z]{3}\d{1,3})':\s*'\/countries\/(\w+)\/(\w+\.\w+)'/g;
  let m;
  while ((m = imagensRealRe.exec(figSrc))) {
    if (m[2] === COUNTRY) {
      codeByFile.set(m[3], m[1]);
    }
  }

  const entries = [];
  let skipped = 0;
  for (const file of files) {
    const abs = path.join(IMG_DIR, file);
    try {
      const img = await loadImage(abs);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log(`  skip (no face): ${file}`);
        skipped++;
        continue;
      }

      const codeMatch = file.match(/^([a-z]{3})(\d{2,3})_(.+)\.(jpe?g|png|webp)$/i);
      const code = codeByFile.get(file) ?? (codeMatch ? `${codeMatch[1].toUpperCase()}${codeMatch[2]}` : file);
      const player = codeMatch ? codeMatch[3].replace(/_/g, ' ') : '';
      const stickerId = code;

      entries.push({
        stickerId,
        code,
        player,
        url: `/countries/${COUNTRY}/${file}`,
        descriptor: Array.from(detection.descriptor),
      });
      console.log(`  ok: ${file} → ${code}`);
    } catch (err) {
      console.log(`  fail: ${file} (${err.message})`);
      skipped++;
    }
  }

  const bundle = {
    modelVersion: '@vladmandic/face-api',
    builtAt: new Date().toISOString(),
    detector: 'tiny_face_detector',
    scope: COUNTRY,
    entries,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle));
  console.log(`\nwrote ${entries.length} embeddings (${skipped} skipped) → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
