'use client';

import { useRouter } from 'next/navigation';
import { Button } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { Sticker } from '@/components/sticker/Sticker';
import { figurinhasEspeciais } from '@/resources/data/figurinhas';

const grupos = [
  {
    id: 'intro',
    titulo: 'Introdução',
    filtro: (codigo: string) => codigo === '00' || /^FWC[1-8]$/.test(codigo),
  },
  {
    id: 'museu',
    titulo: 'Campeões',
    filtro: (codigo: string) => {
      const match = /^FWC(\d+)$/.exec(codigo);
      if (!match) return false;
      const numero = Number(match[1]);
      return numero >= 9 && numero <= 19;
    },
  },
  { id: 'coca', titulo: 'Coca-Cola', filtro: (codigo: string) => /^CC\d{2}$/.test(codigo) },
  {
    id: 'mcd',
    titulo: "McDonald's #13 (28 países)",
    filtro: (codigo: string) => /^MCD[A-Z]{3}13$/.test(codigo),
  },
];

function ordenarIntro(stickers: { codigo: string }[]): typeof stickers {
  // Ordena: 00, FWC1, FWC3, FWC2, FWC4..FWC8 — para empilhar FWC1 sobre FWC2 no grid de 4 cols
  const ordem = ['00', 'FWC1', 'FWC3', 'FWC2', 'FWC5', 'FWC4', 'FWC6', 'FWC7', 'FWC8'];
  const idx = (c: string) => {
    const i = ordem.indexOf(c);
    return i === -1 ? 999 : i;
  };
  return [...stickers].sort((a, b) => idx(a.codigo) - idx(b.codigo));
}

export default function EspeciaisPage() {
  const router = useRouter();
  const especiais = figurinhasEspeciais();

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
      <h2 style={{ color: '#fff', margin: '8px 0' }}>Figurinhas Especiais</h2>
      <p style={{ color: '#9aa6c9', fontSize: 13, marginBottom: 12 }}>
        9 introdutórias, 11 Campeões (FWC9-FWC19), 14 Coca-Cola e 28 McDonald's exclusivas do n.º 13.
      </p>

      {grupos.map((grupo) => {
        let stickers = especiais.filter((s) => grupo.filtro(s.codigo));
        if (grupo.id === 'intro') stickers = ordenarIntro(stickers) as typeof stickers;
        if (!stickers.length) return null;

        return (
          <section key={grupo.id} style={{ marginBottom: 18 }}>
            <div className="section-title">
              <h3>{grupo.titulo}</h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              {stickers.map((s) => (
                <Sticker key={s.id} sticker={s} size={78} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
