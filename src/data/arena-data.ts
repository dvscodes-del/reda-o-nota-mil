export type ArgumentSide = 'pro' | 'against';

export interface ArenaReply {
  id: string;
  argumentId: string;
  topicId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null | undefined;
  side: ArgumentSide | 'neutral';
  content: string;
  votes: number;
  createdAt: string;
}

export interface ArenaArgument {
  id: string;
  topicId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null | undefined;
  side: ArgumentSide;
  title: string;
  content: string;
  repertoireType?: string | undefined;
  repertoireDetail?: string | undefined;
  votes: number;
  repertoireVotes: number;
  isHighlighted?: boolean | undefined;
  replies: ArenaReply[];
  createdAt: string;
}

export interface ArenaTopic {
  id: string;
  statement: string;
  category: 'Tecnologia' | 'Educação' | 'Sociedade' | 'Filosofia' | 'Direito' | 'Cultura';
  description: string;
  context: string;
  creatorName: string;
  createdAt: string;
  totalVotesPro: number;
  totalVotesAgainst: number;
}

export const initialArenaTopics: ArenaTopic[] = [
  {
    id: 'topic-1',
    statement: 'A inteligência artificial prejudica a educação e o pensamento crítico dos estudantes?',
    category: 'Tecnologia',
    description: 'Debate central sobre o impacto de ferramentas como ChatGPT e geradores automáticos de texto no desenvolvimento cognitivo, autoria e aprendizado escolar.',
    context: 'Com a rápida disseminação de ferramentas de IA generativa em escolas e universidades, educadores se dividem entre banir o uso para evitar plágio ou incorporar a tecnologia como tutora personalizada.',
    creatorName: 'Equipe Pedagógica',
    createdAt: '2026-11-01T10:00:00Z',
    totalVotesPro: 142,
    totalVotesAgainst: 189,
  },
  {
    id: 'topic-2',
    statement: 'O trabalho de cuidado não remunerado deve ter remuneração estatal obrigatória no Brasil?',
    category: 'Sociedade',
    description: 'Discussão sobre a invisibilidade do cuidado doméstico exercido majoritariamente por mulheres e a responsabilidade do Estado na redistribuição dessa renda.',
    context: 'Dados do IBGE revelam que mulheres dedicam mais que o dobro de horas a afazeres domésticos do que homens. Países nórdicos já adotam bolsas e créditos de aposentadoria para cuidadores.',
    creatorName: 'Mariana Silva',
    createdAt: '2026-11-02T14:30:00Z',
    totalVotesPro: 215,
    totalVotesAgainst: 98,
  },
  {
    id: 'topic-3',
    statement: 'A proibição do uso de celulares em salas de aula melhora o rendimento e o convívio dos alunos?',
    category: 'Educação',
    description: 'Polêmica sobre legislações recentes em estados brasileiros e países europeus que vetam celulares nas escolas públicas e particulares.',
    context: 'Relatórios da UNESCO apontam que a presença de smartphones em sala desconcentra os estudantes e agrava a ansiedade, enquanto defensores alegam que o aparelho pode ser ferramenta de pesquisa orientada.',
    creatorName: 'Lucas Ferreira',
    createdAt: '2026-11-03T09:15:00Z',
    totalVotesPro: 178,
    totalVotesAgainst: 134,
  },
  {
    id: 'topic-4',
    statement: 'As redes sociais geram mais alienação do que engajamento político consciente entre os jovens?',
    category: 'Filosofia',
    description: 'Análise do papel dos algoritmos de recomendação, polarização ideológica e bolhas sociais na formação cívica da juventude.',
    context: 'O filósofo Byung-Chul Han e sociólogos contemporâneos alertam que a cultura do like fragmenta o debate público e substitui o engajamento comunitário real pela ilusão de participação.',
    creatorName: 'Prof. Gabriel Castro',
    createdAt: '2026-11-04T16:00:00Z',
    totalVotesPro: 165,
    totalVotesAgainst: 112,
  },
  {
    id: 'topic-5',
    statement: 'A redução da maioridade penal é uma medida eficaz para conter a criminalidade juvenil no Brasil?',
    category: 'Direito',
    description: 'Clássico dilema penal brasileiro sobre punitivismo vs. medidas socioeducativas e garantias fundamentais.',
    context: 'O Estatuto da Criança e do Adolescente (ECA) e a Constituição de 1988 preveem inimputabilidade penal antes dos 18 anos, com medidas de internação. Movimentos legislativos debatem a redução para 16 anos.',
    creatorName: 'Camila Rocha',
    createdAt: '2026-11-05T11:20:00Z',
    totalVotesPro: 120,
    totalVotesAgainst: 210,
  },
];

