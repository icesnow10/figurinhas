'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface Perfil {
  id: string;
  nome: string;
  criadoEm: number;
  ultimoLoginEm?: number;
  temPin: boolean;
}

interface PerfilContextType {
  perfis: Perfil[];
  perfilId: string;
  perfilAtual: Perfil | null;
  perfilBloqueado: boolean;
  carregado: boolean;
  recarregar: () => Promise<void>;
  selecionar: (id: string) => boolean; // retorna false se precisa de PIN
  entrarComNome: (nome: string, pin: string) => Promise<boolean>;
  desbloquearESelecionar: (id: string, pin: string) => Promise<boolean>;
  estaDesbloqueado: (id: string) => boolean;
  bloquearPerfilAtual: () => void;
  criar: (
    nome: string,
    pin?: string
  ) => Promise<{ perfil: Perfil | null; erro?: string; codigo?: string; limite?: number }>;
  renomear: (id: string, nome: string) => Promise<void>;
  definirPin: (id: string, pin: string | null, pinAtual?: string) => Promise<boolean>;
  deletar: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'figurinhas:perfilId';
const SESSION_UNLOCK_KEY = 'figurinhas:desbloqueados';
export const MASTER_ID = 'icesnow10';
const PERFIL_PADRAO = MASTER_ID;

const PerfilContext = createContext<PerfilContextType | null>(null);

function lerDesbloqueados(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_UNLOCK_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function salvarDesbloqueados(s: Set<string>) {
  try {
    if (s.size === 0) {
      sessionStorage.removeItem(SESSION_UNLOCK_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_UNLOCK_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfilId, setPerfilId] = useState<string>(PERFIL_PADRAO);
  const [carregado, setCarregado] = useState(false);
  const [desbloqueados, setDesbloqueados] = useState<Set<string>>(new Set());

  // Hidrata do storage no mount
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) setPerfilId(salvo);
    } catch {}
    setDesbloqueados(lerDesbloqueados());
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch('/api/perfis', { cache: 'no-store' });
      if (r.ok) {
        const { perfis } = (await r.json()) as { perfis: Perfil[] };
        setPerfis(perfis ?? []);
      }
    } catch {}
    setCarregado(true);
  }, []);

  // Não carrega a lista de perfis automaticamente para não expor nomes
  // antes do login. O admin chama recarregar() sob demanda.
  useEffect(() => {
    setCarregado(true);
  }, []);

  const estaDesbloqueado = useCallback(
    (id: string) => {
      const p = perfis.find((x) => x.id === id);
      if (!p || !p.temPin) return true;
      return desbloqueados.has(id);
    },
    [perfis, desbloqueados]
  );

  const persistir = useCallback((id: string) => {
    setPerfilId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  const selecionar = useCallback(
    (id: string): boolean => {
      if (!estaDesbloqueado(id)) return false;
      persistir(id);
      return true;
    },
    [estaDesbloqueado, persistir]
  );

  const desbloquearESelecionar = useCallback(
    async (id: string, pin: string): Promise<boolean> => {
      try {
        const r = await fetch('/api/perfis', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, pin }),
        });
        if (!r.ok) return false;
        const { ok } = (await r.json()) as { ok: boolean };
        if (!ok) return false;
        setDesbloqueados((prev) => {
          const next = new Set(prev);
          next.add(id);
          salvarDesbloqueados(next);
          return next;
        });
        persistir(id);
        return true;
      } catch {
        return false;
      }
    },
    [persistir]
  );

  const entrarComNome = useCallback(
    async (nome: string, pin: string): Promise<boolean> => {
      try {
        const r = await fetch('/api/perfis', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, pin }),
        });
        if (!r.ok) return false;
        const { ok, perfil } = (await r.json()) as { ok: boolean; perfil?: Perfil };
        if (!ok || !perfil) return false;
        setDesbloqueados((prev) => {
          const next = new Set(prev);
          next.add(perfil.id);
          salvarDesbloqueados(next);
          return next;
        });
        setPerfis((prev) =>
          prev.some((p) => p.id === perfil.id)
            ? prev.map((p) => (p.id === perfil.id ? perfil : p))
            : [...prev, perfil]
        );
        persistir(perfil.id);
        return true;
      } catch {
        return false;
      }
    },
    [persistir]
  );

  const bloquearPerfilAtual = useCallback(() => {
    const next = new Set<string>();
    setDesbloqueados(next);
    salvarDesbloqueados(next);
    persistir(PERFIL_PADRAO);
  }, [persistir]);

  const criar = useCallback(
    async (
      nome: string,
      pin?: string
    ): Promise<{ perfil: Perfil | null; erro?: string; codigo?: string; limite?: number }> => {
      try {
        const r = await fetch('/api/perfis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, ...(pin ? { pin } : {}) }),
        });
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as {
            erro?: string;
            codigo?: string;
            limite?: number;
          };
          return {
            perfil: null,
            erro: data.erro ?? 'Falha ao criar usuario',
            codigo: data.codigo,
            limite: data.limite,
          };
        }
        const { perfil } = (await r.json()) as { perfil: Perfil };
        setPerfis((prev) => [...prev, perfil]);
        // criou já desbloqueia (se tem pin) e seleciona
        if (perfil.temPin) {
          setDesbloqueados((prev) => {
            const next = new Set(prev);
            next.add(perfil.id);
            salvarDesbloqueados(next);
            return next;
          });
        }
        persistir(perfil.id);
        return { perfil };
      } catch {
        return { perfil: null, erro: 'Falha de conexao ao criar usuario' };
      }
    },
    [persistir]
  );

  const renomear = useCallback(async (id: string, nome: string) => {
    try {
      const r = await fetch('/api/perfis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nome }),
      });
      if (r.ok) {
        const { perfil } = (await r.json()) as { perfil: Perfil };
        setPerfis((prev) => prev.map((p) => (p.id === id ? perfil : p)));
      }
    } catch {}
  }, []);

  const definirPin = useCallback(
    async (id: string, pin: string | null, pinAtual?: string): Promise<boolean> => {
      try {
        const r = await fetch('/api/perfis', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, pin, ...(pinAtual ? { pinAtual } : {}) }),
        });
        if (!r.ok) return false;
        const { perfil } = (await r.json()) as { perfil: Perfil };
        setPerfis((prev) => prev.map((p) => (p.id === id ? perfil : p)));
        // se removeu pin, mantém desbloqueado; se definiu pin, marca como desbloqueado já
        setDesbloqueados((prev) => {
          const next = new Set(prev);
          if (perfil.temPin) next.add(id);
          else next.delete(id);
          salvarDesbloqueados(next);
          return next;
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const deletar = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/perfis?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        setPerfis((prev) => prev.filter((p) => p.id !== id));
        setDesbloqueados((prev) => {
          const next = new Set(prev);
          next.delete(id);
          salvarDesbloqueados(next);
          return next;
        });
        if (perfilId === id) persistir(PERFIL_PADRAO);
      } catch {}
    },
    [perfilId, persistir]
  );

  const perfilAtual: Perfil | null = perfis.find((p) => p.id === perfilId) ?? null;
  const perfilBloqueado =
    carregado && (!perfilAtual || (!!perfilAtual.temPin && !desbloqueados.has(perfilAtual.id)));

  return (
    <PerfilContext.Provider
      value={{
        perfis,
        perfilId,
        perfilAtual,
        perfilBloqueado,
        carregado,
        recarregar,
        selecionar,
        entrarComNome,
        desbloquearESelecionar,
        estaDesbloqueado,
        bloquearPerfilAtual,
        criar,
        renomear,
        definirPin,
        deletar,
      }}
    >
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error('usePerfil deve ser usado dentro de PerfilProvider');
  return ctx;
}
