'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Collapse, Progress, Tabs, Empty, Input, Skeleton, Switch, Tag, message } from 'antd';
import { Copy, Eye, Plus, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useColecao } from '@/resources/hooks/useColecao';
import { usePerfil } from '@/resources/hooks/usePerfil';
import { FIGURINHAS } from '@/resources/data/figurinhas';
import { SELECOES } from '@/resources/data/selecoes';
import type { ColecaoEstado, Sticker as StickerType } from '@/resources/types';

const NOMES_INGLES: Record<string, string> = {
  MEX: 'Mexico',
  CRC: 'Costa Rica',
  CMR: 'Cameroon',
  NZL: 'New Zealand',
  CAN: 'Canada',
  ECU: 'Ecuador',
  SCO: 'Scotland',
  UZB: 'Uzbekistan',
  USA: 'United States',
  COL: 'Colombia',
  IRN: 'Iran',
  GHA: 'Ghana',
  ARG: 'Argentina',
  AUS: 'Australia',
  EGY: 'Egypt',
  AUT: 'Austria',
  BRA: 'Brazil',
  KSA: 'Saudi Arabia',
  SRB: 'Serbia',
  ALG: 'Algeria',
  GER: 'Germany',
  JPN: 'Japan',
  POL: 'Poland',
  SEN: 'Senegal',
  FRA: 'France',
  KOR: 'South Korea',
  MAR: 'Morocco',
  UKR: 'Ukraine',
  ESP: 'Spain',
  URU: 'Uruguay',
  NGA: 'Nigeria',
  NOR: 'Norway',
  ENG: 'England',
  PAR: 'Paraguay',
  TUR: 'Turkey',
  CIV: 'Ivory Coast',
  POR: 'Portugal',
  QAT: 'Qatar',
  HUN: 'Hungary',
  DEN: 'Denmark',
  NED: 'Netherlands',
  CZE: 'Czechia',
  BEL: 'Belgium',
  TUN: 'Tunisia',
  ITA: 'Italy',
  CRO: 'Croatia',
  SUI: 'Switzerland',
  PAN: 'Panama',
};

function faltamPorSelecao(colecao: ColecaoEstado): Record<string, number> {
  const mapa: Record<string, number> = {};
  FIGURINHAS.forEach((f) => {
    if (f.tipo !== 'selecao' || !f.selecaoId) return;
    if (!temNoEstado(colecao, f.id)) {
      mapa[f.selecaoId] = (mapa[f.selecaoId] ?? 0) + 1;
    }
  });
  return mapa;
}

function formatarMensagem(
  figurinhas: StickerType[],
  separador = '\n',
  faltantesPorSelecao?: Record<string, number>
) {
  type Bloco = { ordem: number; texto: string };
  const blocos: Bloco[] = [];

  SELECOES.forEach((selecao) => {
    const numeros = figurinhas
      .filter((s) => s.selecaoId === selecao.id)
      .map((s) => String(s.numero));

    if (numeros.length === 0) return;

    const nomeIngles = NOMES_INGLES[selecao.id] ?? selecao.nome;
    const faltamAntes = faltantesPorSelecao?.[selecao.id];
    let sufixo = '';
    let ordem = Number.MAX_SAFE_INTEGER;

    if (faltamAntes !== undefined) {
      const restam = Math.max(0, faltamAntes - numeros.length);
      ordem = restam;
      if (restam === 0) sufixo = ' [COMPLETA O ALBUM]';
      else if (restam <= 3) sufixo = ` [faltam ${restam} p/ completar]`;
    }

    blocos.push({
      ordem,
      texto: `${selecao.bandeira} ${nomeIngles} (${selecao.id})${sufixo} = ${numeros.join(', ')}`,
    });
  });

  if (faltantesPorSelecao) blocos.sort((a, b) => a.ordem - b.ordem);

  const especiaisNumeros = figurinhas
    .filter((s) => s.tipo === 'especial')
    .map((s) => String(s.numero));

  const linhas = blocos.map((b) => b.texto);
  if (especiaisNumeros.length > 0) {
    linhas.push(`Specials (FWC) = ${especiaisNumeros.join(', ')}`);
  }

  return linhas.join(separador);
}

interface AmigoSalvo {
  id: string;
  nome: string;
}

interface ResumoAlbum {
  coletadas: number;
  totalAlbum: number;
  faltantes: number;
  percentual: number;
}

