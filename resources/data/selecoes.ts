import type { Selecao } from '../types';

// Páginas do álbum oficial Panini FWC 2026 (cada país ocupa 2 páginas — duo
// page). Números extraídos do índice impresso.
export const SELECOES: Selecao[] = [
  // ───── Grupo A
  { id: 'MEX', nome: 'México', nomeEn: 'Mexico', bandeira: '🇲🇽', confederacao: 'CONCACAF', cor: '#006847', totalFigurinhas: 20, grupo: 'A', paginas: [8, 9] },
  { id: 'RSA', nome: 'África do Sul', nomeEn: 'South Africa', bandeira: '🇿🇦', confederacao: 'CAF', cor: '#007749', totalFigurinhas: 20, grupo: 'A', paginas: [10, 11] },
  { id: 'KOR', nome: 'Coreia do Sul', nomeEn: 'South Korea', bandeira: '🇰🇷', confederacao: 'AFC', cor: '#003478', totalFigurinhas: 20, grupo: 'A', paginas: [12, 13] },
  { id: 'CZE', nome: 'Tchéquia', nomeEn: 'Czechia', bandeira: '🇨🇿', confederacao: 'UEFA', cor: '#11457E', totalFigurinhas: 20, grupo: 'A', paginas: [14, 15] },
  // ───── Grupo B
  { id: 'CAN', nome: 'Canadá', nomeEn: 'Canada', bandeira: '🇨🇦', confederacao: 'CONCACAF', cor: '#FF0000', totalFigurinhas: 20, grupo: 'B', paginas: [16, 17] },
  { id: 'BIH', nome: 'Bósnia e Herzegovina', nomeEn: 'Bosnia and Herzegovina', bandeira: '🇧🇦', confederacao: 'UEFA', cor: '#002F6C', totalFigurinhas: 20, grupo: 'B', paginas: [18, 19] },
  { id: 'QAT', nome: 'Catar', nomeEn: 'Qatar', bandeira: '🇶🇦', confederacao: 'AFC', cor: '#8A1538', totalFigurinhas: 20, grupo: 'B', paginas: [20, 21] },
  { id: 'SUI', nome: 'Suíça', nomeEn: 'Switzerland', bandeira: '🇨🇭', confederacao: 'UEFA', cor: '#DA291C', totalFigurinhas: 20, grupo: 'B', paginas: [22, 23] },
  // ───── Grupo C
  { id: 'BRA', nome: 'Brasil', nomeEn: 'Brazil', bandeira: '🇧🇷', confederacao: 'CONMEBOL', cor: '#009C3B', totalFigurinhas: 20, grupo: 'C', paginas: [24, 25] },
  { id: 'MAR', nome: 'Marrocos', nomeEn: 'Morocco', bandeira: '🇲🇦', confederacao: 'CAF', cor: '#C1272D', totalFigurinhas: 20, grupo: 'C', paginas: [26, 27] },
  { id: 'HAI', nome: 'Haiti', nomeEn: 'Haiti', bandeira: '🇭🇹', confederacao: 'CONCACAF', cor: '#00209F', totalFigurinhas: 20, grupo: 'C', paginas: [28, 29] },
  { id: 'SCO', nome: 'Escócia', nomeEn: 'Scotland', bandeira: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederacao: 'UEFA', cor: '#0065BD', totalFigurinhas: 20, grupo: 'C', paginas: [30, 31] },
  // ───── Grupo D
  { id: 'USA', nome: 'Estados Unidos', nomeEn: 'United States', bandeira: '🇺🇸', confederacao: 'CONCACAF', cor: '#B22234', totalFigurinhas: 20, grupo: 'D', paginas: [32, 33] },
  { id: 'PAR', nome: 'Paraguai', nomeEn: 'Paraguay', bandeira: '🇵🇾', confederacao: 'CONMEBOL', cor: '#D52B1E', totalFigurinhas: 20, grupo: 'D', paginas: [34, 35] },
  { id: 'AUS', nome: 'Austrália', nomeEn: 'Australia', bandeira: '🇦🇺', confederacao: 'AFC', cor: '#FFCD00', totalFigurinhas: 20, grupo: 'D', paginas: [36, 37] },
  { id: 'TUR', nome: 'Turquia', nomeEn: 'Turkey', bandeira: '🇹🇷', confederacao: 'UEFA', cor: '#E30A17', totalFigurinhas: 20, grupo: 'D', paginas: [38, 39] },
  // ───── Grupo E
  { id: 'GER', nome: 'Alemanha', nomeEn: 'Germany', bandeira: '🇩🇪', confederacao: 'UEFA', cor: '#000000', totalFigurinhas: 20, grupo: 'E', paginas: [40, 41] },
  { id: 'CUW', nome: 'Curaçao', nomeEn: 'Curaçao', bandeira: '🇨🇼', confederacao: 'CONCACAF', cor: '#002B7F', totalFigurinhas: 20, grupo: 'E', paginas: [42, 43] },
  { id: 'CIV', nome: 'Costa do Marfim', nomeEn: 'Ivory Coast', bandeira: '🇨🇮', confederacao: 'CAF', cor: '#FF8200', totalFigurinhas: 20, grupo: 'E', paginas: [44, 45] },
  { id: 'ECU', nome: 'Equador', nomeEn: 'Ecuador', bandeira: '🇪🇨', confederacao: 'CONMEBOL', cor: '#FFD100', totalFigurinhas: 20, grupo: 'E', paginas: [46, 47] },
  // ───── Grupo F
  { id: 'NED', nome: 'Holanda', nomeEn: 'Netherlands', bandeira: '🇳🇱', confederacao: 'UEFA', cor: '#FF6B00', totalFigurinhas: 20, grupo: 'F', paginas: [48, 49] },
  { id: 'JPN', nome: 'Japão', nomeEn: 'Japan', bandeira: '🇯🇵', confederacao: 'AFC', cor: '#BC002D', totalFigurinhas: 20, grupo: 'F', paginas: [50, 51] },
  { id: 'SWE', nome: 'Suécia', nomeEn: 'Sweden', bandeira: '🇸🇪', confederacao: 'UEFA', cor: '#006AA7', totalFigurinhas: 20, grupo: 'F', paginas: [52, 53] },
  { id: 'TUN', nome: 'Tunísia', nomeEn: 'Tunisia', bandeira: '🇹🇳', confederacao: 'CAF', cor: '#E70013', totalFigurinhas: 20, grupo: 'F', paginas: [54, 55] },
  // ───── Grupo G
  { id: 'BEL', nome: 'Bélgica', nomeEn: 'Belgium', bandeira: '🇧🇪', confederacao: 'UEFA', cor: '#FAE042', totalFigurinhas: 20, grupo: 'G', paginas: [58, 59] },
  { id: 'EGY', nome: 'Egito', nomeEn: 'Egypt', bandeira: '🇪🇬', confederacao: 'CAF', cor: '#CE1126', totalFigurinhas: 20, grupo: 'G', paginas: [60, 61] },
  { id: 'IRN', nome: 'Irã', nomeEn: 'Iran', bandeira: '🇮🇷', confederacao: 'AFC', cor: '#239F40', totalFigurinhas: 20, grupo: 'G', paginas: [62, 63] },
  { id: 'NZL', nome: 'Nova Zelândia', nomeEn: 'New Zealand', bandeira: '🇳🇿', confederacao: 'OFC', cor: '#000000', totalFigurinhas: 20, grupo: 'G', paginas: [64, 65] },
  // ───── Grupo H
  { id: 'ESP', nome: 'Espanha', nomeEn: 'Spain', bandeira: '🇪🇸', confederacao: 'UEFA', cor: '#AA151B', totalFigurinhas: 20, grupo: 'H', paginas: [66, 67] },
  { id: 'CPV', nome: 'Cabo Verde', nomeEn: 'Cape Verde', bandeira: '🇨🇻', confederacao: 'CAF', cor: '#003893', totalFigurinhas: 20, grupo: 'H', paginas: [68, 69] },
  { id: 'KSA', nome: 'Arábia Saudita', nomeEn: 'Saudi Arabia', bandeira: '🇸🇦', confederacao: 'AFC', cor: '#006C35', totalFigurinhas: 20, grupo: 'H', paginas: [70, 71] },
  { id: 'URU', nome: 'Uruguai', nomeEn: 'Uruguay', bandeira: '🇺🇾', confederacao: 'CONMEBOL', cor: '#0038A8', totalFigurinhas: 20, grupo: 'H', paginas: [72, 73] },
  // ───── Grupo I
  { id: 'FRA', nome: 'França', nomeEn: 'France', bandeira: '🇫🇷', confederacao: 'UEFA', cor: '#0055A4', totalFigurinhas: 20, grupo: 'I', paginas: [74, 75] },
  { id: 'SEN', nome: 'Senegal', nomeEn: 'Senegal', bandeira: '🇸🇳', confederacao: 'CAF', cor: '#00853F', totalFigurinhas: 20, grupo: 'I', paginas: [76, 77] },
  { id: 'IRQ', nome: 'Iraque', nomeEn: 'Iraq', bandeira: '🇮🇶', confederacao: 'AFC', cor: '#007A3D', totalFigurinhas: 20, grupo: 'I', paginas: [78, 79] },
  { id: 'NOR', nome: 'Noruega', nomeEn: 'Norway', bandeira: '🇳🇴', confederacao: 'UEFA', cor: '#EF2B2D', totalFigurinhas: 20, grupo: 'I', paginas: [80, 81] },
  // ───── Grupo J
  { id: 'ARG', nome: 'Argentina', nomeEn: 'Argentina', bandeira: '🇦🇷', confederacao: 'CONMEBOL', cor: '#75AADB', totalFigurinhas: 20, grupo: 'J', paginas: [82, 83] },
  { id: 'ALG', nome: 'Argélia', nomeEn: 'Algeria', bandeira: '🇩🇿', confederacao: 'CAF', cor: '#006233', totalFigurinhas: 20, grupo: 'J', paginas: [84, 85] },
  { id: 'AUT', nome: 'Áustria', nomeEn: 'Austria', bandeira: '🇦🇹', confederacao: 'UEFA', cor: '#ED2939', totalFigurinhas: 20, grupo: 'J', paginas: [86, 87] },
  { id: 'JOR', nome: 'Jordânia', nomeEn: 'Jordan', bandeira: '🇯🇴', confederacao: 'AFC', cor: '#CE1126', totalFigurinhas: 20, grupo: 'J', paginas: [88, 89] },
  // ───── Grupo K
  { id: 'POR', nome: 'Portugal', nomeEn: 'Portugal', bandeira: '🇵🇹', confederacao: 'UEFA', cor: '#006600', totalFigurinhas: 20, grupo: 'K', paginas: [90, 91] },
  { id: 'COD', nome: 'Rep. Dem. do Congo', nomeEn: 'DR Congo', bandeira: '🇨🇩', confederacao: 'CAF', cor: '#007FFF', totalFigurinhas: 20, grupo: 'K', paginas: [92, 93] },
  { id: 'UZB', nome: 'Uzbequistão', nomeEn: 'Uzbekistan', bandeira: '🇺🇿', confederacao: 'AFC', cor: '#1EB53A', totalFigurinhas: 20, grupo: 'K', paginas: [94, 95] },
  { id: 'COL', nome: 'Colômbia', nomeEn: 'Colombia', bandeira: '🇨🇴', confederacao: 'CONMEBOL', cor: '#FCD116', totalFigurinhas: 20, grupo: 'K', paginas: [96, 97] },
  // ───── Grupo L
  { id: 'ENG', nome: 'Inglaterra', nomeEn: 'England', bandeira: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederacao: 'UEFA', cor: '#012169', totalFigurinhas: 20, grupo: 'L', paginas: [98, 99] },
  { id: 'CRO', nome: 'Croácia', nomeEn: 'Croatia', bandeira: '🇭🇷', confederacao: 'UEFA', cor: '#FF0000', totalFigurinhas: 20, grupo: 'L', paginas: [100, 101] },
  { id: 'GHA', nome: 'Gana', nomeEn: 'Ghana', bandeira: '🇬🇭', confederacao: 'CAF', cor: '#FCD116', totalFigurinhas: 20, grupo: 'L', paginas: [102, 103] },
  { id: 'PAN', nome: 'Panamá', nomeEn: 'Panama', bandeira: '🇵🇦', confederacao: 'CONCACAF', cor: '#005AA7', totalFigurinhas: 20, grupo: 'L', paginas: [104, 105] },
];

export function formatarPaginas(selecao: Pick<Selecao, 'paginas'>): string {
  return `${selecao.paginas[0]}–${selecao.paginas[1]}`;
}

export const GRUPOS_COPA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export const CONFEDERACOES: { id: string; nome: string; cor: string; icone: string }[] = [
  { id: 'CONMEBOL', nome: 'CONMEBOL', cor: '#FFD700', icone: '🏆' },
  { id: 'UEFA', nome: 'UEFA', cor: '#003399', icone: '⭐' },
  { id: 'CAF', nome: 'CAF', cor: '#006400', icone: '🌍' },
  { id: 'AFC', nome: 'AFC', cor: '#FF6347', icone: '☀️' },
  { id: 'CONCACAF', nome: 'CONCACAF', cor: '#1E90FF', icone: '🌎' },
  { id: 'OFC', nome: 'OFC', cor: '#00CED1', icone: '🌊' },
];
