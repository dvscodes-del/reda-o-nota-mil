import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";

const EssayInput = z.object({
  essay: z.string().min(30, "Escreva pelo menos 30 caracteres para a avaliação."),
  targetScore: z.string().optional(),
  college: z.string().optional(),
  course: z.string().optional(),
});

const CompetencyDetailSchema = z.object({
  name: z.string(),
  score: z.number(),
  level: z.number(), // Nível 0 a 5 do INEP
  descriptor: z.string(), // Texto oficial da Matriz de Referência do INEP
  feedback: z.string(), // Parecer técnico personalizado do fiscal
});

const C5ElementSchema = z.object({
  name: z.string(),
  found: z.boolean(),
  detail: z.string(),
});

const CorrectionSchema = z.object({
  score: z.number(),
  competencies: z.array(CompetencyDetailSchema),
  c5Elements: z.array(C5ElementSchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  annotations: z.array(
    z.object({
      excerpt: z.string(),
      suggestion: z.string(),
      type: z.enum(["acerto", "erro"]),
    }),
  ),
});

export type CorrectionResult = z.infer<typeof CorrectionSchema>;

// ─── MATRIZ OFICIAL DE REFERÊNCIA DO ENEM (INEP) ──────────────────────────────
export const INEP_MATRIX: Record<
  string,
  { shortName: string; fullName: string; levels: Record<number, string> }
> = {
  C1: {
    shortName: "Domínio da norma culta",
    fullName: "Demonstrar domínio da modalidade escrita formal da língua portuguesa",
    levels: {
      200: "Demonstra excelente domínio da modalidade escrita formal da língua portuguesa e de escolha de registro, com no máximo dois desvios gramaticais leves isolados.",
      160: "Demonstra bom domínio da modalidade escrita formal da língua portuguesa e de escolha de registro, com poucos desvios gramaticais e de convenções da escrita.",
      120: "Demonstra domínio mediano da modalidade escrita formal da língua portuguesa e de escolha de registro, com alguns desvios gramaticais e de convenções da escrita.",
      80: "Demonstra domínio insuficiente da modalidade escrita formal da língua portuguesa, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.",
      40: "Demonstra domínio precário da modalidade escrita formal da língua portuguesa, com diversidade e frequência de desvios gramaticais e marcas sistemáticas de oralidade.",
      0: "Demonstra desconhecimento da modalidade escrita formal da língua portuguesa.",
    },
  },
  C2: {
    shortName: "Compreensão e repertório",
    fullName: "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa",
    levels: {
      200: "Desenvolve o tema por meio de argumentação consistente, a partir de um repertório sociocultural produtivo e apresenta excelente domínio do texto dissertativo-argumentativo em 4 parágrafos.",
      160: "Desenvolve o tema por meio de argumentação consistente e apresenta bom domínio do texto dissertativo-argumentativo, com repertório sociocultural legitimado e pertinente.",
      120: "Desenvolve o tema por meio de argumentação previsível e apresenta domínio mediano do texto dissertativo-argumentativo, preso ao senso comum ou textos motivadores.",
      80: "Desenvolve o tema recorrendo à cópia de trechos dos textos motivadores ou apresenta domínio insuficiente do texto dissertativo-argumentativo.",
      40: "Apresenta o assunto, tangenciando o tema, ou demonstra domínio precário do texto dissertativo-argumentativo.",
      0: "Fuga ao tema ou não atendimento ao tipo dissertativo-argumentativo.",
    },
  },
  C3: {
    shortName: "Projeto de texto e argumentação",
    fullName: "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista",
    levels: {
      200: "Apresenta informações, fatos e opiniões relacionados ao tema proposto, de forma consistente e organizada, configurando autoria crítica, em defesa de um ponto de vista.",
      160: "Apresenta informações, fatos e opiniões relacionados ao tema, de forma organizada, com indícios de autoria, em defesa de um ponto de vista.",
      120: "Apresenta informações, fatos e opiniões relacionados ao tema, limitados aos argumentos dos textos motivadores e pouco organizados, em defesa de um ponto de vista.",
      80: "Apresenta informações, fatos e opiniões relacionados ao tema, mas desorganizados ou contraditórios, com projeto de texto frágil.",
      40: "Apresenta informações, fatos e opiniões pouco relacionados ao tema ou incoerentes e sem defesa de um ponto de vista.",
      0: "Apresenta informações, fatos e opiniões não relacionados ao tema e sem defesa de um ponto de vista.",
    },
  },
  C4: {
    shortName: "Coesão e conectivos",
    fullName: "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação",
    levels: {
      200: "Articula bem as partes do texto e apresenta repertório diversificado de recursos coesivos, com conectivos inter e intraparágrafos canônicos e sem repetições mecânicas.",
      160: "Articula as partes do texto, com poucas inadequações, e apresenta repertório diversificado de recursos coesivos.",
      120: "Articula as partes do texto, de forma mediana, com inadequações, ou com repertório pouco diversificado de recursos coesivos.",
      80: "Articula as partes do texto, de forma insuficiente, com muitas inadequações e recursos coesivos muito escassos.",
      40: "Articula as partes do texto de forma precária com frases justapostas.",
      0: "Não articula as informações.",
    },
  },
  C5: {
    shortName: "Proposta de intervenção",
    fullName: "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos",
    levels: {
      200: "Elabora muito bem proposta de intervenção completa (5 elementos: Agente, Ação, Meio/Modo, Efeito e Detalhamento), articulada à discussão do texto.",
      160: "Elabora bem proposta de intervenção relacionada ao tema (4 elementos presentes).",
      120: "Elabora proposta de intervenção de forma mediana (3 elementos presentes).",
      80: "Elabora proposta de intervenção incompleta ou insuficiente (2 elementos presentes).",
      40: "Apresenta proposta de intervenção vaga ou precária (1 elemento presente).",
      0: "Não apresenta proposta de intervenção ou desrespeita os direitos humanos.",
    },
  },
};

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

export function extractParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1. Se contiver quebras duplas de linha (\n\n), essa é a intenção explícita de parágrafo
  if (/\n\s*\n/.test(trimmed)) {
    const ps = trimmed.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    if (ps.length >= 2) return ps;
  }

  // 2. Se as linhas contiverem recuos ou iniciais maiúsculas com pontuação final na linha anterior
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 3 && lines.length <= 6) {
    return lines;
  }

  // 3. Agrupamento inteligente para textos colados com quebras no meio das frases
  const blocks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (!current) {
      current = line;
    } else if (current.length > 120 && /[.!?]$/.test(current)) {
      blocks.push(current);
      current = line;
    } else {
      current += " " + line;
    }
  }
  if (current) blocks.push(current);

  return blocks.length >= 2 ? blocks : [trimmed];
}

