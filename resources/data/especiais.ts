import type { SecaoEspecial } from '../types';

export const SECOES_ESPECIAIS: SecaoEspecial[] = [
  { id: 'INTRO', nome: 'Introdução', icone: 'I', totalFigurinhas: 9, cor: '#FFD700' },
  { id: 'MUSEU', nome: 'Campeões', icone: 'C', totalFigurinhas: 11, cor: '#C9A961' },
  { id: 'COCA', nome: 'Coca-Cola', icone: 'CC', totalFigurinhas: 14, cor: '#E41E2B' },
  { id: 'MCD', nome: "McDonald's #13", icone: '🍟', totalFigurinhas: 28, cor: '#FFC72C' },
];

export const MCDONALDS_PAISES: Array<{ paisId: string; nome: string }> = [
  { paisId: 'GER', nome: 'Alemanha' },
  { paisId: 'KSA', nome: 'Arábia Saudita' },
  { paisId: 'ARG', nome: 'Argentina' },
  { paisId: 'AUS', nome: 'Austrália' },
  { paisId: 'BEL', nome: 'Bélgica' },
  { paisId: 'BRA', nome: 'Brasil' },
  { paisId: 'CAN', nome: 'Canadá' },
  { paisId: 'QAT', nome: 'Catar' },
  { paisId: 'COL', nome: 'Colômbia' },
  { paisId: 'KOR', nome: 'Coreia do Sul' },
  { paisId: 'CIV', nome: 'Costa do Marfim' },
  { paisId: 'CRO', nome: 'Croácia' },
  { paisId: 'ESP', nome: 'Espanha' },
  { paisId: 'USA', nome: 'Estados Unidos' },
  { paisId: 'FRA', nome: 'França' },
  { paisId: 'GHA', nome: 'Gana' },
  { paisId: 'NED', nome: 'Holanda' },
  { paisId: 'ENG', nome: 'Inglaterra' },
  { paisId: 'JPN', nome: 'Japão' },
  { paisId: 'MAR', nome: 'Marrocos' },
  { paisId: 'MEX', nome: 'México' },
  { paisId: 'NOR', nome: 'Noruega' },
  { paisId: 'PAN', nome: 'Panamá' },
  { paisId: 'SEN', nome: 'Senegal' },
  { paisId: 'SUI', nome: 'Suíça' },
  { paisId: 'TUN', nome: 'Tunísia' },
  { paisId: 'URU', nome: 'Uruguai' },
  { paisId: 'UZB', nome: 'Uzbequistão' },
];

export const MCDONALDS_PAISES_IDS = MCDONALDS_PAISES.map((p) => p.paisId);

export const NOMES_INTRO = [
  'Emblema Oficial (1/2)',
  'Emblema Oficial (2/2)',
  'Mascotes',
  'Slogan Oficial',
  'Bola Oficial',
  'Sede - Canadá',
  'Sede - México',
  'Sede - EUA',
];

export const NOMES_MUSEU = [
  'Itália 1934 — Campeã: Itália',
  'Brasil 1950 — Campeã: Uruguai',
  'Suíça 1954 — Campeã: Alemanha',
  'Chile 1962 — Campeã: Brasil',
  'Alemanha 1974 — Campeã: Holanda',
  'México 1986 — Campeã: Argentina',
  'EUA 1994 — Campeã: Brasil',
  'Coreia/Japão 2002 — Campeã: Brasil',
  'Alemanha 2006 — Campeã: Itália',
  'Brasil 2014 — Campeã: Alemanha',
  'Catar 2022 — Campeã: Argentina',
];

export const NOMES_COCA_COLA = [
  'Lamine Yamal',
  'Joshua Kimmich',
  'Harry Kane',
  'Santiago Giménez',
  'Joško Gvardiol',
  'Federico Valverde',
  'Jefferson Lerma',
  'Enner Valencia',
  'Gabriel Magalhães',
  'Virgil van Dijk',
  'Alphonso Davies',
  'Emiliano Martínez',
  'Raúl Jiménez',
  'Lautaro Martínez',
];
