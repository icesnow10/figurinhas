'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Input, Button, Switch, message, notification, Progress } from 'antd';
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
} from 'lucide-react';
import { FIGURINHAS, figurinhaPorId, temVersaoMcDonalds } from '@/resources/data/figurinhas';
import { useColecao } from '@/resources/hooks/useColecao';
import { useHistorico } from '@/resources/hooks/useHistorico';
import { usePerguntaMcd } from '@/resources/hooks/usePerguntaMcd';
import { HistoricoModal } from '@/components/historico/HistoricoModal';
import type { Sticker } from '@/resources/types';
import {
  computeColorHistFromImageData,
  computeDHashFromImageData,
  rankearTopK,
  type FrontHashesPayload,
  type MatchResult,
} from '@/resources/lib/frontHash';

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
const SCAN_CAPTURA_KEY = 'figurinhas:scan:captura';
const QUICK_DURATION_MS = 10_000;
const MAX_NOTIFICACOES_QUICK = 2;
// Estratégia: sempre mostra os top-3 candidatos como botões clicáveis. Auto-
// fire SÓ pra matches muito limpos (score baixo + gap alto), pra evitar falso
// positivo. Pra qualquer caso ambíguo, o usuário toca no candidato certo.
const FRONT_TICK_MS = 120;
const FRONT_TOP_K = 3;
const FRONT_AUTO_SCORE_MAX = 0.22;
const FRONT_AUTO_GAP_MIN = 0.08;
// Amostragem multi-posição por tick (centro + 4 offsets) com VOTO entre as
// posições — só consideramos auto-fire se a maioria delas eleger o mesmo id.
const FRONT_OFFSETS: { dx: number; dy: number }[] = [
  { dx: 0, dy: 0 },
  { dx: -0.1, dy: 0 },
  { dx: 0.1, dy: 0 },
  { dx: 0, dy: -0.1 },
  { dx: 0, dy: 0.1 },
];
const FRONT_OFFSET_VOTO_MIN = 3; // 3 das 5 posições no mesmo id pra auto-fire

type ModoScan = 'turbo' | 'legacy';
type ModoCaptura = 'verso' | 'frente';