function excerptAround(text: string, matchIndex: number, matchLen: number, radius = 50): string {
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + matchLen + radius);
  let snippet = text.substring(start, end).trim();
  if (snippet.length > 100) snippet = snippet.substring(0, 100).trimEnd() + "…";
  return snippet;
}

function findLiteralExcerpt(text: string, rgx: RegExp): string | null {
  const m = text.match(rgx);
  if (!m || m.index === undefined) return null;
  return excerptAround(text, m.index, m[0].length);
}

// ─── COMPETÊNCIA 1: NORMA PADRÃO ─────────────────────────────────────────────
// ENEM Real (Matriz de Referência Oficial do INEP):
// Nível 5 (200): Excelente estrutura sintática; no máximo dois desvios leves aceitos.
// Nível 4 (160): Boa estrutura sintática; poucos desvios gramaticais.
// Nível 3 (120): Domínio mediano; alguns desvios gramaticais e de escolha de registro.
// Nível 2 (80):  Domínio insuficiente com muitos desvios.
// Nível 1 (40):  Domínio precário com desvios graves sistemáticos.
// Nível 0 (0):   Texto com menos de 60 palavras ou desconhecimento da norma culta.

function avaliarC1(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
  informalFound: { excerpt: string; fix: string }[];
  syntaxIssues: { excerpt: string; desc: string }[];
} {
  const informalRules = [
    { rgx: /\bpra\b/gi, fix: "para", severity: "leve" },
    { rgx: /\bpro\s/gi, fix: "para o ", severity: "leve" },
    { rgx: /\bné\b/gi, fix: "não é?", severity: "grave" },
    { rgx: /\bhoje em dia\b/gi, fix: "na contemporaneidade / hodiernamente", severity: "leve" },
    { rgx: /\bcoisa\b(?!\s+pública)/gi, fix: "elemento / aspecto / fator", severity: "leve" },
    { rgx: /\btem que\b/gi, fix: "deve / necessita", severity: "leve" },
    { rgx: /\bcara\b/gi, fix: "indivíduo / cidadão", severity: "grave" },
    { rgx: /\ba gente\b/gi, fix: "nós / a população", severity: "grave" },
    { rgx: /\btá\b/gi, fix: "está", severity: "grave" },
    { rgx: /\bpq\b|\bpqs\b/gi, fix: "porque", severity: "grave" },
    { rgx: /\ba nível de\b/gi, fix: "em nível de", severity: "grave" },
    { rgx: /\bpor conta de\b/gi, fix: "em virtude de / devido a", severity: "leve" },
    { rgx: /\bmuito\s+bom\b/gi, fix: "extremamente positivo / notável", severity: "leve" },
    { rgx: /\btipo\s+(assim|um)\b/gi, fix: "como / tal qual", severity: "grave" },
    { rgx: /\bsó\s+que\b/gi, fix: "porém / contudo", severity: "grave" },
    { rgx: /\bdaí\b/gi, fix: "desse modo / então", severity: "grave" },
    { rgx: /\baí\b/gi, fix: "nesse contexto / então", severity: "grave" },
    { rgx: /\bfalar\s+(sobre|de)\b/gi, fix: "discorrer sobre / abordar", severity: "leve" },
  ];

  const syntaxRules = [
    { rgx: /\b(onde)\s+(?!há|se|existe|vivem|estão|residem|moram|ficam)/gi, desc: "Uso de 'onde' para situações abstratas (prefira 'em que' ou 'no qual')", severity: "grave" },
    { rgx: /\bchegar\s+em\b/gi, desc: "Regência do verbo chegar ('chegar ao' em vez de 'chegar em')", severity: "leve" },
    { rgx: /\bassistir\s+o\b/gi, desc: "Regência: 'assistir ao' no sentido de ver/presenciar", severity: "leve" },
    { rgx: /\bvisar\s+[oa]\b/gi, desc: "Regência: 'visar ao' (no sentido de pretender) é a forma padrão", severity: "leve" },
    { rgx: /\bimplicar\s+em\b/gi, desc: "Regência: 'implicar' é transitivo direto (sem 'em')", severity: "leve" },
    { rgx: /\bpreferi[r]?\s+[^a]*?\s+do\s+que\b/gi, desc: "Regência: 'preferir X a Y' (sem 'do que')", severity: "leve" },
    { rgx: /\bfazem\s+\d+\s+(anos?|meses|dias)/gi, desc: "Concordância: 'faz' (impessoal) no sentido de tempo decorrido", severity: "grave" },
    { rgx: /\bhouveram\b/gi, desc: "Concordância: 'houve' (impessoal) não vai para o plural", severity: "grave" },
  ];

  const informalFound: { excerpt: string; fix: string; severity: string }[] = [];
  const syntaxIssues: { excerpt: string; desc: string; severity: string }[] = [];

  for (const rule of informalRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    for (const m of matches) {
      if (m.index !== undefined) {
        informalFound.push({
          excerpt: excerptAround(text, m.index, m[0].length, 25),
          fix: rule.fix,
          severity: rule.severity,
        });
      }
    }
  }

  for (const rule of syntaxRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    for (const m of matches) {
      if (m.index !== undefined) {
        syntaxIssues.push({
          excerpt: excerptAround(text, m.index, m[0].length, 35),
          desc: rule.desc,
          severity: rule.severity,
        });
      }
    }
  }

  // Frases excessivamente longas (>60 palavras sem pontuação)
  const sentences = text.match(/[^.!?;]+[.!?;]+/g) || [];
  const excessiveLong = sentences.filter(s => s.trim().split(/\s+/).length > 60).length;

  const gravesCount = informalFound.filter(f => f.severity === "grave").length + syntaxIssues.filter(s => s.severity === "grave").length;
  const levesCount = informalFound.filter(f => f.severity === "leve").length + syntaxIssues.filter(s => s.severity === "leve").length + excessiveLong;

  let score: number;
  let feedback: string;

  if (wordCount < 60) {
    score = 0;
    feedback = "Texto com extensão insuficiente (menos de 60 palavras) para avaliação do domínio da norma culta formal.";
  } else if (gravesCount >= 5 || (gravesCount >= 3 && levesCount >= 5)) {
    score = 40;
    feedback = "Domínio precário da modalidade escrita formal: presença recorrente de marcas da oralidade e desvios sistemáticos que comprometem a fluidez do texto.";
  } else if (gravesCount >= 3 || levesCount >= 6) {
    score = 80;
    feedback = "Domínio insuficiente da norma culta: diversos desvios gramaticais, de concordância ou escolha lexical informal que demandam revisão geral.";
  } else if (gravesCount >= 2 || levesCount >= 3) {
    score = 120;
    feedback = "Domínio mediano da modalidade escrita formal: o texto é compreensível, mas apresenta desvios pontuais de pontuação, regência ou marcas de oralidade que impedem notas mais altas.";
  } else if (gravesCount === 1 || levesCount >= 1) {
    score = 160;
    feedback = "Bom domínio da modalidade escrita formal da Língua Portuguesa: estrutura sintática bem desenvolvida, com apenas poucos desvios leves isolados.";
  } else {
    score = 200;
    feedback = "Excelente domínio da modalidade escrita formal da Língua Portuguesa: sintaxe madura, vocabulário acadêmico preciso e respeito rigoroso às convenções da norma culta.";
  }

  return {
    score,
    feedback,
    informalFound: informalFound.map(f => ({ excerpt: f.excerpt, fix: f.fix })),
    syntaxIssues: syntaxIssues.map(s => ({ excerpt: s.excerpt, desc: s.desc })),
  };
}

