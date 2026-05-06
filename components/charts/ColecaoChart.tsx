'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useColecao } from '@/resources/hooks/useColecao';

export function ColecaoChart() {
  const { total } = useColecao();

  const data = [
    { name: 'Coletadas', value: total.coletadas, fill: '#22c55e' },
    { name: 'Faltantes', value: total.faltantes, fill: '#f97316' },
  ];

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Progresso do Álbum</div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              activeShape={false}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
        <Stat label="Total" value={total.totalAlbum} />
        <Stat label="Coletadas" value={total.coletadas} color="#22c55e" />
        <Stat label="Faltam" value={total.faltantes} color="#f97316" />
        <Stat label="Repetidas" value={total.duplicadas} color="#f59e0b" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: color ?? '#fff' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9aa6c9', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
