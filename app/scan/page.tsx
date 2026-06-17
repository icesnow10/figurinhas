'use client';

import dynamic from 'next/dynamic';

const ScanPageClient = dynamic(() => import('./ScanPageClient'), { ssr: false });

export default function Page() {
  return <ScanPageClient />;
}
