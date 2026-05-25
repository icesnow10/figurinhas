'use client';

import { Button, Empty, Radio, Select, type RefSelectProps } from 'antd';
import { History, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/layout/SearchBar';
import { HistoricoModal } from '@/components/historico/HistoricoModal';
import { Sticker } from '@/components/sticker/Sticker';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { SELECOES, formatarPaginas } from '@/resources/data/selecoes';
import { useColecao } from '@/resources/hooks/useColecao';
import { useHistorico } from '@/resources/hooks/useHistorico';
import { usePersistedState } from '@/resources/hooks/usePersistedState';
import type { Sticker as StickerType } from '@/resources/types';

type FiltroStatus = 'todas' | 'tenho' | 'repetidas' | 'nao_tenho';
type OrdemChecklist = 'grupos' | 'alfabetica' | 'alfabetica-en' | 'completude';

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function ChecklistPage() {
  const { temSlot, duplicadasSlot } = useColecao();
  const { itens: historico } = useHistorico();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(() => searchParams?.get('busca') ?? '');
  const [pais, setPais] = usePersistedState<string | null>(
    'figurinhas:checklist:pais',
    null
  );
  const [status, setStatus] = usePersistedState<FiltroStatus>(
    'figurinhas:checklist:status',
    'todas'
  );
  const [ordem, setOrdem] = usePersistedState<OrdemChecklist>(
    'figurinhas:checklist:ordem',
    'grupos'
  );
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const paisesSelectRef = useRef<RefSelectProps>(null);

  // Snapshot persistido dos IDs que casam com o filtro atual. Só é recalculado
  // quando `status` ou `pais` mudam — assim, marcar/desmarcar uma figurinha não
  // a remove da visão atual. Navegar entre páginas, ordenar ou buscar também
  // não invalida o snapshot.
  type Snapshot = { key: string; ids: string[] };
  const [snapshot, setSnapshot] = usePersistedState<Snapshot | null>(
    'figurinhas:checklist:snapshot',
    null
  );
  const temSlotRef = useRef(temSlot);
  const duplicadasSlotRef = useRef(duplicadasSlot);
  useEffect(() => {
    temSlotRef.current = temSlot;
    duplicadasSlotRef.current = duplicadasSlot;
  });

  const snapshotKey = `${status}|${pais ?? ''}`;
  useEffect(() => {
    if (status === 'todas') {
      if (snapshot !== null) setSnapshot(null);
      return;
    }
    if (snapshot?.key === snapshotKey) return;
    const tem = temSlotRef.current;
    const dup = duplicadasSlotRef.current;
    const ids = FIGURINHAS.filter((f) => {
      if (f.slotDeId) return false;
      if (pais && f.selecaoId !== pais) return false;
      if (status === 'tenho' && !tem(f.id)) return false;
      if (status === 'repetidas' && dup(f.id) <= 0) return false;
      if (status === 'nao_tenho' && tem(f.id)) return false;
      return true;
    }).map((f) => f.id);
    setSnapshot({ key: snapshotKey, ids });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotKey, status, pais]);

  const opcoesPaises = useMemo(
    () =>
      SELECOES.map((s) => ({
        label: `${s.bandeira} ${s.nome} (${s.id})`,
        value: s.id,
      })),
    []
  );

  const lista = useMemo(() => {
    const termo = semAcento(busca.trim().replace(/\s+/g, ''));
    const matchPrefixo = termo.match(/^([a-z]+)0*(\d+)$/i);
    const snapshotValido =
      status !== 'todas' && snapshot?.key === snapshotKey ? new Set(snapshot.ids) : null;

    return FIGURINHAS.filter((f) => {
      if (f.slotDeId) return false;
      if (termo) {
        const cod = semAcento(f.codigo);
        const nome = semAcento(f.nome);
        let bate = cod.includes(termo) || nome.includes(termo);
        if (!bate && matchPrefixo) {
          const [, prefix, num] = matchPrefixo;
          const codAlvo = semAcento(`${prefix}${num.padStart(2, '0')}`);
          if (cod === codAlvo) bate = true;
        }
        if (!bate) return false;
      }

      if (pais && f.selecaoId !== pais) {
        return false;
      }

      if (status !== 'todas') {
        if (snapshotValido) {
          if (!snapshotValido.has(f.id)) return false;
        } else {
          if (status === 'tenho' && !temSlot(f.id)) return false;
          if (status === 'repetidas' && duplicadasSlot(f.id) <= 0) return false;
          if (status === 'nao_tenho' && temSlot(f.id)) return false;
        }
      }

      return true;
    });
  }, [busca, pais, status, snapshot, snapshotKey, temSlot, duplicadasSlot]);

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
            <SearchBar
              value={busca}
              onChange={setBusca}
              placeholder="Ex: BRA1, GER15, Messi..."
            />
          </div>

          <div>
            <label style={filterLabelStyle}>Paises</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
              <Select
                ref={paisesSelectRef}
                showSearch
                value={pais ?? undefined}
                onChange={(valor) => {
                  setPais(valor ?? null);
                  paisesSelectRef.current?.blur();
                }}
                placeholder="Todas as selecoes"
                options={opcoesPaises}
                style={{ flex: 1, minWidth: 0 }}
                size="large"
                filterOption={(input, opt) =>
                  semAcento(String(opt?.label ?? '')).includes(semAcento(input))
                }
              />
              <button
                type="button"
                onClick={() => {
                  if (pais) setPais(null);
                  paisesSelectRef.current?.blur();
                }}
                aria-label={pais ? 'Limpar pais selecionado' : 'Confirmar selecao'}
                style={{
                  minWidth: 48,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: pais ? '#dc2626' : '#16a34a',
                  color: '#fff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                {pais ? <X size={20} /> : <Search size={20} />}
              </button>
            </div>
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

          <div>
            <label style={filterLabelStyle}>Ordenar</label>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              options={[
                { label: 'Grupos', value: 'grupos' },
                { label: 'A-Z PT', value: 'alfabetica' },
                { label: 'A-Z EN', value: 'alfabetica-en' },
                { label: 'Completude', value: 'completude' },
              ]}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#9aa6c9' }}>
          {lista.length} figurinha{lista.length !== 1 ? 's' : ''} encontrada
          {lista.length !== 1 ? 's' : ''}
        </div>

        {lista.length === 0 && status !== 'nao_tenho' ? (
          <div style={{ marginTop: 24 }}>
            <Empty description="Nenhuma figurinha com esses filtros" />
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>{renderBlocos(lista, temSlot, ordem, status, pais)}</div>
        )}
      </div>
      <HistoricoModal aberto={historicoAberto} onFechar={() => setHistoricoAberto(false)} />
    </>
  );
}

function renderBlocos(
  lista: StickerType[],
  tem: (id: string) => boolean,
  ordem: OrdemChecklist,
  status: FiltroStatus,
  paisSelecionado: string | null
) {
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

  // Quando o filtro "Não tenho" está ativo, países completos não aparecem em
  // `porSelecao` porque já não restam slots faltantes. Aqui calculamos o total
  // real por seleção para detectar esses casos e mostrar o header como completo.
  const totaisPorSelecao = new Map<string, number>();
  if (status === 'nao_tenho') {
    FIGURINHAS.forEach((f) => {
      if (f.slotDeId) return;
      if (f.tipo !== 'selecao' || !f.selecaoId) return;
      totaisPorSelecao.set(f.selecaoId, (totaisPorSelecao.get(f.selecaoId) ?? 0) + 1);
    });
  }

  const blocos: React.ReactNode[] = [];

  // Build the country list in the requested order. SELECOES is already grouped
  // by `grupo` then by intra-group order, so 'grupos' just reuses it.
  const selecoesOrdenadas = [...SELECOES];
  if (ordem === 'alfabetica') {
    selecoesOrdenadas.sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    );
  } else if (ordem === 'alfabetica-en') {
    selecoesOrdenadas.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  } else if (ordem === 'completude') {
    selecoesOrdenadas.sort((a, b) => {
      const figsA = porSelecao.get(a.id) ?? [];
      const figsB = porSelecao.get(b.id) ?? [];
      const ratioA = figsA.length ? figsA.filter((f) => tem(f.id)).length / figsA.length : -1;
      const ratioB = figsB.length ? figsB.filter((f) => tem(f.id)).length / figsB.length : -1;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
  }

  selecoesOrdenadas.forEach((sel) => {
    const figs = porSelecao.get(sel.id);
    const total = totaisPorSelecao.get(sel.id) ?? 0;
    const completo =
      status === 'nao_tenho' && !figs?.length && total > 0 && (!paisSelecionado || paisSelecionado === sel.id);
    if (!figs?.length && !completo) return;
    const prefixoGrupo = ordem === 'grupos' && sel.grupo ? `Grupo ${sel.grupo} · ` : '';
    const numero = SELECOES.findIndex((s) => s.id === sel.id) + 1;
    const sufixoEn = sel.nomeEn && sel.nomeEn !== sel.nome ? ` / ${sel.nomeEn}` : '';
    blocos.push(
      <GrupoFigurinhas
        key={sel.id}
        titulo={`${prefixoGrupo}#${numero} · pg ${formatarPaginas(sel)} ${sel.bandeira} ${sel.nome}${sufixoEn} (${sel.id})`}
        cor={sel.cor}
        figs={figs ?? []}
        tem={tem}
        completoSemFaltantes={completo ? total : undefined}
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
  completoSemFaltantes,
}: {
  titulo: string;
  cor: string;
  figs: StickerType[];
  tem: (id: string) => boolean;
  completoSemFaltantes?: number;
}) {
  const ehCompleto = completoSemFaltantes !== undefined;
  const coletadas = ehCompleto ? completoSemFaltantes : figs.filter((f) => tem(f.id)).length;
  const totalExibido = ehCompleto ? completoSemFaltantes : figs.length;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 8px' }}>
        <div style={{ width: 6, height: 18, borderRadius: 3, background: cor }} />
        <h3 style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 700 }}>{titulo}</h3>
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: coletadas >= totalExibido ? '#22c55e' : '#9aa6c9',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          {coletadas}/{totalExibido}
        </div>
        {ehCompleto && (
          <div
            style={{
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Completo
          </div>
        )}
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      {figs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {figs.map((s) => (
            <Sticker key={s.id} sticker={s} size={78} />
          ))}
        </div>
      )}
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
