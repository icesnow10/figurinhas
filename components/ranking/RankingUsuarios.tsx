'use client';

import { useEffect, useMemo, useState } from 'react';
import { Empty, Pagination, Progress, Skeleton } from 'antd';
import { Crown, Medal, Trophy } from 'lucide-react';
import { usePerfil } from '@/resources/hooks/usePerfil';

interface RankingItem {
  id: string;
  nome: string;
  coletadas: number;
  totalAlbum: number;
  faltantes: number;
  percentual: number;
}

const POR_PAGINA = 10;

function MedalhaPosicao({ posicao }: { posicao: number }) {
  if (posicao === 1) return <Crown size={16} color="#FFD700" />;
  if (posicao === 2) return <Medal size={16} color="#C0C0C0" />;
  if (posicao === 3) return <Medal size={16} color="#CD7F32" />;
  return (
    <span
      style={{
        fontSize: 11,
        color: '#9aa6c9',
        fontWeight: 700,
        minWidth: 16,
        textAlign: 'center',
      }}
    >
      {posicao}
    </span>
  );
}

export function RankingUsuarios() {
  const { perfilId } = usePerfil();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    fetch('/api/ranking', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ranking: [] }))
      .then((data: { ranking?: RankingItem[] }) => {
        if (!ativo) return;
        setRanking(data.ranking ?? []);
      })
      .catch(() => {
        if (ativo) setRanking([]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const total = ranking.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);

  const itensVisiveis = useMemo(() => {
    const inicio = (paginaAtual - 1) * POR_PAGINA;
    return ranking.slice(inicio, inicio + POR_PAGINA);
  }, [ranking, paginaAtual]);

  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trophy size={18} color="#FFD700" />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Ranking de coletores</div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa6c9' }}>
          {total} coletore{total === 1 ? '' : 's'}
        </div>
      </div>

      {carregando ? (
        <Skeleton active paragraph={{ rows: 4 }} title={false} />
      ) : total === 0 ? (
        <Empty description="Sem coletores ainda" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itensVisiveis.map((item, idx) => {
              const posicao = (paginaAtual - 1) * POR_PAGINA + idx + 1;
              const ehAtual = item.id === perfilId;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: ehAtual ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
                    border: ehAtual
                      ? '1px solid rgba(34,197,94,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MedalhaPosicao posicao={posicao} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.nome}
                      {ehAtual && (
                        <span style={{ color: '#22c55e', fontSize: 10, marginLeft: 6 }}>
                          (você)
                        </span>
                      )}
                    </span>
                    <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>
                      {item.coletadas}/{item.totalAlbum}
                    </span>
                    <span
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800,
                        minWidth: 36,
                        textAlign: 'right',
                      }}
                    >
                      {item.percentual}%
                    </span>
                  </div>
                  <Progress
                    percent={item.percentual}
                    showInfo={false}
                    strokeColor="#22c55e"
                    trailColor="rgba(255,255,255,0.08)"
                    size="small"
                    style={{ margin: 0 }}
                  />
                </div>
              );
            })}
          </div>

          {total > POR_PAGINA && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <Pagination
                current={paginaAtual}
                pageSize={POR_PAGINA}
                total={total}
                onChange={setPagina}
                showSizeChanger={false}
                size="small"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
