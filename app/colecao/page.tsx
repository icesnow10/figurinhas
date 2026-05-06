'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Radio, Tabs } from 'antd';
import { useSearchParams } from 'next/navigation';
import { Minus, Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import {
  AlbumPorGrupos,
  type DirecaoOrdem,
  type FiltroCompletude,
  type OrdemPaises,
} from '@/components/collection/AlbumPorGrupos';
import { SelecaoCard, type DensidadeCard } from '@/components/collection/SelecaoCard';
import { ConfederacaoCard } from '@/components/collection/ConfederacaoCard';
import { DangerZone } from '@/components/collection/DangerZone';
import { Sticker } from '@/components/sticker/Sticker';
import { figurinhasEspeciais } from '@/resources/data/figurinhas';
import { CONFEDERACOES, SELECOES } from '@/resources/data/selecoes';
import { useColecao } from '@/resources/hooks/useColecao';

const DENSIDADE_KEY = 'figurinhas:colecao:densidade';
const DENSIDADES: DensidadeCard[] = ['pequeno', 'medio', 'grande'];
const ROTULOS_DENSIDADE: Record<DensidadeCard, string> = {
  pequeno: 'Pequeno',
  medio: 'Medio',
  grande: 'Grande',
};

export default function ColecaoPage() {
  const { recarregar } = useColecao();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(() =>
    searchParams?.get('tab') === 'confederacoes' ? 'confederacoes' : 'paises'
  );
  const [ordem, setOrdem] = useState<OrdemPaises>('grupos');
  const [direcao, setDirecao] = useState<DirecaoOrdem>('asc');
  const [completude, setCompletude] = useState<FiltroCompletude>('todas');
  const [densidade, setDensidade] = useState<DensidadeCard>('pequeno');
  const especiais = figurinhasEspeciais();

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(DENSIDADE_KEY) as DensidadeCard | null;
      if (salvo && DENSIDADES.includes(salvo)) setDensidade(salvo);
    } catch {}
  }, []);

  const trocarDensidade = (proxima: DensidadeCard) => {
    setDensidade(proxima);
    try {
      localStorage.setItem(DENSIDADE_KEY, proxima);
    } catch {}
  };

  const idx = DENSIDADES.indexOf(densidade);
  const aumentar = () => idx < DENSIDADES.length - 1 && trocarDensidade(DENSIDADES[idx + 1]);
  const diminuir = () => idx > 0 && trocarDensidade(DENSIDADES[idx - 1]);
  const termoConfederacao = busca.trim().toLowerCase();
  const confederacoesComSelecoes = CONFEDERACOES.map((c) => {
    const confBate =
      !termoConfederacao ||
      c.id.toLowerCase().includes(termoConfederacao) ||
      c.nome.toLowerCase().includes(termoConfederacao);
    const selecoes = SELECOES.filter((s) => {
      if (s.confederacao !== c.id) return false;
      if (confBate) return true;
      return (
        s.id.toLowerCase().includes(termoConfederacao) ||
        s.nome.toLowerCase().includes(termoConfederacao)
      );
    });
    return { ...c, selecoes };
  }).filter((c) => c.selecoes.length > 0);

  return (
    <>
      <Header />
      <div className="app-content">
        <Input
          size="large"
          placeholder="Buscar pais ou codigo (BRA, GER, ...)"
          prefix={<Search size={16} color="#9aa6c9" />}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ marginBottom: 8 }}
        />

        <Tabs
          activeKey={abaAtiva}
          onChange={(key) => {
            setAbaAtiva(key);
            recarregar();
          }}
          items={[
            {
              key: 'paises',
              label: 'Paises',
              children: (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                      value={ordem}
                      onChange={(e) => setOrdem(e.target.value)}
                      options={[
                        { label: 'Grupos', value: 'grupos' },
                        { label: 'Alfabetica', value: 'alfabetica' },
                      ]}
                    />
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                      value={direcao}
                      onChange={(e) => setDirecao(e.target.value)}
                      options={[
                        { label: 'Asc', value: 'asc' },
                        { label: 'Desc', value: 'desc' },
                      ]}
                    />
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                      value={completude}
                      onChange={(e) => setCompletude(e.target.value)}
                      options={[
                        { label: 'Todas', value: 'todas' },
                        { label: 'Completas', value: 'completas' },
                        { label: 'Incompletas', value: 'incompletas' },
                      ]}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#9aa6c9', fontWeight: 600 }}>
                        Tamanho
                      </span>
                      <Button
                        size="small"
                        shape="circle"
                        icon={<Minus size={12} />}
                        disabled={idx <= 0}
                        onClick={diminuir}
                        aria-label="Diminuir cards"
                      />
                      <span
                        style={{
                          minWidth: 60,
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {ROTULOS_DENSIDADE[densidade]}
                      </span>
                      <Button
                        size="small"
                        shape="circle"
                        type="primary"
                        icon={<Plus size={12} />}
                        disabled={idx >= DENSIDADES.length - 1}
                        onClick={aumentar}
                        aria-label="Aumentar cards"
                      />
                    </div>
                  </div>
                  <AlbumPorGrupos
                    busca={busca}
                    ordem={ordem}
                    direcao={direcao}
                    completude={completude}
                    densidade={densidade}
                  />
                </>
              ),
            },
            {
              key: 'especiais',
              label: 'Especiais',
              children: (() => {
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

                const secao = (titulo: string, cor: string, list: typeof especiais) =>
                  list.length ? (
                    <section key={titulo} style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px' }}>
                        <div style={{ width: 6, height: 18, borderRadius: 3, background: cor }} />
                        <h3 style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 700 }}>{titulo}</h3>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 8,
                        }}
                      >
                        {list.map((s) => (
                          <Sticker key={s.id} sticker={s} size={78} />
                        ))}
                      </div>
                    </section>
                  ) : null;

                return (
                  <div style={{ marginTop: 8 }}>
                    {secao('Introdução', '#FFD700', intro)}
                    {secao('Campeões', '#C9A961', campeoes)}
                    {secao('Coca-Cola', '#E41E2B', coca)}
                    {secao("McDonald's #13", '#FFC72C', mcd)}
                  </div>
                );
              })(),
            },
            {
              key: 'confederacoes',
              label: 'Confederacao',
              children: (
                <div style={{ marginTop: 8 }}>
                  {confederacoesComSelecoes.map((conf) => (
                    <div key={conf.id} style={{ marginBottom: 18 }}>
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
                            background: conf.cor,
                            color: '#000',
                            fontWeight: 800,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {conf.icone}
                        </div>
                        <h3 style={{ margin: 0, fontSize: 15, color: '#fff', fontWeight: 700 }}>
                          {conf.nome}
                        </h3>
                        <ConfederacaoCard {...conf} compacto />
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 6,
                        }}
                      >
                        {conf.selecoes.map((s) => (
                          <SelecaoCard key={s.id} selecao={s} densidade="pequeno" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />

        <DangerZone />
      </div>
    </>
  );
}
