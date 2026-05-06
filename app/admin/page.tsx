'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, InputNumber, Popconfirm, Switch, message } from 'antd';
import type { InputNumberRef } from 'rc-input-number';
import { ArrowLeft, Bug, Minus, Plus, Star, Trash2, Users } from 'lucide-react';
import { MASTER_ID, usePerfil } from '@/resources/hooks/usePerfil';

const MASTER_PIN = '1788';
const LIMITE_MIN = 1;
const LIMITE_MAX = 5000;
const SCAN_DEBUG_KEY = 'figurinhas:scan:debug';

function formatarUltimoLogin(valor?: number) {
  if (!valor) return 'Nunca';
  const data = new Date(valor);
  const yyyy = data.getFullYear();
  const MM = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  const HH = String(data.getHours()).padStart(2, '0');
  const mm = String(data.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

export default function AdminPage() {
  const router = useRouter();
  const { perfis, perfilId, perfilAtual, carregado, deletar, recarregar } = usePerfil();
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [limite, setLimite] = useState<number>(50);
  const [limiteCarregado, setLimiteCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [valorEdicao, setValorEdicao] = useState<number>(50);
  const inputRef = useRef<InputNumberRef>(null);
  const carregouPerfisRef = useRef(false);
  const [scanDebug, setScanDebug] = useState(false);

  useEffect(() => {
    try {
      setScanDebug(window.localStorage.getItem(SCAN_DEBUG_KEY) === '1');
    } catch {}
  }, []);

  const alternarScanDebug = (v: boolean) => {
    setScanDebug(v);
    try {
      window.localStorage.setItem(SCAN_DEBUG_KEY, v ? '1' : '0');
    } catch {}
  };

  useEffect(() => {
    if (carregado && perfilAtual?.id !== MASTER_ID) {
      router.replace('/');
    }
  }, [carregado, perfilAtual, router]);

  useEffect(() => {
    if (perfilId !== MASTER_ID || carregouPerfisRef.current) return;
    carregouPerfisRef.current = true;
    recarregar();
  }, [perfilId, recarregar]);

  useEffect(() => {
    fetch('/api/limite', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { limite: number }) => {
        setLimite(d.limite);
        setValorEdicao(d.limite);
        setLimiteCarregado(true);
      })
      .catch(() => setLimiteCarregado(true));
  }, []);

  useEffect(() => {
    if (editando) inputRef.current?.focus();
  }, [editando]);

  if (!carregado || perfilAtual?.id !== MASTER_ID) {
    return <div className="app-content" style={{ minHeight: '100vh' }} />;
  }

  const ordenados = [...perfis].sort((a, b) => {
    if (a.id === MASTER_ID) return -1;
    if (b.id === MASTER_ID) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  const remover = async (id: string, nome: string) => {
    setRemovendo(id);
    await deletar(id);
    await recarregar();
    setRemovendo(null);
    message.success(`Usuario "${nome}" removido`);
  };

  const salvarLimite = async (proximo: number) => {
    const valor = Math.max(LIMITE_MIN, Math.min(LIMITE_MAX, Math.floor(proximo)));
    if (valor === limite) return;
    if (valor < perfis.length) {
      message.warning(
        `Limite nao pode ser menor que o total atual (${perfis.length}).`
      );
      return;
    }
    setSalvando(true);
    try {
      const r = await fetch('/api/limite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limite: valor, perfilId: MASTER_ID, pin: MASTER_PIN }),
      });
      if (!r.ok) throw new Error('falha');
      const d = (await r.json()) as { limite: number };
      setLimite(d.limite);
      setValorEdicao(d.limite);
      message.success(`Limite atualizado para ${d.limite}`);
    } catch {
      message.error('Falha ao atualizar limite');
    } finally {
      setSalvando(false);
    }
  };

  const total = perfis.length;
  const pct = limite > 0 ? Math.min(100, Math.max(2, (total / limite) * 100)) : 0;
  const cheio = total >= limite;
  const corBarra = cheio ? '#ef4444' : total / limite >= 0.8 ? '#f59e0b' : '#22c55e';

  return (
    <div className="app-content" style={{ paddingBottom: 100 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 0 8px',
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeft size={18} color="#9aa6c9" />}
          onClick={() => router.push('/')}
          aria-label="Voltar"
        />
        <Star size={20} color="#FFD700" fill="#FFD700" />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Admin</div>
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(34,197,94,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} color="#22c55e" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#9aa6c9', fontWeight: 600 }}>
              Usuarios cadastrados
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                fontSize: 22,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              <span>{total}</span>
              <span style={{ color: '#9aa6c9', fontWeight: 600, fontSize: 14 }}>
                / {limite}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button
              shape="circle"
              size="small"
              disabled={!limiteCarregado || salvando || limite <= LIMITE_MIN}
              icon={<Minus size={14} />}
              onClick={() => salvarLimite(limite - 1)}
              aria-label="Diminuir limite"
            />
            {editando ? (
              <InputNumber
                ref={inputRef}
                size="small"
                min={LIMITE_MIN}
                max={LIMITE_MAX}
                value={valorEdicao}
                onChange={(v) => typeof v === 'number' && setValorEdicao(v)}
                onBlur={() => {
                  setEditando(false);
                  salvarLimite(valorEdicao);
                }}
                onPressEnter={() => {
                  setEditando(false);
                  salvarLimite(valorEdicao);
                }}
                style={{ width: 70 }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setValorEdicao(limite);
                  setEditando(true);
                }}
                aria-label="Editar limite"
                style={{
                  minWidth: 44,
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {limite}
              </button>
            )}
            <Button
              shape="circle"
              size="small"
              type="primary"
              disabled={!limiteCarregado || salvando || limite >= LIMITE_MAX}
              icon={<Plus size={14} />}
              onClick={() => salvarLimite(limite + 1)}
              aria-label="Aumentar limite"
            />
          </div>
        </div>

        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: corBarra,
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        {cheio && (
          <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>
            Limite atingido — novos cadastros bloqueados
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(245,158,11,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bug size={22} color="#f59e0b" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>
            Debug do scanner (OCR)
          </div>
          <div style={{ fontSize: 11, color: '#9aa6c9', marginTop: 2, lineHeight: 1.35 }}>
            Mostra na tela do scanner o recorte enviado ao OCR, o texto bruto reconhecido e os
            códigos candidatos extraídos.
          </div>
        </div>
        <Switch checked={scanDebug} onChange={alternarScanDebug} />
      </div>

      <div className="section-title">
        <h3>Usuarios</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ordenados.map((p) => {
          const ehMaster = p.id === MASTER_ID;
          return (
            <div
              key={p.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: ehMaster ? '#FFD700' : '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a1230',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                {p.nome.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.nome}
                  </span>
                  {ehMaster && <Star size={13} color="#FFD700" fill="#FFD700" />}
                </div>
                <div style={{ fontSize: 11, color: '#7f8aad', marginTop: 2 }}>
                  Ultimo login: {formatarUltimoLogin(p.ultimoLoginEm)}
                </div>
              </div>
              {ehMaster ? (
                <span
                  style={{
                    fontSize: 11,
                    color: '#FFD700',
                    fontWeight: 700,
                    padding: '4px 8px',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: 8,
                  }}
                >
                  Protegido
                </span>
              ) : (
                <Popconfirm
                  title="Excluir usuario"
                  description={`Remover "${p.nome}" e toda a colecao dele?`}
                  okText="Excluir"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remover(p.id, p.nome)}
                >
                  <Button
                    danger
                    type="text"
                    aria-label={`Excluir ${p.nome}`}
                    loading={removendo === p.id}
                    icon={<Trash2 size={18} color="#ef4444" />}
                  />
                </Popconfirm>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
