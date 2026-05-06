import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getRedisClient, hasRedisUrl } from '@/resources/server/redis';
import { lerLimite } from '@/resources/server/limite';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PERFIS_KEY = 'figurinhas:perfis';
const COLECAO_PREFIX = 'figurinhas:colecao:';
const PERFIS_FILE = path.join(process.cwd(), 'resources', 'data', 'perfis.json');

function semStoragePersistente() {
  return process.env.VERCEL === '1' && !hasRedisUrl();
}

export interface Perfil {
  id: string;
  nome: string;
  criadoEm: number;
  ultimoLoginEm?: number;
  pin?: string; // 4 dígitos, opcional
}

export interface PerfilPublico {
  id: string;
  nome: string;
  criadoEm: number;
  ultimoLoginEm?: number;
  temPin: boolean;
}

function publicar(p: Perfil): PerfilPublico {
  return {
    id: p.id,
    nome: p.nome,
    criadoEm: p.criadoEm,
    ultimoLoginEm: p.ultimoLoginEm,
    temPin: !!p.pin,
  };
}

async function lerLocal(): Promise<Perfil[]> {
  try {
    const raw = await fs.readFile(PERFIS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

async function escreverLocal(perfis: Perfil[]) {
  if (semStoragePersistente()) {
    throw new Error(
      'Storage persistente nao configurado. Configure REDIS_URL no Vercel.'
    );
  }
  await fs.writeFile(PERFIS_FILE, JSON.stringify(perfis, null, 2), 'utf-8');
}

const MASTER_ID = 'icesnow10';
const MASTER_PIN = '1788';
const MASTER_NOME = 'icesnow10';
const USERNAME_REGEX = /^[A-Za-z0-9]+$/;

async function lerPerfis(): Promise<Perfil[]> {
  let lista: Perfil[];
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.get(PERFIS_KEY);
    lista = data ? (JSON.parse(data) as Perfil[]) : [];
  } else {
    lista = await lerLocal();
  }
  // Bootstrap: garantir que o Principal (icesnow10) sempre existe com PIN 1788
  const idx = lista.findIndex((p) => p.id === MASTER_ID);
  if (idx < 0) {
    lista.unshift({
      id: MASTER_ID,
      nome: MASTER_NOME,
      criadoEm: Date.now(),
      pin: MASTER_PIN,
    });
    await salvarPerfis(lista);
  } else if (lista[idx].nome !== MASTER_NOME || lista[idx].pin !== MASTER_PIN) {
    lista[idx] = { ...lista[idx], nome: MASTER_NOME, pin: MASTER_PIN };
    await salvarPerfis(lista);
  }
  return lista;
}

async function salvarPerfis(perfis: Perfil[]) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(PERFIS_KEY, JSON.stringify(perfis));
    return;
  }
  await escreverLocal(perfis);
}

