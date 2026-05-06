import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getRedisClient } from '@/resources/server/redis';
import { clampLimite, lerLimite, salvarLimite } from '@/resources/server/limite';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PERFIS_KEY = 'figurinhas:perfis';
const PERFIS_FILE = path.join(process.cwd(), 'resources', 'data', 'perfis.json');

const MASTER_ID = 'icesnow10';
const MASTER_PIN = '1788';

async function contarPerfis(): Promise<number> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      const data = await redis.get(PERFIS_KEY);
      const lista = data ? (JSON.parse(data) as unknown[]) : [];
      return Array.isArray(lista) ? lista.length : 0;
    }
    const raw = await fs.readFile(PERFIS_FILE, 'utf-8');
    const lista = JSON.parse(raw || '[]') as unknown[];
    return Array.isArray(lista) ? lista.length : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const [limite, total] = await Promise.all([lerLimite(), contarPerfis()]);
  return NextResponse.json(
    { limite, total },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    limite?: number;
    perfilId?: string;
    pin?: string;
  };
  const { limite, perfilId, pin } = body;
  if (perfilId !== MASTER_ID || pin !== MASTER_PIN) {
    return NextResponse.json({ erro: 'nao autorizado' }, { status: 403 });
  }
  if (typeof limite !== 'number' || !Number.isFinite(limite)) {
    return NextResponse.json({ erro: 'limite invalido' }, { status: 400 });
  }
  const valor = clampLimite(limite);
  await salvarLimite(valor);
  return NextResponse.json({ limite: valor });
}
