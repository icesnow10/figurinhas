'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import { Check, Lock, Plus, Trophy, User, Users, X } from 'lucide-react';
import { usePerfil } from '@/resources/hooks/usePerfil';

interface LimiteInfo {
  limite: number;
  total: number;
}

const USERNAME_REGEX = /^[A-Za-z0-9]+$/;

export function AuthScreen() {
  const { carregado, criar, entrarComNome } = usePerfil();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [limite, setLimite] = useState<LimiteInfo | null>(null);
  const [modalLimite, setModalLimite] = useState(false);
  const [modalSuporte, setModalSuporte] = useState(false);

  const carregarLimite = async () => {
    try {
      const r = await fetch('/api/limite', { cache: 'no-store' });
      if (r.ok) setLimite((await r.json()) as LimiteInfo);
    } catch {}
  };

  useEffect(() => {
    carregarLimite();
  }, []);

  const limpar = () => {
    setNome('');
    setPin('');
  };

  const trocarModo = (proximo: 'entrar' | 'criar') => {
    setModo(proximo);
    limpar();
  };

  const submeter = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      message.error('Digite seu nome');
      return;
    }
    if (modo === 'criar' && (nomeLimpo.length < 3 || nomeLimpo.length > 25)) {
      message.error('usuario entre 3 e 25 caracteres');
      return;
    }
    if (modo === 'criar' && !USERNAME_REGEX.test(nomeLimpo)) {
      message.error('usuario deve ter apenas letras e numeros');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      message.error('PIN deve ter 4 digitos');
      return;
    }

    setEnviando(true);
    const resultadoCriacao =
      modo === 'criar' ? await criar(nomeLimpo, pin) : undefined;
    const ok =
      modo === 'entrar'
        ? await entrarComNome(nomeLimpo, pin)
        : !!resultadoCriacao?.perfil;
    setEnviando(false);

    if (!ok) {
      if (modo === 'criar' && resultadoCriacao?.codigo === 'LIMITE_ATINGIDO') {
        setModalLimite(true);
        carregarLimite();
        return;
      }
      message.error(
        modo === 'entrar'
          ? 'Nome ou PIN incorreto'
          : resultadoCriacao?.erro ?? 'Falha ao criar usuario'
      );
      return;
    }

    message.success(modo === 'entrar' ? 'Login realizado' : 'Usuario criado');
    carregarLimite();
  };

  const total = limite?.total ?? 0;
  const cap = limite?.limite ?? 50;
  const pct = cap > 0 ? Math.min(100, Math.max(2, (total / cap) * 100)) : 0;
  const cheio = total >= cap;
  const corBarra = cheio ? '#ef4444' : total / cap >= 0.8 ? '#f59e0b' : '#22c55e';

  return (
    <div
      className="app-content"
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: 480,
        marginInline: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 18,
        }}
      >
      <div style={{ textAlign: 'center' }}>
        <Trophy size={46} color="#FFD700" />
        <div style={{ marginTop: 10, color: '#FFD700', fontWeight: 900, fontSize: 18 }}>
          WORLD CUP 2026
        </div>
        <div style={{ color: '#9aa6c9', fontSize: 13, marginTop: 4 }}>
          {modo === 'entrar' ? 'Entre no seu album' : 'Crie seu album'}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input
          size="large"
          prefix={<User size={16} color="#9aa6c9" />}
          placeholder={modo === 'criar' ? 'Nome de usuario (ate 25)' : 'Nome de usuario'}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onPressEnter={submeter}
          maxLength={modo === 'criar' ? 25 : 40}
          autoFocus
        />
        <Input.Password
          size="large"
          prefix={<Lock size={16} color="#9aa6c9" />}
          placeholder="PIN de 4 digitos"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onPressEnter={submeter}
          maxLength={4}
          inputMode="numeric"
        />
        {modo === 'criar' && (
          <Requisitos
            itens={[
              { ok: nome.trim().length >= 3, label: 'Minimo de 3 caracteres' },
              {
                ok: nome.trim().length <= 25,
                label: 'Maximo de 25 caracteres',
              },
              {
                ok: USERNAME_REGEX.test(nome.trim()),
                label: 'Apenas letras e numeros',
              },
              { ok: /^\d{4}$/.test(pin), label: 'PIN com 4 digitos' },
            ]}
          />
        )}
        <Button
          type="primary"
          size="large"
          block
          loading={enviando || !carregado}
          icon={modo === 'criar' ? <Plus size={16} /> : <Lock size={16} />}
          onClick={submeter}
        >
          {modo === 'entrar' ? 'Entrar' : 'Criar usuario'}
        </Button>
      </div>

      {limite && (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="#9aa6c9" />
              <span style={{ fontSize: 12, color: '#9aa6c9', fontWeight: 600 }}>
                Usuarios cadastrados
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {total}
              <span style={{ color: '#9aa6c9', fontWeight: 500 }}> / {cap}</span>
            </span>
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
      )}

      <Button
        type="text"
        onClick={() => trocarModo(modo === 'entrar' ? 'criar' : 'entrar')}
      >
        {modo === 'entrar' ? 'Criar novo usuario' : 'Ja tenho usuario'}
      </Button>
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Precisa de ajuda?</div>
          <div style={{ color: '#9aa6c9', fontSize: 12, marginTop: 2 }}>
            Fale comigo pelo X.
          </div>
        </div>
        <Button size="small" onClick={() => setModalSuporte(true)}>
          Suporte
        </Button>
      </div>

      <Modal
        open={modalLimite}
        title="Limite de usuarios atingido"
        onCancel={() => setModalLimite(false)}
        onOk={() => setModalLimite(false)}
        okText="Entendi"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p style={{ marginBottom: 6 }}>
          Nao foi possivel criar o usuario porque o limite de{' '}
          <strong>{limite?.limite ?? cap}</strong> usuarios ja foi atingido.
        </p>
        <p style={{ color: '#9aa6c9', fontSize: 13 }}>
          Peca ao administrador para aumentar o limite ou remover usuarios inativos.
        </p>
      </Modal>

      <Modal
        open={modalSuporte}
        title="Suporte"
        onCancel={() => setModalSuporte(false)}
        footer={[
          <Button key="cancelar" onClick={() => setModalSuporte(false)}>
            Fechar
          </Button>,
          <Button
            key="x"
            type="primary"
            href="https://x.com/hersz10"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir X
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 6 }}>
          Para suporte, me envie uma mensagem no X: <strong>@hersz10</strong>.
        </p>
        <p style={{ color: '#9aa6c9', fontSize: 13, margin: 0 }}>
          O link abre em uma nova aba.
        </p>
      </Modal>
    </div>
  );
}

interface Requisito {
  ok: boolean;
  label: string;
}

function Requisitos({ itens }: { itens: Requisito[] }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {itens.map((it) => (
        <li
          key={it.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: it.ok ? '#22c55e' : '#fca5a5',
            transition: 'color 0.15s ease',
          }}
        >
          {it.ok ? <Check size={14} /> : <X size={14} />}
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
