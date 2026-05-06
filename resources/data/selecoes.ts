import type { Selecao } from '../types';

export const SELECOES: Selecao[] = [
  // ───── Grupo A
  { id: 'MEX', nome: 'México', bandeira: '🇲🇽', confederacao: 'CONCACAF', cor: '#006847', totalFigurinhas: 20, grupo: 'A' },
  { id: 'RSA', nome: 'África do Sul', bandeira: '🇿🇦', confederacao: 'CAF', cor: '#007749', totalFigurinhas: 20, grupo: 'A' },
  { id: 'KOR', nome: 'Coreia do Sul', bandeira: '🇰🇷', confederacao: 'AFC', cor: '#003478', totalFigurinhas: 20, grupo: 'A' },
  { id: 'CZE', nome: 'Tchéquia', bandeira: '🇨🇿', confederacao: 'UEFA', cor: '#11457E', totalFigurinhas: 20, grupo: 'A' },
  // ───── Grupo B
  { id: 'CAN', nome: 'Canadá', bandeira: '🇨🇦', confederacao: 'CONCACAF', cor: '#FF0000', totalFigurinhas: 20, grupo: 'B' },
  { id: 'BIH', nome: 'Bósnia e Herzegovina', bandeira: '🇧🇦', confederacao: 'UEFA', cor: '#002F6C', totalFigurinhas: 20, grupo: 'B' },
  { id: 'QAT', nome: 'Catar', bandeira: '🇶🇦', confederacao: 'AFC', cor: '#8A1538', totalFigurinhas: 20, grupo: 'B' },
  { id: 'SUI', nome: 'Suíça', bandeira: '🇨🇭', confederacao: 'UEFA', cor: '#DA291C', totalFigurinhas: 20, grupo: 'B' },
  // ───── Grupo C
  { id: 'BRA', nome: 'Brasil', bandeira: '🇧🇷', confederacao: 'CONMEBOL', cor: '#009C3B', totalFigurinhas: 20, grupo: 'C' },
  { id: 'MAR', nome: 'Marrocos', bandeira: '🇲🇦', confederacao: 'CAF', cor: '#C1272D', totalFigurinhas: 20, grupo: 'C' },
  { id: 'HAI', nome: 'Haiti', bandeira: '🇭🇹', confederacao: 'CONCACAF', cor: '#00209F', totalFigurinhas: 20, grupo: 'C' },
  { id: 'SCO', nome: 'Escócia', bandeira: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederacao: 'UEFA', cor: '#0065BD', totalFigurinhas: 20, grupo: 'C' },
  // ───── Grupo D
  { id: 'USA', nome: 'Estados Unidos', bandeira: '🇺🇸', confederacao: 'CONCACAF', cor: '#B22234', totalFigurinhas: 20, grupo: 'D' },
  { id: 'PAR', nome: 'Paraguai', bandeira: '🇵🇾', confederacao: 'CONMEBOL', cor: '#D52B1E', totalFigurinhas: 20, grupo: 'D' },
  { id: 'AUS', nome: 'Austrália', bandeira: '🇦🇺', confederacao: 'AFC', cor: '#FFCD00', totalFigurinhas: 20, grupo: 'D' },
  { id: 'TUR', nome: 'Turquia', bandeira: '🇹🇷', confederacao: 'UEFA', cor: '#E30A17', totalFigurinhas: 20, grupo: 'D' },
  // ───── Grupo E
  { id: 'GER', nome: 'Alemanha', bandeira: '🇩🇪', confederacao: 'UEFA', cor: '#000000', totalFigurinhas: 20, grupo: 'E' },
  { id: 'CUW', nome: 'Curaçao', bandeira: '🇨🇼', confederacao: 'CONCACAF', cor: '#002B7F', totalFigurinhas: 20, grupo: 'E' },
  { id: 'CIV', nome: 'Costa do Marfim', bandeira: '🇨🇮', confederacao: 'CAF', cor: '#FF8200', totalFigurinhas: 20, grupo: 'E' },
  { id: 'ECU', nome: 'Equador', bandeira: '🇪🇨', confederacao: 'CONMEBOL', cor: '#FFD100', totalFigurinhas: 20, grupo: 'E' },
  // ───── Grupo F
  { id: 'NED', nome: 'Holanda', bandeira: '🇳🇱', confederacao: 'UEFA', cor: '#FF6B00', totalFigurinhas: 20, grupo: 'F' },
  { id: 'JPN', nome: 'Japão', bandeira: '🇯🇵', confederacao: 'AFC', cor: '#BC002D', totalFigurinhas: 20, grupo: 'F' },
  { id: 'SWE', nome: 'Suécia', bandeira: '🇸🇪', confederacao: 'UEFA', cor: '#006AA7', totalFigurinhas: 20, grupo: 'F' },
  { id: 'TUN', nome: 'Tunísia', bandeira: '🇹🇳', confederacao: 'CAF', cor: '#E70013', totalFigurinhas: 20, grupo: 'F' },
  // ───── Grupo G
  { id: 'BEL', nome: 'Bélgica', bandeira: '🇧🇪', confederacao: 'UEFA', cor: '#FAE042', totalFigurinhas: 20, grupo: 'G' },
  { id: 'EGY', nome: 'Egito', bandeira: '🇪🇬', confederacao: 'CAF', cor: '#CE1126', totalFigurinhas: 20, grupo: 'G' },
  { id: 'IRN', nome: 'Irã', bandeira: '🇮🇷', confederacao: 'AFC', cor: '#239F40', totalFigurinhas: 20, grupo: 'G' },
  { id: 'NZL', nome: 'Nova Zelândia', bandeira: '🇳🇿', confederacao: 'OFC', cor: '#000000', totalFigurinhas: 20, grupo: 'G' },
  // ───── Grupo H
  { id: 'ESP', nome: 'Espanha', bandeira: '🇪🇸', confederacao: 'UEFA', cor: '#AA151B', totalFigurinhas: 20, grupo: 'H' },
  { id: 'CPV', nome: 'Cabo Verde', bandeira: '🇨🇻', confederacao: 'CAF', cor: '#003893', totalFigurinhas: 20, grupo: 'H' },
  { id: 'KSA', nome: 'Arábia Saudita', bandeira: '🇸🇦', confederacao: 'AFC', cor: '#006C35', totalFigurinhas: 20, grupo: 'H' },
  { id: 'URU', nome: 'Uruguai', bandeira: '🇺🇾', confederacao: 'CONMEBOL', cor: '#0038A8', totalFigurinhas: 20, grupo: 'H' },
  // ───── Grupo I
  { id: 'FRA', nome: 'França', bandeira: '🇫🇷', confederacao: 'UEFA', cor: '#0055A4', totalFigurinhas: 20, grupo: 'I' },
  { id: 'SEN', nome: 'Senegal', bandeira: '🇸🇳', confederacao: 'CAF', cor: '#00853F', totalFigurinhas: 20, grupo: 'I' },
  { id: 'IRQ', nome: 'Iraque', bandeira: '🇮🇶', confederacao: 'AFC', cor: '#007A3D', totalFigurinhas: 20, grupo: 'I' },
  { id: 'NOR', nome: 'Noruega', bandeira: '🇳🇴', confederacao: 'UEFA', cor: '#EF2B2D', totalFigurinhas: 20, grupo: 'I' },
  // ───── Grupo J
  { id: 'ARG', nome: 'Argentina', bandeira: '🇦🇷', confederacao: 'CONMEBOL', cor: '#75AADB', totalFigurinhas: 20, grupo: 'J' },
  { id: 'ALG', nome: 'Argélia', bandeira: '🇩🇿', confederacao: 'CAF', cor: '#006233', totalFigurinhas: 20, grupo: 'J' },
  { id: 'AUT', nome: 'Áustria', bandeira: '🇦🇹', confederacao: 'UEFA', cor: '#ED2939', totalFigurinhas: 20, grupo: 'J' },
  { id: 'JOR', nome: 'Jordânia', bandeira: '🇯🇴', confederacao: 'AFC', cor: '#CE1126', totalFigurinhas: 20, grupo: 'J' },
  // ───── Grupo K
  { id: 'POR', nome: 'Portugal', bandeira: '🇵🇹', confederacao: 'UEFA', cor: '#006600', totalFigurinhas: 20, grupo: 'K' },
  { id: 'COD', nome: 'Rep. Dem. do Congo', bandeira: '🇨🇩', confederacao: 'CAF', cor: '#007FFF', totalFigurinhas: 20, grupo: 'K' },
  { id: 'UZB', nome: 'Uzbequistão', bandeira: '🇺🇿', confederacao: 'AFC', cor: '#1EB53A', totalFigurinhas: 20, grupo: 'K' },
  { id: 'COL', nome: 'Colômbia', bandeira: '🇨🇴', confederacao: 'CONMEBOL', cor: '#FCD116', totalFigurinhas: 20, grupo: 'K' },
  // ───── Grupo L
  { id: 'ENG', nome: 'Inglaterra', bandeira: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederacao: 'UEFA', cor: '#012169', totalFigurinhas: 20, grupo: 'L' },
  { id: 'CRO', nome: 'Croácia', bandeira: '🇭🇷', confederacao: 'UEFA', cor: '#FF0000', totalFigurinhas: 20, grupo: 'L' },
  { id: 'GHA', nome: 'Gana', bandeira: '🇬🇭', confederacao: 'CAF', cor: '#FCD116', totalFigurinhas: 20, grupo: 'L' },
  { id: 'PAN', nome: 'Panamá', bandeira: '🇵🇦', confederacao: 'CONCACAF', cor: '#005AA7', totalFigurinhas: 20, grupo: 'L' },
];

export const GRUPOS_COPA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export const CONFEDERACOES: { id: string; nome: string; cor: string; icone: string }[] = [
  { id: 'CONMEBOL', nome: 'CONMEBOL', cor: '#FFD700', icone: '🏆' },
  { id: 'UEFA', nome: 'UEFA', cor: '#003399', icone: '⭐' },
  { id: 'CAF', nome: 'CAF', cor: '#006400', icone: '🌍' },
  { id: 'AFC', nome: 'AFC', cor: '#FF6347', icone: '☀️' },
  { id: 'CONCACAF', nome: 'CONCACAF', cor: '#1E90FF', icone: '🌎' },
  { id: 'OFC', nome: 'OFC', cor: '#00CED1', icone: '🌊' },
];
