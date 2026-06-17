export type Confederacao = 'CONMEBOL' | 'UEFA' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';

export type StickerRaridade = 'comum' | 'rara' | 'especial' | 'legend';

export type SecaoTipo = 'selecao' | 'especial';

export interface Sticker {
  id: string;
  codigo: string;
  numero: number;
  nome: string;
  imagem: string;
  raridade: StickerRaridade;
  tipo: SecaoTipo;
  selecaoId?: string;
  posicao?: 'GOL' | 'DEF' | 'MEI' | 'ATA' | 'TEC' | 'ESC' | 'TIME';
  slotDeId?: string;
  rotation?: number;
  spanCols?: number;
  spanRows?: number;
}

export interface Selecao {
  id: string;
  nome: string;
  nomeEn: string;
  bandeira: string;
  confederacao: Confederacao;
  cor: string;
  totalFigurinhas: number;
  grupo?: string;
  paginas: [number, number];
}

export interface SecaoEspecial {
  id: string;
  nome: string;
  icone: string;
  totalFigurinhas: number;
  cor: string;
}

export interface ColecaoEstado {
  [stickerId: string]: number;
}
