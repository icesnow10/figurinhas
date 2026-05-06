import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getRedisClient } from '@/resources/server/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COLECAO_PREFIX = 'figurinhas:colecao:';
const PERFIL_PADRAO = 'icesnow10';

type Estado = Record<string, number>;

function pegarPerfil(req: NextRequest): string {
  const id = new URL(req.url).searchParams.get('perfil');
  return id?.trim() || PERFIL_PADRAO;
}

function arquivoLocal(perfilId: string) {
  // Mantém colecao.json para Principal (icesnow10) e legado 'default'
  const ehPrincipal = perfilId === PERFIL_PADRAO || perfilId === 'default';
  const nome = ehPrincipal ? 'colecao.json' : `colecao_${perfilId}.json`;
  return path.join(process.cwd(), 'resources', 'data', nome);
}

async function lerLocal(perfilId: string): Promise<Estado> {
  try {
    const raw = await fs.readFile(arquivoLocal(perfilId), 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function escreverLocal(perfilId: string, dados: Estado) {
  await fs.writeFile(arquivoLocal(perfilId), JSON.stringify(dados, null, 2), 'utf-8');
}

async function ler(perfilId: string): Promise<Estado> {
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.hGetAll(`${COLECAO_PREFIX}${perfilId}`);
    return Object.fromEntries(
      Object.entries(data).map(([id, quantidade]) => [id, Number(quantidade)])
    );
  }
  return lerLocal(perfilId);
}

async function escreverTudo(perfilId: string, dados: Estado) {
  const redis = await getRedisClient();
  if (redis) {
    const key = `${COLECAO_PREFIX}${perfilId}`;
    await redis.del(key);
    if (Object.keys(dados).length) {
      await redis.hSet(
        key,
        Object.fromEntries(
          Object.entries(dados).map(([id, quantidade]) => [id, String(quantidade)])
        )
      );
    }
    return;
  }
  await escreverLocal(perfilId, dados);
}

async function atualizar(perfilId: string, id: string, quantidade: number) {
  const redis = await getRedisClient();
  if (redis) {
    const key = `${COLECAO_PREFIX}${perfilId}`;
    if (quantidade <= 0) await redis.hDel(key, id);
    else await redis.hSet(key, id, String(quantidade));
    return;
  }
  const dados = await lerLocal(perfilId);
  if (quantidade <= 0) delete dados[id];
  else dados[id] = quantidade;
  await escreverLocal(perfilId, dados);
}

export async function GET(req: NextRequest) {
  const perfilId = pegarPerfil(req);
  const dados = await ler(perfilId);
  return NextResponse.json(dados, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const perfilId = pegarPerfil(req);
  const body = await req.json();
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ erro: 'corpo inválido' }, { status: 400 });
  }
  await escreverTudo(perfilId, body as Estado);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const perfilId = pegarPerfil(req);
  const { id, quantidade } = (await req.json()) as { id?: string; quantidade?: number };
  if (!id || typeof quantidade !== 'number') {
    return NextResponse.json({ erro: 'id e quantidade obrigatórios' }, { status: 400 });
  }
  await atualizar(perfilId, id, quantidade);
  return NextResponse.json({ ok: true });
}
