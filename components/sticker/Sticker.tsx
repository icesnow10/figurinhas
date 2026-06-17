'use client';

import { useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import type { Sticker as StickerType } from '@/resources/types';
import { useColecao } from '@/resources/hooks/useColecao';
import { useAdicionarComMcd } from '@/resources/hooks/usePerguntaMcd';
import { useLongPress } from '@/resources/hooks/useLongPress';
import {
  figurinhaPorId,
  obterIdMcDonalds,
} from '@/resources/data/figurinhas';
import { StickerEditModal } from '../modals/StickerEditModal';

interface Props {
  sticker: StickerType;
  size?: number;
}

export function Sticker({ sticker, size = 92 }: Props) {
  const { tem, temSlot, duplicadasSlot, sincronizandoId } = useColecao();
  const adicionarComMcd = useAdicionarComMcd();
  const [openModal, setOpenModal] = useState(false);

  const possui = temSlot(sticker.id);
  const dupes = duplicadasSlot(sticker.id);

  const mcdId = obterIdMcDonalds(sticker.id);
  const temRegular = tem(sticker.id);
  const temMcd = mcdId ? tem(mcdId) : false;
  const salvando = sincronizandoId(sticker.id) || (!!mcdId && sincronizandoId(mcdId));
  const ehVisualMcd = !!(mcdId && temMcd);
  const stickerVisivel = ehVisualMcd ? figurinhaPorId(mcdId!) ?? sticker : sticker;
  const mostrarBadgeMcd = !!(mcdId && temMcd);

  const handlers = useLongPress({
    delay: 500,
    onClick: () => adicionarComMcd(sticker.id),
    onLongPress: () => setOpenModal(true),
  });

  const horizontal = !!sticker.rotation || !!stickerVisivel.rotation;
  const spanCols = stickerVisivel.spanCols ?? sticker.spanCols ?? (horizontal ? 2 : 1);
  const spanRows = stickerVisivel.spanRows ?? sticker.spanRows ?? 1;
  const aspectRatio = horizontal
    ? `${spanCols} / 1.4`
    : `${spanCols} / ${spanRows * 1.4}`;

  return (
    <>
      <div
        {...handlers}
        className="sticker-card"
        style={{
          width: '100%',
          aspectRatio,
          gridColumn: spanCols > 1 ? `span ${spanCols}` : undefined,
          gridRow: spanRows > 1 ? `span ${spanRows}` : undefined,
          alignSelf: 'start',
          position: 'relative',
          borderRadius: 10,
          overflow: 'hidden',
          background: ehVisualMcd ? '#FFF7DB' : '#1a2236',
          border: possui
            ? ehVisualMcd
              ? '2px solid #FFC72C'
              : '2px solid #22c55e'
            : '1px solid #2a3654',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'manipulation',
          transition: 'transform 0.12s ease, border-color 0.12s ease',
        }}
      >
        <img
          src={stickerVisivel.imagem}
          alt={stickerVisivel.nome}
          draggable={false}
          loading="lazy"
          decoding="async"
          style={
            horizontal
              ? {
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '70%',
                  height: '142.857%',
                  objectFit: 'cover',
                  transform: `translate(-50%, -50%) rotate(${stickerVisivel.rotation}deg)`,
                  filter: possui ? 'none' : 'grayscale(100%) brightness(0.55)',
                  transition: 'filter 0.18s ease',
                  pointerEvents: 'none',
                }
              : {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: possui ? 'none' : 'grayscale(100%) brightness(0.55)',
                  transition: 'filter 0.18s ease',
                  pointerEvents: 'none',
                }
          }
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '3px 6px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            textAlign: 'center',
          }}
        >
          {sticker.codigo}
          {ehVisualMcd ? ' · MCD' : ''}
        </div>

        {mostrarBadgeMcd && (
          <div
            style={{
              position: 'absolute',
              bottom: 22,
              left: 4,
              padding: '1px 6px',
              borderRadius: 6,
              background: '#FFC72C',
              color: '#C8102E',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 0.4,
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
            title={
              temRegular && temMcd
                ? 'Você tem ambas as versões'
                : 'Versão McDonald\'s'
            }
          >
            {temRegular && temMcd ? "🍟 + PANINI" : '🍟 MCD'}
          </div>
        )}

        {possui && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <Check size={14} color="#fff" strokeWidth={3} />
          </div>
        )}

        {dupes > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 22,
              height: 22,
              padding: '0 6px',
              borderRadius: 11,
              background: '#f59e0b',
              color: '#000',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <Copy size={10} strokeWidth={3} />
            {dupes}
          </div>
        )}

        {salvando && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10,18,48,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              pointerEvents: 'none',
              animation: 'stickerSpin 0.9s linear infinite',
            }}
          >
            <Loader2 size={20} />
          </div>
        )}
      </div>

      <StickerEditModal
        sticker={sticker}
        open={openModal}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}