// ─── COMPETÊNCIA 2: REPERTÓRIO E TEMA ────────────────────────────────────────
// ENEM Real (Matriz de Referência Oficial do INEP):
// Nível 5 (200): Desenvolve o tema com argumentação consistente, repertório sociocultural legitimado e produtivo articulado à tese.
// Nível 4 (160): Repertório legitimado e pertinente ao tema, com uso pontual ou bom texto dissertativo reflexivo.
// Nível 3 (120): Aborda o tema com argumentação presa ao senso comum (sem repertório legitimado externo) ou baseada apenas nos textos motivadores.
// Nível 2 (80):  Domínio insuficiente do texto dissertativo ou cópia parcial.
// Nível 1 (40):  Tangenciamento do tema.
// Nível 0 (0):   Fuga total ao tema ou menos de 60 palavras.

function avaliarC2(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
  repertoireFound: { label: string; excerpt: string }[];
} {
  const repRules: { label: string; rgx: RegExp; weight: number }[] = [
    { label: "Filósofo / Sociólogo / Pensador", rgx: /\b(bauman|bourdieu|foucault|habermas|durkheim|marx|gramsci|weber|arendt|beauvoir|sartre|rousseau|locke|hobbes|kant|hegel|nietzsche|marilena\s*chauí|ailton\s*krenak|arist[óo]teles|plat[ãa]o|byung-chul\s*han|paulo\s*freire|darcy\s*ribeiro|milton\s*santos|djamila\s*ribeiro|gilberto\s*freyre|s[ée]rgio\s*buarque|yuval\s*harari|thomas\s*mor[eu]?|maquiavel|descartes)\b/gi, weight: 2 },
    { label: "Literatura / Cultura / Artes", rgx: /\b(machado\s*de\s*assis|clarice\s*lispector|graciliano|carolina\s*maria\s*de\s*jesus|drummond|guimarães\s*rosa|orwell|kafka|vidas\s*secas|quarto\s*de\s*despejo|segundo\s*sexo|capitães\s*da\s*areia|modernismo|romantismo|o\s*cortiço|dom\s*casmurro|1984|admirável\s*mundo\s*novo|utopia|cinemateca|cinema)\b/gi, weight: 2 },
    { label: "Legislação / Direitos Humanos", rgx: /\b(constitui[çc][ãa]o\s*(federal)?\s*(de\s*1988)?|artigo\s*\d+|carta\s*magna|cidad[ãa]os?\s*de\s*papel|declaração\s*universal|direitos\s*humanos|lei\s*n[ºo°]?\s*\d+|estatuto|código\s*(penal|civil|de\s*defesa)|lei\s*maria\s*da\s*penha|marco\s*civil|sus\b|sistema\s*único\s*de\s*saúde|ldb\b|clt\b)\b/gi, weight: 2 },
    { label: "Dados e Autoridades Oficiais", rgx: /\b(ibge|ipea|onu|oms|unicef|unesco|oxfam|fiocruz|inep|dados\s*d[ao]|pesquisa\s*d[ao]|censo\s*demogr[áa]fico|relatório\s*d[ao]|instituto|estudo\s*d[ao]|datafolha|ibope)\b/gi, weight: 2 },
    { label: "Contexto Histórico", rgx: /\b(revolu[çc][ãa]o\s*(industrial|francesa)|iluminismo|ditadura\s*militar|era\s*vargas|período\s*colonial|escravidão|república\s*velha|guerra\s*fria|século\s*(xxi|xx|xix|xviii)|idade\s*média|grécia\s*antiga|roma\s*antiga)\b/gi, weight: 1.5 },
    { label: "Conceito Científico / Teórico", rgx: /\b(violência\s*simbólica|habitus|capital\s*(cultural|social)|panóptico|necropolítica|interseccionalidade|modernidade\s*líquida|cidadania\s*(mutilada|ativa)|banalidade\s*do\s*mal|sociedade\s*do\s*cansaço|invisibilidade\s*social|alienação|anomia)\b/gi, weight: 2 },
  ];

  const found: { label: string; excerpt: string; weight: number }[] = [];
  for (const r of repRules) {
    const m = [...text.matchAll(new RegExp(r.rgx.source, "gi"))];
    if (m.length > 0 && m[0] && m[0].index !== undefined) {
      found.push({
        label: r.label,
        excerpt: excerptAround(text, m[0].index, m[0][0].length, 40),
        weight: r.weight,
      });
    }
  }

  const uniqueCats = new Set(found.map(r => r.label)).size;
  const hasGoodStructure = paragraphs.length >= 3;

  let score: number;
  let feedback: string;

  if (wordCount < 60) {
    score = 0;
    feedback = "Texto com extensão insuficiente (menos de 60 palavras) para avaliação do tema e da tipologia dissertativa.";
  } else if (wordCount < 90 || (!hasGoodStructure && uniqueCats === 0)) {
    score = 40;
    feedback = "Tangenciamento temático ou estrutura precária: texto muito curto que não desenvolve tese dissertativa.";
  } else if (uniqueCats === 0 && !hasGoodStructure) {
    score = 80;
    feedback = "Desenvolvimento temático insuficiente: sem repertório sociocultural externo e com estrutura que demanda divisão em introdução, desenvolvimentos e conclusão.";
  } else if (uniqueCats === 0) {
    // Sem repertório nominal, mas com texto estruturado em introdução/desenvolvimento/conclusão
    if (wordCount >= 220) {
      score = 160;
      feedback = "Boa abordagem da proposta dissertativa-argumentativa, apresentando reflexão consistente sobre o tema. Para garantir os 200 pontos com os fiscais, insira ao menos um repertório externo legitimado (filosofia, sociologia, dados estatísticos ou leis).";
    } else {
      score = 120;
      feedback = "Compreensão adequada da proposta e da estrutura dissertativa, porém a argumentação permanece restrita ao senso comum. Enriqueça seu texto citando pensadores, leis ou dados oficiais.";
    }
  } else if (uniqueCats === 1) {
    if (wordCount >= 200 && hasGoodStructure) {
      score = 200;
      feedback = `Excelente domínio temático e repertório sociocultural legitimado (${found[0]?.label}), articulado de forma produtiva em defesa do ponto de vista dissertativo.`;
    } else {
      score = 160;
      feedback = `Bom uso de repertório sociocultural legitimado (${found[0]?.label}). Para atingir a nota 200 com segurança, aprofunde a articulação entre esse repertório e a sua tese central.`;
    }
  } else {
    // 2 ou mais repertórios legítimos
    score = 200;
    feedback = `Excelente domínio temático e repertório sociocultural diversificado (${found.map(f => f.label).slice(0, 2).join(", ")}), mobilizado de modo produtivo na argumentação.`;
  }

  return {
    score,
    feedback,
    repertoireFound: found.map(f => ({ label: f.label, excerpt: f.excerpt })),
  };
}

