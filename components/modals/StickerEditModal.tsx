'use client';

import { Modal, InputNumber, Button, Space, Tag } from 'antd';
import { Trash2, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Sticker as StickerType } from '@/resources/types';
import { useColecao } from '@/resources/hooks/useColecao';
import { figurinhaPorId, obterIdMcDonalds } from '@/resources/data/figurinhas';

interface Props {
  sticker: StickerType;
  open: boolean;
  onClose: () => void;
}

export function StickerEditModal({ sticker, open, onClose }: Props) {
  const { quantidade, setQuantidade, marcarNaoTenho } = useColecao();

  const mcdId = obterIdMcDonalds(sticker.id);
  const stickerMcd = mcdId ? figurinhaPorId(mcdId) : undefined;
  const temVariante = !!(mcdId && stickerMcd);

  const [valorRegular, setValorRegular] = useState<number>(0);
  const [valorMcd, setValorMcd] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setValorRegular(quantidade(sticker.id));
    if (mcdId) setValorMcd(quantidade(mcdId));
  }, [open, sticker.id, mcdId, quantidade]);

  const repetidasRegular = Math.max(0, valorRegular - 1);
  const totalSlot = valorRegular + valorMcd;
  const repetidasSlot = Math.max(0, totalSlot - 1);

  const salvar = () => {
    setQuantidade(sticker.id, valorRegular);
    if (mcdId) setQuantidade(mcdId, valorMcd);
    onClose();
  };

  const naoTenho = () => {
    marcarNaoTenho(sticker.id);
    if (mcdId) marcarNaoTenho(mcdId);
    onClose();
  };

  if (temVariante) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={360}
        title={`Figurinha n.º 13 — ${sticker.nome.replace(/^Time perfilado - /, '')}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ color: '#9aa6c9', fontSize: 12, lineHeight: 1.4 }}>
            Esta figurinha tem versão exclusiva McDonald's. Ajuste cada uma
            separadamente — as duas contam para o slot do n.º 13.
          </div>

          <LinhaVariante
            titulo="Padrão Panini"
            sticker={sticker}
            valor={valorRegular}
            onChange={setValorRegular}
            corBorda="#22c55e"
          />

          <LinhaVariante
            titulo="McDonald's exclusiva"
            sticker={stickerMcd!}
            valor={valorMcd}
            onChange={setValorMcd}
            corBorda="#FFC72C"
            badge="🍟"
          />

          <div
            style={{
              fontSize: 12,
              color: '#9aa6c9',
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
            }}
          >
            Slot do n.º 13: <b style={{ color: '#fff' }}>{totalSlot}</b> cromo
            {totalSlot !== 1 ? 's' : ''}{' '}
            {repetidasSlot > 0
              ? `(${repetidasSlot} repetida${repetidasSlot > 1 ? 's' : ''})`
              : ''}
          </div>

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button danger icon={<Trash2 size={14} />} onClick={naoTenho}>
              Não tenho
            </Button>
            <Button type="primary" onClick={salvar}>
              Salvar
            </Button>
          </Space>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={320}
      title={`Figurinha ${sticker.codigo}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <img
          src={sticker.imagem}
          alt={sticker.nome}
          loading="lazy"
          decoding="async"
          style={{ width: 140, height: 196, objectFit: 'cover', borderRadius: 8 }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{sticker.nome}</div>
          <Space size={4} style={{ marginTop: 4 }}>
            <Tag color="blue">{sticker.codigo}</Tag>
            <Tag>{sticker.raridade}</Tag>
          </Space>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Button
            shape="circle"
            icon={<Minus size={16} />}
            onClick={() => setValorRegular((v) => Math.max(0, v - 1))}
          />
          <InputNumber
            min={0}
            max={99}
            value={valorRegular}
            onChange={(v) => setValorRegular(Number(v ?? 0))}
            style={{ width: 80, textAlign: 'center' }}
          />
          <Button
            shape="circle"
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setValorRegular((v) => v + 1)}
          />
        </div>

        <div style={{ fontSize: 12, color: '#666' }}>
          {valorRegular === 0
            ? 'Não tenho esta figurinha'
            : `Tenho ${valorRegular} (${repetidasRegular} repetidas)`}
        </div>

        <Space style={{ marginTop: 8, width: '100%', justifyContent: 'space-between' }}>
          <Button danger icon={<Trash2 size={14} />} onClick={naoTenho}>
            Não tenho
          </Button>
          <Button type="primary" onClick={salvar}>
            Salvar
          </Button>
        </Space>
      </div>
    </Modal>
  );
}

function LinhaVariante({
  titulo,
  sticker,
  valor,
  onChange,
  corBorda,
  badge,
}: {
  titulo: string;
  sticker: StickerType;
  valor: number;
  onChange: (n: number) => void;
  corBorda: string;
  badge?: string;
}) {
  const repetidas = Math.max(0, valor - 1);
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: 10,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${corBorda}55`,
      }}
    >
      <img
        src={sticker.imagem}
        alt={sticker.nome}
        loading="lazy"
        decoding="async"
        style={{
          width: 56,
          height: 78,
          objectFit: 'cover',
          borderRadius: 6,
          border: `2px solid ${corBorda}`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {badge && <span>{badge}</span>}
          <span>{titulo}</span>
          <Tag color={corBorda === '#FFC72C' ? 'gold' : 'green'} style={{ marginInlineEnd: 0 }}>
            {sticker.codigo}
          </Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button
            size="small"
            shape="circle"
            icon={<Minus size={14} />}
            onClick={() => onChange(Math.max(0, valor - 1))}
            disabled={valor <= 0}
          />
          <InputNumber
            min={0}
            max={99}
            value={valor}
            onChange={(v) => onChange(Number(v ?? 0))}
            size="small"
            style={{ width: 64 }}
          />
          <Button
            size="small"
            shape="circle"
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => onChange(valor + 1)}
            style={{ background: corBorda, borderColor: corBorda, color: '#0a1230' }}
          />
          <span style={{ color: '#9aa6c9', fontSize: 11, marginLeft: 'auto' }}>
            {valor === 0
              ? 'não tenho'
              : `${valor}${repetidas > 0 ? ` (${repetidas} repetidas)` : ''}`}
          </span>
        </div>
      </div>
    </div>
  );
}