export const initialArenaArguments: ArenaArgument[] = [
  // --- Tópico 1: IA na Educação ---
  {
    id: 'arg-1-pro-1',
    topicId: 'topic-1',
    authorId: 'user-pedro',
    authorName: 'Pedro Alcântara',
    authorAvatar: null,
    side: 'pro',
    title: 'A atrofia do esforço cognitivo e a ilusão de domínio do conteúdo',
    content: 'Quando o aluno terceiriza a escrita, o resumo e a formulação de hipóteses para a IA, ele pula exatamente a etapa neurológica do aprendizado: o esforço de reflexão, erro e síntese. O educador Paulo Freire defendia a educação problematizadora, onde o aluno é sujeito ativo do conhecimento. A inteligência artificial, usada sem freios, transforma o estudante em mero receptor passivo de respostas pré-fabricadas.',
    repertoireType: 'Filosofia da Educação',
    repertoireDetail: 'Paulo Freire, "Pedagogia da Autonomia"',
    votes: 42,
    repertoireVotes: 29,
    isHighlighted: true,
    createdAt: '2026-11-01T11:20:00Z',
    replies: [
      {
        id: 'rep-1-1',
        argumentId: 'arg-1-pro-1',
        topicId: 'topic-1',
        authorId: 'user-larissa',
        authorName: 'Larissa Mendes',
        authorAvatar: null,
        side: 'against',
        content: 'Concordo que o uso passivo é prejudicial, Pedro, mas o mesmo argumento foi usado contra a calculadora e a própria internet no passado. Se o professor souber mediar, a IA se torna um parceiro de debate socrático!',
        votes: 18,
        createdAt: '2026-11-01T12:05:00Z',
      },
      {
        id: 'rep-1-2',
        argumentId: 'arg-1-pro-1',
        topicId: 'topic-1',
        authorId: 'user-tiago',
        authorName: 'Tiago Santos',
        authorAvatar: null,
        side: 'pro',
        content: 'Excelente argumento! O problema real é que as escolas brasileiras mal têm formação docente para mediar esse uso, resultando na prática em cópia pura e desaprendizado.',
        votes: 12,
        createdAt: '2026-11-01T14:10:00Z',
      },
    ],
  },
  {
    id: 'arg-1-against-1',
    topicId: 'topic-1',
    authorId: 'user-beatriz',
    authorName: 'Beatriz Vasconcelos',
    authorAvatar: null,
    side: 'against',
    title: 'Democratização do acesso à tutoria personalizada e inclusão',
    content: 'Nem todo aluno tem condições financeiras de pagar por cursinhos caros ou professores particulares para tirar dúvidas de redação e exatas à noite. A IA atua como um tutor individual acessível 24 horas, explicando conceitos difíceis de dez formas diferentes até o aluno compreender. O sociólogo Pierre Bourdieu demonstrou como o capital cultural herdado perpetua desigualdades de classe na escola; a IA funciona justamente como um redutor desse abismo educacional.',
    repertoireType: 'Sociologia',
    repertoireDetail: 'Pierre Bourdieu, "A Reprodução"',
    votes: 56,
    repertoireVotes: 38,
    isHighlighted: true,
    createdAt: '2026-11-01T13:45:00Z',
    replies: [
      {
        id: 'rep-1-3',
        argumentId: 'arg-1-against-1',
        topicId: 'topic-1',
        authorId: 'user-marcos',
        authorName: 'Marcos Vinicius',
        authorAvatar: null,
        side: 'pro',
        content: 'Mas Beatriz, para ter acesso a essas IAs mais avançadas é preciso internet de alta velocidade e aparelhos modernos, o que mantém a exclusão digital para quem é da periferia.',
        votes: 14,
        createdAt: '2026-11-01T15:00:00Z',
      },
    ],
  },
  {
    id: 'arg-1-pro-2',
    topicId: 'topic-1',
    authorId: 'user-carla',
    authorName: 'Carla Nogueira',
    authorAvatar: null,
    side: 'pro',
    title: 'A padronização do pensamento e a perda da originalidade estilística',
    content: 'A IA se baseia em probabilidades e padrões textuais médios da internet. Quando alunos passam a escrever orientados pelas respostas da máquina, perde-se a voz autoral, a ironia, a metáfora e a singularidade do texto. Na redação do ENEM, a Competência 3 avalia exatamente a autoria e o projeto de texto próprio do estudante, algo que a IA mina ao homogeneizar o estilo.',
    repertoireType: 'Teoria da Linguagem',
    repertoireDetail: 'Mikhail Bakhtin, "Gêneros do Discurso"',
    votes: 31,
    repertoireVotes: 19,
    createdAt: '2026-11-02T08:30:00Z',
    replies: [],
  },
  {
    id: 'arg-1-against-2',
    topicId: 'topic-1',
    authorId: 'user-daniel',
    authorName: 'Daniel Oliveira',
    authorAvatar: null,
    side: 'against',
    title: 'Preparação essencial para o mercado de trabalho do século XXI',
    content: 'Proibir ou demonizar a IA na escola é formar jovens despreparados para um mercado que já exige fluência em engenharia de prompt e análise crítica de outputs algorítmicos. O papel da escola não é fingir que a tecnologia não existe, mas ensinar ética, verificação de fontes (fact-checking) e checagem de alucinações da máquina. Segundo dados da OCDE, habilidades complementares à IA serão as mais valorizadas.',
    repertoireType: 'Dados Econômicos',
    repertoireDetail: 'Relatório OCDE 2024 sobre o Futuro do Emprego',
    votes: 39,
    repertoireVotes: 22,
    createdAt: '2026-11-02T10:15:00Z',
    replies: [],
  },

  // --- Tópico 2: Cuidado Não Remunerado ---
  {
    id: 'arg-2-pro-1',
    topicId: 'topic-2',
    authorId: 'user-juliana',
    authorName: 'Juliana Prado',
    authorAvatar: null,
    side: 'pro',
    title: 'Justiça histórica e cumprimento do Artigo 6º da Constituição',
    content: 'O trabalho de cuidado sustenta a base material de toda a economia formal: se ninguém alimenta, cuida de doentes e cria as crianças, os trabalhadores formais sequer poderiam ir para as empresas. A Oxfam aponta que o cuidado não remunerado gera 10,8 trilhões de dólares ao ano globalmente. Remunerar e conceder previdência a essas mulheres é aplicar na prática o Artigo 6º da Carta Magna, que protege a maternidade e a dignidade humana.',
    repertoireType: 'Legislação e Economia',
    repertoireDetail: 'Constituição Federal de 1988 (Art. 6º) e Relatório Oxfam',
    votes: 68,
    repertoireVotes: 44,
    isHighlighted: true,
    createdAt: '2026-11-02T15:10:00Z',
    replies: [
      {
        id: 'rep-2-1',
        argumentId: 'arg-2-pro-1',
        topicId: 'topic-2',
        authorId: 'user-roberto',
        authorName: 'Roberto Dias',
        authorAvatar: null,
        side: 'against',
        content: 'O ponto é nobre, Juliana, mas de onde viria o orçamento fiscal do Estado para arcar com dezenas de milhões de pagamentos mensais sem colapsar a previdência?',
        votes: 21,
        createdAt: '2026-11-02T16:00:00Z',
      },
    ],
  },
  {
    id: 'arg-2-against-1',
    topicId: 'topic-2',
    authorId: 'user-felipe',
    authorName: 'Felipe Antunes',
    authorAvatar: null,
    side: 'against',
    title: 'O risco de reforçar a mulher presa ao espaço doméstico',
    content: 'Pagar um salário estatal para quem cuida em casa pode gerar um incentivo perverso: manter as mulheres permanentemente afastadas da universidade e do mercado de trabalho formal, chancelando pelo Estado a divisão patriarcal do trabalho. A verdadeira emancipação feminina, como pontua Simone de Beauvoir, exige que o Estado crie creches públicas em tempo integral e centros para idosos, liberando a mulher para trabalhar onde desejar, e não pagando para ela ficar no lar.',
    repertoireType: 'Filosofia Feminista',
    repertoireDetail: 'Simone de Beauvoir, "O Segundo Sexo"',
    votes: 49,
    repertoireVotes: 35,
    isHighlighted: true,
    createdAt: '2026-11-02T17:20:00Z',
    replies: [],
  },
];
