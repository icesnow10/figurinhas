'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleHelp, LogOut, Megaphone, Star, Trophy, User } from 'lucide-react';
import { Button, Modal, Progress, message } from 'antd';
import { useColecao } from '@/resources/hooks/useColecao';
import { MASTER_ID, usePerfil } from '@/resources/hooks/usePerfil';
import { ANUNCIO_ATUAL } from '@/resources/data/anuncios';
import { ABRIR_ANUNCIOS_EVENTO } from '@/components/layout/AnnouncementsModal';

export function Header() {
  const { total } = useColecao();
  const { bloquearPerfilAtual, perfilAtual } = usePerfil();
  const [modalSuporte, setModalSuporte] = useState(false);
  const ehAdmin = perfilAtual?.id === MASTER_ID;

  return (
    <div style={{ padding: '14px 16px 8px', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={28} color="#FFD700" />
          <div>
            <div style={{ fontSize: 11, color: '#9aa6c9', letterSpacing: 1 }}>FIFA</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#FFD700', letterSpacing: 0.5 }}>
              WORLD CUP 2026™
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '6px 10px',
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={14} color="#fff" />
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {perfilAtual?.nome ?? 'Perfil'}
          </div>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <Button
              type="text"
              size="small"
              aria-label="Novidades"
              icon={<Megaphone size={15} color="#22c55e" />}
              onClick={() =>
                window.dispatchEvent(new Event(ABRIR_ANUNCIOS_EVENTO))
              }
            />
            {ANUNCIO_ATUAL &&
              perfilAtual &&
              perfilAtual.ultimoAnuncioVisto !== ANUNCIO_ATUAL.id && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1px solid #0a1230',
                    pointerEvents: 'none',
                  }}
                />
              )}
          </div>
          <Button
            type="text"
            size="small"
            aria-label="Suporte"
            icon={<CircleHelp size={15} color="#9aa6c9" />}
            onClick={() => setModalSuporte(true)}
          />
          {ehAdmin && (
            <Link href="/admin" aria-label="Admin" style={{ display: 'inline-flex' }}>
              <Star size={16} color="#FFD700" fill="#FFD700" />
            </Link>
          )}
          <Button
            type="text"
            size="small"
            aria-label="Sair"
            icon={<LogOut size={15} color="#fca5a5" />}
            onClick={() => {
              bloquearPerfilAtual();
              message.info('Sessao encerrada');
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Minha Coleção</div>
          <div style={{ fontSize: 14, color: '#22c55e', fontWeight: 600 }}>
            {total.coletadas} / {total.totalAlbum} figurinhas
          </div>
        </div>
        <div
          style={{
            background: 'rgba(34,197,94,0.15)',
            color: '#22c55e',
            padding: '6px 12px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {total.percentual}%
        </div>
      </div>

      <Progress
        percent={total.percentual}
        showInfo={false}
        strokeColor="#22c55e"
        trailColor="rgba(255,255,255,0.08)"
        style={{ margin: '8px 0 0' }}
      />

      <Modal
        open={modalSuporte}
        title="Suporte"
        onCancel={() => setModalSuporte(false)}
        footer={[
          <Button key="cancelar" onClick={() => setModalSuporte(false)}>
            Fechar
          </Button>,
          <Button
            key="x"
            type="primary"
            href="https://x.com/hersz10"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir X
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 6 }}>
          Para suporte, me envie uma mensagem no X: <strong>@hersz10</strong>.
        </p>
        <p style={{ color: '#9aa6c9', fontSize: 13, margin: 0 }}>
          O link abre em uma nova aba.
        </p>
      </Modal>
    </div>
  );
}