function novoId() {
  return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizarNome(nome: string) {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

function nomeUsuarioValido(nome: string) {
  const nomeLimpo = nome.trim();
  return nomeLimpo.length >= 3 && nomeLimpo.length <= 25 && USERNAME_REGEX.test(nomeLimpo);
}

export async function GET() {
  const perfis = await lerPerfis();
  return NextResponse.json(
    { perfis: perfis.map(publicar) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

function pinValido(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export async function POST(req: NextRequest) {
  try {
  const { nome, pin } = (await req.json()) as { nome?: string; pin?: string };
  if (!nome || !nomeUsuarioValido(nome)) {
    return NextResponse.json(
      { erro: 'usuario deve ter 3 a 25 caracteres, apenas letras e numeros' },
      { status: 400 }
    );
  }
  if (pin && !pinValido(pin)) {
    return NextResponse.json({ erro: 'pin deve ter 4 dígitos' }, { status: 400 });
  }
  const perfis = await lerPerfis();
  const nomeLimpo = nome.trim();
  const nomeNormalizado = normalizarNome(nomeLimpo);
  if (perfis.some((p) => normalizarNome(p.nome) === nomeNormalizado)) {
    return NextResponse.json({ erro: 'nome ja existe' }, { status: 409 });
  }
  const limite = await lerLimite();
  if (perfis.length >= limite) {
    return NextResponse.json(
      { erro: 'limite de usuarios atingido', codigo: 'LIMITE_ATINGIDO', limite },
      { status: 409 }
    );
  }
  const perfil: Perfil = {
    id: novoId(),
    nome: nomeLimpo,
    criadoEm: Date.now(),
    ...(pin ? { pin } : {}),
  };
  perfis.push(perfil);
  await salvarPerfis(perfis);
  return NextResponse.json({ perfil: publicar(perfil) });
  } catch (error) {
    console.error('Falha ao criar perfil', error);
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'falha ao salvar perfil' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });
  if (id === MASTER_ID) {
    return NextResponse.json(
      { erro: 'perfil principal não pode ser excluído' },
      { status: 403 }
    );
  }
  const perfis = await lerPerfis();
  const filtrados = perfis.filter((p) => p.id !== id);
  await salvarPerfis(filtrados);
  // remove a coleção do perfil também
  const redis = await getRedisClient();
  if (redis) {
    await redis.del(`${COLECAO_PREFIX}${id}`);
  } else {
    try {
      await fs.unlink(
        path.join(process.cwd(), 'resources', 'data', `colecao_${id}.json`)
      );
    } catch {}
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    nome?: string;
    pin?: string | null; // null para remover, string para definir
    pinAtual?: string; // necessário se trocar pin de perfil já protegido
  };
  const { id, nome, pin, pinAtual } = body;
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });
  const perfis = await lerPerfis();
  const idx = perfis.findIndex((p) => p.id === id);
  if (idx < 0) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
  const atual = perfis[idx];

  // se vai mexer no PIN, exigir o pin atual quando já existe
  const querMexerPin = pin === null || (typeof pin === 'string');
  if (querMexerPin && atual.pin) {
    if (pinAtual !== atual.pin) {
      return NextResponse.json({ erro: 'pin atual incorreto' }, { status: 401 });
    }
  }
  if (typeof pin === 'string' && !pinValido(pin)) {
    return NextResponse.json({ erro: 'pin deve ter 4 dígitos' }, { status: 400 });
  }

  const nomeLimpo = nome?.trim();
  if (nomeLimpo && !nomeUsuarioValido(nomeLimpo)) {
    return NextResponse.json(
      { erro: 'usuario deve ter 3 a 25 caracteres, apenas letras e numeros' },
      { status: 400 }
    );
  }

  const atualizado: Perfil = {
    ...atual,
    ...(nomeLimpo ? { nome: nomeLimpo } : {}),
  };
  if (pin === null) delete atualizado.pin;
  else if (typeof pin === 'string') atualizado.pin = pin;

  perfis[idx] = atualizado;
  await salvarPerfis(perfis);
  return NextResponse.json({ perfil: publicar(atualizado) });
}

export async function PUT(req: NextRequest) {
  // Verifica PIN: { id, pin } ou { nome, pin } -> { ok, perfil? }
  const { id, nome, pin } = (await req.json()) as {
    id?: string;
    nome?: string;
    pin?: string;
  };
  if ((!id && !nome) || !pin) {
    return NextResponse.json({ ok: false, erro: 'usuario e pin obrigatorios' }, { status: 400 });
  }
  const perfis = await lerPerfis();
  const idx = id
    ? perfis.findIndex((x) => x.id === id)
    : perfis.findIndex(
        (x) =>
          normalizarNome(x.nome) === normalizarNome(nome ?? '') ||
          normalizarNome(x.id) === normalizarNome(nome ?? '')
      );
  if (idx < 0) return NextResponse.json({ ok: false }, { status: 404 });

  const p = perfis[idx];
  const ok = !p.pin || p.pin === pin;
  let perfilLogado = p;
  if (ok) {
    perfilLogado = { ...p, ultimoLoginEm: Date.now() };
    perfis[idx] = perfilLogado;
    try {
      await salvarPerfis(perfis);
    } catch (error) {
      console.error('Falha ao registrar ultimo login', error);
    }
  }

  return NextResponse.json({
    ok,
    perfil: ok ? publicar(perfilLogado) : undefined,
  });
}
