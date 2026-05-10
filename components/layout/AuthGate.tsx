'use client';

import { type ReactNode } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AnnouncementsModal } from '@/components/layout/AnnouncementsModal';
import { usePerfil } from '@/resources/hooks/usePerfil';

export function AuthGate({ children }: { children: ReactNode }) {
  const { carregado, perfilBloqueado } = usePerfil();

  if (!carregado) return <div className="app-content" style={{ minHeight: '100vh' }} />;
  if (perfilBloqueado) return <AuthScreen />;

  return (
    <>
      {children}
      <AnnouncementsModal />
    </>
  );
}
