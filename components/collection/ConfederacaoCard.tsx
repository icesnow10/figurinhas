'use client';

import { Progress } from 'antd';
import { useColecao } from '@/resources/hooks/useColecao';
import { SELECOES } from '@/resources/data/selecoes';
import { FIGURINHAS } from '@/resources/data/figurinhas';

interface Props {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  compacto?: boolean;
}

export function ConfederacaoCard({ id, nome, cor, icone, compacto = false }: Props) {
  const { temSlot } = useColecao();
  const selecoesIds = SELECOES.filter((s) => s.confederacao === id).map((s) => s.id);
  const figs = FIGURINHAS.filter(
    (f) => f.selecaoId && selecoesIds.includes(f.selecaoId) && !f.slotDeId
  );
  const total = figs.length;
  const coletadas = figs.filter((f) => temSlot(f.id)).length;
  const pct = total > 0 ? (coletadas / total) * 100 : 0;

  if (compacto) {
    return (
      <div
        style={{
          fontSize: 11,
          color: '#9aa6c9',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {coletadas} / {total}
      </div>
    );
  }

  return (
    <div className="card" style={{ minWidth: 110, padding: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: cor + '22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 6px',
          fontSize: 22,
        }}
      >
        {icone}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: '#fff' }}>
        {nome}
      </div>
      <div style={{ fontSize: 11, color: '#9aa6c9', fontWeight: 600, textAlign: 'center' }}>
        {coletadas} / {total}
      </div>
      <Progress
        percent={pct}
        showInfo={false}
        size="small"
        strokeColor={cor}
        trailColor="rgba(255,255,255,0.08)"
      />
    </div>
  );
}
