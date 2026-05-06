'use client';

import Link from 'next/link';
import { Progress } from 'antd';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { useColecao } from '@/resources/hooks/useColecao';
import type { SecaoEspecial } from '@/resources/types';

interface Props {
  secao: SecaoEspecial;
}

export function EspecialCard({ secao }: Props) {
  const { tem } = useColecao();
  const figs = FIGURINHAS.filter((f) => f.tipo === 'especial' && f.selecaoId === secao.id);
  const total = figs.length || secao.totalFigurinhas;
  const coletadas = figs.filter((f) => tem(f.id)).length;
  const pct = total > 0 ? (coletadas / total) * 100 : 0;
  const completa = total > 0 && coletadas >= total;

  return (
    <Link
      href="/colecao/especiais"
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 110,
        minHeight: 132,
        padding: 10,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: secao.cor + '22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          fontSize: secao.icone.length > 1 ? 15 : 22,
          fontWeight: 900,
          color: secao.cor,
        }}
      >
        {secao.icone}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          color: '#fff',
          lineHeight: 1.2,
        }}
      >
        {secao.nome}
      </div>
      <div
        style={{
          fontSize: 11,
          color: completa ? '#22c55e' : '#9aa6c9',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {coletadas} / {total}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Progress
          percent={pct}
          showInfo={false}
          size="small"
          strokeColor={completa ? '#22c55e' : secao.cor}
          trailColor="rgba(255,255,255,0.08)"
        />
      </div>
    </Link>
  );
}
