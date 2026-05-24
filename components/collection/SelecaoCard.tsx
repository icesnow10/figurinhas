'use client';

import Link from 'next/link';
import { Progress } from 'antd';
import type { Selecao } from '@/resources/types';
import { useColecao } from '@/resources/hooks/useColecao';
import { figurinhasPorSelecao } from '@/resources/data/figurinhas';
import { SELECOES, formatarPaginas } from '@/resources/data/selecoes';

export type DensidadeCard = 'pequeno' | 'medio' | 'grande';

interface Props {
  selecao: Selecao;
  densidade?: DensidadeCard;
}

const ESCALAS: Record<
  DensidadeCard,
  {
    padding: number;
    gap: number;
    bandeira: number;
    nome: number;
    counter: number;
    minWidth: number;
    minHeight: number;
  }
> = {
  pequeno: {
    padding: 6,
    gap: 3,
    bandeira: 22,
    nome: 11,
    counter: 10,
    minWidth: 70,
    minHeight: 104,
  },
  medio: {
    padding: 10,
    gap: 6,
    bandeira: 36,
    nome: 13,
    counter: 11,
    minWidth: 110,
    minHeight: 142,
  },
  grande: {
    padding: 14,
    gap: 8,
    bandeira: 52,
    nome: 16,
    counter: 13,
    minWidth: 150,
    minHeight: 190,
  },
};

export function SelecaoCard({ selecao, densidade = 'medio' }: Props) {
  const { temSlot } = useColecao();
  const figs = figurinhasPorSelecao(selecao.id);
  const coletadas = figs.filter((f) => temSlot(f.id)).length;
  const completa = coletadas === figs.length;
  const e = ESCALAS[densidade];
  const paginasLabel = formatarPaginas(selecao);
  const numero = SELECOES.findIndex((s) => s.id === selecao.id) + 1;

  return (
    <Link
      href={`/selecao/${selecao.id}`}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: e.gap,
        padding: e.padding,
        minWidth: e.minWidth,
        minHeight: e.minHeight,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        title={`Seleção #${numero} · páginas ${paginasLabel} do álbum`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontSize: Math.max(8, e.counter - 2),
          color: '#9aa6c9',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        <span
          style={{
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 5px',
            borderRadius: 5,
          }}
        >
          #{numero}
        </span>
        <span
          style={{
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 5px',
            borderRadius: 5,
          }}
        >
          pg {paginasLabel}
        </span>
      </div>
      <div style={{ textAlign: 'center', fontSize: e.bandeira, lineHeight: 1 }}>
        {selecao.bandeira}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: e.nome,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {selecao.nome}{' '}
        <span style={{ color: '#9aa6c9', fontWeight: 600 }}>({selecao.id})</span>
        {selecao.nomeEn !== selecao.nome && (
          <div
            style={{
              fontSize: Math.max(9, e.nome - 2),
              color: '#9aa6c9',
              fontWeight: 500,
              fontStyle: 'italic',
              lineHeight: 1.1,
              marginTop: 1,
            }}
          >
            {selecao.nomeEn}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: e.counter,
          color: completa ? '#22c55e' : '#9aa6c9',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {coletadas} / {selecao.totalFigurinhas}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 2 }}>
        <Progress
          percent={(coletadas / selecao.totalFigurinhas) * 100}
          showInfo={false}
          size="small"
          strokeColor={completa ? '#22c55e' : selecao.cor}
          trailColor="rgba(255,255,255,0.08)"
          style={{ marginBottom: -4 }}
        />
      </div>
    </Link>
  );
}
