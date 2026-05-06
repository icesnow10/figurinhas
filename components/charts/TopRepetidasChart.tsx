'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Empty } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useColecao } from '@/resources/hooks/useColecao';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { SELECOES } from '@/resources/data/selecoes';

interface LinhaTop {
  id: string;
  nome: string;
  bandeira: string;
  cor: string;
  repetidas: number;
  href: string;
}

const LIMITE = 10;

export function TopRepetidasChart() {
  const { estado } = useColecao();
  const [aberto, setAberto] = useState(false);

  const linhas = useMemo<LinhaTop[]>(() => {
    const porSelecao = new Map<string, number>();
    FIGURINHAS.forEach((f) => {
      if (f.tipo !== 'selecao' || !f.selecaoId) return;
      const qtd = estado[f.id] ?? 0;
      const dup = Math.max(0, qtd - 1);
      if (dup <= 0) return;
      porSelecao.set(f.selecaoId, (porSelecao.get(f.selecaoId) ?? 0) + dup);
    });
    return SELECOES.map((s) => ({
      id: s.id,
      nome: s.nome,
      bandeira: s.bandeira,
      cor: s.cor,
      repetidas: porSelecao.get(s.id) ?? 0,
      href: `/selecao/${s.id}`,
    }))
      .filter((l) => l.repetidas > 0)
      .sort((a, b) => b.repetidas - a.repetidas)
      .slice(0, LIMITE);
  }, [estado]);

  const max = linhas[0]?.repetidas ?? 0;
  const totalTop = linhas.reduce((acc, l) => acc + l.repetidas, 0);

  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown
            size={16}
            color="#9aa6c9"
            style={{
              transition: 'transform 0.2s ease',
              transform: aberto ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            Top {LIMITE} países com repetidas
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            color: '#f59e0b',
            fontWeight: 700,
            background: 'rgba(245,158,11,0.15)',
            padding: '2px 8px',
            borderRadius: 999,
          }}
        >
          {totalTop} no top
        </span>
      </button>

      {!aberto ? null : linhas.length === 0 ? (
        <Empty
          description="Nenhuma figurinha repetida ainda"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {linhas.map((l, idx) => {
            const pct = max > 0 ? (l.repetidas / max) * 100 : 0;
            const barWidth = Math.max(pct, 4);
            return (
              <Link
                key={l.id}
                href={l.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '6px 4px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
                title={`Abrir ${l.nome}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#9aa6c9',
                      fontWeight: 700,
                      width: 18,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>
                    {l.bandeira}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#e6ecff',
                      fontWeight: 600,
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {l.nome}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#f59e0b',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {l.repetidas}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${barWidth}%`,
                      background: l.cor,
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
