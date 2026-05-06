'use client';

import { Button, Modal } from 'antd';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  figurinhaPorId,
  obterIdMcDonalds,
  temVersaoMcDonalds,
} from '@/resources/data/figurinhas';
import { SELECOES } from '@/resources/data/selecoes';
import { useColecao } from './useColecao';

interface Pergunta {
  paisNome: string;
  bandeira: string;
  regularId: string;
  mcdId: string;
  onEscolha: (idEscolhido: string) => void;
  onCancelar?: () => void;
}

interface PerguntaCtx {
  perguntar: (
    regularId: string,
    onEscolha: (idEscolhido: string) => void,
    onCancelar?: () => void
  ) => boolean;
}

const Context = createContext<PerguntaCtx | null>(null);

export function PerguntaMcdProvider({ children }: { children: ReactNode }) {
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);

  const perguntar = useCallback(
    (regularId: string, onEscolha: (id: string) => void, onCancelar?: () => void) => {
      const mcdId = obterIdMcDonalds(regularId);
      if (!mcdId) return false;
      const sticker = figurinhaPorId(regularId);
      const sel = SELECOES.find((s) => s.id === sticker?.selecaoId);
      setPergunta({
        paisNome: sel?.nome ?? regularId,
        bandeira: sel?.bandeira ?? '',
        regularId,
        mcdId,
        onEscolha,
        onCancelar,
      });
      return true;
    },
    []
  );

  const escolher = (id: string) => {
    const p = pergunta;
    setPergunta(null);
    p?.onEscolha(id);
  };

  const cancelar = () => {
    const p = pergunta;
    setPergunta(null);
    p?.onCancelar?.();
  };

  return (
    <Context.Provider value={{ perguntar }}>
      {children}
      <Modal
        open={!!pergunta}
        onCancel={cancelar}
        title={pergunta ? `Versão McDonald's? ${pergunta.bandeira}` : ''}
        footer={null}
        centered
        styles={{ content: { background: '#0a1230', border: '1px solid #2a3654' } }}
      >
        {pergunta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#9aa6c9', fontSize: 13, lineHeight: 1.4 }}>
              O cromo n.º 13 de <b style={{ color: '#fff' }}>{pergunta.paisNome}</b> tem
              uma versão exclusiva do McDonald's. Qual versão você está adicionando?
            </div>
            <Button
              size="large"
              onClick={() => escolher(pergunta.regularId)}
              style={{ height: 56, fontWeight: 700, fontSize: 14 }}
            >
              Padrão Panini ({pergunta.regularId})
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => escolher(pergunta.mcdId)}
              style={{
                height: 56,
                fontWeight: 700,
                fontSize: 14,
                background: '#FFC72C',
                borderColor: '#FFC72C',
                color: '#000',
              }}
            >
              🍟 McDonald's exclusiva ({pergunta.mcdId})
            </Button>
          </div>
        )}
      </Modal>
    </Context.Provider>
  );
}

export function usePerguntaMcd() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePerguntaMcd precisa do PerguntaMcdProvider');
  return ctx;
}

export function useAdicionarComMcd() {
  const { adicionar } = useColecao();
  const { perguntar } = usePerguntaMcd();

  return useCallback(
    (
      stickerId: string,
      callbacks?: {
        onAdicionado?: (idEscolhido: string) => void;
        onCancelado?: () => void;
      }
    ) => {
      if (!temVersaoMcDonalds(stickerId)) {
        adicionar(stickerId);
        callbacks?.onAdicionado?.(stickerId);
        return;
      }
      perguntar(
        stickerId,
        (id) => {
          adicionar(id);
          callbacks?.onAdicionado?.(id);
        },
        () => callbacks?.onCancelado?.()
      );
    },
    [adicionar, perguntar]
  );
}
