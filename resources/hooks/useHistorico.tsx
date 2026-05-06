'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface HistoricoItem {
  stickerId: string;
  timestamp: number;
}

interface HistoricoContextType {
  itens: HistoricoItem[];
  adicionar: (stickerId: string) => number;
  remover: (stickerId: string, timestamp: number) => void;
  limpar: () => void;
}

const HistoricoContext = createContext<HistoricoContextType | null>(null);

const STORAGE_KEY = 'figurinhas:historico';
const MAX_ITENS = 200;

export function HistoricoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<HistoricoItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoricoItem[];
      if (Array.isArray(parsed)) setItens(parsed);
    } catch {}
  }, []);

  const persistir = useCallback((novos: HistoricoItem[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
    } catch {}
  }, []);

  const adicionar = useCallback(
    (stickerId: string) => {
      const timestamp = Date.now();
      setItens((prev) => {
        const novo = [{ stickerId, timestamp }, ...prev].slice(0, MAX_ITENS);
        persistir(novo);
        return novo;
      });
      return timestamp;
    },
    [persistir]
  );

  const remover = useCallback(
    (stickerId: string, timestamp: number) => {
      setItens((prev) => {
        const idx = prev.findIndex(
          (it) => it.stickerId === stickerId && it.timestamp === timestamp
        );
        if (idx < 0) return prev;
        const novo = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        persistir(novo);
        return novo;
      });
    },
    [persistir]
  );

  const limpar = useCallback(() => {
    setItens([]);
    persistir([]);
  }, [persistir]);

  return (
    <HistoricoContext.Provider value={{ itens, adicionar, remover, limpar }}>
      {children}
    </HistoricoContext.Provider>
  );
}

export function useHistorico() {
  const ctx = useContext(HistoricoContext);
  if (!ctx) throw new Error('useHistorico deve ser usado dentro de HistoricoProvider');
  return ctx;
}
