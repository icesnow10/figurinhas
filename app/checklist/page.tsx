'use client';

import { Button, Empty, Input, Radio, Select } from 'antd';
import { History, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { HistoricoModal } from '@/components/historico/HistoricoModal';
import { Sticker } from '@/components/sticker/Sticker';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { SELECOES } from '@/resources/data/selecoes';
import { useColecao } from '@/resources/hooks/useColecao';
import { useHistorico } from '@/resources/hooks/useHistorico';
import type { Sticker as StickerType } from '@/resources/types';

type FiltroStatus = 'todas' | 'tenho' | 'repetidas' | 'nao_tenho';

export default function ChecklistPage() {
  const { temSlot, duplicadasSlot } = useColecao();
  const { itens: historico } = useHistorico();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(() => searchParams?.get('busca') ?? '');
  const [paises, setPaises] = useState<string[]>([]);
  const [status, setStatus] = useState<FiltroStatus>('todas');
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const opcoesPaises = useMemo(
    () =>
      SELECOES.map((s) => ({
        label: `${s.bandeira} ${s.nome} (${s.id})`,
        value: s.id,
      })),
    []
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace(/\s+/g, '');
    const matchPrefixo = termo.match(/^([a-z]+)0*(\d+)$/i);

    return FIGURINHAS.filter((f) => {
      if (f.slotDeId) return false;
      if (termo) {
        const cod = f.codigo.toLowerCase();
        const nome = f.nome.toLowerCase();
        let bate = cod.includes(termo) || nome.includes(termo);
        if (!bate && matchPrefixo) {
          const [, prefix, num] = matchPrefixo;
          const codAlvo = `${prefix}${num.padStart(2, '0')}`.toLowerCase();
          if (cod === codAlvo) bate = true;
        }
        if (!bate) return false;
      }

      if (paises.length > 0 && (!f.selecaoId || !paises.includes(f.selecaoId))) {
        return false;
      }

      if (status === 'tenho' && !temSlot(f.id)) return false;
      if (status === 'repetidas' && duplicadasSlot(f.id) <= 0) return false;
      if (status === 'nao_tenho' && temSlot(f.id)) return false;

      return true;
    });
  }, [busca, paises, status, temSlot, duplicadasSlot]);

  return (
    <>
      <Header />
      <div className="app-content">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 8,
          }}
        >
          <div style={{ color: '#9aa6c9', fontSize: 12 }}>
            {historico.length > 0
              ? `${historico.length} adicionada${historico.length > 1 ? 's' : ''} recentemente`
              : 'Sem adições recentes'}
          </div>
          <Button
            size="small"
            icon={<History size={14} />}
            onClick={() => setHistoricoAberto(true)}
          >
            Recém-adicionadas
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={filterLabelStyle}>Busca rapida</label>
            <Input
              size="large"
              allowClear
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: BRA1, GER15, Messi..."
              prefix={<Search size={16} color="#9aa6c9" />}
            />
          </div>

          <div>
            <label style={filterLabelStyle}>Paises</label>
            <Select
              mode="multiple"
              allowClear
              value={paises}
              onChange={setPaises}
              placeholder="Todas as selecoes"
              options={opcoesPaises}
              maxTagCount="responsive"
              style={{ width: '100%' }}
              size="large"
              filterOption={(input, opt) =>
                String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          <div>
            <label style={filterLabelStyle}>Filtro</label>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'Todas', value: 'todas' },
                { label: 'Tenho', value: 'tenho' },
                { label: 'Repetidas', value: 'repetidas' },
                { label: 'Nao tenho', value: 'nao_tenho' },
              ]}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#9aa6c9' }}>
          {lista.length} figurinha{lista.length !== 1 ? 's' : ''} encontrada
          {lista.length !== 1 ? 's' : ''}
        </div>

        {lista.length === 0 ? (
          <div style={{ marginTop: 24 }}>
            <Empty description="Nenhuma figurinha com esses filtros" />
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>{renderBlocos(lista, temSlot)}</div>
        )}
      </div>
      <HistoricoModal aberto={historicoAberto} onFechar={() => setHistoricoAberto(false)} />
    </>
  );
}

function renderBlocos(lista: StickerType[], tem: (id: string) => boolean) {
  const porSelecao = new Map<string, StickerType[]>();
  const especiais: StickerType[] = [];

  lista.forEach((f) => {
    if (f.tipo === 'selecao' && f.selecaoId) {
      if (!porSelecao.has(f.selecaoId)) porSelecao.set(f.selecaoId, []);
      porSelecao.get(f.selecaoId)!.push(f);
    } else {
      especiais.push(f);
    }
  });

  const blocos: React.ReactNode[] = [];

  SELECOES.forEach((sel) => {
    const figs = porSelecao.get(sel.id);
    if (!figs?.length) return;
    blocos.push(
      <GrupoFigurinhas
        key={sel.id}
        titulo={`${sel.bandeira} ${sel.nome} (${sel.id})`}
        cor={sel.cor}
        figs={figs}
        tem={tem}
      />
    );
  });

  if (especiais.length) {
    const ordemIntro = ['00', 'FWC1', 'FWC3', 'FWC2', 'FWC5', 'FWC4', 'FWC6', 'FWC7', 'FWC8'];
    const idxIntro = (c: string) => {
      const i = ordemIntro.indexOf(c);
      return i === -1 ? 999 : i;
    };
    const intro = especiais
      .filter((s) => s.codigo === '00' || /^FWC[1-8]$/.test(s.codigo))
      .sort((a, b) => idxIntro(a.codigo) - idxIntro(b.codigo));
    const campeoes = especiais.filter((s) => {
      const m = /^FWC(\d+)$/.exec(s.codigo);
      if (!m) return false;
      const n = Number(m[1]);
      return n >= 9 && n <= 19;
    });
    const coca = especiais.filter((s) => /^CC\d{2}$/.test(s.codigo));
    const mcd = especiais.filter((s) => /^MCD[A-Z]{3}13$/.test(s.codigo));

    if (intro.length) {
      blocos.push(
        <GrupoFigurinhas key="__intro__" titulo="Introdução" cor="#FFD700" figs={intro} tem={tem} />
      );
    }
    if (campeoes.length) {
      blocos.push(
        <GrupoFigurinhas key="__campeoes__" titulo="Campeões" cor="#C9A961" figs={campeoes} tem={tem} />
      );
    }
    if (coca.length) {
      blocos.push(
        <GrupoFigurinhas key="__coca__" titulo="Coca-Cola" cor="#E41E2B" figs={coca} tem={tem} />
      );
    }
    if (mcd.length) {
      blocos.push(
        <GrupoFigurinhas key="__mcd__" titulo="McDonald's #13" cor="#FFC72C" figs={mcd} tem={tem} />
      );
    }
  }

  return blocos;
}

function GrupoFigurinhas({
  titulo,
  cor,
  figs,
  tem,
}: {
  titulo: string;
  cor: string;
  figs: StickerType[];
  tem: (id: string) => boolean;
}) {
  const coletadas = figs.filter((f) => tem(f.id)).length;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 8px' }}>
        <div style={{ width: 6, height: 18, borderRadius: 3, background: cor }} />
        <h3 style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 700 }}>{titulo}</h3>
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: coletadas >= figs.length ? '#22c55e' : '#9aa6c9',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          {coletadas}/{figs.length}
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {figs.map((s) => (
          <Sticker key={s.id} sticker={s} size={78} />
        ))}
      </div>
    </div>
  );
}

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#9aa6c9',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  marginBottom: 4,
  fontWeight: 600,
};
