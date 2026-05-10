export interface Anuncio {
  id: string;
  titulo: string;
  data: string;
  itens: { titulo: string; descricao: string; emoji?: string }[];
}

export const ANUNCIOS: Anuncio[] = [
  {
    id: '2026-05-10-scanner-face-ranking',
    titulo: 'Novidades',
    data: '2026-05-10',
    itens: [
      {
        emoji: '📸',
        titulo: 'Scanner com reconhecimento facial',
        descricao:
          'O scanner agora reconhece o rosto de todos os jogadores — basta apontar a câmera para a figurinha.',
      },
      {
        emoji: '🏆',
        titulo: 'Ranking de coletores',
        descricao:
          'Veja na tela inicial o ranking dos coletores com mais figurinhas no álbum, paginado.',
      },
    ],
  },
];

export const ANUNCIO_ATUAL: Anuncio | null = ANUNCIOS[ANUNCIOS.length - 1] ?? null;
