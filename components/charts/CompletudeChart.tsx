'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Empty, Input, Segmented } from 'antd';
import { CheckCircle2, Search } from 'lucide-react';
import { useColecao } from '@/resources/hooks/useColecao';
import { FIGURINHAS, idsAlternativosDoSlot } from '@/resources/data/figurinhas';
import { SELECOES } from '@/resources/data/selecoes';
import { SECOES_ESPECIAIS } from '@/resources/data/especiais';

type Aba = 'selecoes' | 'especiais';

interface LinhaProgresso {
  id: string;
  rotulo: string;
  cor: string;
  coletadas: number;
  total: number;
  prefixo: string;
  href: string;
}

export function CompletudeChart() {
  const { estado } = useColecao();
  const [aba, setAba] = useState<Aba>('selecoes');
  const [busca, setBusca] = useState('');

  const { selecoes, especiais } = useMemo(() => {
    const porSelecao = new Map<string, { total: number; coletadas: number }>();
    const porEspecial = new Map<string, { total: number; coletadas: number }>();

    FIGURINHAS.forEach((f) => {
      if (f.slotDeId) return;
      if (f.tipo === 'selecao' && f.selecaoId) {
        const cur = porSelecao.get(f.selecaoId) ?? { total: 0, coletadas: 0 };
        cur.total += 1;
        // Considera variantes alternativas (ex.: McDonald's #13) como o mesmo slot.
        const possui = idsAlternativosDoSlot(f.id).some((alt) => (estado[alt] ?? 0) > 0);
        if (possui) cur.coletadas += 1;
        porSelecao.set(f.selecaoId, cur);
      } else if (f.tipo === 'especial' && f.selecaoId) {
        const cur = porEspecial.get(f.selecaoId) ?? { total: 0, coletadas: 0 };
        cur.total += 1;
        if ((estado[f.id] ?? 0) > 0) cur.coletadas += 1;
        porEspecial.set(f.selecaoId, cur);
      }
    });

    // Conta as figurinhas McDonald's separadamente, como seção própria de
    // especiais (já que têm slotDeId e foram puladas acima).
    FIGURINHAS.forEach((f) => {
      if (!f.slotDeId) return;
      if (f.tipo !== 'especial' || !f.selecaoId) return;
      const cur = porEspecial.get(f.selecaoId) ?? { total: 0, coletadas: 0 };
      cur.total += 1;
      if ((estado[f.id] ?? 0) > 0) cur.coletadas += 1;
      porEspecial.set(f.selecaoId, cur);
    });

    const selecoes: LinhaProgresso[] = SELECOES.map((s) => {
      const c = porSelecao.get(s.id) ?? { total: s.totalFigurinhas, coletadas: 0 };
      return {
        id: s.id,
        rotulo: s.nome,
        cor: s.cor,
        coletadas: c.coletadas,
        total: c.total,
        prefixo: s.bandeira,
        href: `/selecao/${s.id}`,
      };
    }).sort((a, b) => b.coletadas / b.total - a.coletadas / a.total);

    const especiais: LinhaProgresso[] = SECOES_ESPECIAIS.map((sec) => {
      const c = porEspecial.get(sec.id) ?? { total: sec.totalFigurinhas, coletadas: 0 };
      return {
        id: sec.id,
        rotulo: sec.nome,
        cor: sec.cor,
        coletadas: c.coletadas,
        total: c.total,
        prefixo: sec.icone,
        href: '/colecao/especiais',
      };
    }).sort((a, b) => b.coletadas / b.total - a.coletadas / a.total);

    return { selecoes, especiais };
  }, [estado]);

  const listaCompleta = aba === 'selecoes' ? selecoes : especiais;
  const termoBusca = busca.trim().toLowerCase();
  const lista = listaCompleta.filter(
    (l) =>
      !termoBusca ||
      l.id.toLowerCase().includes(termoBusca) ||
      l.rotulo.toLowerCase().includes(termoBusca)
  );
  const completas = lista.filter((l) => l.total > 0 && l.coletadas >= l.total).length;
  const emProgresso = lista.filter((l) => l.coletadas > 0 && l.coletadas < l.total).length;

  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Completude</div>
        <Segmented
          size="small"
          value={aba}
          onChange={(v) => setAba(v as Aba)}
          options={[
            { label: 'Selecoes', value: 'selecoes' },
            { label: 'Especiais', value: 'especiais' },
          ]}
        />
      </div>

      <Input
        size="small"
        allowClear
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar"
        prefix={<Search size={14} color="#9aa6c9" />}
      />

      <div
        style={{
          display: 'flex',
          gap: 8,
          fontSize: 11,
          color: '#22c55e',
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
          <CheckCircle2 size={12} /> {completas} completa{completas === 1 ? '' : 's'}
        </span>
        <span>·</span>
        <span>{emProgresso} em progresso</span>
        <span>·</span>
        <span>{lista.length} no total</span>
      </div>

      {lista.length === 0 ? (
        <Empty description="Sem dados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div
          className="completude-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {lista.map((l) => (
            <LinhaBarra key={l.id} linha={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaBarra({ linha }: { linha: LinhaProgresso }) {
  const pct = linha.total > 0 ? (linha.coletadas / linha.total) * 100 : 0;
  const completo = linha.total > 0 && linha.coletadas >= linha.total;
  const cor = completo ? '#22c55e' : pct >= 50 ? linha.cor : '#e6ecff';
  const corBarra = completo ? '#22c55e' : linha.cor;
  const barWidth = Math.max(pct, 2);

  return (
    <Link
      href={linha.href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 4px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textDecoration: 'none',
        color: 'inherit',
      }}
      title={`Abrir ${linha.rotulo}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>
          {linha.prefixo}
        </span>
        <span style={{ fontSize: 12, color: cor, fontWeight: 600, flex: 1 }}>
          {linha.rotulo}
        </span>
        <span
          style={{
            fontSize: 11,
            color: completo ? '#22c55e' : '#e6ecff',
            fontWeight: 700,
          }}
        >
          {linha.coletadas}/{linha.total}
        </span>
        {completo ? <CheckCircle2 size={14} color="#22c55e" /> : null}
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
            background: corBarra,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </Link>
  );
}
