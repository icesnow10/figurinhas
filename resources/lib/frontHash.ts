// dHash 17x16 perceptual hash + Hamming match para o scanner de frente.
// O hash gerado aqui DEVE bater bit-a-bit com o que scripts/generate-front-hashes.js
// produz a partir das imagens-fonte em /public/countries.

export type FrontHashItem = { id: string; h: string };

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

export type MatchResult = {
  id: string;
  distance: number;
  segundoMaisProximo: number;
};

export function rankearMatches(hash: string, items: FrontHashItem[]): MatchResult | null {
  let melhorId = '';
  let melhor = Infinity;
  let segundo = Infinity;
  for (let i = 0; i < items.length; i++) {
    const d = hammingHex(hash, items[i].h);
    if (d < melhor) {
      segundo = melhor;
      melhor = d;
      melhorId = items[i].id;
    } else if (d < segundo) {
      segundo = d;
    }
  }
  if (melhor === Infinity) return null;
  return { id: melhorId, distance: melhor, segundoMaisProximo: segundo };
}

export function findBestMatch(
  hash: string,
  items: FrontHashItem[],
  maxDistance: number,
  minGap = 0
): MatchResult | null {
  const melhor = rankearMatches(hash, items);
  if (!melhor) return null;
  if (melhor.distance > maxDistance) return null;
  if (melhor.segundoMaisProximo - melhor.distance < minGap) return null;
  return melhor;
}
