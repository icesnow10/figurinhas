import { FIGURINHAS } from '@/resources/data/figurinhas';
import type { Sticker } from '@/resources/types';

export function normalizarCodigo(raw: string): string {
  const limpo = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!limpo) return '';
  if (/^\d+$/.test(limpo)) {
    if (limpo === '00' || limpo === '0') return '00';
    const n = parseInt(limpo, 10);
    if (n >= 1 && n <= 99) return `FWC${n}`;
    return limpo;
  }
  const m = limpo.match(/^([A-Z]{3})0*(\d+)$/);
  if (m) return `${m[1]}${m[2].padStart(2, '0')}`;
  return limpo;
}

export function extrairCodigosCandidatos(texto: string): string[] {
  const upper = texto.toUpperCase();
  const matches = new Set<string>();
  // 3 letras + 1-2 dígitos (BRA02, FRA10, etc.)
  const reTime = /\b([A-Z]{3})\s?0?(\d{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = reTime.exec(upper))) {
    matches.add(`${m[1]}${m[2].padStart(2, '0')}`);
  }
  // FWC + número (especiais)
  const reFwc = /\bFWC\s?(\d{1,2})\b/g;
  while ((m = reFwc.exec(upper))) {
    matches.add(`FWC${parseInt(m[1], 10)}`);
  }
  // "00" isolado (logo)
  if (/\b00\b/.test(upper)) matches.add('00');
  return Array.from(matches);
}

export function buscarFigurinha(codigo: string): Sticker | undefined {
  if (!codigo) return undefined;
  return FIGURINHAS.find((f) => f.codigo.toUpperCase() === codigo);
}