// ─── COMPETÊNCIA 3: PROJETO DE TEXTO E ARGUMENTAÇÃO ──────────────────────────
// ENEM Real (Matriz de Referência Oficial do INEP):
// Nível 5 (200): Projeto de texto estratégico consistente, sem lacunas argumentativas e com autoria crítica.
// Nível 4 (160): Projeto de texto evidente com poucas falhas de desdobramento.
// Nível 3 (120): Argumentação previsível ou predominantemente expositiva.
// Nível 2 (80):  Projeto de texto frágil com muitas lacunas ou contradições.
// Nível 1 (40):  Ideias desconexas sem defesa clara de ponto de vista.
// Nível 0 (0):   Texto desconexo ou sem relação de causa e efeito.

function avaliarC3(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
} {
  const logicalOps = [
    /\bvisto que\b/i, /\bpois\b/i, /\bporque\b/i, /\buma vez que\b/i,
    /\bem virtude de\b/i, /\bhaja vista\b/i, /\bpor conseguinte\b/i,
    /\bdessa forma\b/i, /\bdesse modo\b/i, /\bnesse sentido\b/i,
    /\bcom efeito\b/i, /\bembora\b/i, /\bapesar de\b/i, /\bcontudo\b/i,
    /\btodavia\b/i, /\bno entanto\b/i, /\bportanto\b/i, /\blogo\b/i,
    /\bassim\b/i, /\bconsequentemente\b/i, /\bsob essa ótica\b/i,
    /\bnesse cenário\b/i, /\bpor outro lado\b/i, /\bposto que\b/i,
    /\bdiante disso\b/i, /\bnessa perspectiva\b/i, /\bnesse contexto\b/i,
    /\bde modo que\b/i, /\bem contrapartida\b/i, /\bvale destacar\b/i,
  ];

  const opsCount = logicalOps.filter(r => r.test(text)).length;
  const hasGoodStructure = paragraphs.length >= 3;

  let score: number;
  let feedback: string;

  if (wordCount < 80 || paragraphs.length < 2) {
    score = 40;
    feedback = "Argumentação incipiente, sem projeto de texto delimitado ou sustentação suficiente de um ponto de vista em defesa de uma tese.";
  } else if (opsCount < 2 && !hasGoodStructure) {
    score = 80;
    feedback = "Projeto de texto com fragilidades estruturais: faltam operadores argumentativos para articular as causas e consequências do problema.";
  } else if (opsCount < 2 || wordCount < 160) {
    score = 120;
    feedback = "Projeto de texto presente, porém com argumentação previsível ou predominantemente expositiva. Aprofunde o porquê dos problemas levantados com maior criticidade e defesa autoral.";
  } else if (opsCount >= 4 && hasGoodStructure && wordCount >= 220) {
    score = 200;
    feedback = "Projeto de texto estratégico e consistente: há progressão temática bem delineada da introdução à conclusão, com defesa convincente, autoral e crítica do ponto de vista.";
  } else {
    score = 160;
    feedback = "Bom projeto de texto, com desenvolvimento coerente das ideias e defesa nítida da tese. Para alcançar a nota máxima de 200 com a banca, aprofunde ainda mais a relação de causa e efeito nos desenvolvimentos.";
  }

  return { score, feedback };
}

// ─── COMPETÊNCIA 4: COESÃO TEXTUAL ───────────────────────────────────────────
// ENEM Real (Matriz de Referência Oficial do INEP):
// Nível 5 (200): Articula expressivamente as partes do texto com conectivos inter e intraparágrafos sem repetições mecânicas.
// Nível 4 (160): Conectivos interparágrafos presentes e coesão intraparágrafo satisfatória.
// Nível 3 (120): Coesão mediana; repetições lexicais evidentes ou conectivos interparágrafos insuficientes.
// Nível 2 (80):  Coesão insuficiente com carência de recursos conectivos.
// Nível 1 (40):  Presença quase nula de articulação coesiva entre frases e parágrafos.
// Nível 0 (0):   Texto com frases soltas e sem conexão gramatical.

