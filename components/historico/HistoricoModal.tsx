'use client';

import { Button, Empty, Modal, Tag, message } from 'antd';
import { useMemo } from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { useColecao } from '@/resources/hooks/useColecao';
import { useHistorico } from '@/resources/hooks/useHistorico';

function formatarTempo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h atrás`;
  const data = new Date(ts);
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function HistoricoModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { itens, remover: removerHistorico, limpar } = useHistorico();
  const { quantidade, remover: removerColecao } = useColecao();

  const figs = useMemo(() => {
    const mapa = new Map(FIGURINHAS.map((f) => [f.id, f]));
    return itens.map((it) => ({ item: it, fig: mapa.get(it.stickerId) }));
  }, [itens]);

  const desfazerItem = (stickerId: string, timestamp: number) => {
    removerColecao(stickerId);
    removerHistorico(stickerId, timestamp);
    message.success('Adição desfeita');
  };

  const desfazerTudo = () => {
    if (itens.length === 0) return;
    Modal.confirm({
      title: `Desfazer ${itens.length} adição${itens.length > 1 ? 'ões' : ''}?`,
      content:
        'Cada item do histórico será removido da sua coleção (decrementa 1 cópia). Não dá para reverter.',
      okText: 'Desfazer todas',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => {
        itens.forEach((it) => removerColecao(it.stickerId));
        limpar();
        message.success(`${itens.length} adições desfeitas`);
      },
    });
  };

  return (
    <Modal
      open={aberto}
      onCancel={onFechar}
      title="Recém-adicionadas"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button
              danger
              icon={<Undo2 size={14} />}
              onClick={desfazerTudo}
              disabled={itens.length === 0}
              size="small"
            >
              Desfazer todas
            </Button>
            <Button
              type="text"
              icon={<Trash2 size={14} />}
              onClick={limpar}
              disabled={itens.length === 0}
              size="small"
            >
              Limpar histórico
            </Button>
          </div>
          <Button onClick={onFechar}>Fechar</Button>
        </div>
      }
      styles={{ content: { background: '#0a1230', border: '1px solid #2a3654' } }}
    >
      {itens.length === 0 ? (
        <Empty description="Nenhuma figurinha adicionada ainda" />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ color: '#9aa6c9', fontSize: 11, lineHeight: 1.4 }}>
            <b>Desfazer</b> remove a figurinha da sua coleção (decrementa 1 cópia) e tira do histórico.
            <b> Limpar histórico</b> só apaga este registro, não mexe na coleção.
          </div>
          {figs.map(({ item, fig }, idx) => {
            const qtd = quantidade(item.stickerId);
            return (
              <div
                key={`${item.stickerId}-${item.timestamp}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: '#22c55e',
                    color: '#0a1230',
                    fontWeight: 800,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                    {fig?.codigo ?? item.stickerId}
                  </div>
                  <div
                    style={{
                      color: '#9aa6c9',
                      fontSize: 11,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fig?.nome ?? '—'} · {formatarTempo(item.timestamp)}
                  </div>
                </div>
                <Tag color={qtd > 1 ? 'gold' : qtd === 1 ? 'green' : 'default'}>
                  {qtd > 1 ? `x${qtd}` : qtd === 1 ? 'tenho' : 'removida'}
                </Tag>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<Undo2 size={14} />}
                  disabled={qtd <= 0}
                  onClick={() => desfazerItem(item.stickerId, item.timestamp)}
                  aria-label="Desfazer adição"
                />
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
