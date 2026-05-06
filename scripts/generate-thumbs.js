const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const COUNTRIES_DIR = path.join(__dirname, '..', 'public', 'countries');
const TARGET_WIDTH = 280;
const QUALITY = 70;

async function processFolder(folder) {
  const folderPath = path.join(COUNTRIES_DIR, folder);
  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) return;

  const thumbsDir = path.join(folderPath, 'thumbs');
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir);

  const files = fs.readdirSync(folderPath).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  for (const file of files) {
    const src = path.join(folderPath, file);
    const dst = path.join(thumbsDir, file.replace(/\.(jpe?g|png|webp)$/i, '.webp'));
    if (fs.existsSync(dst)) continue;
    try {
      await sharp(src)
        .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(dst);
      console.log(`✓ ${folder}/${file}`);
    } catch (e) {
      console.error(`✗ ${folder}/${file}: ${e.message}`);
    }
  }
}

(async () => {
  const folders = fs.readdirSync(COUNTRIES_DIR);
  for (const f of folders) await processFolder(f);
  console.log('Done.');
})();
