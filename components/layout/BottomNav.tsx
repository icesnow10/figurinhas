'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine, Home, BookOpen, ArrowLeftRight, ListChecks } from 'lucide-react';

const left = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/colecao', label: 'Coleção', icon: BookOpen },
];

const right = [
  { href: '/trocas', label: 'Trocas', icon: ArrowLeftRight },
  { href: '/checklist', label: 'Checklist', icon: ListChecks },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: 'rgba(10,18,48,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        padding: '10px 6px 14px',
        zIndex: 50,
      }}
    >
      {left.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: active ? '#22c55e' : '#9aa6c9',
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Icon size={22} />
            {it.label}
          </Link>
        );
      })}

      <Link
        href="/scan"
        aria-label="Scanner"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: '#22c55e',
          fontSize: 11,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #15803d)',
            boxShadow: '0 6px 18px rgba(34,197,94,0.34), 0 0 0 4px rgba(10,18,48,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -28,
          }}
        >
          <ScanLine size={28} color="#fff" />
        </div>
        <span style={{ color: isActive('/scan') ? '#22c55e' : '#9aa6c9' }}>Scanner</span>
      </Link>

      {right.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: active ? '#22c55e' : '#9aa6c9',
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Icon size={22} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
