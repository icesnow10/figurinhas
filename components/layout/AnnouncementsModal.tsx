'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Tag } from 'antd';
import { Megaphone } from 'lucide-react';
import { usePerfil } from '@/resources/hooks/usePerfil';
import { ANUNCIOS, ANUNCIO_ATUAL } from '@/resources/data/anuncios';

export const ABRIR_ANUNCIOS_EVENTO = 'figurinhas:abrir-anuncios';

export function AnnouncementsModal() {
  const { perfilAtual, perfilBloqueado, marcarAnuncioVisto } = usePerfil();
  const [aberto, setAberto] = useState(false);
  const [modoHistorico, setModoHistorico] = useState(false);

  // mais recente primeiro
  const anunciosOrdenados = useMemo(
    () => [...ANUNCIOS].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)),
    []
  );

  // Auto-abre quando há um anúncio novo
  useEffect(() => {
    if (perfilBloqueado) {
      setAberto(false);
      return;
    }
    if (!perfilAtual || !ANUNCIO_ATUAL) return;
    if (perfilAtual.ultimoAnuncioVisto !== ANUNCIO_ATUAL.id) {
      setModoHistorico(false);
      setAberto(true);
    }
  }, [perfilAtual, perfilBloqueado]);

  // Abertura manual via evento
  useEffect(() => {
    const handler = () => {
      setModoHistorico(true);
      setAberto(true);
    };
    window.addEventListener(ABRIR_ANUNCIOS_EVENTO, handler);
    return () => window.removeEventListener(ABRIR_ANUNCIOS_EVENTO, handler);
  }, []);

  if (!ANUNCIO_ATUAL) return null;
  const anuncioAtual = ANUNCIO_ATUAL;

  const fechar = () => {
    setAberto(false);
    if (!modoHistorico) {
      void marcarAnuncioVisto(anuncioAtual.id);
    }
  };

  const lista = modoHistorico ? anunciosOrdenados : [anuncioAtual];

  return (
    <Modal
      open={aberto}
      onCancel={fechar}
      destroyOnClose
      centered
      width={modoHistorico ? 520 : undefined}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={18} color="#22c55e" />
          <span>{modoHistorico ? 'Histórico de novidades' : anuncioAtual.titulo}</span>
        </div>
      }
      footer={[
        <Button key="ok" type="primary" onClick={fechar}>
          {modoHistorico ? 'Fechar' : 'Entendi'}
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {lista.map((anuncio) => (
          <section key={anuncio.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {modoHistorico && (
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  paddingBottom: 6,
                }}
              >
                <Tag color="green" style={{ marginInlineEnd: 0, fontWeight: 700 }}>
                  {anuncio.data}
                </Tag>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
                  {anuncio.titulo}
                </span>
                <code
                  style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    color: '#9aa6c9',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {anuncio.id}
                </code>
              </header>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {anuncio.itens.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  {item.emoji && <div style={{ fontSize: 22 }}>{item.emoji}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
                      {item.titulo}
                    </div>
                    <div style={{ color: '#cbd5f5', fontSize: 12, marginTop: 4 }}>
                      {item.descricao}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