function lerModoCaptura(): ModoCaptura {
  if (typeof window === 'undefined') return 'verso';
  try {
    const salvo = window.localStorage.getItem(SCAN_CAPTURA_KEY);
    return salvo === 'frente' ? 'frente' : 'verso';
  } catch {
    return 'verso';
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

export default function ScanPage() {
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
  const [modoCaptura, setModoCaptura] = useState<ModoCaptura>('verso');
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [flashAtivo, setFlashAtivo] = useState(false);
  const [flashSuportado, setFlashSuportado] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [notifApi, notifContext] = notification.useNotification();
  const quickModeRef = useRef(false);
  const frontHashesRef = useRef<FrontHashesPayload | null>(null);
  const frontHashesLoadingRef = useRef(false);
  const [frontHashesProntos, setFrontHashesProntos] = useState(false);
  const [frontHashesErro, setFrontHashesErro] = useState<string | null>(null);
  const [topKFrente, setTopKFrente] = useState<MatchResult[]>([]);

  useEffect(() => {
    try {
      setDebugAtivo(window.localStorage.getItem(SCAN_DEBUG_KEY) === '1');
      setQuickMode(window.localStorage.getItem(SCAN_QUICK_KEY) === '1');
    } catch {}
    setModoScan(lerModoScan());
    setModoCaptura(lerModoCaptura());
  }, []);

  // Lazy-load dos hashes de frente quando o usuário entra no modo Frente.
  useEffect(() => {
    if (modoCaptura !== 'frente') return;
    if (frontHashesRef.current || frontHashesLoadingRef.current) return;
    frontHashesLoadingRef.current = true;
    fetch('/scan-fronts.json', { cache: 'force-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<FrontHashesPayload>;
      })
      .then((payload) => {
        frontHashesRef.current = payload;
        setFrontHashesProntos(true);
        setFrontHashesErro(null);
      })
      .catch((e) => {
        setFrontHashesErro(e?.message ?? 'falha ao carregar hashes');
      })
      .finally(() => {
        frontHashesLoadingRef.current = false;
      });
  }, [modoCaptura]);

  const escolherCaptura = useCallback((proximo: ModoCaptura) => {
    setModoCaptura(proximo);
    setTopKFrente([]);
    try {
      window.localStorage.setItem(SCAN_CAPTURA_KEY, proximo);
    } catch {}
  }, []);

  useEffect(() => {
    quickModeRef.current = quickMode;
    try {
      window.localStorage.setItem(SCAN_QUICK_KEY, quickMode ? '1' : '0');
    } catch {}
  }, [quickMode]);

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
  const quickOrigemRef = useRef<{ stickerId: string; timestamp: number } | null>(null);
  const handlerStickerDetectadoRef = useRef<(sticker: Sticker) => void>(() => {});
  const notificacoesAtivasRef = useRef<{ chave: string; intervaloId: number }[]>([]);

  const dispararQuickToast = useCallback(
    (sticker: Sticker, jaTinha: boolean, qtdAtual: number) => {
      const chave = `quick-${sticker.id}-${Date.now()}`;
      let restante = QUICK_DURATION_MS;
      const tickInicial = 100;
      let percent = tickInicial;

      const corPrincipal = jaTinha ? '#f59e0b' : '#22c55e';
      const corProgresso = jaTinha ? '#f59e0b' : '#22c55e';
      const fundoCard = jaTinha ? 'rgba(245,158,11,0.10)' : '#0a1230';
      const bordaCard = jaTinha ? '1px solid rgba(245,158,11,0.55)' : '1px solid #2a3654';

      const renderConteudo = (pct: number) => (
        <div
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
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor={corProgresso}
            />
          </div>
        </div>
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
          closeIcon: null,
          style: { padding: 10, background: fundoCard, border: bordaCard },
          onClick: aoClicar,
        });
      }, 100);

      notificacoesAtivasRef.current.push({ chave, intervaloId });

      notifApi.open({
        key: chave,
        message: null,
        description: renderConteudo(tickInicial),
        placement: 'bottomRight',
        duration: 0,
        closeIcon: null,
        style: { padding: 10, background: fundoCard, border: bordaCard },
        onClick: aoClicar,
      });
    },
    [notifApi]
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

  // Calcula a região do <video> bruto que corresponde ao retângulo verde
  // visível, fazendo a matemática do object-fit: cover (senão o crop fica
  // desalinhado do que o usuário enxerga). Devolve sx, sy, sw, sh pra usar
  // em drawImage subsequente.
  const calcularCropFrente = useCallback(
    (
      dx = 0,
      dy = 0
    ): { sx: number; sy: number; sw: number; sh: number } | null => {
      if (!videoRef.current) return null;
      const v = videoRef.current;
      const sw = v.videoWidth;
      const sh = v.videoHeight;
      const vw = v.clientWidth;
      const vh = v.clientHeight;
      if (!sw || !sh || !vw || !vh) return null;

      const FRAME_RATIO_WH = 5 / 6.5; // largura / altura, espelha o overlay
      let frameW = vw * 0.85;
      let frameH = frameW / FRAME_RATIO_WH;
      if (frameH > vh * 0.78) {
        frameH = vh * 0.78;
        frameW = frameH * FRAME_RATIO_WH;
      }
      // dx/dy são frações do tamanho do frame — desloca o "alvo" sem sair
      // da janela visível. Útil pra amostrar várias posições por tick.
      const frameX = (vw - frameW) / 2 + dx * frameW;
      const frameY = (vh - frameH) / 2 + dy * frameH;

      const viewportRatio = vw / vh;
      const videoRatio = sw / sh;
      let scale: number;
      let offsetX: number;
      let offsetY: number;
      if (videoRatio > viewportRatio) {
        scale = vh / sh;
        offsetX = (vw - sw * scale) / 2;
        offsetY = 0;
      } else {
        scale = vw / sw;
        offsetX = 0;
        offsetY = (vh - sh * scale) / 2;
      }

      const sx = Math.max(0, Math.floor((frameX - offsetX) / scale));
      const sy = Math.max(0, Math.floor((frameY - offsetY) / scale));
      const sCropW = Math.min(sw - sx, Math.floor(frameW / scale));
      const sCropH = Math.min(sh - sy, Math.floor(frameH / scale));
      if (sCropW <= 0 || sCropH <= 0) return null;
      return { sx, sy, sw: sCropW, sh: sCropH };
    },
    []
  );

  // Captura a região da figurinha em duas resoluções: 17x16 pra dHash e 64x64
  // pra histograma de cor. Reusa o mesmo canvas escondido (redimensiona entre
  // os dois drawImage). Devolve null se vídeo ainda não tem dimensões válidas.
  const capturarFrente = useCallback((
    dx = 0,
    dy = 0
  ): {
    hash: ImageData;
    cor: ImageData;
  } | null => {
    if (!canvasRef.current || !videoRef.current) return null;
    const crop = calcularCropFrente(dx, dy);
    if (!crop) return null;
    const c = canvasRef.current;
    const v = videoRef.current;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    c.width = 17;
    c.height = 16;
    ctx.drawImage(v, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 17, 16);
    const hash = ctx.getImageData(0, 0, 17, 16);

    // 32x32 = 1024 amostras, 4x mais rápido que 64x64. Histograma normalizado
    // continua comparável com a fonte gerada offline (Bhattacharyya invariante
    // ao tamanho da amostra desde que ambos normalizem por total de pixels).
    c.width = 32;
    c.height = 32;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(v, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 32, 32);
    const cor = ctx.getImageData(0, 0, 32, 32);

    return { hash, cor };
  }, [calcularCropFrente]);

  useEffect(() => {
    handlerStickerDetectadoRef.current = (sticker: Sticker) => {
      const adicionarFinal = (idEscolhido: string) => {
        const figEscolhida = figurinhaPorId(idEscolhido) ?? sticker;
        const jaTinha = temSlot(idEscolhido);
        adicionar(idEscolhido);
        const qtdDepois = quantidadeSlot(idEscolhido) + 1;
        const ts = registrarHistorico(idEscolhido);
        quickOrigemRef.current = { stickerId: idEscolhido, timestamp: ts };
        dispararQuickToast(figEscolhida, jaTinha, qtdDepois);
      };

      if (temVersaoMcDonalds(sticker.id)) {
        pausadoRef.current = true;
        perguntarMcd(
          sticker.id,
          (idEscolhido) => {
            if (quickModeRef.current) {
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

      if (quickModeRef.current) {
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
    perguntarMcd,
    quantidadeSlot,
    registrarHistorico,
    temSlot,
  ]);

  // Loop de scan contínuo
  useEffect(() => {
    let timeoutId: any = null;
    let cancelado = false;

    const tickVerso = async () => {
      if (cancelado) return;
      const worker = workerRef.current;
      const v = videoRef.current;
      if (!worker || !v || v.readyState < 2 || pausadoRef.current) {
        timeoutId = setTimeout(tickVerso, 350);
        return;
      }
      const canvas = capturarFrame(turboAtivo);
      if (!canvas) {
        timeoutId = setTimeout(tickVerso, 350);
        return;
      }
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
      if (!cancelado) timeoutId = setTimeout(tickVerso, turboAtivo ? 350 : 600);
    };

    const tickFrente = () => {
      if (cancelado) return;
      const v = videoRef.current;
      const payload = frontHashesRef.current;
      if (!v || v.readyState < 2 || pausadoRef.current || !payload) {
        timeoutId = setTimeout(tickFrente, FRONT_TICK_MS);
        return;
      }
      try {
        setEscaneando(true);
        // Pra cada posição, calcula top-K. Depois agrega: o id que ganha
        // mais "melhor de cada posição" é o candidato auto-fire (se for
        // limpo o suficiente). Pra UI, o top-3 vem do agregado de TODAS as
        // posições — colapsa duplicatas pelo melhor score.
        const todosPorId = new Map<string, MatchResult>();
        const votosPorId = new Map<string, number>();
        for (const off of FRONT_OFFSETS) {
          const cap = capturarFrente(off.dx, off.dy);
          if (!cap) continue;
          const hash = computeDHashFromImageData(cap.hash);
          const cor = computeColorHistFromImageData(cap.cor);
          const tops = rankearTopK(hash, cor, payload.items, FRONT_TOP_K);
          if (!tops.length) continue;
          // voto desta posição = 1º colocado dela
          votosPorId.set(tops[0].id, (votosPorId.get(tops[0].id) ?? 0) + 1);
          // mescla candidatos por id, preservando o melhor score visto
          for (const r of tops) {
            const existente = todosPorId.get(r.id);
            if (!existente || r.score < existente.score) todosPorId.set(r.id, r);
          }
        }

        if (todosPorId.size === 0) {
          if (!cancelado) timeoutId = setTimeout(tickFrente, FRONT_TICK_MS);
          return;
        }

        // top-K consolidado pra UI
        const top = Array.from(todosPorId.values())
          .sort((a, b) => a.score - b.score)
          .slice(0, FRONT_TOP_K);
        setTopKFrente(top);

        // Auto-fire só se MAIORIA das posições concordou no mesmo id E o
        // melhor score dele passa nos gates limpos.
        let idVencedor = '';
        let votosVencedor = 0;
        votosPorId.forEach((v, id) => {
          if (v > votosVencedor) {
            votosVencedor = v;
            idVencedor = id;
          }
        });
        if (votosVencedor >= FRONT_OFFSET_VOTO_MIN && !pausadoRef.current) {
          const m = todosPorId.get(idVencedor);
          if (m) {
            const gap = m.scoreSegundoMaisProximo - m.score;
            if (m.score <= FRONT_AUTO_SCORE_MAX && gap >= FRONT_AUTO_GAP_MIN) {
              const sticker = figurinhaPorId(idVencedor);
              if (sticker) handlerStickerDetectadoRef.current(sticker);
            }
          }
        }
      } catch {
        // ignora erro pontual e segue
      } finally {
        setEscaneando(false);
      }
      if (!cancelado) timeoutId = setTimeout(tickFrente, FRONT_TICK_MS);
    };

    loopAtivoRef.current = true;
    const tick = modoCaptura === 'frente' ? tickFrente : tickVerso;
    timeoutId = setTimeout(tick, 800);

    return () => {
      cancelado = true;
      loopAtivoRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [capturarFrame, capturarFrente, debugAtivo, turboAtivo, modoCaptura, frontHashesProntos]);

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

      {/* Moldura do scan: horizontal para o verso (código), vertical para a frente (foto) */}
      {modoCaptura === 'verso' ? (
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
      ) : (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%',
            maxHeight: '78%',
            aspectRatio: '5 / 6.5',
            border: '2px solid #22c55e',
            borderRadius: 14,
            boxShadow: '0 0 24px rgba(34,197,94,0.4)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Linha de scan animada (apenas no verso, onde tem janela horizontal) */}
      {modoCaptura === 'verso' && (
        <>
          <style>{`
            @keyframes scanLine {
              0% { top: 36%; opacity: 0.2; }
              50% { opacity: 1; }
              100% { top: 64%; opacity: 0.2; }
            }
          `}</style>
          <div
            style={{
              position: 'absolute',
              left: '17.5%',
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
        {(() => {
          let corBorda = 'rgba(255,255,255,0.1)';
          let corTexto = '#fff';
          let corIcone = '#22c55e';
          let conteudo: React.ReactNode;

          if (escaneando) {
            conteudo = 'Lendo…';
          } else if (modoCaptura !== 'frente') {
            conteudo = 'Pronto p/ ler';
          } else if (!frontHashesProntos) {
            conteudo = 'Carregando…';
          } else if (topKFrente.length === 0) {
            conteudo = 'Pronto p/ foto';
          } else {
            const t = topKFrente[0];
            const gap = t.scoreSegundoMaisProximo - t.score;
            if (t.score <= FRONT_AUTO_SCORE_MAX && gap >= FRONT_AUTO_GAP_MIN) {
              corBorda = '#22c55e';
              corTexto = '#22c55e';
              corIcone = '#22c55e';
            }
            conteudo = `${t.id} s=${t.score.toFixed(2)}`;
          }

          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(0,0,0,0.55)',
                border: `1px solid ${corBorda}`,
                color: corTexto,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: modoCaptura === 'frente' ? 'monospace' : undefined,
              }}
            >
              <ScanLine size={14} color={corIcone} />
              {conteudo}
            </div>
          );
        })()}
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

      {/* Toggle Verso/Frente: pílula no topo central, abaixo do header */}
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            padding: 4,
            gap: 2,
            pointerEvents: 'auto',
            backdropFilter: 'blur(6px)',
          }}
        >
          {([
            { id: 'verso' as const, label: 'Código', icone: Type },
            { id: 'frente' as const, label: 'Foto', icone: ImageIcon },
          ]).map((opt) => {
            const ativo = modoCaptura === opt.id;
            const Icone = opt.icone;
            return (
              <button
                key={opt.id}
                onClick={() => escolherCaptura(opt.id)}
                aria-pressed={ativo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: ativo ? '#22c55e' : 'transparent',
                  color: ativo ? '#0a1230' : '#e6ebff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 0.3,
                }}
              >
                <Icone size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Texto guia logo abaixo da moldura verde */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: modoCaptura === 'verso' ? 'calc(64% + 12px)' : 'calc(88% + 4px)',
          textAlign: 'center',
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
          padding: '0 8px',
        }}
      >
        {modoCaptura === 'verso' ? (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Centralize o <b style={{ color: '#22c55e' }}>código do cromo</b> no quadro verde
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.75,
                marginTop: 4,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Ex: BRA01 ou 33 — leitura automática
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Toque no <b style={{ color: '#22c55e' }}>jogador certo</b> abaixo
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.85,
                marginTop: 4,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#fbbf24',
              }}
            >
              Beta — Brasil e Argélia
              {frontHashesErro
                ? ` · falha ao carregar (${frontHashesErro})`
                : !frontHashesProntos
                ? ' · carregando catálogo…'
                : ''}
            </div>
          </>
        )}
      </div>

      {/* Painel de top-3 candidatos (modo Foto): tap-to-confirm. */}
      {modoCaptura === 'frente' && frontHashesProntos && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 90,
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          {topKFrente.length === 0 ? (
            <div
              style={{
                color: '#9aa6c9',
                fontSize: 12,
                background: 'rgba(0,0,0,0.55)',
                padding: '6px 12px',
                borderRadius: 999,
                pointerEvents: 'auto',
              }}
            >
              Aponte pra figurinha…
            </div>
          ) : (
            topKFrente.map((cand, idx) => {
              const fig = figurinhaPorId(cand.id);
              if (!fig) return null;
              const ehTop = idx === 0;
              const gap = cand.scoreSegundoMaisProximo - cand.score;
              const limpo = ehTop && cand.score <= FRONT_AUTO_SCORE_MAX && gap >= FRONT_AUTO_GAP_MIN;
              return (
                <button
                  key={cand.id}
                  onClick={() => {
                    pausadoRef.current = true;
                    handlerStickerDetectadoRef.current(fig);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: 6,
                    borderRadius: 12,
                    background: 'rgba(10,18,48,0.85)',
                    border: limpo
                      ? '2px solid #22c55e'
                      : ehTop
                      ? '2px solid #fbbf24'
                      : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(6px)',
                    minWidth: 78,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 84,
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: '#1a2236',
                    }}
                  >
                    <img
                      src={fig.imagem}
                      alt={fig.nome}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div
                    style={{
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: 0.4,
                    }}
                  >
                    {fig.codigo}
                  </div>
                  <div
                    style={{
                      color: limpo ? '#22c55e' : '#9aa6c9',
                      fontSize: 10,
                      fontFamily: 'monospace',
                    }}
                  >
                    s={cand.score.toFixed(2)}
                  </div>
                </button>
              );
            })
          )}
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
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 14px',
          background: 'rgba(10,18,48,0.85)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: quickMode ? '#22c55e' : 'rgba(255,255,255,0.08)',
              color: quickMode ? '#0a1230' : '#9aa6c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bolt size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>Quick mode</div>
            <div
              style={{
                color: '#9aa6c9',
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Salva no ato; toque na notificação p/ editar.
            </div>
          </div>
        </div>
        <Switch checked={quickMode} onChange={setQuickMode} />
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
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{fig.codigo}</div>
              <div style={{ color: '#9aa6c9', fontSize: 13, marginBottom: 10 }}>{fig.nome}</div>
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

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={() => {
                fecharModal();
              }}
              icon={<X size={16} />}
              style={{ flex: 1 }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              onClick={confirmar}
              icon={<Check size={16} />}
              disabled={!fig}
              style={{
                flex: 1,
                background: jaTem ? '#f59e0b' : '#22c55e',
                borderColor: jaTem ? '#f59e0b' : '#22c55e',
                fontWeight: 700,
              }}
            >
              {jaTem ? 'Repetida' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
