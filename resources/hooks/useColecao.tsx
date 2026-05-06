'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ColecaoEstado } from '../types';
import { FIGURINHAS, idsAlternativosDoSlot } from '../data/figurinhas';
import { usePerfil } from './usePerfil';

interface ColecaoContextType {
  estado: ColecaoEstado;
  carregado: boolean;
  sincronizando: boolean;
  quantidade: (id: string) => number;
  quantidadeSlot: (id: string) => number;
  tem: (id: string) => boolean;
  temSlot: (id: string) => boolean;
  duplicadas: (id: string) => number;
  duplicadasSlot: (id: string) => number;
  adicionar: (id: string) => void;
  remover: (id: string) => void;
  setQuantidade: (id: string, n: number) => void;
  marcarNaoTenho: (id: string) => void;
  resetar: () => void;
  removerDuplicadas: () => void;
  recarregar: () => Promise<void>;
  total: {
    coletadas: number;
    totalAlbum: number;
    duplicadas: number;
    faltantes: number;
    percentual: number;
  };
}

const ColecaoContext = createContext<ColecaoContextType | null>(null);

export function ColecaoProvider({ children }: { children: ReactNode }) {
  const { perfilId, carregado: perfilCarregado, perfilBloqueado } = usePerfil();
  const [estado, setEstado] = useState<ColecaoEstado>({});
  const [carregado, setCarregado] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const ultimoFetchRef = useRef(0);

  const url = useCallback(
    (extra = '') =>
      `/api/colecao?perfil=${encodeURIComponent(perfilId)}${extra ? `&${extra}` : ''}`,
    [perfilId]
  );

  const patchServer = useCallback(
    async (id: string, quantidade: number) => {
      if (!perfilCarregado || perfilBloqueado) return;
      try {
        await fetch(url(), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, quantidade }),
        });
      } catch {}
    },
    [perfilBloqueado, perfilCarregado, url]
  );

  const putServer = useCallback(
    async (estado: ColecaoEstado) => {
      if (!perfilCarregado || perfilBloqueado) return;
      try {
        await fetch(url(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estado),
        });
      } catch {}
    },
    [perfilBloqueado, perfilCarregado, url]
  );

  const recarregar = useCallback(async () => {
    if (!perfilCarregado || perfilBloqueado) {
      setEstado({});
      setCarregado(perfilCarregado);
      setSincronizando(false);
      return;
    }

    setSincronizando(true);
    try {
      const r = await fetch(url(), { cache: 'no-store' });
      if (r.ok) {
        const data = (await r.json()) as ColecaoEstado;
        setEstado(data ?? {});
      }
    } catch {}
    ultimoFetchRef.current = Date.now();
    setSincronizando(false);
    setCarregado(true);
  }, [perfilBloqueado, perfilCarregado, url]);

  // Recarrega quando trocar o perfil
  useEffect(() => {
    setEstado({});
    setCarregado(false);
    if (!perfilCarregado || perfilBloqueado) {
      setCarregado(perfilCarregado);
      return;
    }
    recarregar();
  }, [perfilBloqueado, perfilCarregado, perfilId, recarregar]);

  // refresh ao voltar o foco da janela
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - ultimoFetchRef.current > 1000) recarregar();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [recarregar]);

  const quantidade = useCallback((id: string) => estado[id] ?? 0, [estado]);
  const tem = useCallback((id: string) => (estado[id] ?? 0) > 0, [estado]);
  const duplicadas = useCallback(
    (id: string) => Math.max(0, (estado[id] ?? 0) - 1),
    [estado]
  );
  const quantidadeSlot = useCallback(
    (id: string) =>
      idsAlternativosDoSlot(id).reduce(
        (acc, alt) => acc + (estado[alt] ?? 0),
        0
      ),
    [estado]
  );
  const temSlot = useCallback(
    (id: string) => idsAlternativosDoSlot(id).some((alt) => (estado[alt] ?? 0) > 0),
    [estado]
  );
  const duplicadasSlot = useCallback(
    (id: string) => Math.max(0, quantidadeSlot(id) - 1),
    [quantidadeSlot]
  );

  const adicionar = useCallback(
    (id: string) => {
      setEstado((prev) => {
        const nova = (prev[id] ?? 0) + 1;
        patchServer(id, nova);
        return { ...prev, [id]: nova };
      });
    },
    [patchServer]
  );

  const remover = useCallback(
    (id: string) => {
      setEstado((prev) => {
        const atual = prev[id] ?? 0;
        const nova = Math.max(0, atual - 1);
        patchServer(id, nova);
        if (nova <= 0) {
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: nova };
      });
    },
    [patchServer]
  );

  const setQuantidadeFn = useCallback(
    (id: string, n: number) => {
      setEstado((prev) => {
        const v = Math.max(0, n);
        patchServer(id, v);
        if (v <= 0) {
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: v };
      });
    },
    [patchServer]
  );

  const marcarNaoTenho = useCallback(
    (id: string) => {
      setEstado((prev) => {
        patchServer(id, 0);
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },
    [patchServer]
  );

  const resetar = useCallback(() => {
    setEstado({});
    putServer({});
  }, [putServer]);

  const removerDuplicadas = useCallback(() => {
    setEstado((prev) => {
      const novo: ColecaoEstado = {};
      for (const [id, qtd] of Object.entries(prev)) {
        if (qtd > 0) novo[id] = 1;
      }
      putServer(novo);
      return novo;
    });
  }, [putServer]);

  const total = useMemo(() => {
    const slotsAlbum = FIGURINHAS.filter((f) => !f.slotDeId);
    const totalAlbum = slotsAlbum.length;
    const coletadas = slotsAlbum.filter((f) =>
      idsAlternativosDoSlot(f.id).some((alt) => (estado[alt] ?? 0) > 0)
    ).length;
    const duplicadasArr = slotsAlbum.map((f) => {
      const qtdSlot = idsAlternativosDoSlot(f.id).reduce(
        (acc, alt) => acc + (estado[alt] ?? 0),
        0
      );
      return Math.max(0, qtdSlot - 1);
    });
    const duplicadas = duplicadasArr.reduce((a, b) => a + b, 0);
    const faltantes = totalAlbum - coletadas;
    const percentual = totalAlbum > 0 ? Math.round((coletadas / totalAlbum) * 100) : 0;
    return { coletadas, totalAlbum, duplicadas, faltantes, percentual };
  }, [estado]);

  const value: ColecaoContextType = {
    estado,
    carregado,
    sincronizando,
    quantidade,
    quantidadeSlot,
    tem,
    temSlot,
    duplicadas,
    duplicadasSlot,
    adicionar,
    remover,
    setQuantidade: setQuantidadeFn,
    marcarNaoTenho,
    resetar,
    removerDuplicadas,
    recarregar,
    total,
  };

  return <ColecaoContext.Provider value={value}>{children}</ColecaoContext.Provider>;
}

export function useColecao() {
  const ctx = useContext(ColecaoContext);
  if (!ctx) throw new Error('useColecao deve ser usado dentro de ColecaoProvider');
  return ctx;
}
