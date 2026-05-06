import { promises as fs } from 'fs';
import path from 'path';
import { getRedisClient, hasRedisUrl } from './redis';

const LIMITE_KEY = 'figurinhas:limite';
const LIMITE_FILE = path.join(process.cwd(), 'resources', 'data', 'limite.json');

export const LIMITE_PADRAO = 50;
export const LIMITE_MIN = 1;
export const LIMITE_MAX = 5000;

function semStoragePersistente() {
  return process.env.VERCEL === '1' && !hasRedisUrl();
}

export async function lerLimite(): Promise<number> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      const valor = await redis.get(LIMITE_KEY);
      const n = valor ? Number(valor) : NaN;
      return Number.isFinite(n) && n > 0 ? n : LIMITE_PADRAO;
    }
    const raw = await fs.readFile(LIMITE_FILE, 'utf-8');
    const dados = JSON.parse(raw || '{}') as { limite?: number };
    return typeof dados.limite === 'number' && dados.limite > 0
      ? dados.limite
      : LIMITE_PADRAO;
  } catch {
    return LIMITE_PADRAO;
  }
}

export async function salvarLimite(limite: number) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(LIMITE_KEY, String(limite));
    return;
  }
  if (semStoragePersistente()) {
    throw new Error('Storage persistente nao configurado. Configure REDIS_URL no Vercel.');
  }
  await fs.writeFile(LIMITE_FILE, JSON.stringify({ limite }, null, 2), 'utf-8');
}

export function clampLimite(n: number) {
  return Math.max(LIMITE_MIN, Math.min(LIMITE_MAX, Math.floor(n)));
}
