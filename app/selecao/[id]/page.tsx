'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button, Progress, Tabs } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { SELECOES, formatarPaginas } from '@/resources/data/selecoes';
import { figurinhasPorSelecao } from '@/resources/data/figurinhas';
import { Sticker } from '@/components/sticker/Sticker';
import { useColecao } from '@/resources/hooks/useColecao';

export default function SelecaoPage() {
  const params = useParams();
  const router = useRouter();
  const { tem } = useColecao();

  const id = params?.id as string;
  const indiceSelecao = SELECOES.findIndex((s) => s.id === id);
  const selecao = indiceSelecao === -1 ? undefined : SELECOES[indiceSelecao];

  if (!selecao) {
    return (
      <div className="app-content">
        <Button onClick={() => router.back()} icon={<ArrowLeft size={16} />}>
          Voltar
        </Button>
        <p style={{ marginTop: 20 }}>Seleção não encontrada</p>
      </div>
    );
  }

  const figs = figurinhasPorSelecao(selecao.id);
  const coletadas = figs.filter((f) => tem(f.id)).length;
  const pct = (coletadas / figs.length) * 100;

  return (
    <div className="app-content">
      <Button
        type="text"
        icon={<ArrowLeft size={18} color="#fff" />}
        onClick={() => router.back()}
        style={{ color: '#fff', paddingLeft: 0, marginBottom: 8 }}
      >
        Voltar
      </Button>

      <div
        className="card"
        style={{
          background: `linear-gradient(135deg, ${selecao.cor}33, ${selecao.cor}10)`,
          borderColor: selecao.cor + '55',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 44 }}>{selecao.bandeira}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#9aa6c9', letterSpacing: 1 }}>SELEÇÃO</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
              {selecao.nome} <span style={{ color: '#9aa6c9', fontWeight: 600, fontSize: 16 }}>({selecao.id})</span>
            </div>
            <div style={{ fontSize: 12, color: '#9aa6c9' }}>
              {selecao.confederacao} • Grupo {selecao.grupo} • #{indiceSelecao + 1} · pg {formatarPaginas(selecao)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>
              {coletadas}/{figs.length}
            </div>
          </div>
        </div>
        <Progress
          percent={pct}
          showInfo={false}
          strokeColor="#22c55e"
          trailColor="rgba(255,255,255,0.08)"
          style={{ marginTop: 8 }}
        />
      </div>

      <Tabs
        defaultActiveKey="elenco"
        items={[
          {
            key: 'elenco',
            label: 'Elenco',
            children: (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {figs.map((s) => (
                  <Sticker key={s.id} sticker={s} size={78} />
                ))}
              </div>
            ),
          },
          {
            key: 'faltam',
            label: `Faltam (${figs.length - coletadas})`,
            children: (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {figs.filter((f) => !tem(f.id)).map((s) => (
                  <Sticker key={s.id} sticker={s} size={78} />
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