function avaliarC4(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
} {
  const interParagraphConnectors = [
    /^(em primeiro lugar|primeiramente|a princípio|de início|em uma primeira análise|a priori|sob essa perspectiva|sob esse prisma|em um primeiro momento|de fato)/i,
    /^(em segundo lugar|ademais|outrossim|além disso|por outro lado|paralelamente|somado a isso|a posteriori|sob outro prisma|além do mais|em contrapartida|vale ressaltar)/i,
    /^(portanto|diante disso|diante do exposto|infere-se|conclui-se|logo|em suma|desse modo|torna-se evidente|dessa forma|assim|urge portanto)/i,
  ];

  let interMatches = 0;
  for (let i = 1; i < paragraphs.length; i++) {
    const p = (paragraphs[i] || "").trim();
    if (interParagraphConnectors.some(rgx => rgx.test(p))) {
      interMatches++;
    }
  }

  const intraConnectorsList = [
    "além disso", "no entanto", "todavia", "contudo", "porém", "entretanto",
    "visto que", "desse modo", "nesse sentido", "por conseguinte", "dessa forma",
    "isto é", "vale ressaltar", "com efeito", "haja vista", "consequentemente",
    "assim", "portanto", "logo", "embora", "apesar de", "posto que", "ainda que",
    "de modo que", "com o intuito de", "a fim de", "por meio de", "sob essa ótica",
    "nesse cenário", "nessa perspectiva", "diante disso", "em virtude de", "uma vez que",
    "haja vista que", "nesse contexto", "por outro lado", "em contrapartida"
  ];
  const intraRgx = new RegExp(`\\b(${intraConnectorsList.join("|")})\\b`, "gi");
  const intraCount = (text.match(intraRgx) || []).length;

  let score: number;
  let feedback: string;

  if (wordCount < 80) {
    score = 40;
    feedback = "Texto com extensão reduzida para demonstrar repertório variado de recursos coesivos.";
  } else if (interMatches === 0 && intraCount < 2) {
    score = 80;
    feedback = "Recursos coesivos muito escassos: as ideias aparecem desconectadas. Inicie os parágrafos de desenvolvimento e conclusão com conectivos lógicos e variados.";
  } else if (interMatches === 0 && intraCount < 4) {
    score = 120;
    feedback = "Coesão mediana: o texto utiliza conectivos pontuais, mas carece de conectivos interparágrafos nas transições para garantir ritmo fluido à leitura.";
  } else if (interMatches >= 1 && intraCount >= 3 && paragraphs.length >= 3) {
    score = (interMatches >= 2 && intraCount >= 4) ? 200 : 160;
    feedback = (score === 200)
      ? "Excelente domínio dos mecanismos coesivos: presença de conectivos interparágrafos canônicos, diversidade de enlaces no interior dos períodos e leitura fluida."
      : "Boa articulação textual, com conectivos bem posicionados e transições adequadas entre as partes do texto.";
  } else {
    score = 160;
    feedback = "Boa articulação textual, com conectivos bem posicionados e transições adequadas entre as partes do texto. Amplie a variedade de operadores intraparágrafos para nota máxima.";
  }

  return { score, feedback };
}

// ─── COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO ──────────────────────────────────
// ENEM Real (Matriz de Referência Oficial do INEP):
// Cada um dos 5 elementos pontua exatamente 40 pontos na régua oficial:
// 1. Agente (quem executa a ação)
// 2. Ação (o que deve ser feito)
// 3. Meio / Modo (como a ação será realizada - instrumentos, parcerias, projetos)
// 4. Efeito / Finalidade (para que a ação é feita - objetivo social)
// 5. Detalhamento (explicação, exemplificação ou justificativa de um dos 4 elementos anteriores)
//
// 5 elementos = 200 | 4 elementos = 160 | 3 elementos = 120 | 2 elementos = 80 | 1 elemento = 40 | 0 = 0

function avaliarC5(text: string, paragraphs: string[]): {
  score: number;
  feedback: string;
  elements: { name: string; found: boolean; detail: string }[];
} {
  // Para robustez máxima: examina tanto o último parágrafo quanto as últimas 90 palavras do texto inteiro
  const lastParagraph = paragraphs[paragraphs.length - 1] || text;
  const words = text.split(/\s+/).filter(Boolean);
  const tailWords = words.slice(Math.max(0, words.length - 90)).join(" ");
  const targetArea = (lastParagraph.length >= 80) ? lastParagraph : `${tailWords} ${lastParagraph}`;

  const hasAgent = /\b(governo|minist[ée]rio|secretaria|poder\s*p[úu]blico|estado|escola|universidade|ong|fam[íi]lia|m[íi]dia|sociedade|cabe\s*(ao|à|aos|às)|compete\s*(ao|à|aos|às)|instituiç[õo]es|tribunal|cidad[ãa]os|setor\s*privado)\b/i.test(targetArea);
  const hasAction = /\b(deve[m]?\s+(criar|elaborar|implementar|promover|garantir|assegurar|fiscalizar|combater|fomentar|investir|articular|desenvolver|atuar|viabilizar)|cabe\s+(ao|à|aos|às).*?(criar|implementar|promover|agir|viabilizar)|é\s*(necessário|fundamental|urgente|preciso|imperativo)|precisa|urge)\b/i.test(targetArea);
  const hasMeans = /\b(por\s*meio\s*de|mediante|atrav[ée]s\s*de|em\s*parceria\s*com|em\s*conjunto\s*com|por\s*interm[ée]dio\s*de|campanhas?|programas?|oficinas?|palestras?|legislação|projeto\s*de\s*lei|com\s*o\s*auxílio|a\s*partir\s*de|com\s*a\s*criação)\b/i.test(targetArea);
  const hasEffect = /\b(a\s*fim\s*de|com\s*o\s*(intuito|objetivo|propósito|fito)\s*de|visando\s*a|para\s*(que\s*)?(se\s*)?(garanta|assegure|combata|mitigue|reduza|elimine|melhore|transforme)|de\s*modo\s*a|com\s*vistas\s*a)\b/i.test(targetArea);
  
  // Detalhamento do INEP:
  // Aposto explicativo entre vírgulas ou travessões (ex: "órgão responsável por..."),
  // exemplificação explícita ("como...", "a exemplo de...", "em especial...", "tais como..."),
  // ou especificação qualificada do meio/agente.
  const hasDetailing = /\b(especificamente|em\s*especial|voltad[ao]s?\s*(a|ao|para)|destinad[ao]s?\s*(a|ao|para)|–[^-]+–|,\s*(?:órgão|entidade|responsável|instituição|com\s*o\s*foco|por\s*exemplo|a\s*exemplo\s*de|tais\s*como)[^,.]+,?)/i.test(targetArea) ||
    /(\bpor\s*meio\s*de\b[^.!?]{20,}\b(com|contando|aliando|envolvendo)\b[^.!?]{10,})/i.test(targetArea);

  const elements = [
    { name: "Agente", found: hasAgent, detail: "quem executará a intervenção (ex: Ministério da Educação, Governo Federal)" },
    { name: "Ação", found: hasAction, detail: "o que será feito concretamente (ex: 'deve implementar', 'cabe fiscalizar')" },
    { name: "Meio/Modo", found: hasMeans, detail: "como a ação será realizada (ex: 'por meio de oficinas escolares', 'mediante parcerias')" },
    { name: "Finalidade/Efeito", found: hasEffect, detail: "qual o objetivo ou impacto social esperado (ex: 'a fim de combater a exclusão')" },
    { name: "Detalhamento", found: hasDetailing, detail: "especificação de um dos elementos (ex: explicando o papel do agente ou como as ações ocorrerão)" },
  ];

  const foundCount = elements.filter(e => e.found).length;
  const missingElements = elements.filter(e => !e.found);

  let score = foundCount * 40;
  if (paragraphs.length < 2 && foundCount > 2) {
    score = Math.min(score, 120);
  }

  let feedback: string;
  if (foundCount === 5) {
    score = 200;
    feedback = "Proposta de intervenção completa e exemplar (5/5 elementos): agente, ação, meio/modo, finalidade e detalhamento estão contemplados e articulados de forma viável à discussão.";
  } else if (foundCount === 4) {
    score = 160;
    feedback = `Proposta de intervenção bem estruturada (4/5 elementos presentes). Para alcançar os 200 pontos com a banca, adicione o elemento ausente: ${missingElements[0]?.name} (${missingElements[0]?.detail}).`;
  } else if (foundCount === 3) {
    score = 120;
    feedback = `Proposta de intervenção satisfatória (3/5 elementos identificados). Elementos em falta: ${missingElements.map(e => e.name).join(" e ")}. Encorpore a proposta especificando a forma de realização e o objetivo social claro.`;
  } else if (foundCount === 2) {
    score = 80;
    feedback = "Proposta de intervenção incompleta (2/5 elementos). Desenvolva melhor a solução indicando expressamente quem fará, o que fará, por qual meio e com qual finalidade.";
  } else if (foundCount === 1) {
    score = 40;
    feedback = "Proposta de intervenção incipiente: apenas um elemento identificado. Formule uma proposta articulada com agente e ação concreta.";
  } else {
    score = 0;
    feedback = "Ausência de proposta de intervenção social. O parágrafo conclusivo do texto dissertativo do ENEM deve apresentar proposta para o problema abordado.";
  }

  return { score, feedback, elements };
}

