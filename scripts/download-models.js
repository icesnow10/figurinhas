// Downloads @vladmandic/face-api model weights into public/models/
// Idempotent: skips files already present. Runs as postinstall.

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';
const OUT = path.resolve(__dirname, '..', 'public', 'models');

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  for (const name of FILES) {
    const dest = path.join(OUT, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      skipped++;
      continue;
    }
    process.stdout.write(`  fetching ${name} ... `);
    try {
      await download(`${BASE}/${name}`, dest);
      console.log('ok');
      downloaded++;
    } catch (err) {
      console.log(`FAILED (${err.message})`);
    }
  }
  console.log(`face-api models: ${downloaded} downloaded, ${skipped} cached at ${OUT}`);
}

main().catch((err) => {
  console.error('download-models failed:', err);
  process.exit(0); // do not break install
});
