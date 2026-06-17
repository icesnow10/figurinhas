'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Input, Button, Collapse, Segmented, Switch, message, notification, Progress } from 'antd';
import {
  RotateCw,
  X,
  Check,
  ScanLine,
  Settings2,
  Zap,
  Clock,
  Flashlight,
  FlashlightOff,
  History,
  Bolt,
  Image as ImageIcon,
  Type,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import {
  FIGURINHAS,
  figurinhaPorId,
  figurinhasPorSelecao,
  temVersaoMcDonalds,
} from '@/resources/data/figurinhas';
import { SELECOES, formatarPaginas } from '@/resources/data/selecoes';
import { useColecao } from '@/resources/hooks/useColecao';
import { useHistorico } from '@/resources/hooks/useHistorico';
import { usePerguntaMcd } from '@/resources/hooks/usePerguntaMcd';
import { HistoricoModal } from '@/components/historico/HistoricoModal';
import { Sticker as StickerView } from '@/components/sticker/Sticker';
import type { Sticker } from '@/resources/types';
import { SCANNER_CONFIG } from '@/resources/lib/faceConfig';
import { findMatches, isConfidentMatch } from '@/resources/lib/faceMatcher';
import { getDescriptor, loadModels } from '@/resources/lib/faceEmbeddings';
import type { EmbeddingsBundle, ReferenceEntry } from '@/resources/lib/faceTypes';
import { FACE_REFERENCES as ALL_REFERENCES } from '@/resources/data/embeddings-all';

const FACE_REFERENCES: ReferenceEntry[] = ALL_REFERENCES;

function normalizarCodigo(raw: string): string {
  const limpo = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!limpo) return '';
  if (/^\d+$/.test(limpo)) {
    if (limpo === '00' || limpo === '0') return '00';
    const n = parseInt(limpo, 10);
    if (n >= 1 && n <= 99) return `FWC${n}`;
    return limpo;
  }
  const m = limpo.match(/^([A-Z]{3})0*(\d+)$/);
  if (m) return `${m[1]}${m[2].padStart(2, '0')}`;
  return limpo;
}

function extrairCodigosCandidatos(texto: string): string[] {
  const upper = texto.toUpperCase();
  const matches = new Set<string>();
  // 3 letras + 1-2 dígitos
  const reTime = /\b([A-Z]{3})\s?0?(\d{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = reTime.exec(upper))) {
    matches.add(`${m[1]}${m[2].padStart(2, '0')}`);
  }
  // FWC + número
  const reFwc = /\bFWC\s?(\d{1,2})\b/g;
  while ((m = reFwc.exec(upper))) {
    matches.add(`FWC${parseInt(m[1], 10)}`);
  }
  // "00" isolado
  if (/\b00\b/.test(upper)) matches.add('00');
  return Array.from(matches);
}

function buscarFigurinha(codigo: string): Sticker | undefined {
  if (!codigo) return undefined;
  return FIGURINHAS.find((f) => f.codigo.toUpperCase() === codigo);
}

const CAMERA_FACING_KEY = 'figurinhas:scan:facingMode';
const SCAN_DEBUG_KEY = 'figurinhas:scan:debug';
const SCAN_TURBO_KEY = 'figurinhas:scan:turbo'; // legado, migrado para SCAN_MODE_KEY
const SCAN_MODE_KEY = 'figurinhas:scan:mode';
const SCAN_QUICK_KEY = 'figurinhas:scan:quickMode';
const SCAN_USO_KEY = 'figurinhas:scan:modoUso';
const SCAN_CAPTURA_KEY = 'figurinhas:scan:captura';
const QUICK_DURATION_MS = 10_000;
const TROCA_DURATION_MS = 6_000;
const MAX_NOTIFICACOES_QUICK = 2;

type ModoScan = 'turbo' | 'legacy';
type ModoUso = 'normal' | 'quick' | 'troca';
type ModoCaptura = 'foto' | 'codigo';

function lerModoCaptura(): ModoCaptura {
  if (typeof window === 'undefined') return 'foto';
  try {
    const salvo = window.localStorage.getItem(SCAN_CAPTURA_KEY);
    return salvo === 'codigo' ? 'codigo' : 'foto';
  } catch {
    return 'foto';
  }
}

function lerModoScan(): ModoScan {
  if (typeof window === 'undefined') return 'turbo';
  try {
    const salvo = window.localStorage.getItem(SCAN_MODE_KEY);
    if (salvo === 'turbo' || salvo === 'legacy') return salvo;
    // migra: se o usuário já desligou explicitamente o turbo antes, respeita
    const turboLegado = window.localStorage.getItem(SCAN_TURBO_KEY);
    if (turboLegado === '0') return 'legacy';
    return 'turbo';
  } catch {
    return 'turbo';
  }
}

const FEATURES_SCAN: {
  id: ModoScan;
  titulo: string;
  descricao: string;
  recomendado?: boolean;
  icone: typeof Zap;
}[] = [
  {
    id: 'turbo',
    titulo: 'Turbo (multi-zoom + alto contraste)',
    descricao:
      'Faz zoom digital alternando 3 escalas e aplica alto contraste antes do OCR. Reconhece mais rápido e evita ter que aproximar/afastar o cromo.',
    recomendado: true,
    icone: Zap,
  },
  {
    id: 'legacy',
    titulo: 'Clássico (sem zoom automático)',
    descricao:
      'Captura uma única escala, sem pré-processamento. Pode exigir aproximar e afastar o cromo manualmente.',
    icone: Clock,
  },
];
// Larguras (em fração da largura do vídeo) que o modo turbo alterna a cada tick.
// Simula o "afastar/aproximar" manual fazendo zoom digital em 3 escalas.
const ESCALAS_TURBO = [0.45, 0.65, 0.9] as const;
const ASPECTO_JANELA = 0.28 / 0.65; // razão alturaJanela/larguraJanela atual

function lerCameraPreferida(): 'environment' | 'user' {
  if (typeof window === 'undefined') return 'environment';
  try {
    const salvo = window.localStorage.getItem(CAMERA_FACING_KEY);
    return salvo === 'user' || salvo === 'environment' ? salvo : 'environment';
  } catch {
    return 'environment';
  }
}