interface RankingItem extends ResumoAlbum {
  id: string;
  nome: string;
}

function isBrilhante(sticker: StickerType) {
  return sticker.tipo === 'especial' || (sticker.tipo === 'selecao' && sticker.numero === 1);
}

function temNoEstado(estado: ColecaoEstado, stickerId: string) {
  return (estado[stickerId] ?? 0) > 0;
}

function duplicadasNoEstado(estado: ColecaoEstado, stickerId: string) {
  return Math.max(0, (estado[stickerId] ?? 0) - 1);
}

export default function TrocasPage() {
  const { duplicadas, estado, tem, recarregar } = useColecao();
  const { perfilId } = usePerfil();
  const [amigos, setAmigos] = useState<AmigoSalvo[]>([]);
  const [carregandoAmigos, setCarregandoAmigos] = useState(true);
  const [adicionandoAmigo, setAdicionandoAmigo] = useState(false);
  const [amigoNome, setAmigoNome] = useState('');
  const [amigoAtivoId, setAmigoAtivoId] = useState<string | null>(null);
  const [colecaoAmigo, setColecaoAmigo] = useState<ColecaoEstado>({});
  const [carregandoAmigo, setCarregandoAmigo] = useState(false);
  const [trocaJustaPorAmigo, setTrocaJustaPorAmigo] = useState<Record<string, boolean>>({});
  const [trocaCompletar, setTrocaCompletar] = useState(false);
  const [apenasMatch, setApenasMatch] = useState(false);
  const [resumoPorAmigo, setResumoPorAmigo] = useState<Record<string, ResumoAlbum>>({});

  useEffect(() => {
    let ativo = true;
    fetch('/api/ranking', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ranking: [] }))
      .then((data: { ranking?: RankingItem[] }) => {
        if (!ativo) return;
        const mapa: Record<string, ResumoAlbum> = {};
        (data.ranking ?? []).forEach((item) => {
          mapa[item.id] = {
            coletadas: item.coletadas,
            totalAlbum: item.totalAlbum,
            faltantes: item.faltantes,
            percentual: item.percentual,
          };
        });
        setResumoPorAmigo(mapa);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const meusFaltantesPorSelecao = useMemo(() => faltamPorSelecao(estado), [estado]);

  const repetidas = FIGURINHAS.filter((f) => duplicadas(f.id) > 0);
  const faltantes = FIGURINHAS.filter((f) => !tem(f.id));
  const textoRepetidas = useMemo(() => formatarMensagem(repetidas), [repetidas]);
  const textoFaltantes = useMemo(
    () =>
      formatarMensagem(
        faltantes,
        '\n\n',
        trocaCompletar ? meusFaltantesPorSelecao : undefined
      ),
    [faltantes, meusFaltantesPorSelecao, trocaCompletar]
  );

  useEffect(() => {
    if (!perfilId) return;
    setCarregandoAmigos(true);
    fetch(`/api/amigos?perfil=${encodeURIComponent(perfilId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { amigos: [] }))
      .then((data: { amigos?: AmigoSalvo[] }) => {
        const lista = data.amigos ?? [];
        setAmigos(lista);
        setAmigoAtivoId((atual) => atual ?? lista[0]?.id ?? null);
      })
      .catch(() => setAmigos([]))
      .finally(() => setCarregandoAmigos(false));
  }, [perfilId]);

  useEffect(() => {
    if (!amigoAtivoId) {
      setColecaoAmigo({});
      return;
    }

    setCarregandoAmigo(true);
    fetch(`/api/colecao?perfil=${encodeURIComponent(amigoAtivoId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setColecaoAmigo(data ?? {}))
      .catch(() => {
        setColecaoAmigo({});
        message.error('Nao foi possivel carregar o amigo');
      })
      .finally(() => setCarregandoAmigo(false));
  }, [amigoAtivoId]);

  const adicionarAmigo = async () => {
    const nome = amigoNome.trim();
    if (!nome || !perfilId) return;
    setAdicionandoAmigo(true);
    try {
      const r = await fetch(`/api/amigos?perfil=${encodeURIComponent(perfilId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        amigo?: AmigoSalvo;
        amigos?: AmigoSalvo[];
        erro?: string;
        codigo?: string;
      };
      if (r.status === 409 && data.codigo === 'JA_EXISTE' && data.amigo) {
        message.info('Amigo ja adicionado');
        setAmigoNome('');
        setAmigoAtivoId(data.amigo.id);
        return;
      }
      if (!r.ok || !data.amigo) {
        message.error(data.erro ?? 'Falha ao adicionar amigo');
        return;
      }
      if (data.amigos) setAmigos(data.amigos);
      setAmigoNome('');
      setAmigoAtivoId(data.amigo.id);
      message.success('Amigo adicionado');
    } catch {
      message.error('Falha de conexao');
    } finally {
      setAdicionandoAmigo(false);
    }
  };

  const removerAmigo = async (id: string) => {
    if (!perfilId) return;
    const anterior = amigos;
    const proximos = amigos.filter((amigo) => amigo.id !== id);
    setAmigos(proximos);
    if (amigoAtivoId === id) setAmigoAtivoId(proximos[0]?.id ?? null);
    try {
      const r = await fetch(
        `/api/amigos?perfil=${encodeURIComponent(perfilId)}&id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      if (!r.ok) throw new Error('falha');
    } catch {
      setAmigos(anterior);
      message.error('Nao foi possivel remover o amigo');
    }
  };

  const copiarTexto = async (texto: string) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      message.success('Lista copiada');
    } catch {
      message.error('Nao foi possivel copiar');
    }
  };

  return (
    <>
      <Header />
      <div className="app-content">
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>
                Troca para completar
              </div>
              <div style={{ color: '#9aa6c9', fontSize: 11 }}>
                Prioriza no topo as seleções mais perto de fechar e mostra "completa" ou "faltam X".
              </div>
            </div>
            <Switch checked={trocaCompletar} onChange={setTrocaCompletar} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Apenas match</div>
              <div style={{ color: '#9aa6c9', fontSize: 11 }}>
                Limita os dois lados ao mínimo (ex.: 15 minhas × 40 do amigo = 15 trocas).
              </div>
            </div>
            <Switch checked={apenasMatch} onChange={setApenasMatch} />
          </div>
        </div>
        <Tabs
          defaultActiveKey="amigos"
          onChange={() => {
            recarregar();
          }}
          items={[
            {
              key: 'amigos',
              label: 'Amigos',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        value={amigoNome}
                        onChange={(e) => setAmigoNome(e.target.value)}
                        onPressEnter={adicionarAmigo}
                        placeholder="Nome do amigo"
                        disabled={adicionandoAmigo}
                      />
                      <Button
                        type="primary"
                        icon={<Plus size={15} />}
                        onClick={adicionarAmigo}
                        loading={adicionandoAmigo}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {carregandoAmigos ? (
                    <div className="card">
                      <Skeleton active paragraph={{ rows: 3 }} />
                    </div>
                  ) : amigos.length === 0 ? (
                    <Empty description="Adicione um amigo pelo nome do usuario" />
                  ) : (
                    <Collapse
                      accordion
                      activeKey={amigoAtivoId ?? undefined}
                      onChange={(key) => {
                        const id = Array.isArray(key) ? key[0] : key;
                        setAmigoAtivoId(id ? String(id) : null);
                      }}
                      items={amigos.map((amigo) => {
                        const resumo = resumoPorAmigo[amigo.id];
                        return ({
                        key: amigo.id,
                        label: (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Eye size={15} color="#22c55e" />
                              <span
                                style={{
                                  color: '#fff',
                                  fontWeight: 700,
                                  flex: 1,
                                  minWidth: 0,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {amigo.nome}
                              </span>
                              {resumo && (
                                <>
                                  <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>
                                    {resumo.coletadas}/{resumo.totalAlbum}
                                  </span>
                                  <span
                                    style={{
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 800,
                                      minWidth: 32,
                                      textAlign: 'right',
                                    }}
                                  >
                                    {resumo.percentual}%
                                  </span>
                                </>
                              )}
                            </div>
                            {resumo && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Progress
                                  percent={resumo.percentual}
                                  showInfo={false}
                                  strokeColor="#22c55e"
                                  trailColor="rgba(255,255,255,0.08)"
                                  size="small"
                                  style={{ margin: 0, flex: 1 }}
                                />
                                <span style={{ color: '#9aa6c9', fontSize: 10 }}>
                                  faltam {resumo.faltantes}
                                </span>
                              </div>
                            )}
                          </div>
                        ),
                        extra: (
                          <Button
                            type="text"
                            size="small"
                            icon={<Trash2 size={14} color="#ef4444" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              removerAmigo(amigo.id);
                            }}
                          />
                        ),
                        children:
                          amigo.id === amigoAtivoId ? (
                            <ComparativoAmigo
                              nome={amigo.nome}
                              carregando={carregandoAmigo}
                              minhaColecao={estado}
                              colecaoAmigo={colecaoAmigo}
                              trocaJusta={trocaJustaPorAmigo[amigo.id] ?? false}
                              trocaCompletar={trocaCompletar}
                              apenasMatch={apenasMatch}
                              onTrocaJustaChange={(checked) =>
                                setTrocaJustaPorAmigo((prev) => ({
                                  ...prev,
                                  [amigo.id]: checked,
                                }))
                              }
                              onCopiar={copiarTexto}
                            />
                          ) : (
                            <div style={{ color: '#9aa6c9' }}>Clique para ver as trocas.</div>
                          ),
                        });
                      })}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'whatsapp',
              label: 'WhatsApp',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <MensagemWhatsApp
                    titulo={`Repetidas (${repetidas.length})`}
                    texto={textoRepetidas}
                    onCopiar={() => copiarTexto(textoRepetidas)}
                  />
                  <MensagemWhatsApp
                    titulo={`Preciso (${faltantes.length})`}
                    texto={textoFaltantes}
                    onCopiar={() => copiarTexto(textoFaltantes)}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}

function ComparativoAmigo({
  nome,
  carregando,
  minhaColecao,
  colecaoAmigo,
  trocaJusta,
  trocaCompletar,
  apenasMatch,
  onTrocaJustaChange,
  onCopiar,
}: {
  nome: string;
  carregando: boolean;
  minhaColecao: ColecaoEstado;
  colecaoAmigo: ColecaoEstado;
  trocaJusta: boolean;
  trocaCompletar: boolean;
  apenasMatch: boolean;
  onTrocaJustaChange: (checked: boolean) => void;
  onCopiar: (texto: string) => void;
}) {
  const comparativo = useMemo(
    () =>
      compararColecoes(minhaColecao, colecaoAmigo, {
        trocaJusta,
        trocaCompletar,
        apenasMatch,
      }),
    [apenasMatch, colecaoAmigo, minhaColecao, trocaCompletar, trocaJusta]
  );

  const meusFaltantes = useMemo(
    () => (trocaCompletar ? faltamPorSelecao(minhaColecao) : undefined),
    [minhaColecao, trocaCompletar]
  );
  const faltantesAmigo = useMemo(
    () => (trocaCompletar ? faltamPorSelecao(colecaoAmigo) : undefined),
    [colecaoAmigo, trocaCompletar]
  );

  if (carregando) {
    return (
      <div className="card">
        <Skeleton active paragraph={{ rows: 4 }} title={{ width: 160 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ color: '#e6ecff', fontSize: 13, fontWeight: 700 }}>Troca justa</span>
          <Switch checked={trocaJusta} onChange={onTrocaJustaChange} />
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 16,
            color: '#9aa6c9',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <li>Brilhantes só trocam com brilhantes (especiais e escudo da seleção).</li>
          <li>Normais só trocam com normais.</li>
          <li>Brasil só troca com Brasil.</li>
        </ul>
      </div>
      <ResumoTroca
        titulo={`Posso oferecer para ${nome}`}
        stickers={comparativo.possoDar}
        trocaJusta={trocaJusta}
        faltantesPorSelecao={faltantesAmigo}
        onCopiar={onCopiar}
      />
      <ResumoTroca
        titulo={`Posso receber de ${nome}`}
        stickers={comparativo.possoReceber}
        trocaJusta={trocaJusta}
        faltantesPorSelecao={meusFaltantes}
        onCopiar={onCopiar}
      />
    </div>
  );
}

function compararColecoes(
  minhaColecao: ColecaoEstado,
  colecaoAmigo: ColecaoEstado,
  opcoes: { trocaJusta: boolean; trocaCompletar: boolean; apenasMatch: boolean }
) {
  const { trocaJusta, trocaCompletar, apenasMatch } = opcoes;

  const possoDarBase = FIGURINHAS.filter(
    (sticker) =>
      duplicadasNoEstado(minhaColecao, sticker.id) > 0 &&
      !temNoEstado(colecaoAmigo, sticker.id)
  );
  const possoReceberBase = FIGURINHAS.filter(
    (sticker) =>
      duplicadasNoEstado(colecaoAmigo, sticker.id) > 0 &&
      !temNoEstado(minhaColecao, sticker.id)
  );

  let possoDar = possoDarBase;
  let possoReceber = possoReceberBase;

  if (trocaJusta) {
    const isBrasil = (sticker: StickerType) => sticker.selecaoId === 'BRA';
    const baldes = (lista: StickerType[]) => ({
      braBrilhante: lista.filter((s) => isBrasil(s) && isBrilhante(s)),
      braNormal: lista.filter((s) => isBrasil(s) && !isBrilhante(s)),
      outrasBrilhante: lista.filter((s) => !isBrasil(s) && isBrilhante(s)),
      outrasNormal: lista.filter((s) => !isBrasil(s) && !isBrilhante(s)),
    });

    const dar = baldes(possoDar);
    const receber = baldes(possoReceber);

    possoDar = [
      ...(receber.braBrilhante.length ? dar.braBrilhante : []),
      ...(receber.braNormal.length ? dar.braNormal : []),
      ...(receber.outrasBrilhante.length ? dar.outrasBrilhante : []),
      ...(receber.outrasNormal.length ? dar.outrasNormal : []),
    ];
    possoReceber = [
      ...(dar.braBrilhante.length ? receber.braBrilhante : []),
      ...(dar.braNormal.length ? receber.braNormal : []),
      ...(dar.outrasBrilhante.length ? receber.outrasBrilhante : []),
      ...(dar.outrasNormal.length ? receber.outrasNormal : []),
    ];
  }

  if (trocaCompletar) {
    const faltMinhas = faltamPorSelecao(minhaColecao);
    const faltAmigo = faltamPorSelecao(colecaoAmigo);
    const ranquear = (mapa: Record<string, number>) => (s: StickerType) =>
      s.tipo === 'especial' ? Number.MAX_SAFE_INTEGER : mapa[s.selecaoId ?? ''] ?? Number.MAX_SAFE_INTEGER;

    possoDar = [...possoDar].sort(
      (a, b) => ranquear(faltAmigo)(a) - ranquear(faltAmigo)(b)
    );
    possoReceber = [...possoReceber].sort(
      (a, b) => ranquear(faltMinhas)(a) - ranquear(faltMinhas)(b)
    );
  }

  if (apenasMatch) {
    const n = Math.min(possoDar.length, possoReceber.length);
    possoDar = possoDar.slice(0, n);
    possoReceber = possoReceber.slice(0, n);
  }

  return { possoDar, possoReceber };
}

function ResumoTroca({
  titulo,
  stickers,
  trocaJusta,
  faltantesPorSelecao,
  onCopiar,
}: {
  titulo: string;
  stickers: StickerType[];
  trocaJusta: boolean;
  faltantesPorSelecao?: Record<string, number>;
  onCopiar: (texto: string) => void;
}) {
  const brilhantes = stickers.filter(isBrilhante).length;
  const normais = stickers.length - brilhantes;
  const texto = formatarMensagem(stickers, '\n', faltantesPorSelecao);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{titulo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color={trocaJusta ? 'green' : 'default'}>{stickers.length}</Tag>
          <Button
            type="primary"
            size="small"
            icon={<Copy size={14} />}
            disabled={!texto}
            onClick={() => onCopiar(texto)}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 10 }}>
        <Tag color="gold">Brilhantes {brilhantes}</Tag>
        <Tag>Normais {normais}</Tag>
      </div>
      {stickers.length === 0 ? (
        <Empty description="Nenhuma troca compativel" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Input.TextArea
          readOnly
          value={texto}
          autoSize={{ minRows: 2, maxRows: 6 }}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      )}
    </div>
  );
}

function MensagemWhatsApp({
  titulo,
  texto,
  onCopiar,
}: {
  titulo: string;
  texto: string;
  onCopiar: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginTop: 8,
        marginBottom: 12,
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
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e6ecff' }}>{titulo}</div>
        <Button type="primary" size="small" icon={<Copy size={14} />} onClick={onCopiar}>
          Copiar
        </Button>
      </div>
      <Input.TextArea
        readOnly
        value={texto}
        autoSize={{ minRows: 3, maxRows: 6 }}
        style={{ fontFamily: 'monospace', fontSize: 13 }}
      />
    </div>
  );
}