// ─── EXERCÍCIO DE COMPETÊNCIA INDIVIDUAL ─────────────────────────────────────

const CompetencyExerciseInput = z.object({
  competencyCode: z.enum(["C1", "C2", "C3", "C4", "C5"]),
  sectionId: z.enum(["intro", "des1", "des2", "conc"]),
  topic: z.string(),
  exerciseText: z.string().min(15, "Escreva pelo menos 15 caracteres para avaliação."),
});

const CompetencyExerciseResultSchema = z.object({
  score: z.number(),
  status: z.enum(["excelente", "bom", "regular", "insuficiente"]),
  feedback: z.string(),
  strengths: z.array(z.string()),
  tips: z.array(z.string()),
});

export type CompetencyExerciseResult = z.infer<typeof CompetencyExerciseResultSchema>;

export function evaluateCompetencyHeuristically(
  comp: "C1" | "C2" | "C3" | "C4" | "C5",
  section: "intro" | "des1" | "des2" | "conc",
  topic: string,
  text: string,
): CompetencyExerciseResult {
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  if (words < 8) {
    return {
      score: 40,
      status: "insuficiente",
      feedback: "Trecho muito curto para demonstrar a competência exigida. Desenvolva sua resposta com pelo menos duas ou três orações completas.",
      strengths: ["Iniciativa de resposta."],
      tips: ["Escreva um parágrafo mais elaborado articulando suas ideias ao tema."],
    };
  }

  if (comp === "C1") {
    const r1 = avaliarC1(text, [text], words);
    const score = Math.max(40, r1.score);
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    const strengths: string[] = [];
    const tips: string[] = [];

    if (r1.informalFound.length === 0) {
      strengths.push("Bom registro formal, sem marcas evidentes de oralidade.");
    }
    if (r1.syntaxIssues.length === 0) {
      strengths.push("Estrutura sintática adequada, respeitando a regência e concordância padrão.");
    }
    if (r1.informalFound.length > 0 && r1.informalFound[0]) {
      tips.push(`Evite termos coloquiais: substitua "${r1.informalFound[0].excerpt}" por termos mais formais.`);
    }
    if (tips.length === 0) {
      tips.push("Mantenha o foco na pontuação precisa entre orações subordinadas e uso da crase.");
    }

    return {
      score,
      status,
      feedback: r1.feedback,
      strengths: strengths.length > 0 ? strengths : ["Texto compreensível."],
      tips,
    };
  }

  if (comp === "C2") {
    const r2 = avaliarC2(text, [text], words);
    const hasNominal = r2.repertoireFound.length > 0;
    const score = hasNominal ? 200 : words >= 35 ? 160 : 120;
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    const strengths: string[] = [];
    const tips: string[] = [];

    if (hasNominal && r2.repertoireFound[0]) {
      strengths.push(`Repertório legitimado identificado com sucesso: ${r2.repertoireFound[0].label}.`);
      strengths.push("Boa aplicação do repertório em diálogo com a proposta.");
      tips.push("Lembre-se sempre de interpretar o repertório, amarrando-o diretamente à sua tese.");
    } else {
      strengths.push("Desenvolvimento coerente da ideia em relação ao tema.");
      tips.push("Para nota máxima em C2, mencione explicitamente uma lei (Constituição de 1988), pensador (filósofo/sociólogo) ou autoridade estatística (IBGE).");
    }

    return {
      score,
      status,
      feedback: hasNominal && r2.repertoireFound[0]
        ? `Excelente aplicação de repertório sociocultural legitimado (${r2.repertoireFound[0].label}) voltado ao tema!`
        : "Bom desenvolvimento da ideia, porém o repertório ainda permanece restrito ao senso comum. Adicione uma autoridade externa.",
      strengths,
      tips,
    };
  }

  if (comp === "C3") {
    const r3 = avaliarC3(text, [text], words);
    const score = words >= 40 && r3.score >= 120 ? 160 : words >= 25 ? 120 : 80;
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    const strengths: string[] = [];
    const tips: string[] = [];

    if (/\b(tese|porque|visto que|desse modo|haja vista|portanto|além disso)\b/i.test(text)) {
      strengths.push("Presença de conectivos que evidenciam relação de causa e consequência.");
    }
    strengths.push("Ponto de vista direcionado à problemática proposta.");
    tips.push("Verticalize os argumentos: mostre claramente o PORQUÊ do problema e qual seu impacto na sociedade.");

    return {
      score,
      status,
      feedback: score >= 160
        ? "Excelente direcionamento argumentativo com defesa nítida de ponto de vista e causalidade!"
        : "Argumentação compreensível, mas com potencial de maior criticidade e aprofundamento das causas.",
      strengths,
      tips,
    };
  }

  if (comp === "C4") {
    const r4 = avaliarC4(text, [text], words);
    const hasConns = /\b(portanto|ademais|além disso|nesse sentido|sob essa ótica|visto que|contudo|entretanto|desse modo|diante disso)\b/i.test(text);
    const score = hasConns && words >= 25 ? 200 : hasConns ? 160 : words >= 20 ? 120 : 80;
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";

    return {
      score,
      status,
      feedback: hasConns
        ? "Ótimo emprego de operadores coesivos para articular os períodos com fluidez e elegância!"
        : "O texto necessita de operadores coesivos explícitos (ex.: 'Nesse contexto', 'Ademais', 'Por conseguinte') para conectar as orações.",
      strengths: hasConns
        ? ["Emprego funcional de conectivos interperíodos.", "Boa transição de ideias."]
        : ["Estrutura frasal compreensível."],
      tips: hasConns
        ? ["Continue variando os conectivos para não repeti-los ao longo de toda a redação."]
        : ["Inicie seus períodos com conectivos variados como 'Sob essa perspectiva' ou 'Ademais'."],
    };
  }

  // C5 (Intervenção)
  const r5 = avaliarC5(text, [text]);
  const foundCount = r5.elements.filter(e => e.found).length;
  const score = Math.max(40, foundCount * 40);
  const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
  const missing = r5.elements.filter(e => !e.found).map(e => e.name);

  return {
    score,
    status,
    feedback: foundCount >= 4
      ? `Proposta de intervenção de alto nível (${foundCount}/5 elementos contemplados)!`
      : `Proposta identificou ${foundCount}/5 elementos. Elementos faltantes: ${missing.join(", ")}.`,
    strengths: r5.elements.filter(e => e.found).map(e => `Elemento identificado com sucesso: ${e.name}.`),
    tips: missing.length > 0
      ? [`Adicione explicitamente: ${missing.join(", ")} para alcançar a nota 200 na C5.`]
      : ["Proposta completa! Garanta que ela esteja sempre articulada aos argumentos levantados no desenvolvimento."],
  };
}

