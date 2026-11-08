export interface TrainingEssay {
  id: number;
  theme: string;
  title: string;
  score: number;
  competencies: { c1: number; c2: number; c3: number; c4: number; c5: number };
  paragraphs: string[];
  highlights: {
    paragraph: number;
    label: string;
    tip: string;
  }[];
}

export const trainingEssays: TrainingEssay[] = [
  {
    id: 1,
    theme: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    title: "O peso invisível do cuidado feminino",
    score: 980,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 200, c5: 180 },
    paragraphs: [
      "A filósofa Simone de Beauvoir, em sua célebre obra 'O Segundo Sexo', afirmou que 'não se nasce mulher, torna-se mulher', evidenciando como os papéis de gênero são construções sociais. No Brasil contemporâneo, essa construção se manifesta de forma contundente na invisibilidade do trabalho de cuidado exercido majoritariamente por mulheres — um labor não remunerado, pouco reconhecido e estruturalmente negligenciado pelas políticas públicas. Diante disso, faz-se necessário analisar tanto a raiz cultural dessa desigualdade quanto a omissão estatal que a perpetua.",
      "Em primeiro lugar, é fundamental compreender que a naturalização do cuidado como atribuição feminina decorre de séculos de socialização patriarcal. Segundo dados do IBGE de 2022, as mulheres brasileiras dedicam, em média, 21,4 horas semanais a afazeres domésticos e cuidados de pessoas, enquanto os homens dedicam apenas 11 horas. Essa discrepância não é fruto de escolha individual, mas de uma estrutura que, desde a infância, condiciona meninas ao papel de cuidadoras e meninos ao de provedores. Tal divisão desigual limita o acesso feminino à educação, ao mercado de trabalho e à autonomia financeira, perpetuando um ciclo de dependência e sobrecarga.",
      "Ademais, a omissão do Estado em reconhecer e valorizar o trabalho de cuidado aprofunda essa desigualdade. A Constituição Federal de 1988, em seu artigo 6º, assegura a proteção à maternidade e à infância como direitos sociais, porém a ausência de creches públicas suficientes, de políticas de licença parental igualitária e de sistemas de apoio a cuidadores informais revela uma contradição entre o texto constitucional e a realidade vivida. Essa lacuna institucional não apenas sobrecarrega as mulheres, mas também compromete o desenvolvimento econômico do país, uma vez que milhões de trabalhadoras potenciais são impedidas de ingressar ou permanecer no mercado formal.",
      "Portanto, para enfrentar a invisibilidade do trabalho de cuidado feminino no Brasil, é imprescindível uma ação articulada. Cabe ao Ministério das Mulheres, em parceria com o Ministério da Educação, implementar campanhas educativas nas escolas públicas — por meio de materiais didáticos e oficinas sobre igualdade de gênero — a fim de desconstruir, desde a base, a naturalização dos papéis de cuidado. Paralelamente, o Poder Legislativo deve aprovar um projeto de lei que institua a licença parental compartilhada obrigatória e amplie a rede de creches públicas, garantindo que o cuidado seja uma responsabilidade coletiva e não um fardo exclusivamente feminino."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório filosófico", tip: "Excelente uso de Simone de Beauvoir para contextualizar o tema, com interpretação que conecta a obra à realidade brasileira." },
      { paragraph: 1, label: "Dados estatísticos", tip: "Dado do IBGE utilizado de forma produtiva — não apenas citado, mas interpretado para sustentar o argumento." },
      { paragraph: 2, label: "Repertório jurídico", tip: "Referência à Constituição com análise crítica da contradição entre a lei e a prática. Isso demonstra maturidade argumentativa." },
      { paragraph: 3, label: "Proposta completa", tip: "Proposta com agente, ação, meio, finalidade e detalhamento. Dois agentes complementares dão robustez à intervenção." }
    ]
  },
  {
    id: 2,
    theme: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    title: "Cuidar: verbo feminino no singular brasileiro",
    score: 940,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 180, c5: 160 },
    paragraphs: [
      "Na obra 'Quarto de Despejo', Carolina Maria de Jesus narra o cotidiano extenuante de uma mulher negra que, além de buscar o sustento da família, carregava sozinha o peso dos cuidados domésticos e dos filhos. Décadas depois, a realidade descrita por Carolina permanece atual: o trabalho de cuidado no Brasil é exercido predominantemente por mulheres, em especial negras e periféricas, sem reconhecimento social ou econômico. Nesse sentido, a invisibilidade desse labor configura um problema estrutural que demanda enfrentamento urgente.",
      "Sob essa perspectiva, a divisão sexual do trabalho, enraizada na cultura brasileira, constitui a principal causa dessa invisibilidade. O sociólogo Pierre Bourdieu, em 'A Dominação Masculina', explica como as estruturas de poder se reproduzem de forma tão naturalizada que se tornam imperceptíveis — a chamada 'violência simbólica'. No contexto do cuidado, essa violência se manifesta quando a sociedade trata como 'vocação' ou 'instinto materno' aquilo que, na verdade, é trabalho: exaustivo, contínuo e indispensável para o funcionamento da economia.",
      "Outrossim, a precariedade das políticas públicas voltadas ao cuidado agrava a situação das mulheres brasileiras. Dados da Oxfam indicam que o trabalho doméstico e de cuidado não remunerado, se fosse contabilizado, representaria cerca de 11% do PIB brasileiro. Apesar dessa magnitude, o país carece de uma rede de apoio institucional — como creches em horário integral, centros de acolhimento para idosos e programas de assistência a cuidadores — que possibilite a redistribuição dessas tarefas entre o Estado, o mercado e as famílias.",
      "Diante do exposto, é necessário que o Governo Federal, por intermédio do Ministério do Desenvolvimento Social, crie o Programa Nacional de Valorização do Cuidado, que inclua a ampliação de creches e centros-dia para idosos em municípios prioritários, financiado por emendas parlamentares vinculadas. Essa medida deve ser acompanhada de campanhas midiáticas, veiculadas em TVs abertas e redes sociais, que promovam a corresponsabilização masculina no cuidado, a fim de transformar a cultura que historicamente delegou essa função exclusivamente às mulheres."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório literário", tip: "Carolina Maria de Jesus é uma referência potente: mulher, negra, periférica — encarna o recorte do tema." },
      { paragraph: 1, label: "Repertório sociológico", tip: "Bourdieu e o conceito de 'violência simbólica' aplicados com precisão ao tema do cuidado." },
      { paragraph: 2, label: "Dados econômicos", tip: "O dado da Oxfam sobre o PIB dá dimensão econômica ao problema, elevando o nível do argumento." },
      { paragraph: 3, label: "Proposta detalhada", tip: "Proposta com nome de programa, fonte de financiamento e ações complementares — bem articulada." }
    ]
  },
  {
    id: 3,
    theme: "Desafios para a valorização de comunidades e povos tradicionais no Brasil",
    title: "Raízes silenciadas: o apagamento dos povos tradicionais",
    score: 960,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 200, c5: 160 },
    paragraphs: [
      "O antropólogo Darcy Ribeiro, em 'O Povo Brasileiro', descreveu a formação da identidade nacional como resultado do encontro — muitas vezes violento — entre matrizes indígenas, africanas e europeias. Entretanto, apesar de serem pilares fundadores da cultura brasileira, comunidades e povos tradicionais seguem marginalizados, tendo seus territórios invadidos, seus saberes desvalorizados e suas vozes ignoradas. Essa contradição entre a importância histórica desses grupos e seu tratamento atual revela um desafio que precisa ser enfrentado com urgência.",
      "Primeiramente, a invisibilização dos povos tradicionais decorre de um modelo de desenvolvimento econômico que prioriza o agronegócio e a exploração mineral em detrimento da preservação territorial. Segundo o Conselho Indigenista Missionário (CIMI), em 2021 foram registrados 305 casos de invasões a terras indígenas — o maior número em duas décadas. Quilombolas, ribeirinhos, quebradeiras de coco e outras comunidades enfrentam ameaças semelhantes. Essa lógica predatória não apenas viola direitos constitucionais, mas também destrói modos de vida que carregam conhecimentos ancestrais sobre manejo sustentável do meio ambiente.",
      "Além disso, o apagamento cultural desses povos é reforçado pela ausência de representatividade nos espaços de poder e nos currículos escolares. Embora a Lei 11.645/2008 determine a inclusão da história e cultura indígena e afro-brasileira no ensino, sua implementação é precária: faltam materiais didáticos adequados, formação docente específica e, sobretudo, a participação dos próprios povos tradicionais na construção desses conteúdos. O resultado é uma educação que reproduz estereótipos e não reconhece a contribuição viva dessas comunidades para a sociedade contemporânea.",
      "Portanto, para valorizar efetivamente as comunidades e povos tradicionais, propõe-se que o Ministério dos Povos Indígenas, em articulação com o Ministério da Educação e lideranças comunitárias, desenvolva um programa de formação continuada para professores da rede pública, com produção de materiais didáticos elaborados em coautoria com representantes dessas comunidades. Tal iniciativa, financiada pelo FNDE, visa garantir que a diversidade cultural brasileira seja ensinada com autenticidade e respeito, contribuindo para a desconstrução de preconceitos e para o fortalecimento da identidade nacional."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório antropológico", tip: "Darcy Ribeiro é referência clássica para temas sobre identidade e diversidade brasileira — uso bem contextualizado." },
      { paragraph: 1, label: "Dados e exemplificação", tip: "Dados do CIMI e exemplos de diferentes comunidades tradicionais demonstram domínio do recorte temático." },
      { paragraph: 2, label: "Repertório legislativo", tip: "Citar a Lei 11.645/2008 e analisar sua falha de implementação mostra olhar crítico sobre políticas públicas." },
      { paragraph: 3, label: "Proposta articulada", tip: "Coautoria com comunidades tradicionais é um diferencial — mostra respeito ao protagonismo desses povos." }
    ]
  },
  {
    id: 4,
    theme: "Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil",
    title: "Existir sem documento: a cidadania negada",
    score: 920,
    competencies: { c1: 200, c2: 200, c3: 180, c4: 180, c5: 160 },
    paragraphs: [
      "O filósofo Hannah Arendt, ao analisar a condição dos apátridas no século XX, cunhou a expressão 'o direito a ter direitos', demonstrando que sem o reconhecimento formal pelo Estado, o indivíduo é privado de toda e qualquer proteção. No Brasil, essa reflexão encontra paralelo na realidade de mais de 2,7 milhões de pessoas sem registro civil de nascimento, segundo estimativa do IBGE. Essas pessoas, invisíveis para o Estado, não podem acessar saúde, educação, trabalho formal ou programas sociais — existem, mas oficialmente não constam.",
      "Nesse contexto, a desigualdade regional e a precariedade da infraestrutura cartorial constituem os principais obstáculos ao registro civil universal. Em estados da região Norte, a distância entre comunidades ribeirinhas e os cartórios mais próximos pode ultrapassar centenas de quilômetros, tornando o ato de registrar uma criança uma jornada onerosa e, muitas vezes, inviável. Soma-se a isso o desconhecimento de muitas famílias sobre a gratuidade do primeiro registro, garantida pela Lei 9.534/1997, o que evidencia uma falha comunicacional do poder público.",
      "A esse cenário soma-se o fato de que a ausência de documentação perpetua ciclos de exclusão social. Sem certidão de nascimento, não é possível obter RG, CPF, carteira de trabalho ou título de eleitor. Essa cadeia de impossibilidades impede o indivíduo de exercer direitos fundamentais previstos na Constituição, como votar, trabalhar formalmente e acessar o SUS. Assim, a falta de registro civil não é apenas uma questão burocrática, mas um mecanismo de reprodução da pobreza e da desigualdade.",
      "Logo, é imperativo que o Governo Federal, por meio dos Tribunais de Justiça estaduais e do Conselho Nacional de Justiça, amplie os mutirões itinerantes de registro civil nas regiões de maior sub-registro, especialmente na Amazônia e no semiárido nordestino. Esses mutirões devem contar com embarcações e veículos adaptados, equipes multidisciplinares e parcerias com agentes comunitários de saúde que já atuam nessas localidades, a fim de garantir que todo brasileiro tenha, desde o nascimento, o direito a ter direitos."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório filosófico", tip: "Hannah Arendt e 'o direito a ter direitos' — conceito central que estrutura toda a argumentação." },
      { paragraph: 1, label: "Contextualização geográfica", tip: "A referência à região Norte e às dificuldades logísticas mostra conhecimento da realidade brasileira." },
      { paragraph: 2, label: "Encadeamento lógico", tip: "A 'cadeia de impossibilidades' (sem certidão → sem RG → sem trabalho) é um recurso argumentativo eficaz." },
      { paragraph: 3, label: "Proposta viável", tip: "Mutirões itinerantes com embarcações e parcerias com agentes de saúde — solução criativa e realista." }
    ]
  },
  {
    id: 5,
    theme: "O estigma associado às doenças mentais na sociedade brasileira",
    title: "Mentes aprisionadas pelo preconceito",
    score: 960,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 200, c5: 160 },
    paragraphs: [
      "Na obra 'Holocausto Brasileiro', a jornalista Daniela Arbex narra os horrores do Hospital Colônia de Barbacena, onde mais de 60 mil pessoas com transtornos mentais morreram em condições desumanas ao longo do século XX. Embora o manicômio tenha sido desativado, o estigma que o sustentava permanece vivo na sociedade brasileira: pessoas com doenças mentais continuam sendo vistas com desconfiança, tratadas como incapazes e excluídas de espaços de convivência e trabalho. Esse preconceito, longe de ser inofensivo, agrava o sofrimento dos acometidos e dificulta a busca por tratamento.",
      "Em primeiro lugar, a estigmatização das doenças mentais está enraizada em uma concepção histórica que associava loucura a periculosidade e desvio moral. Michel Foucault, em 'História da Loucura', demonstrou como as sociedades ocidentais construíram mecanismos de exclusão para segregar os considerados 'anormais'. No Brasil, essa herança se traduz em piadas que banalizam o sofrimento psíquico, em ambientes de trabalho que punem a vulnerabilidade emocional e em famílias que resistem a buscar ajuda profissional por medo do julgamento social. O resultado é um país onde, segundo a OMS, a depressão atinge 5,8% da população — a maior taxa da América Latina — mas onde falar sobre saúde mental ainda é tabu.",
      "Outrossim, a precariedade da rede de atenção psicossocial amplia os efeitos do estigma. A Reforma Psiquiátrica, consolidada pela Lei 10.216/2001, propôs a substituição dos manicômios por Centros de Atenção Psicossocial (CAPS) e serviços comunitários de saúde mental. Contudo, dados do Ministério da Saúde revelam que muitos municípios brasileiros sequer possuem um CAPS em funcionamento, obrigando pacientes a percorrer longas distâncias ou a recorrer a internações em hospitais gerais sem equipe especializada. Essa lacuna institucional reforça a ideia de que doenças mentais não merecem o mesmo investimento que doenças físicas.",
      "Diante do exposto, é necessário que o Ministério da Saúde, em parceria com conselhos regionais de psicologia, implemente campanhas permanentes de conscientização sobre saúde mental nas mídias digitais e em Unidades Básicas de Saúde, utilizando depoimentos de pessoas que superaram o estigma como ferramenta de sensibilização. Paralelamente, deve-se ampliar o financiamento dos CAPS, por meio de repasses do Fundo Nacional de Saúde, garantindo cobertura em todos os municípios com mais de 20 mil habitantes, a fim de assegurar que o cuidado em saúde mental seja acessível, humanizado e livre de preconceito."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório jornalístico", tip: "'Holocausto Brasileiro' é referência impactante que conecta história e atualidade do tema." },
      { paragraph: 1, label: "Repertório filosófico + dados", tip: "Foucault + dados da OMS = combinação sofisticada de repertório teórico e empírico no mesmo parágrafo." },
      { paragraph: 2, label: "Análise de política pública", tip: "Citar a Lei da Reforma Psiquiátrica e apontar sua implementação falha demonstra senso crítico aguçado." },
      { paragraph: 3, label: "Proposta dupla", tip: "Duas frentes (conscientização + ampliação de CAPS) com agentes, meios e finalidades claras." }
    ]
  },
  {
    id: 6,
    theme: "Democratização do acesso ao cinema no Brasil",
    title: "Cinema para quem? O direito à tela negada",
    score: 940,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 180, c5: 160 },
    paragraphs: [
      "O cineasta Glauber Rocha, precursor do Cinema Novo, defendia que a arte cinematográfica deveria ser uma 'câmera na mão e uma ideia na cabeça' — acessível, popular e transformadora. No entanto, a realidade brasileira contraria esse ideal: segundo a Agência Nacional do Cinema (ANCINE), mais de 90% dos municípios brasileiros não possuem sequer uma sala de cinema. Essa concentração das salas em grandes centros urbanos e em shoppings de alto custo revela que o acesso ao cinema no Brasil é um privilégio de classe, não um direito cultural efetivado.",
      "Sob essa ótica, a desigualdade no acesso ao cinema é, antes de tudo, um reflexo da concentração de renda e da urbanização desigual do país. Os ingressos, que chegam a custar R$ 50 em capitais, são proibitivos para a maioria da população — especialmente quando se considera que o salário mínimo mal cobre necessidades básicas. Além disso, a ausência de políticas de descentralização faz com que cidades do interior e periferias das metrópoles permaneçam como 'desertos culturais', onde a única janela para o audiovisual é a televisão aberta, com sua programação limitada e comercialmente orientada.",
      "A esse quadro soma-se a subrepresentação da diversidade brasileira nas produções que efetivamente chegam às telas. Dados da ANCINE indicam que filmes estrangeiros, sobretudo hollywoodianos, ocupam mais de 80% do mercado exibidor nacional, relegando o cinema brasileiro — especialmente o independente e o regional — a uma fatia marginal. Essa hegemonia cultural não apenas limita a visão de mundo do espectador, mas também desestimula a produção local, criando um ciclo de dependência que enfraquece a identidade cinematográfica do país.",
      "Portanto, para democratizar o acesso ao cinema no Brasil, é fundamental que a ANCINE, em articulação com prefeituras municipais, financie a criação de cineclubes públicos e gratuitos em escolas e centros comunitários de cidades sem salas de exibição, utilizando recursos do Fundo Setorial do Audiovisual. Esses espaços devem priorizar a exibição de filmes nacionais e promover debates mediados por educadores, com o objetivo de formar público crítico e valorizar a produção cultural brasileira, garantindo que o cinema seja, de fato, um direito e não um luxo."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório cinematográfico", tip: "Glauber Rocha e o Cinema Novo — referência pertinente que se conecta diretamente ao tema proposto." },
      { paragraph: 1, label: "Análise socioeconômica", tip: "Relação entre preço do ingresso e salário mínimo + conceito de 'desertos culturais' — argumentação sólida." },
      { paragraph: 2, label: "Dados setoriais", tip: "80% de filmes estrangeiros nas telas — dado que sustenta o argumento sobre hegemonia cultural." },
      { paragraph: 3, label: "Proposta com financiamento", tip: "Fundo Setorial do Audiovisual como fonte de recurso mostra conhecimento das estruturas de fomento." }
    ]
  },
  {
    id: 7,
    theme: "Manipulação do comportamento do usuário pelo controle de dados na internet",
    title: "Algoritmos que moldam mentes",
    score: 980,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 200, c5: 180 },
    paragraphs: [
      "Em '1984', George Orwell construiu uma distopia na qual o Estado totalitário controlava não apenas as ações, mas os pensamentos dos cidadãos por meio da vigilância constante e da manipulação da informação. Na era digital, essa ficção encontra ecos perturbadores na realidade: empresas de tecnologia coletam dados pessoais em escala massiva e utilizam algoritmos para direcionar conteúdos, influenciar decisões de consumo e, como revelou o escândalo Cambridge Analytica, até manipular processos eleitorais. O controle de dados na internet tornou-se, assim, uma questão central para a democracia contemporânea.",
      "Primeiramente, a coleta indiscriminada de dados pessoais por plataformas digitais configura uma violação sistemática da privacidade. Cada clique, busca, curtida e localização é registrado, analisado e transformado em perfis comportamentais que são comercializados para anunciantes e, em casos mais graves, para agentes políticos. O filósofo Byung-Chul Han, em 'Psicopolítica', alerta que essa nova forma de poder não opera pela coerção, mas pela sedução: o usuário entrega voluntariamente seus dados em troca de serviços 'gratuitos', sem compreender que o verdadeiro produto é ele próprio. Essa assimetria de informação torna o consentimento uma ficção jurídica.",
      "Ademais, os algoritmos de recomendação criam 'bolhas informacionais' que restringem a pluralidade de perspectivas e radicalizam opiniões. Ao priorizar conteúdos que geram engajamento — frequentemente sensacionalistas ou polarizadores —, essas ferramentas distorcem a percepção da realidade e enfraquecem o debate democrático. O caso das eleições de 2016 nos Estados Unidos, em que perfis falsos e notícias fabricadas foram amplificados por algoritmos do Facebook, ilustra como a manipulação de dados pode comprometer a soberania popular e a integridade dos processos eleitorais.",
      "Conclui-se, portanto, que é urgente a regulamentação do uso de dados pessoais no Brasil. Cabe ao Congresso Nacional aprovar e fortalecer a Lei Geral de Proteção de Dados (LGPD), por meio de emendas que ampliem as atribuições e o orçamento da Autoridade Nacional de Proteção de Dados (ANPD), dotando-a de capacidade fiscalizatória real para aplicar sanções a empresas que violem a privacidade dos usuários. Simultaneamente, o Ministério da Educação deve incluir a 'alfabetização digital' nos currículos do ensino fundamental e médio, com disciplinas que ensinem os estudantes a identificar manipulação algorítmica e a proteger seus dados, formando cidadãos conscientes na era da informação."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório literário + atual", tip: "Orwell + Cambridge Analytica: a ponte entre ficção e realidade é muito eficaz para temas tecnológicos." },
      { paragraph: 1, label: "Repertório filosófico contemporâneo", tip: "Byung-Chul Han e 'Psicopolítica' — referência sofisticada e altamente pertinente ao tema digital." },
      { paragraph: 2, label: "Exemplo internacional", tip: "O caso das eleições americanas é repertório legitimado que dá escala global ao argumento." },
      { paragraph: 3, label: "Proposta legislativa + educacional", tip: "Fortalecer a LGPD + alfabetização digital = intervenção completa com dois eixos complementares." }
    ]
  },
  {
    id: 8,
    theme: "Desafios para a formação educacional de surdos no Brasil",
    title: "O silêncio que exclui: educação e surdez",
    score: 920,
    competencies: { c1: 200, c2: 200, c3: 180, c4: 180, c5: 160 },
    paragraphs: [
      "O educador Paulo Freire defendia que a educação deveria ser um ato de liberdade, capaz de transformar o indivíduo e a sociedade. Para a comunidade surda brasileira, contudo, essa liberdade permanece cerceada: apesar do reconhecimento da Língua Brasileira de Sinais (Libras) pela Lei 10.436/2002, a formação educacional de surdos enfrenta obstáculos que vão da escassez de intérpretes à inadequação dos materiais didáticos, revelando que a inclusão, muitas vezes, existe apenas no papel.",
      "Nesse sentido, a insuficiência de profissionais qualificados em Libras constitui o principal entrave à educação inclusiva de surdos. Dados do Censo Escolar do INEP mostram que a maioria das escolas públicas brasileiras não conta com intérpretes de Libras em sala de aula, obrigando estudantes surdos a acompanhar conteúdos exclusivamente em português oral — uma língua que, para eles, é estrangeira. Essa barreira linguística não apenas compromete o aprendizado, mas também gera isolamento social e emocional, uma vez que o aluno surdo é frequentemente tratado como exceção, e não como sujeito pleno do processo educativo.",
      "Corrobora esse cenário a persistência de uma visão clínica da surdez, que a trata como deficiência a ser 'corrigida' em vez de reconhecê-la como diferença linguística e cultural. Essa perspectiva, ainda predominante em muitas instituições, prioriza a oralização forçada em detrimento do ensino bilíngue (Libras como primeira língua e português escrito como segunda). A consequência é uma educação que não respeita a identidade surda e produz, segundo pesquisas da Universidade Federal de Santa Catarina (UFSC), índices de letramento significativamente inferiores entre surdos em comparação com ouvintes da mesma faixa etária.",
      "Diante disso, propõe-se que o Ministério da Educação, por meio da Secretaria de Educação Especial, amplie a oferta de cursos de licenciatura e formação continuada em Libras nas universidades federais, com bolsas de estudo para docentes da rede pública que se especializem no ensino bilíngue para surdos. Além disso, deve-se garantir a produção de materiais didáticos em formato visual e em Libras, disponibilizados em plataformas digitais gratuitas, a fim de que a educação inclusiva não seja um privilégio geográfico, mas um direito efetivado em todo o território nacional."
    ],
    highlights: [
      { paragraph: 0, label: "Paulo Freire + legislação", tip: "Combinar Freire com a Lei de Libras mostra duplo repertório — teórico e jurídico — na introdução." },
      { paragraph: 1, label: "Dados educacionais", tip: "Censo Escolar/INEP como fonte para evidenciar a falta de intérpretes — dado institucional forte." },
      { paragraph: 2, label: "Análise cultural", tip: "Diferenciar visão clínica de visão cultural da surdez demonstra amadurecimento conceitual." },
      { paragraph: 3, label: "Proposta educacional", tip: "Bolsas para docentes + materiais em Libras + plataformas digitais — proposta com camadas de detalhamento." }
    ]
  },
  {
    id: 9,
    theme: "Caminhos para combater a intolerância religiosa no Brasil",
    title: "Fé e respeito: a tolerância como pilar democrático",
    score: 940,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 180, c5: 160 },
    paragraphs: [
      "O sociólogo Émile Durkheim, ao estudar as religiões, concluiu que elas cumprem uma função social fundamental: fortalecer os laços comunitários e dar sentido à existência coletiva. No Brasil, país constitucionalmente laico e dotado de enorme diversidade religiosa, essa dimensão comunitária deveria ser fonte de riqueza cultural. Contudo, a intolerância religiosa — que atinge sobretudo praticantes de religiões de matriz africana — revela que a pluralidade de crenças, em vez de ser celebrada, é frequentemente perseguida.",
      "Em primeiro lugar, as raízes históricas da intolerância religiosa no Brasil remetem ao processo de colonização, marcado pela imposição do catolicismo e pela demonização das práticas religiosas indígenas e africanas. Essa herança colonial se perpetua no preconceito contemporâneo: segundo dados do Disque 100, as denúncias de intolerância religiosa cresceram mais de 5.000% entre 2011 e 2016, e a maioria dos casos envolve ataques a terreiros de candomblé e umbanda. Tal violência não é apenas simbólica: inclui invasões, incêndios e agressões físicas que configuram crimes de ódio.",
      "A esse panorama acrescenta-se a omissão do sistema educacional em promover o respeito à diversidade religiosa. Embora a Lei de Diretrizes e Bases da Educação (LDB) preveja o ensino religioso de caráter não confessional, na prática, muitas escolas reproduzem uma visão cristã-cêntrica que ignora ou deprecia outras tradições. Essa lacuna formativa alimenta o ciclo do preconceito, pois crianças e jovens crescem sem contato com a pluralidade de expressões religiosas que compõem a identidade brasileira.",
      "Portanto, é imprescindível que o Ministério da Educação reformule as diretrizes do ensino religioso nas escolas públicas, substituindo o modelo confessional por uma abordagem de 'história das religiões' que contemple todas as tradições presentes no Brasil, com ênfase nas de matriz africana e indígena. Essa reformulação deve incluir a capacitação de professores por meio de parcerias com universidades e comunidades religiosas, financiada pelo FNDE, a fim de formar cidadãos que compreendam a diversidade de crenças como patrimônio cultural e não como ameaça, contribuindo para a construção de uma sociedade efetivamente tolerante."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório sociológico", tip: "Durkheim e a função social da religião — base teórica sólida para contextualizar o tema." },
      { paragraph: 1, label: "Dados do Disque 100", tip: "Crescimento de 5.000% nas denúncias é um dado impactante que evidencia a gravidade do problema." },
      { paragraph: 2, label: "Análise do sistema educacional", tip: "Crítica à implementação da LDB mostra capacidade de ir além da superfície normativa." },
      { paragraph: 3, label: "Proposta curricular", tip: "'História das religiões' como alternativa ao ensino confessional — proposta criativa e viável." }
    ]
  },
  {
    id: 10,
    theme: "A persistência da violência contra a mulher na sociedade brasileira",
    title: "Feridas abertas: a violência que não cessa",
    score: 960,
    competencies: { c1: 200, c2: 200, c3: 200, c4: 200, c5: 160 },
    paragraphs: [
      "Em 'A Hora da Estrela', Clarice Lispector constrói a personagem Macabéa — uma mulher nordestina, pobre e silenciada, cujo destino é moldado por uma sociedade que a ignora e a violenta. Décadas depois da publicação dessa obra, a violência contra a mulher permanece como uma das mais graves violações de direitos humanos no Brasil: segundo o Atlas da Violência de 2019, 4.519 mulheres foram assassinadas no país em 2017, e 66% delas eram negras. Esses números revelam que a persistência dessa violência é, ao mesmo tempo, uma questão de gênero e de raça.",
      "Sob essa perspectiva, a cultura machista e patriarcal brasileira constitui o alicerce sobre o qual a violência contra a mulher se perpetua. Desde a infância, meninos são socializados para associar masculinidade a domínio e controle, enquanto meninas aprendem a aceitar a submissão como normalidade. O conceito de 'masculinidade tóxica', amplamente discutido nas ciências sociais, ajuda a compreender como essa construção cultural naturaliza agressões verbais, psicológicas e físicas no âmbito doméstico. A consequência é uma sociedade que, muitas vezes, culpabiliza a vítima e protege o agressor.",
      "Ademais, as lacunas na aplicação da Lei Maria da Penha (Lei 11.340/2006) evidenciam a insuficiência da resposta estatal. Apesar de ser considerada pela ONU uma das três melhores legislações do mundo no combate à violência doméstica, sua efetividade é comprometida pela falta de delegacias especializadas, de casas-abrigo e de equipes multidisciplinares de atendimento às vítimas. Em muitos municípios do interior, a mulher agredida sequer tem onde registrar a ocorrência, restando-lhe o silêncio e o medo. Essa precariedade institucional transforma a lei em letra morta.",
      "Diante desse cenário, é urgente que o Governo Federal, por meio do Ministério da Mulher, da Família e dos Direitos Humanos, amplie a rede de Delegacias Especializadas de Atendimento à Mulher (DEAMs), com meta de instalação em todos os municípios com mais de 50 mil habitantes, financiadas por recursos do Fundo Nacional de Segurança Pública. Concomitantemente, deve-se implementar programas de educação para a igualdade de gênero nas escolas, com formação de professores e distribuição de materiais que desconstruam estereótipos machistas, a fim de romper, na base, o ciclo cultural que alimenta a violência contra a mulher."
    ],
    highlights: [
      { paragraph: 0, label: "Repertório literário + dados", tip: "Clarice Lispector + Atlas da Violência: combinação de arte e estatística que dá força à introdução." },
      { paragraph: 1, label: "Conceito sociológico", tip: "'Masculinidade tóxica' como chave analítica — mostra vocabulário das ciências sociais contemporâneas." },
      { paragraph: 2, label: "Análise da Lei Maria da Penha", tip: "Reconhecer a qualidade da lei E apontar falhas na execução é uma estratégia argumentativa madura." },
      { paragraph: 3, label: "Proposta com metas numéricas", tip: "Meta de DEAMs em municípios com 50 mil+ habitantes e fonte de financiamento — proposta objetiva e mensurável." }
    ]
  },
];