function salvarCameraPreferida(facingMode: 'environment' | 'user') {
  try {
    window.localStorage.setItem(CAMERA_FACING_KEY, facingMode);
  } catch {}
}

function ToastSwipe({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: ReactNode;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const deltaRef = useRef(0);
  const dismissedRef = useRef(false);

  const aplicar = () => {
    if (!elRef.current) return;
    const d = deltaRef.current;
    elRef.current.style.transform = `translateX(${d}px)`;
    elRef.current.style.opacity = String(1 - Math.min(0.6, Math.abs(d) / 220));
  };

  return (
    <div
      ref={elRef}
      onTouchStart={(e) => {
        if (dismissedRef.current) return;
        startRef.current = e.touches[0].clientX;
        if (elRef.current) elRef.current.style.transition = 'none';
      }}
      onTouchMove={(e) => {
        if (startRef.current === null || dismissedRef.current) return;
        deltaRef.current = e.touches[0].clientX - startRef.current;
        aplicar();
      }}
      onTouchEnd={() => {
        if (dismissedRef.current) return;
        if (Math.abs(deltaRef.current) > 80) {
          dismissedRef.current = true;
          if (elRef.current) {
            elRef.current.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
            const direcao = deltaRef.current > 0 ? 1 : -1;
            deltaRef.current = direcao * 320;
            aplicar();
          }
          window.setTimeout(onDismiss, 180);
        } else {
          deltaRef.current = 0;
          if (elRef.current) {
            elRef.current.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
          }
          aplicar();
        }
        startRef.current = null;
      }}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}

export default function ScanPageClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<any>(null);
  const loopAtivoRef = useRef(false);
  const pausadoRef = useRef(false);
  const cooldownTimeoutRef = useRef<number | null>(null);
  const escalaTickRef = useRef(0);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(lerCameraPreferida);
  const [cameraErro, setCameraErro] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoTexto, setUltimoTexto] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [codigoLido, setCodigoLido] = useState('');
  const [edicaoManual, setEdicaoManual] = useState('');

  const [debugAtivo, setDebugAtivo] = useState(false);
  const [debugFrame, setDebugFrame] = useState<string | null>(null);
  const [debugCandidatos, setDebugCandidatos] = useState<string[]>([]);
  const [modoScan, setModoScan] = useState<ModoScan>('turbo');
  const [modoCaptura, setModoCaptura] = useState<ModoCaptura>('foto');
  const modoCapturaRef = useRef<ModoCaptura>('foto');
  const [faceProntos, setFaceProntos] = useState(false);
  const ultimoFaceIdRef = useRef<{ id: string; at: number } | null>(null);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [flashAtivo, setFlashAtivo] = useState(false);
  const [flashSuportado, setFlashSuportado] = useState(false);
  const [modoUso, setModoUso] = useState<ModoUso>('normal');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [notifApi, notifContext] = notification.useNotification();
  const modoUsoRef = useRef<ModoUso>('normal');

  useEffect(() => {
    try {
      setDebugAtivo(window.localStorage.getItem(SCAN_DEBUG_KEY) === '1');
      const salvoUso = window.localStorage.getItem(SCAN_USO_KEY);
      if (salvoUso === 'normal' || salvoUso === 'quick' || salvoUso === 'troca') {
        setModoUso(salvoUso);
      } else if (window.localStorage.getItem(SCAN_QUICK_KEY) === '1') {
        setModoUso('quick');
      }
    } catch {}
    setModoScan(lerModoScan());
    setModoCaptura(lerModoCaptura());
  }, []);

  useEffect(() => {
    modoCapturaRef.current = modoCaptura;
    try {
      window.localStorage.setItem(SCAN_CAPTURA_KEY, modoCaptura);
    } catch {}
  }, [modoCaptura]);

  // Lazy-load dos modelos face-api só quando o modo Foto é usado.
  useEffect(() => {
    if (modoCaptura !== 'foto' || faceProntos) return;
    let cancelado = false;
    loadModels(SCANNER_CONFIG.detector)
      .then(() => {
        if (!cancelado) setFaceProntos(true);
      })
      .catch((err) => {
        console.error('Falha ao carregar modelos face-api', err);
      });
    return () => {
      cancelado = true;
    };
  }, [modoCaptura, faceProntos]);

  useEffect(() => {
    modoUsoRef.current = modoUso;
    try {
      window.localStorage.setItem(SCAN_USO_KEY, modoUso);
      window.localStorage.setItem(SCAN_QUICK_KEY, modoUso === 'quick' ? '1' : '0');
    } catch {}
  }, [modoUso]);

  const turboAtivo = modoScan === 'turbo';

  const escolherModo = (proximo: ModoScan) => {
    setModoScan(proximo);
    try {
      window.localStorage.setItem(SCAN_MODE_KEY, proximo);
      // sincroniza chave legada para que outras superfícies não voltem ao default antigo
      window.localStorage.setItem(SCAN_TURBO_KEY, proximo === 'turbo' ? '1' : '0');
    } catch {}
  };

  const {
    tem,
    temSlot,
    duplicadas,
    duplicadasSlot,
    adicionar,
    remover,
    quantidade,
    quantidadeSlot,
  } = useColecao();
  const { adicionar: registrarHistorico, remover: removerHistorico } = useHistorico();
  const { perguntar: perguntarMcd } = usePerguntaMcd();

  const verificarSelecaoCompleta = useCallback(
    (selecaoId: string | undefined) => {
      if (!selecaoId) return null;
      const sel = SELECOES.find((s) => s.id === selecaoId);
      if (!sel) return null;
      const figs = figurinhasPorSelecao(selecaoId);
      if (!figs.length) return null;
      const completa = figs.every((f) => temSlot(f.id));
      return { selecao: sel, completa };
    },
    [temSlot]
  );

  const projetarSelecaoCompleta = useCallback(
    (sticker: Sticker | undefined) => {
      if (!sticker?.selecaoId) return null;
      const sel = SELECOES.find((s) => s.id === sticker.selecaoId);
      if (!sel) return null;
      const figs = figurinhasPorSelecao(sticker.selecaoId);
      if (!figs.length) return null;
      const slotCanonico = sticker.slotDeId ?? sticker.id;
      const completa = figs.every((f) => f.id === slotCanonico || temSlot(f.id));
      return { selecao: sel, completa };
    },
    [temSlot]
  );
  const quickOrigemRef = useRef<{ stickerId: string; timestamp: number } | null>(null);
  const handlerStickerDetectadoRef = useRef<(sticker: Sticker) => void>(() => {});
  const notificacoesAtivasRef = useRef<{ chave: string; intervaloId: number }[]>([]);

  const dispararQuickToast = useCallback(
    (sticker: Sticker, jaTinha: boolean, qtdAtual: number) => {
      const chave = `quick-${sticker.id}-${Date.now()}`;
      let restante = QUICK_DURATION_MS;
      const tickInicial = 100;
      let percent = tickInicial;

      const infoSelecao = projetarSelecaoCompleta(sticker);
      const corPrincipal = jaTinha ? '#f59e0b' : '#22c55e';
      const corProgresso = jaTinha ? '#f59e0b' : '#22c55e';
      const fundoCard = jaTinha ? 'rgba(245,158,11,0.10)' : '#0a1230';
      const bordaCard = jaTinha ? '1px solid rgba(245,158,11,0.55)' : '1px solid #2a3654';

      const renderConteudo = (pct: number) => (
        <ToastSwipe onDismiss={() => finalizar()}>
          <div
            onClick={aoClicar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 60,
                borderRadius: 6,
                overflow: 'hidden',
                border: `2px solid ${corPrincipal}`,
                background: '#1a2236',
                flexShrink: 0,
              }}
            >
              <img
                src={sticker.imagem}
                alt={sticker.codigo}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                {jaTinha && (
                  <span
                    style={{
                      fontSize: 10,
                      background: '#f59e0b',
                      color: '#0a1230',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                    }}
                  >
                    DUPLICADA
                  </span>
                )}
                <span>{sticker.codigo}</span>
                <span style={{ color: corPrincipal, fontWeight: 700 }}>
                  {jaTinha ? `· ${qtdAtual}ª cópia` : '· adicionada!'}
                </span>
              </div>
              <div
                style={{
                  color: '#9aa6c9',
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 4,
                }}
              >
                {sticker.nome} — toque para editar
              </div>
              {infoSelecao?.completa && (
                <div
                  style={{
                    color: '#22c55e',
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  ✅ Seleção {infoSelecao.selecao.nome} completa!
                </div>
              )}
              <Progress
                percent={pct}
                size="small"
                showInfo={false}
                strokeColor={corProgresso}
              />
            </div>
          </div>
        </ToastSwipe>
      );

      while (notificacoesAtivasRef.current.length >= MAX_NOTIFICACOES_QUICK) {
        const maisAntiga = notificacoesAtivasRef.current.shift();
        if (maisAntiga) {
          window.clearInterval(maisAntiga.intervaloId);
          notifApi.destroy(maisAntiga.chave);
        }
      }

      const finalizar = () => {
        const lista = notificacoesAtivasRef.current;
        const idx = lista.findIndex((n) => n.chave === chave);
        if (idx >= 0) {
          window.clearInterval(lista[idx].intervaloId);
          lista.splice(idx, 1);
        }
        notifApi.destroy(chave);
      };

      const aoClicar = () => {
        finalizar();
        pausadoRef.current = true;
        setCodigoLido(sticker.codigo);
        setEdicaoManual(sticker.codigo);
        setModalAberto(true);
      };

      const intervaloId = window.setInterval(() => {
        restante -= 100;
        percent = Math.max(0, (restante / QUICK_DURATION_MS) * 100);
        if (restante <= 0) {
          finalizar();
          return;
        }
        notifApi.open({
          key: chave,
          message: null,
          description: renderConteudo(percent),
          placement: 'bottomRight',
          duration: 0,
          closeIcon: <X size={14} color="#9aa6c9" />,
          onClose: finalizar,
          style: { padding: 10, background: fundoCard, border: bordaCard },
        });
      }, 100);

      notificacoesAtivasRef.current.push({ chave, intervaloId });

      notifApi.open({
        key: chave,
        message: null,
        description: renderConteudo(tickInicial),
        placement: 'bottomRight',
        duration: 0,
        closeIcon: <X size={14} color="#9aa6c9" />,
        onClose: finalizar,
        style: { padding: 10, background: fundoCard, border: bordaCard },
      });
    },
    [notifApi, projetarSelecaoCompleta]
  );

  const dispararTrocaToast = useCallback(
    (sticker: Sticker, jaTinha: boolean, qtdAtual: number) => {
      const chave = `troca-${sticker.id}-${Date.now()}`;
      const infoSelecao = verificarSelecaoCompleta(sticker.selecaoId);
      const selecaoCompleta = !!infoSelecao?.completa;

      const corPrincipal = selecaoCompleta
        ? '#f59e0b'
        : jaTinha
        ? '#f59e0b'
        : '#22c55e';
      const fundoCard = selecaoCompleta
        ? 'rgba(245,158,11,0.10)'
        : jaTinha
        ? 'rgba(245,158,11,0.10)'
        : 'rgba(34,197,94,0.10)';
      const bordaCard = selecaoCompleta
        ? '1px solid rgba(245,158,11,0.55)'
        : jaTinha
        ? '1px solid rgba(245,158,11,0.55)'
        : '1px solid rgba(34,197,94,0.55)';

      let restante = TROCA_DURATION_MS;
      let percent = 100;
      let intervaloId: number | null = null;

      const finalizar = () => {
        if (intervaloId !== null) {
          window.clearInterval(intervaloId);
          intervaloId = null;
        }
        notifApi.destroy(chave);
      };

      const conteudoCompleta = (sel: NonNullable<typeof infoSelecao>['selecao'], pct: number) => (
        <ToastSwipe onDismiss={finalizar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{sel.bandeira}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    background: '#f59e0b',
                    color: '#0a1230',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                  }}
                >
                  SELEÇÃO COMPLETA
                </span>
                <span>{sel.id}</span>
              </div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                {sel.nome}{' '}
                <span style={{ color: '#9aa6c9', fontWeight: 600, fontSize: 11 }}>
                  #{SELECOES.findIndex((x) => x.id === sel.id) + 1} · pg {formatarPaginas(sel)}
                </span>
              </div>
              <div
                style={{
                  color: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 2,
                  marginBottom: 4,
                }}
              >
                Não precisa de figurinhas dessa seleção
              </div>
              <Progress percent={pct} size="small" showInfo={false} strokeColor="#f59e0b" />
            </div>
          </div>
        </ToastSwipe>
      );

      const titulo = jaTinha ? 'Já tem' : 'Precisa!';
      const selecaoSticker = sticker.selecaoId
        ? SELECOES.find((s) => s.id === sticker.selecaoId)
        : undefined;
      const paginasSticker = selecaoSticker ? formatarPaginas(selecaoSticker) : null;
      const numeroSelecaoSticker = selecaoSticker
        ? SELECOES.findIndex((s) => s.id === selecaoSticker.id) + 1
        : null;
      const subtitulo = jaTinha
        ? qtdAtual > 1
          ? `${qtdAtual - 1} repetida${qtdAtual - 1 > 1 ? 's' : ''} dessa`
          : '1 cópia na coleção'
        : 'Slot vazio na sua coleção';

      const conteudoPadrao = (pct: number) => (
        <ToastSwipe onDismiss={finalizar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 60,
                borderRadius: 6,
                overflow: 'hidden',
                border: `2px solid ${corPrincipal}`,
                background: '#1a2236',
                flexShrink: 0,
              }}
            >
              <img
                src={sticker.imagem}
                alt={sticker.codigo}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    background: corPrincipal,
                    color: '#0a1230',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                  }}
                >
                  {titulo.toUpperCase()}
                </span>
                <span>{sticker.codigo}</span>
                {paginasSticker ? (
                  <span
                    style={{
                      fontSize: 10,
                      color: '#9aa6c9',
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.08)',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    #{numeroSelecaoSticker} · pg {paginasSticker}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  color: '#9aa6c9',
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                }}
              >
                {sticker.nome}
              </div>
              <div
                style={{
                  color: corPrincipal,
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 2,
                  marginBottom: 4,
                }}
              >
                {subtitulo}
              </div>
              <Progress percent={pct} size="small" showInfo={false} strokeColor={corPrincipal} />
            </div>
          </div>
        </ToastSwipe>
      );

      const renderConteudo = (pct: number) =>
        selecaoCompleta && infoSelecao
          ? conteudoCompleta(infoSelecao.selecao, pct)
          : conteudoPadrao(pct);

      const abrir = (pct: number) =>
        notifApi.open({
          key: chave,
          message: null,
          duration: 0,
          placement: 'bottomRight',
          style: { padding: 10, background: fundoCard, border: bordaCard },
          closeIcon: <X size={14} color="#9aa6c9" />,
          onClose: finalizar,
          description: renderConteudo(pct),
        });

      abrir(percent);
      intervaloId = window.setInterval(() => {
        restante -= 100;
        percent = Math.max(0, (restante / TROCA_DURATION_MS) * 100);
        if (restante <= 0) {
          finalizar();
          return;
        }
        abrir(percent);
      }, 100);
    },
    [notifApi, verificarSelecaoCompleta]
  );

  // Inicia câmera
  const iniciarCamera = useCallback(async () => {
    try {
      const md = (navigator as any)?.mediaDevices;
      const seguro =
        typeof window !== 'undefined' &&
        (window.isSecureContext ||
          ['localhost', '127.0.0.1'].includes(window.location.hostname));
      if (!md || !md.getUserMedia) {
        if (!seguro) {
          setCameraErro(
            'A câmera só funciona em HTTPS. Acesse via uma URL https:// (ex.: localtunnel) ou pelo localhost — não use o IP da rede direto no celular.'
          );
        } else {
          setCameraErro('Este navegador não suporta acesso à câmera.');
        }
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await md.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      salvarCameraPreferida(facingMode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // tenta foco contínuo + detecta torch quando o navegador suporta
      try {
        const track = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.();
        if (caps?.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
        }
        setFlashSuportado(Boolean(caps?.torch));
      } catch {
        setFlashSuportado(false);
      }
      // ao reiniciar a câmera, o flash sempre volta desligado
      setFlashAtivo(false);
      setCameraErro(null);
    } catch (e: any) {
      setCameraErro(e?.message ?? 'Não foi possível acessar a câmera');
    }
  }, [facingMode]);

  useEffect(() => {
    iniciarCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (cooldownTimeoutRef.current) {
        window.clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = null;
      }
    };
  }, [iniciarCamera]);

  // Inicializa worker do Tesseract uma vez
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const Tesseract = await import('tesseract.js');
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        });
        if (cancelado) {
          await worker.terminate();
          return;
        }
        workerRef.current = worker;
      } catch (e) {
        console.error('Falha ao iniciar OCR', e);
      }
    })();
    return () => {
      cancelado = true;
      workerRef.current?.terminate?.().catch(() => {});
      workerRef.current = null;
    };
  }, []);

  // Captura um frame da janela central. Quando turbo está ativo, faz zoom digital
  // alternando 3 escalas (largura) para evitar que o usuário precise aproximar/afastar
  // o cromo manualmente, e aplica grayscale + boost de contraste para o OCR acertar
  // mais rápido.
  const capturarFrame = useCallback(
    (turbo: boolean): HTMLCanvasElement | null => {
      if (!videoRef.current || !canvasRef.current) return null;
      const v = videoRef.current;
      const c = canvasRef.current;
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (!w || !h) return null;
      const escalaW = turbo
        ? ESCALAS_TURBO[escalaTickRef.current % ESCALAS_TURBO.length]
        : 0.65;
      escalaTickRef.current += 1;
      const recW = Math.floor(w * escalaW);
      const recH = Math.floor(recW * ASPECTO_JANELA);
      const sx = Math.floor((w - recW) / 2);
      const sy = Math.floor((h - recH) / 2);
      c.width = recW;
      c.height = recH;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(v, sx, sy, recW, recH, 0, 0, recW, recH);
      if (turbo) {
        try {
          const img = ctx.getImageData(0, 0, recW, recH);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const v = Math.max(0, Math.min(255, (g - 128) * 1.6 + 128));
            d[i] = d[i + 1] = d[i + 2] = v;
          }
          ctx.putImageData(img, 0, 0);
        } catch {}
      }
      return c;
    },
    []
  );

  useEffect(() => {
    handlerStickerDetectadoRef.current = (sticker: Sticker) => {
      // Haptic feedback no match — funciona em Chrome Android, no-op em iOS Safari.
      try {
        navigator.vibrate?.([40, 60, 40]);
      } catch {}
      const adicionarFinal = (idEscolhido: string) => {
        const figEscolhida = figurinhaPorId(idEscolhido) ?? sticker;
        const jaTinha = temSlot(idEscolhido);
        adicionar(idEscolhido);
        const qtdDepois = quantidadeSlot(idEscolhido) + 1;
        const ts = registrarHistorico(idEscolhido);
        quickOrigemRef.current = { stickerId: idEscolhido, timestamp: ts };
        dispararQuickToast(figEscolhida, jaTinha, qtdDepois);
      };

      if (modoUsoRef.current === 'troca') {
        const jaTinha = temSlot(sticker.id);
        const qtd = quantidadeSlot(sticker.id);
        dispararTrocaToast(sticker, jaTinha, qtd);
        pausadoRef.current = true;
        if (cooldownTimeoutRef.current) {
          window.clearTimeout(cooldownTimeoutRef.current);
        }
        cooldownTimeoutRef.current = window.setTimeout(() => {
          pausadoRef.current = false;
          cooldownTimeoutRef.current = null;
        }, 1500);
        return;
      }

      if (temVersaoMcDonalds(sticker.id)) {
        pausadoRef.current = true;
        perguntarMcd(
          sticker.id,
          (idEscolhido) => {
            if (modoUsoRef.current === 'quick') {
              adicionarFinal(idEscolhido);
              if (cooldownTimeoutRef.current) {
                window.clearTimeout(cooldownTimeoutRef.current);
              }
              cooldownTimeoutRef.current = window.setTimeout(() => {
                pausadoRef.current = false;
                cooldownTimeoutRef.current = null;
              }, 1500);
            } else {
              setCodigoLido(idEscolhido);
              setEdicaoManual(idEscolhido);
              setModalAberto(true);
            }
          },
          () => {
            pausadoRef.current = false;
          }
        );
        return;
      }

      if (modoUsoRef.current === 'quick') {
        adicionarFinal(sticker.id);
        pausadoRef.current = true;
        if (cooldownTimeoutRef.current) {
          window.clearTimeout(cooldownTimeoutRef.current);
        }
        cooldownTimeoutRef.current = window.setTimeout(() => {
          pausadoRef.current = false;
          cooldownTimeoutRef.current = null;
        }, 1500);
      } else {
        pausadoRef.current = true;
        setCodigoLido(sticker.codigo);
        setEdicaoManual(sticker.codigo);
        setModalAberto(true);
      }
    };
  }, [
    adicionar,
    dispararQuickToast,
    dispararTrocaToast,
    perguntarMcd,
    quantidadeSlot,
    registrarHistorico,
    temSlot,
  ]);

  // Loop de scan contínuo
  useEffect(() => {
    let timeoutId: any = null;
    let cancelado = false;

    const tickCodigo = async () => {
      const worker = workerRef.current;
      const v = videoRef.current;
      if (!worker || !v || v.readyState < 2 || pausadoRef.current) return;
      const canvas = capturarFrame(turboAtivo);
      if (!canvas) return;
      try {
        setEscaneando(true);
        const { data } = await worker.recognize(canvas);
        const texto = (data?.text ?? '').trim();
        setUltimoTexto(texto);
        const candidatos = extrairCodigosCandidatos(texto);
        if (debugAtivo) {
          try {
            setDebugFrame(canvas.toDataURL('image/png'));
          } catch {}
          setDebugCandidatos(candidatos);
        }
        const valido = candidatos.find((c) => buscarFigurinha(c));
        if (valido && !pausadoRef.current) {
          const sticker = buscarFigurinha(valido);
          if (sticker) handlerStickerDetectadoRef.current(sticker);
        }
      } catch {
        // ignora erro pontual e segue
      } finally {
        setEscaneando(false);
      }
    };

    const tickFoto = async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth || pausadoRef.current) return;
      try {
        setEscaneando(true);
        const desc = await getDescriptor(v, SCANNER_CONFIG);
        if (!desc) return;
        const matches = findMatches(desc, FACE_REFERENCES, SCANNER_CONFIG);
        const best = matches[0];
        if (debugAtivo) {
          setDebugCandidatos(
            matches.map((m) => `${m.entry.code} ${m.distance.toFixed(3)}`)
          );
        }
        if (!best || !isConfidentMatch(best, SCANNER_CONFIG)) return;
        const sticker = figurinhaPorId(best.entry.stickerId);
        if (!sticker) return;
        const last = ultimoFaceIdRef.current;
        const now = Date.now();
        if (last && last.id === sticker.id && now - last.at < 8000) return;
        ultimoFaceIdRef.current = { id: sticker.id, at: now };
        if (!pausadoRef.current) {
          handlerStickerDetectadoRef.current(sticker);
        }
      } catch {
        // ignora e segue
      } finally {
        setEscaneando(false);
      }
    };

    const tick = async () => {
      if (cancelado) return;
      if (modoCapturaRef.current === 'codigo') {
        await tickCodigo();
        if (!cancelado) timeoutId = setTimeout(tick, turboAtivo ? 350 : 600);
      } else {
        await tickFoto();
        if (!cancelado) timeoutId = setTimeout(tick, 400);
      }
    };

    loopAtivoRef.current = true;
    timeoutId = setTimeout(tick, 800);

    return () => {
      cancelado = true;
      loopAtivoRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [capturarFrame, debugAtivo, turboAtivo]);

  const fig = buscarFigurinha(normalizarCodigo(edicaoManual));
  const origemAtual = quickOrigemRef.current;
  const fromQuick = !!(fig && origemAtual && origemAtual.stickerId === fig.id);
  const jaTem = fig
    ? fromQuick
      ? quantidadeSlot(fig.id) > 1
      : temSlot(fig.id)
    : false;
  const dupes = fig
    ? fromQuick
      ? Math.max(0, quantidadeSlot(fig.id) - 2)
      : duplicadasSlot(fig.id)
    : 0;
  const infoSelecaoModal = fig
    ? fromQuick
      ? verificarSelecaoCompleta(fig.selecaoId)
      : projetarSelecaoCompleta(fig)
    : null;

  const limparEstadoScan = useCallback(() => {
    setUltimoTexto('');
    setDebugFrame(null);
    setDebugCandidatos([]);
    setCodigoLido('');
    setEdicaoManual('');
  }, []);

  const fecharModal = () => {
    const origem = quickOrigemRef.current;
    if (origem) {
      const qtdAntes = duplicadas(origem.stickerId) + 1;
      remover(origem.stickerId);
      removerHistorico(origem.stickerId, origem.timestamp);
      const qtdDepois = qtdAntes - 1;
      if (qtdDepois <= 0) {
        message.info(`${origem.stickerId} removida da coleção`);
      } else {
        message.info(
          `${origem.stickerId}: duplicata desfeita (${qtdDepois} cópia${qtdDepois > 1 ? 's' : ''} restante${qtdDepois > 1 ? 's' : ''})`
        );
      }
    }
    setModalAberto(false);
    limparEstadoScan();
    quickOrigemRef.current = null;
    pausadoRef.current = false;
  };

  const confirmar = () => {
    if (!fig) {
      message.error('Figurinha não encontrada');
      return;
    }

    const finalizar = (idEscolhido: string) => {
      const origem = quickOrigemRef.current;
      if (origem && origem.stickerId === idEscolhido) {
        message.success('Mantida');
      } else if (origem && origem.stickerId !== idEscolhido) {
        remover(origem.stickerId);
        removerHistorico(origem.stickerId, origem.timestamp);
        adicionar(idEscolhido);
        registrarHistorico(idEscolhido);
        message.success(`Trocada de ${origem.stickerId} para ${idEscolhido}`);
      } else {
        adicionar(idEscolhido);
        registrarHistorico(idEscolhido);
        message.success(temSlot(idEscolhido) ? 'Repetida adicionada!' : 'Figurinha adicionada!');
      }
      quickOrigemRef.current = null;
      setModalAberto(false);
      limparEstadoScan();
      pausadoRef.current = true;
      if (cooldownTimeoutRef.current) {
        window.clearTimeout(cooldownTimeoutRef.current);
      }
      cooldownTimeoutRef.current = window.setTimeout(() => {
        pausadoRef.current = false;
        cooldownTimeoutRef.current = null;
      }, 1500);
    };

    if (temVersaoMcDonalds(fig.id)) {
      perguntarMcd(fig.id, finalizar);
      return;
    }

    finalizar(fig.id);
  };

  const fecharScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (typeof window !== 'undefined') window.history.back();
  };

  const trocarCamera = () => {
    setFacingMode((atual) => {
      const proxima = atual === 'environment' ? 'user' : 'environment';
      salvarCameraPreferida(proxima);
      return proxima;
    });
  };

  const alternarFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) {
      message.warning('Câmera não está pronta');
      return;
    }
    const caps: any = track.getCapabilities?.();
    if (!caps?.torch) {
      message.info('Este dispositivo não suporta flash via navegador');
      setFlashSuportado(false);
      return;
    }
    const proximo = !flashAtivo;
    try {
      await track.applyConstraints({ advanced: [{ torch: proximo } as any] });
      setFlashAtivo(proximo);
    } catch {
      message.error('Não foi possível controlar o flash');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {notifContext}
      {modoCaptura === 'foto' && !faceProntos && !cameraErro && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'rgba(5,8,20,0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: '#0a1230',
              border: '1px solid #2a3654',
              borderRadius: 16,
              padding: '24px 22px',
              maxWidth: 320,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 14px',
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22c55e',
                animation: 'scanSpin 1.1s linear infinite',
              }}
            >
              <Loader2 size={26} />
            </div>
            <div
              style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                marginBottom: 6,
              }}
            >
              Preparando reconhecimento facial
            </div>
            <div
              style={{
                color: '#9aa6c9',
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 16,
                animation: 'scanPulse 1.4s ease-in-out infinite',
              }}
            >
              Baixando o modelo neural na primeira vez. Demora alguns segundos — depois fica em cache.
            </div>
            <Button
              size="small"
              onClick={() => setModoCaptura('codigo')}
              icon={<Type size={14} />}
              style={{ background: 'transparent', borderColor: '#2a3654', color: '#9aa6c9' }}
            >
              Usar leitura por código enquanto carrega
            </Button>
          </div>
        </div>
      )}
      {cameraErro ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fca5a5',
            padding: 24,
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          {cameraErro}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* Overlay escuro com janela transparente central */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 0, transparent 32%, rgba(0,0,0,0.6) 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Estilo do Segmented: pill arredondada com selecionado em verde */}
      <style>{`
        .scan-mode-toggle .ant-segmented {
          background: rgba(0,0,0,0.55) !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          border-radius: 999px !important;
          padding: 3px !important;
        }
        .scan-mode-toggle .ant-segmented .ant-segmented-item {
          border-radius: 999px !important;
        }
        .scan-mode-toggle .ant-segmented .ant-segmented-item-label {
          color: #fff !important;
          padding: 4px 14px !important;
          border-radius: 999px !important;
        }
        .scan-mode-toggle .ant-segmented .ant-segmented-item-selected,
        .scan-mode-toggle .ant-segmented .ant-segmented-thumb {
          background: #22c55e !important;
          border-radius: 999px !important;
        }
        .scan-mode-toggle .ant-segmented .ant-segmented-item-selected .ant-segmented-item-label {
          color: #0a1230 !important;
          font-weight: 700;
        }
        @keyframes scanLine {
          0% { transform: translateY(0); opacity: 0.2; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0.2; }
        }
        @keyframes scanSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes scanPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Toggle Foto/Código — modo Código (acima da moldura horizontal) */}
      {modoCaptura === 'codigo' && (
        <div
          className="scan-mode-toggle"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '36%',
            display: 'flex',
            justifyContent: 'center',
            transform: 'translateY(-100%)',
            paddingBottom: 6,
            pointerEvents: 'auto',
            zIndex: 4,
          }}
        >
          <Segmented<ModoCaptura>
            value={modoCaptura}
            onChange={(v) => setModoCaptura(v)}
            size="middle"
            options={[
              {
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ImageIcon size={14} /> Foto
                  </span>
                ),
                value: 'foto' as ModoCaptura,
              },
              {
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Type size={14} /> Código
                  </span>
                ),
                value: 'codigo' as ModoCaptura,
              },
            ]}
          />
        </div>
      )}

      {/* Moldura do scan */}
      {modoCaptura === 'foto' ? (
        <div
          className="scan-mode-toggle"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <Segmented<ModoCaptura>
            value={modoCaptura}
            onChange={(v) => setModoCaptura(v)}
            size="middle"
            options={[
              {
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ImageIcon size={14} /> Foto
                  </span>
                ),
                value: 'foto' as ModoCaptura,
              },
              {
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Type size={14} /> Código
                  </span>
                ),
                value: 'codigo' as ModoCaptura,
              },
            ]}
          />

          <div
            style={{
              width: 'min(64vw, calc((100vh - 200px) * 5 / 6.5))',
              aspectRatio: '5 / 6.5',
              border: '2px solid #22c55e',
              borderRadius: 14,
              boxShadow: '0 0 24px rgba(34,197,94,0.4)',
            }}
          />
          <div
            style={{
              textAlign: 'center',
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
              padding: '0 8px',
              maxWidth: '90vw',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              Centralize o <b style={{ color: '#22c55e' }}>rosto do jogador</b>
            </div>
            <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, opacity: 0.85, whiteSpace: 'nowrap' }}>
              {FACE_REFERENCES.length} jogadores com reconhecimento ativos
            </div>
            <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: '#f59e0b' }}>
              Escudos e times perfilados ainda não disponíveis em modo foto — troque para <b>Código</b> se necessário
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              left: '17.5%',
              top: '36%',
              width: '65%',
              height: '28%',
              border: '2px solid #22c55e',
              borderRadius: 14,
              boxShadow: '0 0 24px rgba(34,197,94,0.4)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '17.5%',
              top: '36%',
              width: '65%',
              height: 2,
              background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
              animation: 'scanLine 2.4s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Topo: botão fechar + status */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent)',
        }}
      >
        <button
          onClick={fecharScan}
          aria-label="Fechar"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ScanLine size={11} color="#22c55e" />
            {escaneando ? 'Lendo…' : modoCaptura === 'foto' && !faceProntos ? 'Carregando…' : 'Pronto'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={trocarCamera}
            aria-label="Trocar câmera"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <RotateCw size={18} />
          </button>
          {flashSuportado && (
            <button
              onClick={alternarFlash}
              aria-label={flashAtivo ? 'Desligar flash' : 'Ligar flash'}
              aria-pressed={flashAtivo}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: flashAtivo ? '#fbbf24' : 'rgba(0,0,0,0.55)',
                border: flashAtivo
                  ? '1px solid #fbbf24'
                  : '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: flashAtivo ? '#0a1230' : '#fff',
                cursor: 'pointer',
              }}
            >
              {flashAtivo ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
            </button>
          )}
          <button
            onClick={() => setHistoricoAberto(true)}
            aria-label="Recém-adicionadas"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <History size={18} />
          </button>
          <button
            onClick={() => setModalConfigAberto(true)}
            aria-label="Configurações do scanner"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Settings2 size={18} />
            {turboAtivo && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#fbbf24',
                  border: '2px solid #0a1230',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Texto guia logo abaixo da moldura verde (modo Código) */}
      {modoCaptura === 'codigo' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(64% + 12px)',
            textAlign: 'center',
            color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
            padding: '0 8px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Centralize o <b style={{ color: '#22c55e' }}>código do cromo</b> no quadro verde
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            Ex: BRA01 ou 33 — leitura automática
          </div>
        </div>
      )}

      {debugAtivo && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 12,
            right: 12,
            zIndex: 5,
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(245,158,11,0.45)',
            borderRadius: 12,
            padding: 10,
            color: '#e6ebff',
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: '50vh',
            overflowY: 'auto',
            boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong style={{ color: '#fcd34d' }}>Debug OCR</strong>
            <span style={{ color: '#9aa6c9' }}>
              {escaneando ? 'reconhecendo…' : 'aguardando'}
            </span>
          </div>
          {debugFrame ? (
            <img
              src={debugFrame}
              alt="Recorte enviado ao OCR"
              style={{
                width: '100%',
                maxHeight: 140,
                objectFit: 'contain',
                background: '#000',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          ) : (
            <div style={{ color: '#9aa6c9' }}>Sem frame ainda…</div>
          )}
          <div>
            <div style={{ color: '#94a3b8', marginBottom: 2 }}>Texto bruto</div>
            <div
              style={{
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.45)',
                padding: '6px 8px',
                borderRadius: 6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 90,
                overflow: 'auto',
              }}
            >
              {ultimoTexto || '—'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', marginBottom: 2 }}>Candidatos</div>
            <div style={{ fontFamily: 'monospace' }}>
              {debugCandidatos.length === 0
                ? '—'
                : debugCandidatos.map((c) => {
                    const ok = !!buscarFigurinha(c);
                    return (
                      <span
                        key={c}
                        style={{
                          color: ok ? '#22c55e' : '#f59e0b',
                          marginRight: 8,
                        }}
                      >
                        {ok ? '✓' : '?'} {c}
                      </span>
                    );
                  })}
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div
        className="scan-mode-toggle"
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 14px',
        }}
      >
        <Segmented<ModoUso>
          value={modoUso}
          onChange={(v) => setModoUso(v)}
          block
          options={[
            {
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Check size={13} /> Adicionar
                </span>
              ),
              value: 'normal' as ModoUso,
            },
            {
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ScanLine size={13} /> Conferir
                </span>
              ),
              value: 'troca' as ModoUso,
            },
            {
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <PlusCircle size={13} /> Rápido
                </span>
              ),
              value: 'quick' as ModoUso,
            },
          ]}
        />
        <div
          style={{
            color: '#9aa6c9',
            fontSize: 11,
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          {modoUso === 'normal' &&
            'Confirma antes de adicionar à coleção.'}
          {modoUso === 'troca' &&
            'Só confere se você precisa ou já tem, sem salvar.'}
          {modoUso === 'quick' &&
            'Adicionar Rápido — adiciona na hora, toque na notificação se quiser editar.'}
        </div>
      </div>

      <HistoricoModal aberto={historicoAberto} onFechar={() => setHistoricoAberto(false)} />

      <Modal
        open={modalConfigAberto}
        onCancel={() => setModalConfigAberto(false)}
        title="Configurações do scanner"
        footer={[
          <Button key="fechar" onClick={() => setModalConfigAberto(false)}>
            Fechar
          </Button>,
        ]}
        styles={{ content: { background: '#0a1230', border: '1px solid #2a3654' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: '#9aa6c9', fontSize: 12 }}>
            Escolha como o scanner lê os códigos. Apenas um modo fica ativo por vez.
          </div>
          {FEATURES_SCAN.map((f) => {
            const Icone = f.icone;
            const ativo = modoScan === f.id;
            return (
              <div
                key={f.id}
                onClick={() => escolherModo(f.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: ativo ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)',
                  border: ativo
                    ? '1px solid rgba(251,191,36,0.45)'
                    : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: ativo ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                    color: ativo ? '#0a1230' : '#9aa6c9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icone size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <span>{f.titulo}</span>
                    {f.recomendado && (
                      <span
                        style={{
                          fontSize: 10,
                          background: 'rgba(34,197,94,0.18)',
                          color: '#22c55e',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 800,
                        }}
                      >
                        PADRÃO
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      color: '#9aa6c9',
                      fontSize: 11,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {f.descricao}
                  </div>
                </div>
                <Switch
                  checked={ativo}
                  onChange={() => escolherModo(f.id)}
                  onClick={(_, e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={modalAberto}
        onCancel={() => {
          fecharModal();
        }}
        footer={null}
        centered
        title={null}
        styles={{ content: { background: '#0a1230', border: '1px solid #2a3654' } }}
      >
        <div style={{ textAlign: 'center', padding: '8px 4px' }}>
          {fig ? (
            <>
              <div
                style={{
                  margin: '0 auto 12px',
                  width: 120,
                  height: 168,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: jaTem ? '2px solid #f59e0b' : '2px solid #22c55e',
                  background: '#1a2236',
                }}
              >
                <img
                  src={fig.imagem}
                  alt={fig.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>
                {fig.codigo}
                {(() => {
                  if (!fig.selecaoId) return null;
                  const idx = SELECOES.findIndex((s) => s.id === fig.selecaoId);
                  if (idx === -1) return null;
                  const sel = SELECOES[idx];
                  return (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: '#9aa6c9',
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        verticalAlign: 'middle',
                      }}
                    >
                      #{idx + 1} · pg {formatarPaginas(sel)}
                    </span>
                  );
                })()}
              </div>
              <div style={{ color: '#9aa6c9', fontSize: 13, marginBottom: 10 }}>{fig.nome}</div>
              {infoSelecaoModal?.completa && (
                <div
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.45)',
                    color: '#bbf7d0',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  ✅ Seleção {infoSelecaoModal.selecao.nome} completa
                </div>
              )}
              {jaTem && (
                <div
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.4)',
                    color: '#fde68a',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  ⚠️ Você já tem essa figurinha
                  {dupes > 0 ? ` (${dupes} repetida${dupes > 1 ? 's' : ''})` : ''}
                </div>
              )}
              {fig.selecaoId && infoSelecaoModal && !infoSelecaoModal.completa && (() => {
                const todas = figurinhasPorSelecao(fig.selecaoId);
                const faltam = todas.filter((s) => !temSlot(s.id));
                if (!faltam.length) return null;
                return (
                  <Collapse
                    ghost
                    style={{ marginBottom: 12, textAlign: 'left' }}
                    items={[
                      {
                        key: 'faltantes',
                        label: (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
                              Faltam em {infoSelecaoModal.selecao.bandeira}{' '}
                              {infoSelecaoModal.selecao.nome}
                            </span>
                            <span
                              style={{
                                color: '#9aa6c9',
                                fontSize: 11,
                                fontWeight: 700,
                                background: 'rgba(255,255,255,0.06)',
                                padding: '2px 8px',
                                borderRadius: 10,
                              }}
                            >
                              {faltam.length}/{todas.length}
                            </span>
                          </div>
                        ),
                        children: (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: 6,
                            }}
                          >
                            {faltam.map((s) => (
                              <StickerView key={s.id} sticker={s} size={56} />
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                );
              })()}
            </>
          ) : (
            <>
              <div
                style={{
                  color: '#fca5a5',
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Código não reconhecido
              </div>
              {codigoLido && (
                <div style={{ color: '#9aa6c9', fontSize: 13, marginBottom: 10 }}>
                  Lemos: &quot;{codigoLido}&quot;. Corrija e tente confirmar.
                </div>
              )}
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <Input
              value={edicaoManual}
              onChange={(e) =>
                setEdicaoManual(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                )
              }
              onPressEnter={confirmar}
              size="large"
              placeholder="BRA01 ou 33"
              style={{ textAlign: 'center', fontWeight: 700, letterSpacing: 1 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              size="large"
              onClick={() => {
                fecharModal();
              }}
              icon={<X size={20} />}
              style={{ flex: 1, height: 52, fontSize: 16, fontWeight: 700 }}
            >
              Cancelar
            </Button>
            <Button
              size="large"
              type="primary"
              onClick={confirmar}
              icon={<Check size={20} />}
              disabled={!fig}
              style={{
                flex: 1,
                height: 52,
                fontSize: 16,
                background: jaTem ? '#f59e0b' : '#22c55e',
                borderColor: jaTem ? '#f59e0b' : '#22c55e',
                fontWeight: 700,
              }}
            >
              {jaTem ? 'Repetida' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