export const evaluateCompetencyExercise = createServerFn({ method: "POST" })
  .validator((input: unknown) => CompetencyExerciseInput.parse(input))
  .handler(async ({ data }) => {
    return evaluateCompetencyHeuristically(
      data.competencyCode,
      data.sectionId,
      data.topic,
      data.exerciseText,
    );
  });


// ─── MOTOR PRINCIPAL ENCORAJADOR E JUSTO ──────────────────────────────────────

export function evaluateEssayHeuristically(
  essayText: string,
  context?: { targetScore?: string; college?: string; course?: string },
): CorrectionResult {
  const text = essayText.trim();
  const paragraphs = extractParagraphs(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const r1 = avaliarC1(text, paragraphs, wordCount);
  const r2 = avaliarC2(text, paragraphs, wordCount);
  const r3 = avaliarC3(text, paragraphs, wordCount);
  const r4 = avaliarC4(text, paragraphs, wordCount);
  const r5 = avaliarC5(text, paragraphs);

  const totalScore = r1.score + r2.score + r3.score + r4.score + r5.score;

  // ── Forças ──
  const strengths: string[] = [];
  if (r1.score >= 160) strengths.push("Excelente clareza formal e vocabulário alinhado às expectativas da banca do ENEM.");
  if (r2.score >= 160) strengths.push("Uso consciente e produtivo de repertório sociocultural para fundamentar a reflexão.");
  if (r3.score >= 160) strengths.push("Projeto de texto coerente com divisão equilibrada de ideias entre introdução, desenvolvimentos e conclusão.");
  if (r4.score >= 160) strengths.push("Emprego assertivo de conectivos interparágrafos, conferindo bom ritmo e coesão à leitura.");
  if (r5.score >= 160) strengths.push("Proposta de intervenção propositiva e bem articulada, contemplando a maioria dos elementos exigidos.");
  if (strengths.length < 2) strengths.push("Esforço evidente de estruturação dissertativa e engajamento com a temática proposta.");

  // ── Melhorias prioritárias ──
  const improvements: string[] = [];
  if (r5.score < 200) {
    const missing = r5.elements.filter(e => !e.found).map(e => e.name);
    improvements.push(`Na Competência 5, complete todos os 5 elementos da proposta de intervenção (falta: ${missing.join(", ")}).`);
  }
  if (r2.score < 200) {
    improvements.push("Na Competência 2, reforce a fundamentação citando filósofos, sociólogos, dados do IBGE ou a Constituição de 1988.");
  }
  if (r4.score < 200) {
    improvements.push("Na Competência 4, comece todos os parágrafos de desenvolvimento e conclusão com conectivos (ex: 'Em primeiro lugar', 'Ademais', 'Portanto').");
  }
  if (r3.score < 200) {
    improvements.push("Na Competência 3, aprofunde a relação de causa e efeito nos desenvolvimentos para evitar passagens expositivas.");
  }
  if (r1.score < 200) {
    improvements.push("Na Competência 1, atente-se a expressões coloquiais para garantir um registro estritamente formal.");
  }
  if (improvements.length < 2) {
    improvements.push(`Para manter seu ritmo rumo aos 1000 pontos em ${context?.course || "seu curso"}, continue praticando semanalmente.`);
  }

  // ── Anotações literais no texto ──
  const annotations: { excerpt: string; suggestion: string; type: "acerto" | "erro" }[] = [];

  // Acerto de conectivo conclusivo
  const concConn = findLiteralExcerpt(paragraphs[paragraphs.length - 1] || text, /^(portanto|diante disso|diante do exposto|em suma|infere-se)/i);
  if (concConn) {
    annotations.push({
      excerpt: concConn,
      suggestion: "Ótimo uso de conectivo conclusivo para abrir a proposta de intervenção (Competência 4).",
      type: "acerto",
    });
  }

  // Acerto de repertório
  if (r2.repertoireFound.length > 0 && r2.repertoireFound[0]) {
    annotations.push({
      excerpt: r2.repertoireFound[0].excerpt,
      suggestion: `${r2.repertoireFound[0].label}: repertório pertinente que enriquece a fundamentação da tese (Competência 2).`,
      type: "acerto",
    });
  }

  // Acerto de conectivo em D2
  if (paragraphs.length >= 3) {
    const d2Conn = findLiteralExcerpt(paragraphs[2] || "", /^(ademais|outrossim|além disso|por outro lado|em segundo lugar)/i);
    if (d2Conn) {
      annotations.push({
        excerpt: d2Conn,
        suggestion: "Conector interparágrafo bem posicionado, reforçando a continuidade textual (Competência 4).",
        type: "acerto",
      });
    }
  }

  // Erro de termo informal
  if (r1.informalFound.length > 0 && r1.informalFound[0]) {
    annotations.push({
      excerpt: r1.informalFound[0].excerpt,
      suggestion: `Substitua a expressão informal por uma opção mais adequada à norma padrão, como "${r1.informalFound[0].fix}" (Competência 1).`,
      type: "erro",
    });
  }

  // Erro de proposta incompleta
  const missingEl = r5.elements.find(e => !e.found);
  if (missingEl && r5.score < 200) {
    const lastP = paragraphs[paragraphs.length - 1] || "";
    const phrase = lastP.match(/^[^.!?]{15,70}/);
    if (phrase && text.includes(phrase[0].trim())) {
      annotations.push({
        excerpt: phrase[0].trim(),
        suggestion: `Sua intervenção pode alcançar a pontuação máxima se adicionar explicitamente "${missingEl.name}" (${missingEl.detail}).`,
        type: "erro",
      });
    }
  }

  const buildCompetency = (id: "C1" | "C2" | "C3" | "C4" | "C5", score: number, technicalFeedback: string) => {
    const meta = INEP_MATRIX[id];
    const level = Math.max(0, Math.min(5, Math.round(score / 40)));
    const descriptor = (meta && meta.levels[score]) || (meta && meta.levels[0]) || "";
    return {
      name: `${id} · ${meta ? meta.shortName : ""}`,
      score,
      level,
      descriptor,
      feedback: technicalFeedback,
    };
  };

  return CorrectionSchema.parse({
    score: totalScore,
    competencies: [
      buildCompetency("C1", r1.score, r1.feedback),
      buildCompetency("C2", r2.score, r2.feedback),
      buildCompetency("C3", r3.score, r3.feedback),
      buildCompetency("C4", r4.score, r4.feedback),
      buildCompetency("C5", r5.score, r5.feedback),
    ],
    c5Elements: r5.elements,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    annotations: annotations.filter(a => a.excerpt.length >= 4).slice(0, 5),
  });
}

// ─── SERVER FUNCTION ──────────────────────────────────────────────────────────

export const correctEssay = createServerFn({ method: "POST" })
  .validator((input: unknown) => EssayInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || process.env["LOVABLE_API_KEY"];

    // Se houver chave válida do Google Gemini (formato AIzaSy...), usa IA generativa
    if (apiKey && !apiKey.startsWith("AQ.")) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });

        const goalContext =
          data.course && data.college
            ? `O candidato pretende ingressar em ${data.course} na instituição ${data.college}, com meta de atingir ${data.targetScore || 900} pontos no ENEM.`
            : `O candidato tem como objetivo alcançar ${data.targetScore || 900} pontos no ENEM.`;

        const result = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: CorrectionSchema,
          prompt: `Você é um avaliador oficial da banca examinadora de redação do ENEM (INEP).
Aplique estritamente a Matriz Oficial de Referência para Correção da Redação do ENEM. ${goalContext}

COMPETÊNCIAS OFICIAIS DO INEP (Pontuação por níveis: 0, 40, 80, 120, 160 ou 200 pontos):
1. Competência 1: Demonstrar domínio da modalidade escrita formal da língua portuguesa.
   - Nível 5 (200): Excelente estrutura sintática e no máximo dois desvios leves tolerados.
   - Nível 4 (160): Boa estrutura sintática e poucos desvios gramaticais.
   - Nível 3 (120): Domínio mediano da modalidade escrita formal.
   - Nível 2 (80): Domínio insuficiente, com muitos desvios.
   - Nível 1 (40): Domínio precário da norma culta.
   - Nível 0 (0): Desconhecimento da norma culta formal.

2. Competência 2: Compreender a proposta e aplicar conceitos das várias áreas do conhecimento em texto dissertativo-argumentativo em prosa.
   - Nível 5 (200): Repertório sociocultural legitimado, pertinente e com uso produtivo articulado à tese em 4 parágrafos.
   - Nível 4 (160): Repertório legitimado e pertinente, mas com uso pontual / pouco produtivo.
   - Nível 3 (120): Abordagem completa porém presa ao senso comum (sem repertório legitimado externo).
   - Nível 2 (80): Cópia dos motivadores ou estrutura insuficiente.
   - Nível 1 (40): Tangenciamento do tema.
   - Nível 0 (0): Fuga total ao tema ou tipo textual não dissertativo.

3. Competência 3: Selecionar, relacionar, organizar e interpretar informações em defesa de um ponto de vista.
   - Nível 5 (200): Projeto de texto consistente, sem lacunas argumentativas e com autoria crítica.
   - Nível 4 (160): Projeto de texto com poucas falhas de desdobramento.
   - Nível 3 (120): Argumentação previsível ou predominantemente expositiva.
   - Nível 2 (80): Projeto de texto frágil com muitas lacunas ou contradições.

4. Competência 4: Demonstrar conhecimento dos mecanismos linguísticos para construção da argumentação.
   - Nível 5 (200): Conectivos interparágrafos canônicos em ao menos duas transições e ampla diversidade de conectivos intraparágrafos sem repetições mecânicas.
   - Nível 4 (160): Conectivos interparágrafos presentes e coesão intraparágrafo satisfatória.
   - Nível 3 (120): Ausência de interparágrafos ou repetições vocabulares evidentes.
   - Nível 2 (80): Coesão precária com períodos justapostos.

5. Competência 5: Proposta de intervenção social respeitando os direitos humanos (40 pontos por elemento):
   - 5 elementos válidos (Agente, Ação, Meio/Modo, Efeito e Detalhamento) = 200 (Nível 5)
   - 4 elementos = 160 (Nível 4)
   - 3 elementos = 120 (Nível 3)
   - 2 elementos = 80 (Nível 2)
   - 1 elemento = 40 (Nível 1)
   - 0 elementos = 0 (Nível 0)

Preencha rigorosamente os campos 'score', 'level' (0 a 5), 'descriptor' (o texto oficial da matriz do INEP) e 'feedback' (seu parecer técnico fundamentado de fiscal do ENEM) para cada uma das 5 competências. Indique no 'c5Elements' cada um dos 5 elementos da intervenção.

TEXTO DO PARTICIPANTE:
${data.essay}`,
        });

        if (result?.object) return result.object;
      } catch (err: unknown) {
        console.warn("[correctEssay] Gemini API indisponível. Usando motor oficial ENEM calibrado:", err instanceof Error ? err.message : err);
      }
    }

    // Motor pedagógico ENEM calibrado
    return evaluateEssayHeuristically(data.essay, {
      ...(data.course ? { course: data.course } : {}),
      ...(data.college ? { college: data.college } : {}),
      ...(data.targetScore ? { targetScore: data.targetScore } : {}),
    });
  });
