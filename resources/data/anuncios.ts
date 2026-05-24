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
  {
    id: '2026-05-14-ordenacao-numeracao-busca-trocas',
    titulo: 'Novidades',
    data: '2026-05-14',
    itens: [
      {
        emoji: '🔤',
        titulo: 'Ordem alfabética PT e EN',
        descricao:
          'Coleção e Checklist agora ordenam países em português ou inglês — útil para quem troca com gringos.',
      },
      {
        emoji: '🔢',
        titulo: 'Numeração oficial do álbum',
        descricao:
          'Cada país mostra seu número canônico (1 México, 2 África do Sul…) no card e no checklist, sempre estável.',
      },
      {
        emoji: '🗂️',
        titulo: 'Grupos respeitam a ordem do álbum',
        descricao:
          'Dentro de cada grupo, os países seguem a ordem oficial do álbum em vez de alfabética.',
      },
      {
        emoji: '🔎',
        titulo: 'Busca sem acento',
        descricao:
          'Pesquise "alvarez" e encontre "Álvarez". Vale para nomes de jogadores e seleções, em PT e EN.',
      },
      {
        emoji: '🤝',
        titulo: 'Trocas WhatsApp corrigidas',
        descricao:
          'O "Preciso" agora bate com o contador do início, o #13 não aparece duplicado e ter o McDonald\'s #13 conta como slot completo.',
      },
    ],
  },
  {
    id: '2026-05-14-scanner-troca-modo-saving-spinner',
    titulo: 'Novidades',
    data: '2026-05-14',
    itens: [
      {
        emoji: '🤝',
        titulo: 'Modo Troca/Consulta no scanner',
        descricao:
          'Novo modo no scanner que mostra se você precisa ou já tem a figurinha, sem salvar nada. Ideal para escanear o álbum de amigos.',
      },
      {
        emoji: '⏳',
        titulo: 'Tela de carregamento do scanner',
        descricao:
          'Overlay claro enquanto o modelo de reconhecimento facial é baixado na primeira vez — não trava mais sem feedback.',
      },
      {
        emoji: '✅',
        titulo: 'Aviso de seleção completa',
        descricao:
          'O scanner agora destaca quando uma seleção já está completa: no modo Troca esconde o jogador, e nos modos Normal/Quick aparece um badge no toast/modal.',
      },
      {
        emoji: '💾',
        titulo: 'Sincronização robusta da coleção',
        descricao:
          'Cliques rápidos e scans em sequência não perdem mais a ordem das gravações; falhas momentâneas de rede tentam novamente automaticamente.',
      },
      {
        emoji: '🔄',
        titulo: 'Spinner ao salvar figurinha',
        descricao:
          'Cada figurinha mostra um spinner sobre o card enquanto a alteração está sendo sincronizada com o servidor.',
      },
    ],
  },
  {
    id: '2026-05-23-paginas-album-faltantes-scanner',
    titulo: 'Novidades',
    data: '2026-05-23',
    itens: [
      {
        emoji: '📖',
        titulo: 'Página oficial do álbum por país',
        descricao:
          'Cada país agora mostra seu número (#1 México, #9 Brasil…) e o intervalo das 2 páginas no álbum (pg X–Y) na Home, Coleção, Checklist, Scanner e na página da seleção.',
      },
      {
        emoji: '🧩',
        titulo: 'Faltantes da seleção no scanner',
        descricao:
          'Ao escanear uma figurinha de uma seleção incompleta, o modal traz um bloco recolhível com as figurinhas que ainda faltam dessa seleção — abra só quando precisar.',
      },
      {
        emoji: '⚡',
        titulo: 'Primeira figurinha mais rápida no scanner',
        descricao:
          'Adicionado warm-up do reconhecimento facial durante o carregamento: a compilação dos shaders WebGL agora acontece com o spinner visível, não no meio da sua primeira mira.',
      },
      {
        emoji: '🎴',
        titulo: 'Card de seleção sem sobrepor a bandeira',
        descricao:
          'Os badges #N e pg X–Y agora ficam em uma linha própria acima da bandeira — não cortam mais a flag no tamanho pequeno.',
      },
      {
        emoji: '🔍',
        titulo: 'Botão grande de buscar/limpar no mobile',
        descricao:
          'Coleção e Checklist (busca + filtro de países) ganharam um botão à direita: verde com lupa para fechar o teclado, vermelho com X para limpar. Sem precisar mais caçar o "x" minúsculo nem apertar o "ok" do teclado.',
      },
    ],
  },
];

export const ANUNCIO_ATUAL: Anuncio | null = ANUNCIOS[ANUNCIOS.length - 1] ?? null;
