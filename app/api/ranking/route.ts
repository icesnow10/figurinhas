import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getRedisClient } from '@/resources/server/redis';
import { FIGURINHAS, idsAlternativosDoSlot } from '@/resources/data/figurinhas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PERFIS_KEY = 'figurinhas:perfis';
const COLECAO_PREFIX = 'figurinhas:colecao:';
const PERFIS_FILE = path.join(process.cwd(), 'resources', 'data', 'perfis.json');
const PERFIL_PADRAO = 'icesnow10';

interface PerfilRaw {
  id: string;
  nome: string;
}

type Estado = Record<string, number>;

const SLOTS_ALBUM = FIGURINHAS.filter((f) => !f.slotDeId);
const TOTAL_ALBUM = SLOTS_ALBUM.length;

async function lerPerfis(): Promise<PerfilRaw[]> {
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.get(PERFIS_KEY);
    return data ? (JSON.parse(data) as PerfilRaw[]) : [];
  }
  try {
    const raw = await fs.readFile(PERFIS_FILE, 'utf-8');
    return JSON.parse(raw || '[]') as PerfilRaw[];
  } catch {
    return [];
  }
}

function arquivoLocalColecao(perfilId: string) {
  const ehPrincipal = perfilId === PERFIL_PADRAO || perfilId === 'default';
  const nome = ehPrincipal ? 'colecao.json' : `colecao_${perfilId}.json`;
  return path.join(process.cwd(), 'resources', 'data', nome);
}

async function lerColecao(perfilId: string): Promise<Estado> {
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.hGetAll(`${COLECAO_PREFIX}${perfilId}`);
    return Object.fromEntries(
      Object.entries(data).map(([id, quantidade]) => [id, Number(quantidade)])
    );
  }
  try {
    const raw = await fs.readFile(arquivoLocalColecao(perfilId), 'utf-8');
    return JSON.parse(raw || '{}') as Estado;
  } catch {
    return {};
  }
}

function calcular(estado: Estado) {
  const coletadas = SLOTS_ALBUM.filter((f) =>
    idsAlternativosDoSlot(f.id).some((alt) => (estado[alt] ?? 0) > 0)
  ).length;
  const faltantes = TOTAL_ALBUM - coletadas;
  const percentual = TOTAL_ALBUM > 0 ? Math.round((coletadas / TOTAL_ALBUM) * 100) : 0;
  return { coletadas, totalAlbum: TOTAL_ALBUM, faltantes, percentual };
}

export async function GET() {
  const perfis = await lerPerfis();
  const ranking = await Promise.all(
    perfis.map(async (p) => {
      const estado = await lerColecao(p.id);
      return { id: p.id, nome: p.nome, ...calcular(estado) };
    })
  );
  ranking.sort(
    (a, b) =>
      b.coletadas - a.coletadas ||
      b.percentual - a.percentual ||
      a.nome.localeCompare(b.nome, 'pt-BR')
  );
  return NextResponse.json(
    { ranking },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
