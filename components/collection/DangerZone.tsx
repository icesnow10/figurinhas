'use client';

import { useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { useColecao } from '@/resources/hooks/useColecao';

type Acao = 'duplicadas' | 'tudo';

interface ConfigAcao {
  titulo: string;
  descricao: string;
  textoConfirmacao: string;
  rotuloBotao: string;
  contagem: number;
  executar: () => void;
  mensagemSucesso: string;
}

export function DangerZone() {
  const { total, removerDuplicadas, resetar } = useColecao();
  const [acaoAberta, setAcaoAberta] = useState<Acao | null>(null);
  const [textoDigitado, setTextoDigitado] = useState('');

  const configs: Record<Acao, ConfigAcao> = {
    duplicadas: {
      titulo: 'Apagar todas as repetidas',
      descricao:
        'Cada figurinha que você tem mais de uma vez será reduzida para apenas uma cópia. Essa ação não pode ser desfeita.',
      textoConfirmacao: 'APAGAR REPETIDAS',
      rotuloBotao: 'Apagar repetidas',
      contagem: total.duplicadas,
      executar: () => {
        removerDuplicadas();
        message.success('Figurinhas repetidas apagadas');
      },
      mensagemSucesso: 'Figurinhas repetidas apagadas',
    },
    tudo: {
      titulo: 'Apagar coleção inteira',
      descricao:
        'Todas as figurinhas registradas, incluindo as únicas, serão removidas. Sua coleção voltará a zero. Essa ação não pode ser desfeita.',
      textoConfirmacao: 'APAGAR TUDO',
      rotuloBotao: 'Apagar tudo',
      contagem: total.coletadas + total.duplicadas,
      executar: () => {
        resetar();
        message.success('Coleção apagada');
      },
      mensagemSucesso: 'Coleção apagada',
    },
  };

  const cfg = acaoAberta ? configs[acaoAberta] : null;
  const podeConfirmar = cfg ? textoDigitado.trim() === cfg.textoConfirmacao : false;

  const abrir = (acao: Acao) => {
    setAcaoAberta(acao);
    setTextoDigitado('');
  };

  const fechar = () => {
    setAcaoAberta(null);
    setTextoDigitado('');
  };

  const confirmar = () => {
    if (!cfg || !podeConfirmar) return;
    cfg.executar();
    fechar();
  };

  const copiarFrase = async () => {
    if (!cfg) return;
    try {
      await navigator.clipboard.writeText(cfg.textoConfirmacao);
      message.success('Frase copiada');
    } catch {
      message.error('Não foi possível copiar');
    }
  };

  return (
    <>
      <div
        className="card"
        style={{
          marginTop: 24,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(248,113,113,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#f87171" />
          <div style={{ color: '#fecaca', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
            Zona de risco
          </div>
        </div>
        <div style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.4 }}>
          Ações destrutivas que afetam toda a sua coleção. Não dá para desfazer.
        </div>

        <LinhaAcao
          rotulo="Apagar todas repetidas"
          detalhe={`${total.duplicadas} figurinha${total.duplicadas === 1 ? '' : 's'} repetida${
            total.duplicadas === 1 ? '' : 's'
          }`}
          onClick={() => abrir('duplicadas')}
          desabilitado={total.duplicadas <= 0}
        />
        <LinhaAcao
          rotulo="Apagar coleção inteira"
          detalhe={`${total.coletadas} figurinha${total.coletadas === 1 ? '' : 's'} na coleção`}
          onClick={() => abrir('tudo')}
          desabilitado={total.coletadas <= 0 && total.duplicadas <= 0}
        />
      </div>

      <Modal
        open={acaoAberta !== null}
        title={cfg?.titulo}
        onCancel={fechar}
        destroyOnClose
        footer={[
          <Button key="cancelar" onClick={fechar}>
            Cancelar
          </Button>,
          <Button
            key="confirmar"
            danger
            type="primary"
            disabled={!podeConfirmar}
            onClick={confirmar}
            icon={<Trash2 size={14} />}
          >
            {cfg?.rotuloBotao}
          </Button>,
        ]}
      >
        {cfg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ color: '#e6ecff', fontSize: 13, lineHeight: 1.5 }}>{cfg.descricao}</div>
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 12, color: '#fca5a5', fontWeight: 700 }}>
                Para confirmar, digite a frase abaixo:
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <code
                  style={{
                    color: '#fff',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {cfg.textoConfirmacao}
                </code>
                <Button
                  type="text"
                  size="small"
                  icon={<Copy size={14} color="#9aa6c9" />}
                  onClick={copiarFrase}
                  aria-label="Copiar frase"
                />
              </div>
            </div>
            <Input
              autoFocus
              value={textoDigitado}
              onChange={(e) => setTextoDigitado(e.target.value)}
              placeholder="Digite a frase exatamente"
              onPressEnter={confirmar}
            />
          </div>
        )}
      </Modal>
    </>
  );
}

function LinhaAcao({
  rotulo,
  detalhe,
  onClick,
  desabilitado,
}: {
  rotulo: string;
  detalhe: string;
  onClick: () => void;
  desabilitado: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
        borderTop: '1px solid rgba(248,113,113,0.18)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{rotulo}</div>
        <div style={{ color: '#9aa6c9', fontSize: 11, marginTop: 2 }}>{detalhe}</div>
      </div>
      <Button
        danger
        size="small"
        icon={<Trash2 size={14} />}
        onClick={onClick}
        disabled={desabilitado}
      >
        Apagar
      </Button>
    </div>
  );
}
