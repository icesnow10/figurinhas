import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getRedisClient, hasRedisUrl } from '@/resources/server/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AMIGOS_PREFIX = 'figurinhas:amigos:';
const PERFIS_KEY = 'figurinhas:perfis';
const PERFIS_FILE = path.join(process.cwd(), 'resources', 'data', 'perfis.json');

interface AmigoSalvo {
  id: string;
  nome: string;
}

interface PerfilArquivo {
  id: string;
  nome: string;
}

function semStoragePersistente() {
  return process.env.VERCEL === '1' && !hasRedisUrl();
}

function arquivoLocal(perfilId: string) {
  return path.join(
    process.cwd(),
    'resources',
    'data',
    `amigos_${perfilId}.json`
  );
}

async function lerLista(perfilId: string): Promise<AmigoSalvo[]> {
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.get(`${AMIGOS_PREFIX}${perfilId}`);
    if (!data) return [];
    try {
      const lista = JSON.parse(data) as AmigoSalvo[];
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }
  try {
    const raw = await fs.readFile(arquivoLocal(perfilId), 'utf-8');
    const lista = JSON.parse(raw || '[]') as AmigoSalvo[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

async function escreverLista(perfilId: string, amigos: AmigoSalvo[]) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(`${AMIGOS_PREFIX}${perfilId}`, JSON.stringify(amigos));
    return;
  }
  if (semStoragePersistente()) {
    throw new Error(
      'Storage persistente nao configurado. Configure REDIS_URL no Vercel.'
    );
  }
  await fs.writeFile(
    arquivoLocal(perfilId),
    JSON.stringify(amigos, null, 2),
    'utf-8'
  );
}

async function lerPerfis(): Promise<PerfilArquivo[]> {
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.get(PERFIS_KEY);
    if (!data) return [];
    try {
      const lista = JSON.parse(data) as PerfilArquivo[];
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }
  try {
    const raw = await fs.readFile(PERFIS_FILE, 'utf-8');
    const lista = JSON.parse(raw || '[]') as PerfilArquivo[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function pegarPerfil(req: NextRequest): string | null {
  const id = new URL(req.url).searchParams.get('perfil');
  return id?.trim() || null;
}

export async function GET(req: NextRequest) {
  const perfilId = pegarPerfil(req);
  if (!perfilId) {
    return NextResponse.json({ erro: 'perfil obrigatório' }, { status: 400 });
  }
  const amigos = await lerLista(perfilId);
  return NextResponse.json(
    { amigos },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const perfilId = pegarPerfil(req);
  if (!perfilId) {
    return NextResponse.json({ erro: 'perfil obrigatório' }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { nome?: string };
  const nomeBusca = body.nome?.trim();
  if (!nomeBusca) {
    return NextResponse.json({ erro: 'nome obrigatório' }, { status: 400 });
  }
  if (
    nomeBusca.toLocaleLowerCase('pt-BR') === perfilId.toLocaleLowerCase('pt-BR')
  ) {
    return NextResponse.json(
      { erro: 'nao pode adicionar voce mesmo' },
      { status: 400 }
    );
  }

  const perfis = await lerPerfis();
  const alvo = perfis.find(
    (p) =>
      p.nome.trim().toLocaleLowerCase('pt-BR') ===
        nomeBusca.toLocaleLowerCase('pt-BR') ||
      p.id.trim().toLocaleLowerCase('pt-BR') ===
        nomeBusca.toLocaleLowerCase('pt-BR')
  );
  if (!alvo) {
    return NextResponse.json(
      { erro: 'amigo nao encontrado', codigo: 'NAO_ENCONTRADO' },
      { status: 404 }
    );
  }
  if (alvo.id === perfilId) {
    return NextResponse.json(
      { erro: 'nao pode adicionar voce mesmo' },
      { status: 400 }
    );
  }

  const amigos = await lerLista(perfilId);
  if (amigos.some((a) => a.id === alvo.id)) {
    return NextResponse.json(
      { erro: 'amigo ja adicionado', codigo: 'JA_EXISTE', amigo: alvo },
      { status: 409 }
    );
  }
  const novo: AmigoSalvo = { id: alvo.id, nome: alvo.nome };
  const proximos = [...amigos, novo];
  await escreverLista(perfilId, proximos);
  return NextResponse.json({ amigo: novo, amigos: proximos });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const perfilId = url.searchParams.get('perfil')?.trim();
  const amigoId = url.searchParams.get('id')?.trim();
  if (!perfilId || !amigoId) {
    return NextResponse.json(
      { erro: 'perfil e id obrigatórios' },
      { status: 400 }
    );
  }
  const amigos = await lerLista(perfilId);
  const proximos = amigos.filter((a) => a.id !== amigoId);
  await escreverLista(perfilId, proximos);
  return NextResponse.json({ ok: true, amigos: proximos });
}
