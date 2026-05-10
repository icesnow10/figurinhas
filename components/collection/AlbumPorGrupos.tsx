'use client';

import { SELECOES, GRUPOS_COPA } from '@/resources/data/selecoes';
import { SelecaoCard, type DensidadeCard } from './SelecaoCard';
import type { Selecao } from '@/resources/types';
import { figurinhasPorSelecao } from '@/resources/data/figurinhas';
import { useColecao } from '@/resources/hooks/useColecao';

export type OrdemPaises = 'alfabetica' | 'grupos' | 'completude';
export type DirecaoOrdem = 'asc' | 'desc';
export type FiltroCompletude = 'todas' | 'completas' | 'incompletas';

interface Props {
  busca?: string;
  ordem?: OrdemPaises;
  direcao?: DirecaoOrdem;
  completude?: FiltroCompletude;
  densidade?: DensidadeCard;
}

const COLUNAS_GRUPOS: Record<DensidadeCard, number> = {
  pequeno: 4,
  medio: 2,
  grande: 1,
};

const COLUNAS_ALFA: Record<DensidadeCard, number> = {
  pequeno: 3,
  medio: 1,
  grande: 1,
};

function filtrarSelecoes(busca: string) {
  const termo = busca.trim().toLowerCase();
  return SELECOES.filter(
    (s) =>
      !termo ||
      s.nome.toLowerCase().includes(termo) ||
      s.id.toLowerCase().includes(termo)
  );
}

function razaoCompletude(selecaoId: string, tem: (id: string) => boolean): number {
  const figs = figurinhasPorSelecao(selecaoId);
  if (!figs.length) return 0;
  const coletadas = figs.filter((f) => tem(f.id)).length;
  return coletadas / figs.length;
}

function ordenarPorNome(selecoes: Selecao[], direcao: DirecaoOrdem) {
  return [...selecoes].sort((a, b) => {
    const resultado = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    return direcao === 'asc' ? resultado : -resultado;
  });
}

function gradeSelecoes(
  selecoes: Selecao[],
  colunas: number,
  densidade: DensidadeCard
) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${colunas}, 1fr)`,
        gap: densidade === 'pequeno' ? 6 : 10,
      }}
    >
      {selecoes.map((s) => (
        <SelecaoCard key={s.id} selecao={s} densidade={densidade} />
      ))}
    </div>
  );
}

export function AlbumPorGrupos({
  busca = '',
  ordem = 'grupos',
  direcao = 'asc',
  completude = 'todas',
  densidade = 'medio',
}: Props) {
  const { tem } = useColecao();

  const filtrarPorCompletude = (sels: Selecao[]) => {
    if (completude === 'todas') return sels;
    return sels.filter((s) => {
      const figs = figurinhasPorSelecao(s.id);
      const coletadas = figs.filter((f) => tem(f.id)).length;
      const completa = figs.length > 0 && coletadas === figs.length;
      return completude === 'completas' ? completa : !completa;
    });
  };

  const selecoesFiltradas = filtrarPorCompletude(filtrarSelecoes(busca));

  if (ordem === 'alfabetica') {
    return (
      <div style={{ marginTop: 12 }}>
        {gradeSelecoes(
          ordenarPorNome(selecoesFiltradas, direcao),
          COLUNAS_ALFA[densidade],
          densidade
        )}
      </div>
    );
  }

  if (ordem === 'completude') {
    // Most complete first when direcao=asc (mirrors mental "best first"); flip
    // for desc. Ties broken by name to keep ordering stable.
    const ordenado = [...selecoesFiltradas].sort((a, b) => {
      const ra = razaoCompletude(a.id, tem);
      const rb = razaoCompletude(b.id, tem);
      if (rb !== ra) return direcao === 'asc' ? rb - ra : ra - rb;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
    return (
      <div style={{ marginTop: 12 }}>
        {gradeSelecoes(ordenado, COLUNAS_ALFA[densidade], densidade)}
      </div>
    );
  }

  const grupos = direcao === 'asc' ? GRUPOS_COPA : [...GRUPOS_COPA].reverse();

  return (
    <div>
      {grupos.map((grupo) => {
        const sels = ordenarPorNome(
          selecoesFiltradas.filter((s) => s.grupo === grupo),
          direcao
        );
        if (!sels.length) return null;

        return (
          <div key={grupo} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '12px 0 8px',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: '#22c55e',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {grupo}
              </div>
              <h3 style={{ margin: 0, fontSize: 15, color: '#fff', fontWeight: 700 }}>
                Grupo {grupo}
              </h3>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
            {gradeSelecoes(sels, COLUNAS_GRUPOS[densidade], densidade)}
          </div>
        );
      })}
    </div>
  );
}
