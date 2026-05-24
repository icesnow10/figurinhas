'use client';

import { useEffect, useState } from 'react';

export function usePersistedState<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(inicial);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chave);
      if (bruto !== null) setValor(JSON.parse(bruto) as T);
    } catch {}
    setHidratado(true);
  }, [chave]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {}
  }, [chave, hidratado, valor]);

  return [valor, setValor] as const;
}
