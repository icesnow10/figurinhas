// Matching de frente da figurinha — duas assinaturas combinadas:
//   1. dHash 17x16 (256 bits) — captura a "forma" da imagem (gradientes locais)
//   2. Histograma HSV (apenas H+S, 12x6 bins) — captura a paleta de cores
//      ignorando brilho (V), pra ser robusto a iluminação variável.
// O score final é uma soma ponderada dos dois (60% hash + 40% cor).
// As funções deste arquivo DEVEM bater bit-a-bit com scripts/generate-front-hashes.js.

export type FrontHashItem = { id: string; h: string; c?: string };

export type FrontHashesPayload = {
  version: number;
  generatedAt: string;
  filtro: string;
  algorithm: string;
  items: FrontHashItem[];
};

const POPCOUNT = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let n = i;
    let c = 0;
    while (n) {
      c += n & 1;
      n >>= 1;
    }
    t[i] = c;
  }
  return t;
})();

// ---------- dHash ----------

export function computeDHashFromImageData(img: ImageData): string {
  if (img.width !== 17 || img.height !== 16) {
    throw new Error(`computeDHashFromImageData: esperado 17x16, recebido ${img.width}x${img.height}`);
  }
  const data = img.data;
  const gray = new Uint8Array(17 * 16);
  for (let i = 0; i < 17 * 16; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const bits = new Uint8Array(32);
  let bitIdx = 0;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const left = gray[row * 17 + col];
      const right = gray[row * 17 + col + 1];
      if (left < right) {
        bits[bitIdx >> 3] |= 1 << (bitIdx & 7);
      }
      bitIdx++;
    }
  }
  let hex = '';
  for (let i = 0; i < bits.length; i++) {
    hex += bits[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export function hammingHex(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  const ba = hexToBytes(a);
  const bb = hexToBytes(b);
  let dist = 0;
  for (let i = 0; i < ba.length; i++) {
    dist += POPCOUNT[ba[i] ^ bb[i]];
  }
  return dist;
}

// ---------- Histograma HSV ----------

// Computa histograma 2D HxS (12x6 = 72 bins) a partir de um ImageData RGB.
// Mesma lógica do script Node — output sqrt-encoded uint8 hex.
export function computeColorHistFromImageData(img: ImageData): string {
  const data = img.data;
  const total = img.width * img.height;
  const bins = new Float32Array(72);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta > 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max > 0 ? delta / max : 0;
    const hBin = Math.min(11, Math.floor(h / 30));
    const sBin = Math.min(5, Math.floor(s * 6));
    bins[hBin * 6 + sBin]++;
  }
  let hex = '';
  for (let i = 0; i < 72; i++) {
    const norm = bins[i] / total;
    const q = Math.min(255, Math.round(Math.sqrt(norm) * 255));
    hex += q.toString(16).padStart(2, '0');
  }
  return hex;
}

// Distância Bhattacharyya: 1 - sum(sqrt(a*b)). Range [0, 1], menor = mais
// parecido. Robusto a histogramas esparsos.
export function bhattacharyyaHex(aHex: string, bHex: string): number {
  if (aHex.length !== bHex.length) return 1;
  const a = hexToBytes(aHex);
  const b = hexToBytes(bHex);
  // bins armazenados como sqrt(p)*255 — desfaz o sqrt antes de comparar
  let sumA = 0;
  let sumB = 0;
  const pa = new Float32Array(a.length);
  const pb = new Float32Array(b.length);
  for (let i = 0; i < a.length; i++) {
    pa[i] = (a[i] / 255) ** 2;
    pb[i] = (b[i] / 255) ** 2;
    sumA += pa[i];
    sumB += pb[i];
  }
  // re-normaliza por causa de erros de quantização
  if (sumA <= 0 || sumB <= 0) return 1;
  let bc = 0;
  for (let i = 0; i < a.length; i++) {
    bc += Math.sqrt((pa[i] / sumA) * (pb[i] / sumB));
  }
  return Math.max(0, 1 - bc);
}

// ---------- Ranking combinado ----------

export type MatchResult = {
  id: string;
  hashDist: number; // 0..256
  colorDist: number; // 0..1
  score: number; // combinado, 0..1
  scoreSegundoMaisProximo: number;
};

export type RankConfig = {
  hashWeight: number;
  colorWeight: number;
};

const DEFAULT_RANK: RankConfig = { hashWeight: 0.6, colorWeight: 0.4 };

// Ranqueia TODOS os items e devolve os top-K em ordem ascendente de score.
// Cada elemento tem o score do PRÓXIMO no ranking como segundoMaisProximo,
// pra preservar a noção de "gap até o próximo candidato" usada nos gates.
export function rankearTopK(
  hashHex: string,
  colorHex: string | null,
  items: FrontHashItem[],
  k = 3,
  config: RankConfig = DEFAULT_RANK
): MatchResult[] {
  if (!items.length) return [];
  const todos: { id: string; hd: number; cd: number; score: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const hd = hammingHex(hashHex, items[i].h);
    const itemCor = items[i].c;
    const cd = colorHex && itemCor ? bhattacharyyaHex(colorHex, itemCor) : 0.5;
    const score = config.hashWeight * (hd / 256) + config.colorWeight * cd;
    todos.push({ id: items[i].id, hd, cd, score });
  }
  todos.sort((a, b) => a.score - b.score);
  const out: MatchResult[] = [];
  const limite = Math.min(k, todos.length);
  for (let i = 0; i < limite; i++) {
    const t = todos[i];
    const proximo = todos[i + 1];
    out.push({
      id: t.id,
      hashDist: t.hd,
      colorDist: t.cd,
      score: t.score,
      scoreSegundoMaisProximo: proximo ? proximo.score : 1,
    });
  }
  return out;
}

export function rankearMatches(
  hashHex: string,
  colorHex: string | null,
  items: FrontHashItem[],
  config: RankConfig = DEFAULT_RANK
): MatchResult | null {
  const top = rankearTopK(hashHex, colorHex, items, 1, config);
  return top[0] ?? null;
}
