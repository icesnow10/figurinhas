'use client';

import { useMemo, useState } from 'react';
import { Cpu, ChevronDown, ChevronRight } from 'lucide-react';
import { FACE_REFERENCES } from '@/resources/data/embeddings-all';

const LEGACY_LABEL = 'sem registro';

// Stacked bar palette — keeps "happy path" (tiny@416) green, fallbacks warmer
// the further down the cascade they got.
const COLOR: Record<string, string> = {
  'tiny@416': '#22c55e',
  'tiny@608': '#facc15',
  'tiny@800': '#f97316',
  'ssd@configured': '#a855f7',
  'ssd@0.3': '#a855f7',
  'ssd@0.2': '#7e22ce',
  [LEGACY_LABEL]: '#475569',
};

function colorFor(strategy: string): string {
  return COLOR[strategy] ?? '#94a3b8';
}

export function EmbeddingsStats() {
  const [aberto, setAberto] = useState(false);

  const { total, breakdown, naoPadrao } = useMemo(() => {
    const counts = new Map<string, number>();
    const naoPadrao: { code: string; player: string; strategy: string }[] = [];
    for (const e of FACE_REFERENCES) {
      const s = (e as any).strategy ?? LEGACY_LABEL;
      counts.set(s, (counts.get(s) ?? 0) + 1);
      if (s !== 'tiny@416' && s !== LEGACY_LABEL) {
        naoPadrao.push({ code: e.code, player: e.player, strategy: s });
      }
    }
    const ordemFixa = ['tiny@416', 'tiny@608', 'tiny@800', 'ssd@0.3', 'ssd@0.2', 'ssd@configured', LEGACY_LABEL];
    const breakdown = Array.from(counts.entries()).sort((a, b) => {
      const ia = ordemFixa.indexOf(a[0]);
      const ib = ordemFixa.indexOf(b[0]);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
    naoPadrao.sort((a, b) => a.code.localeCompare(b.code));
    return { total: FACE_REFERENCES.length, breakdown, naoPadrao };
  }, []);

  return (
    <div
      className="card"
      style={{
        padding: 14,
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(34,197,94,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Cpu size={22} color="#22c55e" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>
            Embeddings — modelo usado
          </div>
          <div style={{ fontSize: 11, color: '#9aa6c9', marginTop: 2 }}>
            {total} figurinhas com descritor facial
          </div>
        </div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 5,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {breakdown.map(([s, n]) => (
          <div
            key={s}
            title={`${s}: ${n}`}
            style={{ width: `${(n / total) * 100}%`, background: colorFor(s) }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {breakdown.map(([s, n]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colorFor(s) }} />
            <span style={{ color: '#fff', fontWeight: 600 }}>{s}</span>
            <span style={{ color: '#9aa6c9' }}>{n}</span>
            <span style={{ color: '#7f8aad', fontSize: 11 }}>
              ({((n / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      {naoPadrao.length > 0 && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: '#facc15',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {naoPadrao.length} figurinha{naoPadrao.length === 1 ? '' : 's'} precisaram de fallback
        </button>
      )}

      {aberto && naoPadrao.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 6,
            maxHeight: 260,
            overflow: 'auto',
            padding: 8,
            background: 'rgba(0,0,0,0.18)',
            borderRadius: 8,
          }}
        >
          {naoPadrao.map((e) => (
            <div
              key={e.code}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                fontSize: 11,
                padding: '4px 6px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: 'monospace',
                  }}
                >
                  {e.code}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: colorFor(e.strategy),
                    border: `1px solid ${colorFor(e.strategy)}`,
                    padding: '0 4px',
                    borderRadius: 3,
                  }}
                >
                  {e.strategy}
                </span>
              </div>
              <span style={{ color: '#9aa6c9' }}>{e.player}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
