// Gera public/scan-fronts.json com perceptual hashes (dHash 256-bit) das imagens
// referenciadas em IMAGENS_REAIS (resources/data/figurinhas.ts), filtrando pelo
// prefixo abaixo. Rodar manualmente quando adicionar/atualizar países do filtro:
//   npm run generate-front-hashes
//
// O hash usa dHash 17x16 grayscale: para cada linha de 17 pixels, gera 16 bits
// comparando pixel[c] < pixel[c+1]. 16 linhas * 16 bits = 256 bits = 64 chars hex.
// Distância Hamming < ~40 indica match forte; > ~80 = ruído.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FILTRO_PREFIXO = 'BRA';
const ROOT = path.join(__dirname, '..');
const ARQUIVO_FIGURINHAS = path.join(ROOT, 'resources', 'data', 'figurinhas.ts');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SAIDA = path.join(PUBLIC_DIR, 'scan-fronts.json');

function lerImagensReais() {
  const src = fs.readFileSync(ARQUIVO_FIGURINHAS, 'utf8');
  const inicio = src.indexOf('const IMAGENS_REAIS');
  if (inicio < 0) throw new Error('IMAGENS_REAIS não encontrado em figurinhas.ts');
  const abre = src.indexOf('{', inicio);
  let depth = 0;
  let fim = -1;
  for (let i = abre; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        fim = i;
        break;
      }
    }
  }
  if (fim < 0) throw new Error('Fim do bloco IMAGENS_REAIS não encontrado');
  const corpo = src.slice(abre + 1, fim);
  const re = /([A-Z0-9]+)\s*:\s*['"]([^'"]+)['"]/g;
  const map = {};
  let m;
  while ((m = re.exec(corpo))) {
    map[m[1]] = m[2];
  }
  return map;
}

async function dHashHex(arquivo) {
  const raw = await sharp(arquivo)
    .resize(17, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();
  const bits = Buffer.alloc(32);
  let bitIdx = 0;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const left = raw[row * 17 + col];
      const right = raw[row * 17 + col + 1];
      if (left < right) {
        bits[bitIdx >> 3] |= 1 << (bitIdx & 7);
      }
      bitIdx++;
    }
  }
  return bits.toString('hex');
}

(async () => {
  const imagens = lerImagensReais();
  const ids = Object.keys(imagens)
    .filter((id) => id.startsWith(FILTRO_PREFIXO))
    .sort();

  if (!ids.length) {
    console.error(`[front-hashes] nenhum id casa com prefixo "${FILTRO_PREFIXO}"`);
    process.exit(1);
  }

  const items = [];
  let ausentes = 0;
  for (const id of ids) {
    const rel = imagens[id].replace(/^\//, '');
    const abs = path.join(PUBLIC_DIR, rel);
    if (!fs.existsSync(abs)) {
      console.warn(`[front-hashes] AUSENTE ${id} -> ${rel}`);
      ausentes++;
      continue;
    }
    try {
      const h = await dHashHex(abs);
      items.push({ id, h });
    } catch (e) {
      console.error(`[front-hashes] FALHA ${id}: ${e.message}`);
      ausentes++;
    }
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    filtro: FILTRO_PREFIXO,
    algorithm: 'dHash-17x16-256bit',
    items,
  };
  fs.writeFileSync(SAIDA, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `[front-hashes] ${items.length}/${ids.length} (filtro ${FILTRO_PREFIXO}) hasheadas em ${path.relative(ROOT, SAIDA)}` +
      (ausentes ? ` — ${ausentes} ausentes/falhas` : '')
  );
})();
