import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AntdProvider } from '@/components/layout/AntdProvider';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'Álbum Copa 2026',
  description: 'Controle suas figurinhas da Copa do Mundo 2026',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050b1f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AntdProvider>
          <div className="app-shell">
            {children}
            <BottomNav />
          </div>
        </AntdProvider>
      </body>
    </html>
  );
}
