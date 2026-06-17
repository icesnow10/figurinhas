'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Skeleton, Tag } from 'antd';
import { Search, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { SelecaoCard } from '@/components/collection/SelecaoCard';
import { ConfederacaoCard } from '@/components/collection/ConfederacaoCard';
import { EspecialCard } from '@/components/collection/EspecialCard';
import { ColecaoChart } from '@/components/charts/ColecaoChart';
import { CompletudeChart } from '@/components/charts/CompletudeChart';
import { TopRepetidasChart } from '@/components/charts/TopRepetidasChart';
import { RankingUsuarios } from '@/components/ranking/RankingUsuarios';
import { SELECOES, CONFEDERACOES } from '@/resources/data/selecoes';
import { SECOES_ESPECIAIS } from '@/resources/data/especiais';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { useColecao } from '@/resources/hooks/useColecao';
import { useAdicionarComMcd } from '@/resources/hooks/usePerguntaMcd';

const DESTAQUE_SELECOES_IDS = [
  'BRA',
  'FRA',
  'ESP',
  'ARG',
  'ENG',
  'POR',
  'NED',
  'MAR',
  'BEL',
  'GER',
];

export default function Home() {
  const destaqueSelecoes = DESTAQUE_SELECOES_IDS.map((id) =>
    SELECOES.find((s) => s.id === id)
  ).filter((s): s is (typeof SELECOES)[number] => Boolean(s));
  const { carregado, quantidade, quantidadeSlot, remover, tem } = useColecao();
  const adicionarComMcd = useAdicionarComMcd();
  const [busca, setBusca] = useState('');
  const [focado, setFocado] = useState(false);
  const [ocultarWallOfShame, setOcultarWallOfShame] = useState(false);

  useEffect(() => {
    try {
      setOcultarWallOfShame(localStorage.getItem('figurinhas:ocultarWallOfShame') === '1');
    } catch {}
  }, []);

  const resultadosBusca = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoCompacto = termo.replace(/\s+/g, '');
    if (!termo) return [];
    const matchCodigo = termoCompacto.match(/^([a-z]+)0*(\d+)$/i);
    const matchPrefixoPais = SELECOES.some((s) => s.id.toLowerCase() === termoCompacto);

    return FIGURINHAS.filter((f) => {
      const codigo = f.codigo.toLowerCase();
      const nome = f.nome.toLowerCase();

      if (matchCodigo) {
        const [, prefixo, numero] = matchCodigo;
        return codigo === `${prefixo}${numero.padStart(2, '0')}`.toLowerCase();
      }

      if (matchPrefixoPais) return codigo.startsWith(termoCompacto);

      return codigo.includes(termoCompacto) || nome.includes(termo);
    })
      .slice(0, 24)
      .map((f) => f);
  }, [busca]);

  const mostrarSkeletonBusca = !carregado && busca.trim().length > 0;
  const mostrarResultadosBusca =
    focado && busca.trim().length > 0 && (mostrarSkeletonBusca || resultadosBusca.length > 0);
  const atualizarBusca = (valor: string) => {
    setBusca(valor.replace(/^(selecao|especial):/i, ''));
  };
  const esconderWallOfShame = () => {
    setOcultarWallOfShame(true);
    try {
      localStorage.setItem('figurinhas:ocultarWallOfShame', '1');
    } catch {}
  };
  const gastoEstimado = FIGURINHAS.reduce((total, figurinha) => {
    if (figurinha.selecaoId === 'COCA') return total;
    return total + quantidade(figurinha.id);
  }, 0);

  return (
    <>
      <Header />
      <div className="app-content">
        <div style={{ position: 'relative' }}>
          <Input
            size="large"
            placeholder="Buscar figurinhas, selecoes..."
            prefix={<Search size={16} color="#9aa6c9" />}
            allowClear
            value={busca}
            onChange={(e) => atualizarBusca(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={() => window.setTimeout(() => setFocado(false), 120)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              color: '#fff',
            }}
          />

          {mostrarResultadosBusca ? (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 20,
                maxHeight: 320,
                overflowY: 'auto',
                padding: 6,
                borderRadius: 12,
                background: '#0a1230',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 14px 34px rgba(0,0,0,0.35)',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {mostrarSkeletonBusca ? (
              <div style={{ padding: 8 }}>
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              </div>
              ) : (
                resultadosBusca.map((f) => {
                  const qtd = quantidade(f.id);
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 6px',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ color: '#22c55e', fontWeight: 800, minWidth: 48 }}>
                        {f.codigo}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 13,
                          color: '#e6ecff',
                        }}
                      >
                        {f.nome}
                      </span>
                      <Tag color={tem(f.id) ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                        {tem(f.id) ? `Tenho${qtd > 1 ? ` ${qtd}` : ''}` : 'Nao tenho'}
                      </Tag>
                      <Button
                        size="small"
                        shape="circle"
                        onClick={() => remover(f.id)}
                        disabled={qtd <= 0}
                      >
                        -
                      </Button>
                      <Button size="small" shape="circle" type="primary" onClick={() => adicionarComMcd(f.id)}>
                        +
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 14 }}>
          <ColecaoChart />
        </div>

        <div style={{ marginTop: 12 }}>
          <RankingUsuarios />
        </div>

        {!ocultarWallOfShame && (
          <div
            className="card"
            style={{
              marginTop: 12,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(127,29,29,0.42))',
              border: '1px solid rgba(248,113,113,0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              position: 'relative',
              paddingRight: 42,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fecaca', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                Wall of shame 😂
              </div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginTop: 3 }}>
                Voce ja gastou R$ {gastoEstimado.toLocaleString('pt-BR')} em figurinhas
              </div>
              <div style={{ color: '#fecaca', fontSize: 11, marginTop: 4 }}>
                Cada figurinha conta como R$ 1, exceto Coca-Cola. Trocas nao consideradas.
              </div>
            </div>
            <div
              style={{
                color: '#fff',
                fontSize: 24,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                marginRight: 0,
              }}
            >
              R$ {gastoEstimado.toLocaleString('pt-BR')}
            </div>
            <Button
              type="text"
              size="small"
              aria-label="Ocultar wall of shame"
              onClick={esconderWallOfShame}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#fecaca',
                fontSize: 11,
                fontWeight: 800,
                minWidth: 20,
                height: 20,
                padding: 0,
              }}
            >
              X
            </Button>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <CompletudeChart />
        </div>

        <div style={{ marginTop: 12 }}>
          <TopRepetidasChart />
        </div>

        <div className="section-title">
          <h3>Por Selecoes</h3>
          <Link href="/colecao">Ver todas</Link>
        </div>
        <div className="scroll-x">
          {destaqueSelecoes.map((s) => (
            <SelecaoCard key={s.id} selecao={s} />
          ))}
        </div>

        <div className="section-title">
          <h3>Por Confederacao</h3>
          <Link href="/colecao?tab=confederacoes">Ver todas</Link>
        </div>
        <div className="scroll-x">
          {CONFEDERACOES.map((c) => (
            <ConfederacaoCard key={c.id} {...c} />
          ))}
        </div>

        <div className="section-title">
          <h3>Especiais</h3>
          <Link href="/colecao/especiais">Ver todas</Link>
        </div>
        <div className="scroll-x">
          {SECOES_ESPECIAIS.map((sec) => (
            <EspecialCard key={sec.id} secao={sec} />
          ))}
        </div>

        <Link
          href="/colecao/especiais"
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 18,
            background: 'linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.04))',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={26} color="#000" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#fff' }}>Figurinhas Especiais</div>
            <div style={{ fontSize: 12, color: '#fde68a' }}>
              00, introducao, museu de campeoes e Coca-Cola
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
