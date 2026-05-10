'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { Megaphone } from 'lucide-react';
import { usePerfil } from '@/resources/hooks/usePerfil';
import { ANUNCIO_ATUAL } from '@/resources/data/anuncios';

export function AnnouncementsModal() {
  const { perfilAtual, perfilBloqueado, marcarAnuncioVisto } = usePerfil();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (perfilBloqueado) {
      setAberto(false);
      return;
    }
    if (!perfilAtual || !ANUNCIO_ATUAL) return;
    if (perfilAtual.ultimoAnuncioVisto !== ANUNCIO_ATUAL.id) {
      setAberto(true);
    }
  }, [perfilAtual, perfilBloqueado]);

  if (!ANUNCIO_ATUAL) return null;
  const anuncio = ANUNCIO_ATUAL;

  const fechar = () => {
    setAberto(false);
    void marcarAnuncioVisto(anuncio.id);
  };

  return (
    <Modal
      open={aberto}
      onCancel={fechar}
      destroyOnClose
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={18} color="#22c55e" />
          <span>{anuncio.titulo}</span>
        </div>
      }
      footer={[
        <Button key="ok" type="primary" onClick={fechar}>
          Entendi
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{item.titulo}</div>
              <div style={{ color: '#cbd5f5', fontSize: 12, marginTop: 4 }}>
                {item.descricao}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
