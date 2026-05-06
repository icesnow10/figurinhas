'use client';

import { ConfigProvider, theme } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { AuthGate } from '@/components/layout/AuthGate';
import { ColecaoProvider } from '@/resources/hooks/useColecao';
import { HistoricoProvider } from '@/resources/hooks/useHistorico';
import { PerfilProvider } from '@/resources/hooks/usePerfil';
import { PerguntaMcdProvider } from '@/resources/hooks/usePerguntaMcd';
import type { ReactNode } from 'react';

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#22c55e',
          colorInfo: '#22c55e',
          borderRadius: 10,
          fontFamily: 'inherit',
        },
      }}
    >
      <PerfilProvider>
        <ColecaoProvider>
          <HistoricoProvider>
            <PerguntaMcdProvider>
              <AuthGate>{children}</AuthGate>
            </PerguntaMcdProvider>
          </HistoricoProvider>
        </ColecaoProvider>
      </PerfilProvider>
    </ConfigProvider>
  );
}
