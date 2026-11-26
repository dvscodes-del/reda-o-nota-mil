import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import {
  analyzeAiAuthorship,
  mergeServerAiAssessment,
  type AiDetectionReport,
  type WritingTelemetry,
} from "./ai-detector";

const WritingTelemetrySchema = z.object({
  pasteAttempts: z.number(),
  pastedChars: z.number(),
  largeInsertChars: z.number(),
  typedChars: z.number(),
  backspaces: z.number(),
  tabSwitches: z.number(),
  startedAt: z.number().nullable(),
  submittedAt: z.number().optional(),
});

const EssayInput = z.object({
  essay: z.string().min(30, "Escreva pelo menos 30 caracteres para a avaliação."),
  topic: z.string().optional(),
  themeHint: z.string().optional(),
  targetScore: z.string().optional(),
  college: z.string().optional(),
  course: z.string().optional(),
  telemetry: WritingTelemetrySchema.optional(),
});

const CompetencyDetailSchema = z.object({
  name: z.string(),
  score: z.number(),
  level: z.number(), // Nível 0 a 5 do INEP
  descriptor: z.string(), // Texto oficial da Matriz de Referência do INEP
  feedback: z.string(), // Parecer técnico personalizado do avaliador
  nextStep: z.string().optional(), // Ação concreta para subir +40 pontos
});

const C5ElementSchema = z.object({
  name: z.string(),
  found: z.boolean(),
  detail: z.string(),
  evidence: z.string().optional(), // Trecho real identificado no texto do aluno
});

const ParagraphFeedbackSchema = z.object({
  index: z.number(),
  role: z.string(),
  status: z.enum(["forte", "atencao", "incompleto"]),
  wordCount: z.number(),
  comment: z.string(),
});

const TopicAdherenceSchema = z.object({
  status: z.enum(["completo", "parcial", "tangenciamento", "fuga"]),
  matchedKeywords: z.array(z.string()),
  comment: z.string(),
});

const TextMetricsSchema = z.object({
  wordCount: z.number(),
  estimatedLines: z.number(),
  paragraphCount: z.number(),
  sentenceCount: z.number(),
  avgWordsPerSentence: z.number(),
  repeatedWords: z.array(
    z.object({
      word: z.string(),
      count: z.number(),
    }),
  ),
});

const AiDetectionSignalSchema = z.object({
  label: z.string(),
  severity: z.enum(["alto", "medio", "baixo"]),
  detail: z.string(),
});

const AiDetectionSchema = z.object({
  aiProbability: z.number(),
  verdict: z.enum(["humano", "suspeito", "provavel_ia"]),
  blocked: z.boolean(),
  summary: z.string(),
  signals: z.array(AiDetectionSignalSchema),
  flaggedExcerpts: z.array(z.string()),
  telemetrySummary: z
    .object({
      pasteAttempts: z.number(),
      largeInsertPercent: z.number(),
      writingSeconds: z.number(),
      wordsPerMinute: z.number(),
    })
    .optional(),
});

const AnnotationSchema = z.object({
  excerpt: z.string(),
  suggestion: z.string(),
  type: z.enum(["acerto", "erro"]),
  competency: z.enum(["C1", "C2", "C3", "C4", "C5"]).optional(),
  rewrite: z.string().optional(),
});

const CorrectionSchema = z.object({
  score: z.number(),
  overallSummary: z.string().optional(),
  zeroReason: z.string().optional(),
  evaluationMode: z.enum(["gemini", "oficial_calibrado"]).optional(),
  topicAdherence: TopicAdherenceSchema.optional(),
  textMetrics: TextMetricsSchema.optional(),
  paragraphFeedback: z.array(ParagraphFeedbackSchema).optional(),
  competencies: z.array(CompetencyDetailSchema),
  c5Elements: z.array(C5ElementSchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  annotations: z.array(AnnotationSchema),
  aiDetection: AiDetectionSchema.optional(),
});

const GeminiCorrectionSchema = CorrectionSchema.omit({
  aiDetection: true,
  textMetrics: true,
  evaluationMode: true,
}).extend({
  aiAssessment: z.object({
    aiProbability: z
      .number()
      .describe(
        "Probabilidade estimada (0 a 100) de o texto ter sido gerado por IA como ChatGPT, Gemini ou Claude",
      ),
    reasons: z
      .array(z.string())
      .describe("Até 3 justificativas objetivas em português sobre indícios de IA ou autenticidade humana"),
    flaggedExcerpts: z
      .array(z.string())
      .describe("Até 3 trechos literais curtos que parecem fortemente gerados por IA, se houver"),
  }),
});

export type CorrectionResult = z.infer<typeof CorrectionSchema>;
export type { AiDetectionReport, WritingTelemetry };

// ─── MATRIZ OFICIAL DE REFERÊNCIA DO ENEM (INEP) ──────────────────────────────
export const INEP_MATRIX: Record<
  "C1" | "C2" | "C3" | "C4" | "C5",
  { shortName: string; fullName: string; levels: Record<number, string> }
> = {
  C1: {
    shortName: "Domínio da norma culta",
    fullName: "Demonstrar domínio da modalidade escrita formal da língua portuguesa",
    levels: {
      200: "Demonstra excelente domínio da modalidade escrita formal da língua portuguesa e de escolha de registro, com no máximo dois desvios leves isolados.",
      160: "Demonstra bom domínio da modalidade escrita formal da língua portuguesa e de escolha de registro, com poucos desvios gramaticais e de convenções da escrita.",
      120: "Demonstra domínio mediano da modalidade escrita formal da língua portuguesa e de escolha de registro, com alguns desvios gramaticais e de convenções da escrita.",
      80: "Demonstra domínio insuficiente da modalidade escrita formal da língua portuguesa, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.",
      40: "Demonstra domínio precário da modalidade escrita formal da língua portuguesa, com diversidade e frequência de desvios gramaticais e marcas sistemáticas de oralidade.",
      0: "Demonstra desconhecimento da modalidade escrita formal da língua portuguesa ou texto anulado.",
    },
  },
  C2: {
    shortName: "Compreensão e repertório",
    fullName:
      "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa",
    levels: {
      200: "Desenvolve o tema por meio de argumentação consistente, a partir de repertório sociocultural legitimado, pertinente e produtivo, com excelente domínio do texto dissertativo-argumentativo.",
      160: "Desenvolve o tema por meio de argumentação consistente e apresenta bom domínio do texto dissertativo-argumentativo, com repertório sociocultural legitimado e pertinente.",
      120: "Desenvolve o tema por meio de argumentação previsível e apresenta domínio mediano do texto dissertativo-argumentativo, preso ao senso comum ou com repertório pouco produtivo.",
      80: "Desenvolve o tema recorrendo à cópia de trechos ou apresenta domínio insuficiente do texto dissertativo-argumentativo.",
      40: "Apresenta o assunto tangenciando o tema ou demonstra domínio precário do texto dissertativo-argumentativo.",
      0: "Fuga total ao tema ou não atendimento ao tipo dissertativo-argumentativo.",
    },
  },
  C3: {
    shortName: "Projeto de texto e argumentação",
    fullName:
      "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista",
    levels: {
      200: "Apresenta informações, fatos e opiniões relacionados ao tema proposto, de forma consistente e organizada, configurando autoria crítica em defesa de um ponto de vista.",
      160: "Apresenta informações, fatos e opiniões relacionados ao tema, de forma organizada, com indícios de autoria, em defesa de um ponto de vista.",
      120: "Apresenta informações, fatos e opiniões relacionados ao tema, limitados ou pouco desenvolvidos, em defesa de um ponto de vista.",
      80: "Apresenta informações, fatos e opiniões relacionados ao tema, mas desorganizados, lacunosos ou contraditórios, com projeto de texto frágil.",
      40: "Apresenta informações, fatos e opiniões pouco relacionados ao tema ou incoerentes e sem defesa clara de ponto de vista.",
      0: "Apresenta informações, fatos e opiniões não relacionados ao tema e sem defesa de um ponto de vista.",
    },
  },
  C4: {
    shortName: "Coesão e conectivos",
    fullName: "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação",
    levels: {
      200: "Articula bem as partes do texto e apresenta repertório diversificado de recursos coesivos, com ao menos dois operadores interparágrafos e sem repetições excessivas.",
      160: "Articula as partes do texto, com poucas inadequações, e apresenta repertório diversificado de recursos coesivos.",
      120: "Articula as partes do texto de forma mediana, com inadequações, repetições ou repertório pouco diversificado de recursos coesivos.",
      80: "Articula as partes do texto de forma insuficiente, com muitas inadequações e recursos coesivos escassos.",
      40: "Articula as partes do texto de forma precária, com frases justapostas.",
      0: "Não articula as informações.",
    },
  },
  C5: {
    shortName: "Proposta de intervenção",
    fullName: "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos",
    levels: {
      200: "Elabora muito bem proposta de intervenção completa (5 elementos: Agente, Ação, Meio/Modo, Finalidade e Detalhamento), articulada à discussão do texto.",
      160: "Elabora bem proposta de intervenção relacionada ao tema (4 elementos válidos presentes).",
      120: "Elabora proposta de intervenção de forma mediana (3 elementos válidos presentes).",
      80: "Elabora proposta de intervenção incompleta ou insuficiente (2 elementos válidos presentes).",
      40: "Apresenta proposta de intervenção vaga ou precária (1 elemento válido presente).",
      0: "Não apresenta proposta de intervenção ou desrespeita os direitos humanos.",
    },
  },
};

// ─── UTILITÁRIOS LINGUÍSTICOS (UNICODE PT-BR SAFE) ────────────────────────────

const PT_B_START = "(?<![A-Za-zÀ-ÖØ-öø-ÿ])";
const PT_B_END = "(?![A-Za-zÀ-ÖØ-öø-ÿ])";

function ptRegex(pattern: string, flags = "gi"): RegExp {
  return new RegExp(`${PT_B_START}(?:${pattern})${PT_B_END}`, flags);
}

function normalizePt(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clampInepScore(raw: number): number {
  const clamped = Math.max(0, Math.min(200, Math.round(raw / 40) * 40));
  return clamped;
}

const PT_STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
  "em", "no", "na", "nos", "nas", "por", "pelo", "pela", "pelos", "pelas", "para",
  "com", "sem", "sob", "sobre", "entre", "ate", "apos", "ante", "contra", "desde",
  "que", "se", "ou", "e", "mas", "pois", "como", "mais", "menos", "muito", "muita",
  "muitos", "muitas", "todo", "toda", "todos", "todas", "cada", "outro", "outra",
  "outros", "outras", "mesmo", "mesma", "esse", "essa", "esses", "essas", "este",
  "esta", "estes", "estas", "isso", "isto", "aquele", "aquela", "aquilo", "qual",
  "quais", "seu", "sua", "seus", "suas", "nosso", "nossa", "nossos", "nossas",
  "ser", "estar", "ter", "haver", "fazer", "ir", "poder", "dever", "sao", "foi",
  "era", "seja", "tem", "pode", "deve", "devem", "ainda", "tambem", "assim", "ja",
  "nao", "sim", "bem", "mal", "onde", "quando", "porque", "porem", "contudo",
  "todavia", "entretanto", "portanto", "logo", "ademais", "alem", "disso", "forma",
  "modo", "meio", "meios", "parte", "partes", "grande", "maior", "menor", "apenas",
  "somente", "atraves", "diante", "frente", "cerca", "nesse", "nessa", "neste",
  "nesta", "desse", "dessa", "deste", "desta", "dentre", "entao", "enquanto", "pelo",
  "sendo", "tendo", "feito", "feita", "fator", "fatores", "mundo", "pais", "brasil",
  "brasileiro", "brasileira", "brasileiros", "brasileiras", "sociedade", "social",
  "sociais", "populacao", "pessoas", "individuos", "cidadaos", "problema", "problemas",
  "questao", "questoes", "desafio", "desafios", "impacto", "impactos", "caminho",
  "caminhos", "combater", "combate", "enfrentar", "enfrentamento", "superar",
  "importancia", "papel", "perspectivas", "contexto", "cenario", "atual", "atualidade",
  "contemporaneo", "contemporanea", "realidade", "necessario", "fundamental", "urgente",
  "explore", "aborde", "analise", "discuta", "estigma", "politicas", "publicas", "estado",
]);

function stemPt(word: string): string {
  const w = normalizePt(word).replace(/[^a-z]/g, "");
  if (w.length <= 4) return w;
  return w.replace(/(acoes|icoes|mente|idade|ismos|istas|aveis|iveis|amento|imento|acao|icao|ancia|encia|ados|adas|idos|idas|ores|oras|eis|oes|aes|ais|es|os|as|s)$/, "").slice(0, 6) || w.slice(0, 5);
}

export function extractParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (/\n\s*\n/.test(trimmed)) {
    const ps = trimmed
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (ps.length >= 2) return ps;
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length >= 3 && lines.length <= 6) {
    return lines;
  }

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

/**
 * Extrai um trecho LITERAL exato do texto (sem reticências) para que o grifo no editor sempre encontre o trecho.
 */
function exactExcerptAround(text: string, matchIndex: number, matchLen: number, radius = 26): string {
  let start = Math.max(0, matchIndex - radius);
  let end = Math.min(text.length, matchIndex + matchLen + radius);

  // Alinha ao limite de palavra para não cortar palavras no meio
  if (start > 0) {
    const spaceAfter = text.indexOf(" ", start);
    if (spaceAfter !== -1 && spaceAfter < matchIndex) {
      start = spaceAfter + 1;
    }
  }
  if (end < text.length) {
    const spaceBefore = text.lastIndexOf(" ", end);
    if (spaceBefore !== -1 && spaceBefore >= matchIndex + matchLen) {
      end = spaceBefore;
    }
  }

  // Nunca cruza quebra de linha
  const raw = text.slice(start, end);
  const nlIdx = raw.indexOf("\n");
  let clean = raw;
  if (nlIdx !== -1) {
    const relMatch = matchIndex - start;
    if (nlIdx < relMatch) {
      clean = raw.slice(nlIdx + 1);
    } else {
      clean = raw.slice(0, nlIdx);
    }
  }

  return clean.trim() || text.slice(matchIndex, matchIndex + matchLen).trim();
}

function findLiteralExcerpt(text: string, rgx: RegExp, radius = 28): string | null {
  const m = text.match(rgx);
  if (!m || m.index === undefined) return null;
  return exactExcerptAround(text, m.index, m[0].length, radius);
}

// ─── MÉTRICAS TEXTUAIS & DETECÇÃO DE REPETIÇÃO / TEXTO DESCONEXO ─────────────

function computeTextMetrics(
  text: string,
  paragraphs: string[],
  topic?: string,
  themeHint?: string,
): z.infer<typeof TextMetricsSchema> {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const estimatedLines = Math.min(35, Math.max(1, Math.ceil(text.length / 78)));
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 2);
  const sentenceCount = Math.max(1, sentences.length);
  const avgWordsPerSentence = Math.round((wordCount / sentenceCount) * 10) / 10;

  // Termos do tema e do recorte não são punidos como repetição lexical
  const topicStems = new Set(
    `${topic || ""} ${themeHint || ""}`
      .split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/)
      .filter((w) => w.length >= 4)
      .map(stemPt),
  );

  const freq = new Map<string, { display: string; count: number }>();
  for (const raw of words) {
    const clean = raw.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ]+$/g, "");
    const norm = normalizePt(clean);
    if (norm.length < 5 || PT_STOPWORDS.has(norm)) continue;
    if (topicStems.has(stemPt(norm))) continue;
    const prev = freq.get(norm);
    if (prev) {
      prev.count += 1;
    } else {
      freq.set(norm, { display: clean.toLowerCase(), count: 1 });
    }
  }

  const repeatedWords = [...freq.values()]
    .filter((item) => item.count >= 4)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item) => ({ word: item.display, count: item.count }));

  return {
    wordCount,
    estimatedLines,
    paragraphCount: paragraphs.length,
    sentenceCount,
    avgWordsPerSentence,
    repeatedWords,
  };
}

function checkEliminatoryQuality(text: string, wordCount: number): string | null {
  // 1. Texto abaixo do mínimo de linhas do ENEM (7 linhas ≈ 48-55 palavras)
  if (wordCount < 45) {
    return "Texto insuficiente: a redação tem menos de 7 linhas aproximadas. Na regra oficial do INEP, textos com até 7 linhas recebem nota zero.";
  }

  const rawWords = text
    .split(/\s+/)
    .map((w) => normalizePt(w).replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 0);

  // 2. Detecção de gibberish / teclas aleatórias ("asdfgh", "kkkkk", palavras sem vogais)
  const gibberishCount = rawWords.filter((w) => {
    if (w.length < 3) return false;
    const hasVowel = /[aeiou]/.test(w);
    const repeatedChar = /(.)\1{3,}/.test(w);
    const consonantCluster = /[bcdfghjklmnpqrstvwxyz]{5,}/.test(w);
    return !hasVowel || repeatedChar || consonantCluster;
  }).length;

  if (rawWords.length >= 20 && gibberishCount / rawWords.length >= 0.25) {
    return "Texto desconexo ou sem sentido legível em língua portuguesa (sequências aleatórias de caracteres). Na banca do ENEM, isso configura anulação.";
  }

  // 3. Diversidade lexical extremamente baixa (spam / colar a mesma frase várias vezes)
  const uniqueWords = new Set(rawWords);
  const ttr = uniqueWords.size / Math.max(1, rawWords.length);
  if (wordCount >= 55 && ttr < 0.28) {
    return "Repetição artificial excessiva de palavras ou frases idênticas, sem desenvolvimento argumentativo real.";
  }

  // Frases literalmente duplicadas 3+ vezes
  const normSentences = text
    .split(/[.!?]+/)
    .map((s) => normalizePt(s).replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 18);
  const sentCounts = new Map<string, number>();
  for (const s of normSentences) {
    sentCounts.set(s, (sentCounts.get(s) || 0) + 1);
  }
  const maxDup = Math.max(0, ...sentCounts.values());
  if (maxDup >= 3) {
    return "Repetição literal da mesma frase ao longo do texto, sem progressão dissertativa.";
  }

  return null;
}

// ─── VERIFICAÇÃO DE ADERÊNCIA AO TEMA (FUGA / TANGENCIAMENTO / COMPLETO) ──────

function avaliarAderenciaTema(
  text: string,
  topic?: string,
  themeHint?: string,
): z.infer<typeof TopicAdherenceSchema> {
  if (!topic || !topic.trim()) {
    return {
      status: "completo",
      matchedKeywords: [],
      comment: "Avaliação realizada em modo tema livre.",
    };
  }

  const extractMeaningful = (source: string): Array<{ original: string; stem: string }> => {
    const seen = new Set<string>();
    const out: Array<{ original: string; stem: string }> = [];
    for (const token of source.split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/)) {
      const norm = normalizePt(token);
      if (norm.length < 4 || PT_STOPWORDS.has(norm)) continue;
      const st = stemPt(norm);
      if (st.length < 3 || seen.has(st)) continue;
      seen.add(st);
      out.push({ original: token.toLowerCase(), stem: st });
    }
    return out;
  };

  const coreKeywords = extractMeaningful(topic);
  const hintKeywords = extractMeaningful(themeHint || "").filter(
    (h) => !coreKeywords.some((c) => c.stem === h.stem),
  );

  // Se o tema só tinha palavras muito genéricas, não penaliza falsamente
  if (coreKeywords.length === 0) {
    return {
      status: "completo",
      matchedKeywords: [],
      comment: "Abordagem temática compatível com a proposta selecionada.",
    };
  }

  const textWords = text
    .split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/)
    .map((w) => normalizePt(w))
    .filter((w) => w.length >= 3);
  const textStems = textWords.map(stemPt);

  const matchedCore: string[] = [];
  let coreMentions = 0;
  for (const kw of coreKeywords) {
    const hits = textStems.filter(
      (s) => s === kw.stem || (kw.stem.length >= 4 && s.startsWith(kw.stem)) || (s.length >= 4 && kw.stem.startsWith(s)),
    ).length;
    if (hits > 0) {
      matchedCore.push(kw.original);
      coreMentions += hits;
    }
  }

  const matchedHint: string[] = [];
  let hintMentions = 0;
  for (const kw of hintKeywords) {
    const hits = textStems.filter(
      (s) => s === kw.stem || (kw.stem.length >= 4 && s.startsWith(kw.stem)) || (s.length >= 4 && kw.stem.startsWith(s)),
    ).length;
    if (hits > 0) {
      matchedHint.push(kw.original);
      hintMentions += hits;
    }
  }

  const allMatched = [...matchedCore, ...matchedHint].slice(0, 6);
  const coreRatio = matchedCore.length / coreKeywords.length;

  // Fuga total: nenhuma palavra-chave do tema nem do recorte aparece no texto
  if (matchedCore.length === 0 && matchedHint.length === 0) {
    return {
      status: "fuga",
      matchedKeywords: [],
      comment: `O texto não menciona os termos centrais do tema "${topic}". Na banca do ENEM, a fuga total ao tema resulta em anulação (nota 0).`,
    };
  }

  // Tangenciamento: tocou apenas tangencialmente no assunto sem desenvolver o recorte central
  if (
    (matchedCore.length === 0 && matchedHint.length >= 1) ||
    (coreKeywords.length >= 2 && matchedCore.length === 1 && coreMentions <= 1 && hintMentions <= 1)
  ) {
    return {
      status: "tangenciamento",
      matchedKeywords: allMatched,
      comment: `O texto tangencia o assunto sem aprofundar o recorte específico de "${topic}". Retome explicitamente as palavras-chave da frase temática na introdução, nos desenvolvimentos e na conclusão.`,
    };
  }

  // Abordagem parcial
  if (coreRatio < 0.45 && matchedHint.length <= 1 && coreMentions < 3) {
    return {
      status: "parcial",
      matchedKeywords: allMatched,
      comment: `O tema foi abordado parcialmente (${allMatched.join(", ")}). Articule todos os núcleos da frase temática para alcançar 200 pontos na Competência 2.`,
    };
  }

  return {
    status: "completo",
    matchedKeywords: allMatched,
    comment: `Boa aderência ao recorte temático, com retomada consistente de termos centrais (${allMatched.slice(0, 4).join(", ")}).`,
  };
}

// ─── COMPETÊNCIA 1: NORMA PADRÃO ─────────────────────────────────────────────

interface C1Finding {
  excerpt: string;
  fix: string;
  reason: string;
  severity: "leve" | "grave";
  category: "oralidade" | "ortografia" | "regencia_crase" | "registro" | "pontuacao";
}

function avaliarC1(
  text: string,
  paragraphs: string[],
  wordCount: number,
): {
  score: number;
  feedback: string;
  nextStep: string;
  findings: C1Finding[];
} {
  const rules: Array<{
    rgx: RegExp;
    fix: string;
    reason: string;
    severity: "leve" | "grave";
    category: C1Finding["category"];
  }> = [
    // Oralidade e internetês
    { rgx: ptRegex("pra"), fix: "para", reason: "Contrações da fala ('pra') devem ser substituídas por 'para' na norma culta.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("pro"), fix: "para o", reason: "Evite contrações orais ('pro'); escreva 'para o'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("né"), fix: "não é", reason: "Marca explícita de oralidade ('né'), incompatível com o gênero dissertativo.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("tá|tão"), fix: "está / estão", reason: "Abreviação oral do verbo 'estar' penaliza a Competência 1.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("a\\s+gente"), fix: "a sociedade / a população", reason: "'A gente' é coloquial; prefira sujeito impessoal ou 'a população/sociedade'.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("pq|pqs|vc|vcs|tbm|tb|mt|mto|msm|hj|kd|blz|vlw"), fix: "forma por extenso", reason: "Abreviação de internetês não é aceita na modalidade escrita formal do ENEM.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("hoje\\s+em\\s+dia"), fix: "na contemporaneidade / atualmente", reason: "Expressão desgastada e próxima da oralidade; prefira 'atualmente' ou 'na contemporaneidade'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("coisa(?!\\s+p[úu]blica)"), fix: "aspecto / elemento / fator", reason: "Palavra vaga/coloquial ('coisa'); use vocabulário preciso como 'fator', 'aspecto' ou 'fenômeno'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("tem\\s+que"), fix: "deve / necessita", reason: "Locução coloquial ('tem que'); substitua por 'deve' ou 'precisa'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("por\\s+conta\\s+de"), fix: "em virtude de / devido a", reason: "Expressão informal ('por conta de'); prefira 'em virtude de' ou 'em razão de'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("tipo\\s+(?:assim|um|uma)"), fix: "como / tal qual", reason: "Marca de oralidade ('tipo assim'); use 'como' ou 'a exemplo de'.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("só\\s+que"), fix: "porém / contudo", reason: "Conjunção coloquial ('só que'); prefira 'contudo', 'todavia' ou 'entretanto'.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("daí|aí"), fix: "desse modo / nesse contexto", reason: "Marcador típico da fala ('daí'/'aí'); use conectivos formais como 'desse modo'.", severity: "grave", category: "oralidade" },
    { rgx: ptRegex("muito\\s+(?:bom|ruim)"), fix: "benéfico / prejudicial", reason: "Adjetivação pouco precisa; prefira termos formais como 'benéfico', 'nocivo' ou 'grave'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("falar\\s+(?:sobre|de)"), fix: "abordar / discorrer sobre", reason: "Verbo genérico da oralidade; prefira 'abordar', 'analisar' ou 'discorrer sobre'.", severity: "leve", category: "oralidade" },
    { rgx: ptRegex("cara"), fix: "indivíduo / cidadão", reason: "Gíria inadequada ao registro formal da redação do ENEM.", severity: "grave", category: "oralidade" },

    // 1ª pessoa do singular (quebra de impessoalidade dissertativa)
    { rgx: ptRegex("(?:eu\\s+(?:acho|penso|acredito|vejo|concordo)|na\\s+minha\\s+opini[ãa]o|ao\\s+meu\\s+ver)"), fix: "nota-se que / evidencia-se que", reason: "Evite 1ª pessoa do singular em dissertações do ENEM; mantenha o texto impessoal em 3ª pessoa.", severity: "leve", category: "registro" },

    // Ortografia e acentuação muito recorrentes em redações
    { rgx: ptRegex("nao"), fix: "não", reason: "Falta de acento (til): escreva 'não'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("tambem"), fix: "também", reason: "Falta de acento agudo: escreva 'também'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("atraves|atravez"), fix: "através / por meio de", reason: "Grafia incorreta: o correto é 'através' (e para instrumento, prefira 'por meio de').", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("saude"), fix: "saúde", reason: "Falta de acento agudo no hiato: escreva 'saúde'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("educacao"), fix: "educação", reason: "Falta de cedilha e til: escreva 'educação'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("populacao"), fix: "população", reason: "Falta de cedilha e til: escreva 'população'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("politica|politicas"), fix: "política(s)", reason: "Proparoxítona obrigatória com acento: escreva 'política(s)'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("cidadao|cidadaos"), fix: "cidadão / cidadãos", reason: "Falta de til: escreva 'cidadão(s)'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("consequencia|consequencias"), fix: "consequência(s)", reason: "Falta de acento circunflexo: escreva 'consequência(s)'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("voce|voces"), fix: "você(s) (ou evite dirigir-se ao leitor)", reason: "Falta de acento e quebra de impessoalidade na dissertação.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("eh"), fix: "é", reason: "Grafia informal de internet ('eh'); escreva 'é'.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("concerteza"), fix: "com certeza", reason: "Desvio ortográfico: escreve-se separado ('com certeza').", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("derrepente"), fix: "de repente", reason: "Desvio ortográfico: escreve-se separado ('de repente').", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("apartir"), fix: "a partir", reason: "Desvio ortográfico: escreve-se separado ('a partir').", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("porisso"), fix: "por isso", reason: "Desvio ortográfico: escreve-se separado ('por isso').", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("menas"), fix: "menos", reason: "'Menos' é invariável — não existe 'menas' na língua portuguesa.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("seje|esteje"), fix: "seja / esteja", reason: "Flexão verbal incorreta no presente do subjuntivo.", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("excess[ãa]o|exce[çc]ao"), fix: "exceção", reason: "Grafia correta: 'exceção' (com c e ç).", severity: "grave", category: "ortografia" },
    { rgx: ptRegex("impecilho|empecilio"), fix: "empecilho", reason: "Grafia correta: 'empecilho'.", severity: "leve", category: "ortografia" },
    { rgx: ptRegex("previl[ée]gio"), fix: "privilégio", reason: "Grafia correta: 'privilégio'.", severity: "leve", category: "ortografia" },
    { rgx: ptRegex("reinvindicar|reinvindica[çc][ãa]o"), fix: "reivindicar / reivindicação", reason: "Grafia correta: 'reivindicar' (sem 'n' na primeira sílaba).", severity: "leve", category: "ortografia" },
    { rgx: ptRegex("(?:poder|ensino|servi[çc]o|setor|hospital|sistema)\\s+publico|(?:sa[úu]de|educa[çc][ãa]o|pol[íi]tica|escola|seguran[çc]a)\\s+publica"), fix: "público / pública", reason: "Proparoxítona obrigatória com acento agudo ('público/a').", severity: "grave", category: "ortografia" },

    // Crase, regência e concordância
    { rgx: ptRegex("à\\s+(?:partir|respeito|todos|todas|cada|longo\\s+prazo|favor|ele|ela|eles|elas|esse|essa|este|esta|um|uma)"), fix: "a (sem crase)", reason: "Não ocorre crase antes de verbos, pronomes masculinos/indefinidos ou palavras masculinas.", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("a\\s+medida\\s+que"), fix: "à medida que", reason: "Locução conjuntiva feminina 'à medida que' exige crase.", severity: "leve", category: "regencia_crase" },
    { rgx: ptRegex("(?:devido|frente|em\\s+rela[çc][ãa]o)\\s+a\\s+(?:falta|aus[êe]ncia|crise|sociedade|educa[çc][ãa]o|sa[úu]de|desigualdade|viol[êe]ncia|popula[çc][ãa]o|quest[ãa]o)"), fix: "à (com crase)", reason: "A regência exige preposição 'a' + artigo 'a' antes de substantivo feminino → crase ('à').", severity: "leve", category: "regencia_crase" },
    { rgx: ptRegex("(?:sociedade|cen[áa]rio|contexto|momento|situa[çc][ãa]o|[ée]poca|s[ée]culo|processo|realidade|per[íi]odo|problema|quest[ãa]o|panorama),?\\s+onde"), fix: "em que / no qual / na qual", reason: "Use 'onde' apenas para lugar físico; para ideias, tempo ou contextos, use 'em que' ou 'no/na qual'.", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("houveram|haviam\\s+(?:muitos|muitas|v[áa]rios|v[áa]rias|problemas|pessoas|casos)"), fix: "houve / havia", reason: "O verbo 'haver' no sentido de existir é impessoal e permanece no singular.", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("fazem\\s+\\d+\\s+(?:anos?|meses|dias|s[ée]culos)"), fix: "faz", reason: "O verbo 'fazer' indicando tempo decorrido é impessoal (singular: 'faz').", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("existe\\s+(?:muitos|muitas|v[áa]rios|v[áa]rias|diversos|diversas|in[úu]meros|in[úu]meras|problemas|pessoas|fatores|desafios)"), fix: "existem", reason: "Diferentemente de 'haver', o verbo 'existir' concorda com o sujeito no plural ('existem').", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("tratam-se\\s+de"), fix: "trata-se de", reason: "O verbo 'tratar-se de' tem sujeito indeterminado e fica sempre na 3ª pessoa do singular.", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("para\\s+mim\\s+(?:fazer|ir|escrever|ver|estudar|resolver|entender|dizer)"), fix: "para eu + verbo", reason: "'Mim' não conjuga verbo; use o pronome sujeito 'eu'.", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("a\\s+n[íi]vel\\s+de"), fix: "em nível de / no âmbito de", reason: "'A nível de' é considerado inadequado na norma padrão; prefira 'em nível de' ou 'no âmbito de'.", severity: "grave", category: "regencia_crase" },
    { rgx: ptRegex("chegar\\s+em"), fix: "chegar a / ao", reason: "Na norma padrão, quem chega, chega 'a' algum lugar.", severity: "leve", category: "regencia_crase" },
    { rgx: ptRegex("assistir\\s+o\\b"), fix: "assistir ao", reason: "No sentido de ver/presenciar, 'assistir' é transitivo indireto ('assistir ao').", severity: "leve", category: "regencia_crase" },
    { rgx: ptRegex("visar\\s+[oa]\\s+[a-zà-ÿ]{3,}"), fix: "visar ao / à", reason: "No sentido de objetivar, a norma padrão tradicional recomenda 'visar ao/à'.", severity: "leve", category: "regencia_crase" },
    { rgx: ptRegex("implicar\\s+em"), fix: "implicar (sem 'em')", reason: "No sentido de acarretar, 'implicar' é transitivo direto (sem a preposição 'em').", severity: "leve", category: "regencia_crase" },
    { rgx: ptRegex("preferi[r]?\\s+[^.!?]{2,35}\\s+do\\s+que"), fix: "preferir X a Y", reason: "Regência padrão: 'preferir uma coisa a outra' (sem 'do que').", severity: "leve", category: "regencia_crase" },
  ];

  const findings: C1Finding[] = [];
  for (const rule of rules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    for (const m of matches.slice(0, 2)) {
      if (m.index !== undefined) {
        findings.push({
          excerpt: exactExcerptAround(text, m.index, m[0].length, 22),
          fix: rule.fix,
          reason: rule.reason,
          severity: rule.severity,
          category: rule.category,
        });
      }
    }
  }

  // Pontuação e convenções da escrita
  const sentences = text.match(/[^.!?;]+[.!?;]+/g) || [];
  const excessiveLong = sentences.filter((s) => s.trim().split(/\s+/).length > 72);
  if (excessiveLong.length > 0 && excessiveLong[0]) {
    const snippet = excessiveLong[0].trim().split(/\s+/).slice(0, 12).join(" ");
    findings.push({
      excerpt: snippet,
      fix: "Divida este período longo em duas frases com ponto final.",
      reason: `Período excessivamente longo (${excessiveLong[0].trim().split(/\s+/).length} palavras) prejudica a clareza sintática.`,
      severity: "leve",
      category: "pontuacao",
    });
  }

  // Parágrafos sem pontuação final ou iniciados com minúscula
  let missingEndPunct = 0;
  let lowercaseStart = 0;
  for (const p of paragraphs) {
    if (p.length >= 25 && !/[.!?"]$/.test(p.trim())) {
      missingEndPunct++;
    }
    if (/^[a-zà-öø-ÿ]/.test(p.trim())) {
      lowercaseStart++;
    }
  }
  if (missingEndPunct > 0) {
    findings.push({
      excerpt: paragraphs.find((p) => p.length >= 25 && !/[.!?"]$/.test(p.trim()))?.slice(-45).trim() || "",
      fix: "Finalize cada parágrafo com ponto final.",
      reason: `${missingEndPunct} parágrafo(s) terminou/terminaram sem pontuação final.`,
      severity: "grave",
      category: "pontuacao",
    });
  }
  if (lowercaseStart > 0) {
    findings.push({
      excerpt: paragraphs.find((p) => /^[a-zà-öø-ÿ]/.test(p.trim()))?.slice(0, 45).trim() || "",
      fix: "Inicie todo parágrafo com letra maiúscula.",
      reason: `${lowercaseStart} parágrafo(s) iniciado(s) com letra minúscula.`,
      severity: "leve",
      category: "pontuacao",
    });
  }

  // Exclamações ou reticências (informais na dissertação ENEM)
  const exclamMatch = text.match(/[^.!?]{5,40}(?:!|\.{3})/);
  if (exclamMatch && exclamMatch.index !== undefined) {
    findings.push({
      excerpt: exactExcerptAround(text, exclamMatch.index, exclamMatch[0].length, 8),
      fix: "Substitua exclamações ou reticências por ponto final.",
      reason: "O uso de '!' ou '...' transmite subjetividade/informalidade incompatível com o texto dissertativo-argumentativo.",
      severity: "leve",
      category: "pontuacao",
    });
  }

  // Espaço faltando após vírgula/ponto (ex.: "Brasil,onde")
  const missingSpaceMatch = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ][,;][A-Za-zÀ-ÖØ-öø-ÿ]/);
  if (missingSpaceMatch && missingSpaceMatch.index !== undefined) {
    findings.push({
      excerpt: exactExcerptAround(text, missingSpaceMatch.index, missingSpaceMatch[0].length, 15),
      fix: "Insira espaço após vírgula ou ponto e vírgula.",
      reason: "Convenção básica da escrita: sempre há espaço depois de sinais de pontuação.",
      severity: "leve",
      category: "pontuacao",
    });
  }

  const gravesCount = findings.filter((f) => f.severity === "grave").length;
  const levesCount = findings.filter((f) => f.severity === "leve").length;

  let score: number;
  let feedback: string;
  let nextStep: string;

  if (wordCount < 55) {
    score = 0;
    feedback = "Extensão insuficiente para avaliar o domínio da modalidade escrita formal.";
    nextStep = "Desenvolva a redação em 4 parágrafos completos (entre 20 e 30 linhas).";
  } else if (gravesCount >= 6 || (gravesCount >= 4 && levesCount >= 4)) {
    score = 40;
    feedback = `Domínio precário da norma culta: foram detectados ${gravesCount} desvios graves e ${levesCount} leves (ortografia, oralidade ou concordância) que comprometem a leitura formal.`;
    nextStep = "Revise acentuação obrigatória, elimine marcas da fala e verifique concordância verbal em cada frase.";
  } else if (gravesCount >= 3 || levesCount >= 6) {
    score = 80;
    feedback = `Domínio insuficiente da modalidade escrita formal: presença de ${gravesCount} desvio(s) grave(s) e ${levesCount} leve(s), exigindo revisão cuidadosa de gramática e registro.`;
    nextStep = "Elimine desvios de acentuação, crase e oralidade antes de finalizar o rascunho.";
  } else if (gravesCount >= 2 || levesCount >= 4) {
    score = 120;
    feedback = `Domínio mediano da norma culta: o texto comunica bem as ideias, mas acumula desvios pontuais (${gravesCount} grave(s) e ${levesCount} leve(s)) de regência, pontuação ou registro.`;
    nextStep = "Corrija os trechos sinalizados em destaque e revise vírgulas após adjuntos adverbiais deslocados.";
  } else if (gravesCount === 1 || levesCount >= 2 || wordCount < 150) {
    score = 160;
    feedback =
      gravesCount === 0 && levesCount <= 1
        ? "Bom domínio da modalidade escrita formal, porém o texto ainda é relativamente curto para evidenciar maior variedade sintática exigida no nível 200."
        : `Bom domínio da norma culta e boa construção sintática, com apenas poucos desvios pontuais (${gravesCount} grave(s) e ${levesCount} leve(s)).`;
    nextStep = "Faça uma releitura final focada em crase, concordância e fluidez dos períodos para cravar os 200 pontos.";
  } else {
    score = 200;
    feedback =
      levesCount === 0
        ? "Excelente domínio da norma culta: sintaxe madura, vocabulário formal preciso e respeito rigoroso às convenções da escrita."
        : "Excelente domínio da norma culta: sintaxe bem estruturada com apenas um desvio leve isolado, dentro da tolerância máxima do INEP.";
    nextStep = "Excelente padrão formal! Mantenha essa precisão sintática e revise sempre crase e vírgulas.";
  }

  return { score, feedback, nextStep, findings };
}

// ─── COMPETÊNCIA 2: COMPREENSÃO DO TEMA, TIPOLOGIA E REPERTÓRIO ──────────────

function avaliarC2(
  text: string,
  paragraphs: string[],
  wordCount: number,
  topicAdherence: z.infer<typeof TopicAdherenceSchema>,
): {
  score: number;
  feedback: string;
  nextStep: string;
  repertoireFound: { label: string; excerpt: string; productive: boolean }[];
} {
  const repRules: { label: string; rgx: RegExp }[] = [
    {
      label: "Filósofo / Sociólogo / Pensador",
      rgx: ptRegex(
        "bauman|bourdieu|foucault|habermas|durkheim|marx|gramsci|weber|arendt|hannah\\s+arendt|beauvoir|sartre|rousseau|locke|hobbes|kant|hegel|nietzsche|marilena\\s+chau[íi]|ailton\\s+krenak|arist[óo]teles|plat[ãa]o|byung-chul\\s+han|paulo\\s+freire|darcy\\s+ribeiro|milton\\s+santos|djamila\\s+ribeiro|gilberto\\s+freyre|gilberto\\s+dimenstein|s[ée]rgio\\s+buarque|florestan\\s+fernandes|josu[ée]\\s+de\\s+castro|l[ée]lia\\s+gonzalez|sueli\\s+carneiro|grada\\s+kilomba|nise\\s+da\\s+silveira|yuval\\s+harari|thomas\\s+mor[eu]?|maquiavel|descartes|montesquieu|adorno|horkheimer|seneca|s[êe]neca|john\\s+rawls|amartya\\s+sen",
      ),
    },
    {
      label: "Literatura / Cinema / Artes",
      rgx: ptRegex(
        "machado\\s+de\\s+assis|clarice\\s+lispector|graciliano\\s+ramos|carolina\\s+maria\\s+de\\s+jesus|concei[çc][ãa]o\\s+evaristo|drummond|guimar[ãa]es\\s+rosa|ariano\\s+suassuna|jorge\\s+amado|george\\s+orwell|orwell|kafka|vidas\\s+secas|quarto\\s+de\\s+despejo|segundo\\s+sexo|capit[ãa]es\\s+da\\s+areia|o\\s+corti[çc]o|dom\\s+casmurro|1984|admir[áa]vel\\s+mundo\\s+novo|utopia|modernismo|romantismo|divertida\\s+mente|black\\s+mirror|o\\s+dilema\\s+das\\s+redes|que\\s+horas\\s+ela\\s+volta|ilha\\s+das\\s+flores|cidade\\s+de\\s+deus|bicho\\s+de\\s+sete\\s+cabe[çc]as|parasita|13\\s+reasons\\s+why|nunca\\s+me\\s+sonharam|estamira|tempos\\s+modernos",
      ),
    },
    {
      label: "Legislação / Constituição / Direitos",
      rgx: ptRegex(
        "constitui[çc][ãa]o\\s*(?:federal)?\\s*(?:de\\s*1988)?|artigo\\s*\\d+[ºo°]?|carta\\s+magna|cidad[ãa]os?\\s+de\\s+papel|declara[çc][ãa]o\\s+universal|direitos\\s+humanos|lei\\s+n[ºo°]?\\s*\\d+|estatuto\\s+d[ao]|eca|lgpd|lei\\s+geral\\s+de\\s+prote[çc][ãa]o\\s+de\\s+dados|c[óo]digo\\s+(?:penal|civil|florestal|de\\s+defesa)|lei\\s+maria\\s+da\\s+penha|marco\\s+civil|lei\\s+de\\s+cotas|lei\\s+[áa]urea|sus|sistema\\s+[úu]nico\\s+de\\s+sa[úu]de|ldb|clt",
      ),
    },
    {
      label: "Dados e Instituições Oficiais",
      rgx: ptRegex(
        "ibge|ipea|onu|oms|organiza[çc][ãa]o\\s+mundial\\s+da\\s+sa[úu]de|unicef|unesco|oxfam|fiocruz|inep|pnad|mapa\\s+da\\s+fome|censo\\s+demogr[áa]fico|datafolha|ipea|f[óo]rum\\s+brasileiro\\s+de\\s+seguran[çc]a|observat[óo]rio|pesquisa\\s+d[ao]|relat[óo]rio\\s+d[ao]",
      ),
    },
    {
      label: "Contexto Histórico",
      rgx: ptRegex(
        "revolu[çc][ãa]o\\s+(?:industrial|francesa|tecnol[óo]gica)|iluminismo|ditadura\\s+militar|era\\s+vargas|per[íi]odo\\s+colonial|brasil\\s+col[ôo]nia|escravid[ãa]o|rep[úu]blica\\s+velha|guerra\\s+fria|segunda\\s+guerra|s[ée]culo\\s+(?:xxi|xx|xix|xviii)|idade\\s+m[ée]dia|gr[ée]cia\\s+antiga|roma\\s+antiga|reforma\\s+sanit[áa]ria",
      ),
    },
    {
      label: "Conceito Teórico / Científico",
      rgx: ptRegex(
        "viol[êe]ncia\\s+simb[óo]lica|habitus|capital\\s+(?:cultural|social)|pan[óo]ptico|necropol[íi]tica|interseccionalidade|modernidade\\s+l[íi]quida|cidadania\\s+(?:mutilada|ativa)|banalidade\\s+do\\s+mal|sociedade\\s+do\\s+cansa[çc]o|positividade\\s+t[óo]xica|invisibilidade\\s+social|ind[úu]stria\\s+cultural|contrato\\s+social|aliena[çc][ãa]o|anomia|racismo\\s+estrutural|uberiza[çc][ãa]o",
      ),
    },
  ];

  const interpretiveMarkers =
    /\b(evidencia|demonstra|mostra|revela|reflete|contrasta|analogamente|de maneira semelhante|sob essa|nessa ótica|nesse sentido|na prática|no entanto|contudo|todavia|entretanto|porém|assim|logo|desse modo)\b/i;

  const found: { label: string; excerpt: string; productive: boolean }[] = [];
  for (const r of repRules) {
    const m = text.match(new RegExp(r.rgx.source, "i"));
    if (m && m.index !== undefined) {
      const containerP =
        paragraphs.find((p) => p.toLowerCase().includes(m[0].toLowerCase())) || text;
      const pWords = containerP.split(/\s+/).filter(Boolean).length;
      const productive = pWords >= 32 && interpretiveMarkers.test(containerP);
      found.push({
        label: r.label,
        excerpt: exactExcerptAround(text, m.index, m[0].length, 28),
        productive,
      });
    }
  }

  const uniqueCats = found.length;
  const hasProductiveRep = found.some((f) => f.productive);
  const hasFourParagraphs = paragraphs.length >= 4;
  const hasThreeParagraphs = paragraphs.length >= 3;

  let score: number;
  let feedback: string;
  let nextStep: string;

  if (topicAdherence.status === "fuga") {
    score = 0;
    feedback = topicAdherence.comment;
    nextStep = "Releia atentamente todas as palavras-chave da frase temática antes de planejar seus argumentos.";
  } else if (topicAdherence.status === "tangenciamento") {
    score = 40;
    feedback = `Tangenciamento ao tema detectado. ${topicAdherence.comment}`;
    nextStep = "Inclua explicitamente os núcleos principais do tema na tese e desenvolva causas ligadas diretamente a ele.";
  } else if (wordCount < 90 || paragraphs.length < 2) {
    score = 80;
    feedback =
      "Domínio insuficiente da estrutura dissertativo-argumentativa: o texto precisa ser organizado em introdução, desenvolvimento e conclusão com extensão adequada.";
    nextStep = "Estruture sua redação em 4 parágrafos claros: Introdução, Desenvolvimento 1, Desenvolvimento 2 e Conclusão.";
  } else if (uniqueCats === 0) {
    score = 120;
    feedback =
      "O texto compreende a proposta e segue a estrutura dissertativa, mas permanece preso ao senso comum por não mobilizar repertório sociocultural legitimado de outra área do conhecimento.";
    nextStep =
      "Inclua ao menos um repertório legitimado (lei, dado oficial do IBGE/ONU, obra literária, filme ou pensador) conectado diretamente à sua tese.";
  } else if (topicAdherence.status === "parcial") {
    score = 120;
    feedback = `Há repertório sociocultural (${found[0]?.label}), porém a abordagem do tema ainda é parcial. ${topicAdherence.comment}`;
    nextStep = "Articule todos os elementos do recorte temático na introdução e nos dois desenvolvimentos.";
  } else if (!hasFourParagraphs || !hasProductiveRep || wordCount < 190) {
    score = 160;
    const reason = !hasFourParagraphs
      ? "a divisão em 4 parágrafos (Introdução, D1, D2 e Conclusão) tornaria a estrutura mais sólida"
      : !hasProductiveRep
      ? "o repertório foi citado de modo pontual e pode ser mais bem interpretado em relação à sua tese"
      : "a extensão ainda pode ser ampliada para aprofundar a discussão";
    feedback = `Boa abordagem do tema com repertório legitimado (${found.map((f) => f.label).slice(0, 2).join(" e ")}), porém ${reason}.`;
    nextStep =
      "Apresente o repertório, relacione-o explicitamente ao tema e interprete como ele comprova a sua tese em uma estrutura de 4 parágrafos.";
  } else {
    score = 200;
    feedback = `Excelente compreensão da proposta e domínio da estrutura dissertativa em ${paragraphs.length} parágrafos, com repertório sociocultural legitimado e produtivo (${found.map((f) => f.label).slice(0, 2).join(" e ")}).`;
    nextStep = "Nível máximo atingido! Continue sempre ligando o repertório à realidade brasileira analisada.";
  }

  // Garante coerência se tiver 3 parágrafos mas excelente estrutura -> máximo 160
  if (!hasThreeParagraphs && score > 120) {
    score = 120;
  }

  return { score, feedback, nextStep, repertoireFound: found };
}

// ─── COMPETÊNCIA 3: PROJETO DE TEXTO E ARGUMENTAÇÃO ──────────────────────────

function avaliarC3(
  text: string,
  paragraphs: string[],
  wordCount: number,
  topicAdherence: z.infer<typeof TopicAdherenceSchema>,
): {
  score: number;
  feedback: string;
  nextStep: string;
} {
  const causalAndCriticalOps = [
    ptRegex("visto\\s+que"),
    ptRegex("uma\\s+vez\\s+que"),
    ptRegex("em\\s+virtude\\s+de"),
    ptRegex("haja\\s+vista"),
    ptRegex("por\\s+conseguinte"),
    ptRegex("consequentemente"),
    ptRegex("o\\s+que\\s+(?:gera|acarreta|provoca|resulta|agrava|perpetua|impede|compromete)"),
    ptRegex("como\\s+consequ[êe]ncia"),
    ptRegex("em\\s+decorr[êe]ncia"),
    ptRegex("posto\\s+que"),
    ptRegex("embora"),
    ptRegex("apesar\\s+de"),
    ptRegex("contudo|todavia|entretanto|no\\s+entanto"),
    ptRegex("por\\s+outro\\s+lado|em\\s+contrapartida"),
    ptRegex("evidencia|comprova|demonstra|revela"),
    ptRegex("nesse\\s+sentido|sob\\s+essa\\s+[óo]tica|dessa\\s+forma|desse\\s+modo"),
  ];

  const uniqueOps = causalAndCriticalOps.filter((r) => r.test(text)).length;

  // Verifica tese na introdução
  const intro = paragraphs[0] || "";
  const introHasThesis =
    intro.split(/\s+/).filter(Boolean).length >= 25 &&
    /(?:problema|impasse|entrave|desafio|lacuna|neglig[êe]ncia|desigualdade|invisibilidade|falta|aus[êe]ncia|urg[êe]ncia|necess[áa]rio|evidencia|agrava|perpetua|compromete|limita|decorre|causa)/i.test(
      intro,
    );

  // Verifica profundidade e equilíbrio dos desenvolvimentos (D1 e D2)
  const devParagraphs = paragraphs.length >= 4 ? paragraphs.slice(1, paragraphs.length - 1) : paragraphs.slice(1);
  const substantialDevs = devParagraphs.filter((p) => p.split(/\s+/).filter(Boolean).length >= 40).length;

  // Verifica se D1 e D2 não são repetição um do outro (similaridade Jaccard)
  let redundantDevs = false;
  if (devParagraphs.length >= 2 && devParagraphs[0] && devParagraphs[1]) {
    const getContentSet = (p: string) =>
      new Set(
        p
          .split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/)
          .map(normalizePt)
          .filter((w) => w.length >= 5 && !PT_STOPWORDS.has(w)),
      );
    const s1 = getContentSet(devParagraphs[0]);
    const s2 = getContentSet(devParagraphs[1]);
    let inter = 0;
    for (const w of s1) if (s2.has(w)) inter++;
    const union = s1.size + s2.size - inter;
    if (union > 10 && inter / union > 0.55) {
      redundantDevs = true;
    }
  }

  let score: number;
  let feedback: string;
  let nextStep: string;

  if (topicAdherence.status === "fuga") {
    score = 0;
    feedback = "Sem relação com o tema proposto, não há defesa de ponto de vista válida para a proposta.";
    nextStep = "Construa uma tese direta respondendo ao problema apresentado na frase temática.";
  } else if (topicAdherence.status === "tangenciamento") {
    score = 80;
    feedback = "Projeto de texto comprometido pelo tangenciamento temático: os argumentos não atacam diretamente o problema central.";
    nextStep = "Defina duas causas concretas do recorte exato do tema e desenvolva cada uma em um parágrafo separado.";
  } else if (wordCount < 90 || paragraphs.length < 2) {
    score = 40;
    feedback = "Argumentação incipiente, sem projeto de texto delimitado nem sustentação consistente de ponto de vista.";
    nextStep = "Planeje a redação antes de escrever: 1 tese na introdução + 2 argumentos distintos nos desenvolvimentos + 1 conclusão.";
  } else if (uniqueOps < 2 || substantialDevs === 0) {
    score = 80;
    feedback =
      "Projeto de texto frágil: os parágrafos de desenvolvimento ainda são rasos ou predominantemente expositivos, com pouca articulação de causas e consequências.";
    nextStep = "Em cada desenvolvimento, siga: tópico frasal (ideia) → explicação da causa → comprovação/exemplo → consequência crítica.";
  } else if (redundantDevs) {
    score = 120;
    feedback =
      "Projeto de texto com redundância argumentativa: os parágrafos de desenvolvimento repetem ideias muito semelhantes em vez de explorar ângulos complementares.";
    nextStep = "Dedique o Desenvolvimento 1 a uma causa (ex.: omissão estatal) e o Desenvolvimento 2 a outro fator (ex.: aspecto cultural ou econômico).";
  } else if (uniqueOps < 4 || !introHasThesis || substantialDevs < 2 || wordCount < 210 || topicAdherence.status === "parcial") {
    score = uniqueOps >= 3 && introHasThesis && wordCount >= 180 ? 160 : 120;
    if (score === 160) {
      feedback =
        "Bom projeto de texto, com defesa clara da tese e desenvolvimento organizado das ideias, restando apenas pequenos ajustes de aprofundamento argumentativo.";
      nextStep =
        "Garanta dois desenvolvimentos equilibrados (cerca de 6–8 linhas cada) explicitando causa e consequência de cada argumento.";
    } else {
      feedback =
        "Projeto de texto presente, mas com argumentação ainda previsível ou pouco desdobrada em um dos parágrafos.";
      nextStep =
        "Anuncie claramente sua tese na introdução e desenvolva dois argumentos completos (mínimo ~45 palavras em cada desenvolvimento) sem lacunas.";
    }
  } else {
    score = 200;
    feedback =
      "Projeto de texto estratégico e autoral: tese nítida na introdução, dois desenvolvimentos consistentes com relações claras de causa e consequência e fechamento coerente.";
    nextStep = "Excelente progressão argumentativa! Mantenha o equilíbrio entre os dois desenvolvimentos.";
  }

  return { score, feedback, nextStep };
}

// ─── COMPETÊNCIA 4: COESÃO TEXTUAL ───────────────────────────────────────────

function avaliarC4(
  text: string,
  paragraphs: string[],
  wordCount: number,
  repeatedWords: Array<{ word: string; count: number }>,
): {
  score: number;
  feedback: string;
  nextStep: string;
  interCount: number;
  repeatedConnectors: string[];
} {
  const interParagraphOpeners = [
    /^(?:em\s+primeiro\s+lugar|primeiramente|a\s+princ[íi]pio|de\s+in[íi]cio|em\s+uma\s+primeira\s+an[áa]lise|em\s+primeiro\s+plano|sob\s+essa\s+(?:[óo]tica|perspectiva)|sob\s+esse\s+prisma|diante\s+desse\s+(?:cen[áa]rio|contexto)|de\s+um\s+lado|inicialmente|nesse\s+contexto|nesse\s+sentido)/i,
    /^(?:em\s+segundo\s+lugar|ademais|outrossim|al[ée]m\s+disso|por\s+outro\s+lado|paralelamente|somado\s+a\s+isso|sob\s+outro\s+prisma|al[ée]m\s+do\s+mais|em\s+contrapartida|de\s+outro\s+lado|a\s+esse\s+(?:cen[áa]rio|quadro)\s+soma-se|outro\s+(?:fator|ponto|aspecto))/i,
    /^(?:portanto|diante\s+disso|diante\s+do\s+exposto|infere-se|conclui-se|logo|em\s+suma|desse\s+modo|dessa\s+forma|assim|urge,?\s+portanto|em\s+s[íi]ntese|frente\s+ao\s+exposto)/i,
  ];

  let interCount = 0;
  for (let i = 1; i < paragraphs.length; i++) {
    const p = (paragraphs[i] || "").trim();
    if (interParagraphOpeners.some((rgx) => rgx.test(p))) {
      interCount++;
    }
  }

  const intraCatalog = [
    "além disso", "no entanto", "todavia", "contudo", "porém", "entretanto",
    "visto que", "desse modo", "nesse sentido", "por conseguinte", "dessa forma",
    "isto é", "ou seja", "com efeito", "haja vista", "consequentemente",
    "assim", "portanto", "logo", "embora", "apesar de", "posto que", "ainda que",
    "de modo que", "com o intuito de", "a fim de", "por meio de", "sob essa ótica",
    "nesse cenário", "nessa perspectiva", "diante disso", "em virtude de", "uma vez que",
    "nesse contexto", "por outro lado", "em contrapartida", "ademais", "outrossim",
    "paralelamente", "conforme", "segundo",
  ];

  const connectorFreq = new Map<string, number>();
  for (const conn of intraCatalog) {
    const matches = text.match(ptRegex(conn.replace(/\s+/g, "\\s+"))) || [];
    if (matches.length > 0) {
      connectorFreq.set(conn, matches.length);
    }
  }

  const uniqueIntraCount = connectorFreq.size;
  const repeatedConnectors = [...connectorFreq.entries()]
    .filter(([, count]) => count >= 3)
    .map(([conn]) => conn);

  // Coesão referencial anafórica (retomadas elegantes)
  const referentialMatches =
    text.match(
      ptRegex(
        "(?:esse|essa|este|esta|tal)\\s+(?:cen[áa]rio|quadro|realidade|problem[áa]tica|quest[ãa]o|fen[ôo]meno|impasse|processo|contraste|medida|direito|panorama)|os\\s+quais|as\\s+quais|o\\s+qual|a\\s+qual|cuj[oa]s?",
      ),
    ) || [];
  const hasReferentialCohesion = referentialMatches.length >= 2;

  const severeWordEcho = repeatedWords.filter((w) => w.count >= 5);

  let score: number;
  let feedback: string;
  let nextStep: string;

  if (wordCount < 75) {
    score = 40;
    feedback = "Texto muito curto para demonstrar articulação coesiva consistente entre frases e parágrafos.";
    nextStep = "Construa parágrafos completos ligados por conectivos variados.";
  } else if (interCount === 0 && uniqueIntraCount < 2) {
    score = 80;
    feedback =
      "Recursos coesivos escassos: faltam conectivos interparágrafos e operadores internos, deixando os períodos justapostos.";
    nextStep = "Inicie D1, D2 e Conclusão com operadores lógicos (ex.: 'Em primeiro lugar', 'Ademais', 'Portanto') e ligue as frases internas.";
  } else if (interCount === 0 || uniqueIntraCount < 3) {
    score = 120;
    feedback =
      interCount === 0
        ? "Coesão mediana: há conectivos internos, mas nenhum parágrafo foi aberto com operador argumentativo interparágrafo (requisito-chave da banca do ENEM)."
        : "Coesão mediana: repertório de conectivos ainda limitado, reduzindo a fluidez entre as ideias.";
    nextStep =
      "Na matriz oficial do ENEM, use pelo menos 2 conectivos interparágrafos (no início de D1/D2/Conclusão) e varie os conectivos internos.";
  } else if (
    interCount >= 2 &&
    uniqueIntraCount >= 5 &&
    paragraphs.length >= 4 &&
    repeatedConnectors.length === 0 &&
    severeWordEcho.length === 0
  ) {
    score = 200;
    feedback = hasReferentialCohesion
      ? `Excelente domínio da coesão textual: ${interCount} transições interparágrafos bem marcadas, ${uniqueIntraCount} operadores internos distintos, boas retomadas referenciais e sem repetições mecânicas.`
      : `Excelente articulação textual: ${interCount} operadores interparágrafos e repertório diversificado de ${uniqueIntraCount} conectivos internos, garantindo leitura fluida.`;
    nextStep = "Excelente coesão! Continue combinando conectivos variados com pronomes de retomada ('esse quadro', 'tal medida').";
  } else {
    score = 160;
    const notes: string[] = [];
    if (interCount < 2) notes.push("adicione conectivo interparágrafo em ao menos dois parágrafos (D1, D2 ou Conclusão)");
    if (repeatedConnectors.length > 0) notes.push(`evite repetir o conectivo "${repeatedConnectors[0]}"`);
    if (severeWordEcho.length > 0) notes.push(`substitua repetições da palavra "${severeWordEcho[0]?.word}" (${severeWordEcho[0]?.count}x) por sinônimos`);
    if (uniqueIntraCount < 5) notes.push("amplie a variedade de conectivos intraparágrafos");

    feedback = `Boa articulação entre as partes do texto (${interCount} transição(ões) interparágrafo e ${uniqueIntraCount} conectivos únicos). Para cravar 200 na C4, ${notes.slice(0, 2).join(" e ")}.`;
    nextStep =
      severeWordEcho.length > 0
        ? `Troque repetições de "${severeWordEcho[0]?.word}" por sinônimos ou pronomes referenciais.`
        : "Garanta conectivos distintos na abertura de D1, D2 e Conclusão e diversifique os enlaces internos.";
  }

  return { score, feedback, nextStep, interCount, repeatedConnectors };
}

// ─── COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO (+ DIREITOS HUMANOS) ─────────────

function avaliarC5(
  text: string,
  paragraphs: string[],
  topicAdherence: z.infer<typeof TopicAdherenceSchema>,
): {
  score: number;
  feedback: string;
  nextStep: string;
  humanRightsViolation: boolean;
  elements: { name: string; found: boolean; detail: string; evidence?: string }[];
} {
  // Checagem de violação de Direitos Humanos (zera a C5 na regra oficial do ENEM)
  const hrViolationRgx = ptRegex(
    "pena\\s+de\\s+morte|tortura(?:r|s)?|linchamento|justi[çc]a\\s+com\\s+as\\s+pr[óo]prias\\s+m[ãa]os|matar\\s+(?:bandidos?|criminosos?|infratores?)|exterm[íi]nio\\s+de|censura\\s+pr[ée]via|trabalho\\s+escravo\\s+como\\s+puni[çc][ãa]o|agress[ãa]o\\s+f[íi]sica\\s+como\\s+solu[çc][ãa]o",
  );
  const hrMatch = text.match(hrViolationRgx);
  if (hrMatch) {
    return {
      score: 0,
      humanRightsViolation: true,
      feedback:
        "A proposta de intervenção fere os Direitos Humanos. Segundo a matriz oficial do INEP, propostas que promovam violência, tortura, justiça com as próprias mãos ou supressão de direitos fundamentais zeram a Competência 5.",
      nextStep: "Reformule a conclusão propondo políticas públicas democráticas, educativas, legais ou sociais que respeitem a dignidade humana.",
      elements: [
        { name: "Agente", found: false, detail: "Anulado por desrespeito aos Direitos Humanos" },
        { name: "Ação", found: false, detail: "Anulado por desrespeito aos Direitos Humanos" },
        { name: "Meio/Modo", found: false, detail: "Anulado por desrespeito aos Direitos Humanos" },
        { name: "Finalidade/Efeito", found: false, detail: "Anulado por desrespeito aos Direitos Humanos" },
        { name: "Detalhamento", found: false, detail: "Anulado por desrespeito aos Direitos Humanos" },
      ],
    };
  }

  const lastParagraph = paragraphs[paragraphs.length - 1] || text;
  const words = text.split(/\s+/).filter(Boolean);
  const tailWords = words.slice(Math.max(0, words.length - 85)).join(" ");
  const targetArea =
    paragraphs.length >= 2 && lastParagraph.length >= 40 ? lastParagraph : tailWords;

  const actionVerbs =
    "criar|elaborar|implementar|promover|garantir|assegurar|fiscalizar|combater|fomentar|investir|articular|desenvolver|ampliar|expandir|fortalecer|regulamentar|ofertar|oferecer|acelerar|incluir|integrar|capacitar|viabilizar|realizar|instituir|atualizar|revisar|reformular|conscientizar|incentivar|construir|estabelecer|adotar|estruturar|priorizar|reduzir|disponibilizar|democratizar|proporcionar|reverter";

  const agentRgx = ptRegex(
    "(?:governo\\s*(?:federal|estadual|municipal)?|minist[ée]rio(?:\\s+d[aeo]s?\\s+[A-ZÀ-ÿa-zà-ÿ]+(?:\\s+[A-ZÀ-ÿa-zà-ÿ]+){0,2})?|secretarias?\\s*(?:de\\s+[A-ZÀ-ÿa-zà-ÿ]+|municipais|estaduais)?|poder\\s+(?:p[úu]blico|executivo|legislativo|judici[áa]rio)|estado|prefeituras?|congresso\\s+nacional|escolas?|institui[çc][õo]es\\s+de\\s+ensino|universidades?|ongs?|terceiro\\s+setor|fam[íi]lias?|m[íi]dia|imprensa|empresas\\s+de\\s+tecnologia|plataformas\\s+digitais|setor\\s+privado|sus|sistema\\s+[úu]nico\\s+de\\s+sa[úu]de|tribunal\\s+de\\s+contas|defensoria\\s+p[úu]blica|minist[ée]rio\\s+p[úu]blico)",
  );
  const actionRgx = ptRegex(
    `(?:deve[mr]?|precisa[mr]?|necessita[mr]?)\\s+(?:${actionVerbs})|(?:cabe|compete)\\s+(?:ao|à|aos|às)[^.!?]{3,180}?(?:${actionVerbs})|(?:[ée]\\s+(?:necess[áa]rio|fundamental|imperativo|urgente|preciso)\\s+que|urge\\s+que)[^.!?]{3,140}?(?:${actionVerbs}|crie[m]?|amplie[m]?|implemente[m]?|promova[m]?|garanta[m]?|fiscalize[m]?|invista[m]?|desenvolva[m]?)`,
  );
  const meansRgx = ptRegex(
    "(?:por\\s+meio\\s+de|mediante|atrav[ée]s\\s+de|por\\s+interm[ée]dio\\s+de|com\\s+o\\s+aux[íi]lio\\s+de|a\\s+partir\\s+de|em\\s+parceria\\s+com|em\\s+conjunto\\s+com|via\\s+)[^,.;!?]{4,65}",
  );
  const effectRgx = ptRegex(
    "(?:a\\s+fim\\s+de|com\\s+o\\s+(?:intuito|objetivo|prop[óo]sito|fito)\\s+de|visando\\s+(?:a|à)|de\\s+modo\\s+a|com\\s+vistas\\s+a|para\\s+que\\s+[^,.;!?]{5,55}|para\\s+(?:garantir|assegurar|combater|mitigar|reduzir|eliminar|melhorar|transformar|reverter|promover|ampliar|proteger|democratizar|efetivar|ajudar|fortalecer)[^,.;!?]{3,55}|assim,\\s+ser[áa]\\s+poss[íi]vel[^.!?]{5,60}|desse\\s+modo,\\s+(?:a|o|ser[áa])[^.!?]{5,60})",
  );
  const detailingRgx = new RegExp(
    "(?:,\\s*(?:(?:órgão|entidade|instituição)\\s+[^,.;!?]{4,55}|responsáve(?:l|is)\\s+por\\s+[^,.;!?]{4,50}|encarregad[oa]s?\\s+de\\s+[^,.;!?]{4,50}|em\\s+especial\\s+[^,.;!?]{4,45}|especialmente\\s+[^,.;!?]{4,45}|sobretudo\\s+[^,.;!?]{4,45}|como\\s+[^,.;!?]{6,45}|tais\\s+como\\s+[^,.;!?]{6,45}|a\\s+exemplo\\s+de\\s+[^,.;!?]{6,45}|com\\s+foco\\s+(?:em|inicial|priorit[áa]rio)[^,.;!?]{4,50}|voltad[ao]s?\\s+(?:a|ao|à|para)[^,.;!?]{4,45}|destinad[ao]s?\\s+(?:a|ao|à|para)[^,.;!?]{4,45}|auditad[ao]s?\\s+por[^,.;!?]{4,40}|com\\s+verbas?\\s+[^,.;!?]{4,40}|com\\s+fiscaliza[çc][ãa]o[^,.;!?]{4,40})|–[^–]{8,65}–|—[^—]{8,65}—|\\b(?:por\\s+meio\\s+de|mediante)\\b[^.!?]{24,}\\b(?:e|com|aliando|envolvendo|contando|incluindo|priorizando)\\b[^.!?]{12,})",
    "i",
  );

  const extractClean = (rgx: RegExp): string | undefined => {
    const m = targetArea.match(rgx);
    if (!m) return undefined;
    return m[0].replace(/^[,;\s]+/, "").trim().slice(0, 75);
  };

  const agentEvidence = extractClean(agentRgx);
  const actionEvidence = extractClean(actionRgx);
  const meansEvidence = extractClean(meansRgx);
  const effectEvidence = extractClean(effectRgx);
  const detailingEvidence = extractClean(detailingRgx);

  const elements: Array<{ name: string; found: boolean; detail: string; evidence?: string }> = [
    {
      name: "Agente",
      found: Boolean(agentEvidence),
      detail: "Quem executará a intervenção (ex.: Ministério da Educação, Governo Federal, escolas)",
      ...(agentEvidence ? { evidence: agentEvidence } : {}),
    },
    {
      name: "Ação",
      found: Boolean(actionEvidence),
      detail: "O que será feito concretamente (ex.: 'deve ampliar', 'cabe implementar')",
      ...(actionEvidence ? { evidence: actionEvidence } : {}),
    },
    {
      name: "Meio/Modo",
      found: Boolean(meansEvidence),
      detail: "Como a ação será executada (ex.: 'por meio de verbas vinculadas e oficinas escolares')",
      ...(meansEvidence ? { evidence: meansEvidence } : {}),
    },
    {
      name: "Finalidade/Efeito",
      found: Boolean(effectEvidence),
      detail: "Qual objetivo social se busca atingir (ex.: 'a fim de reduzir a desigualdade')",
      ...(effectEvidence ? { evidence: effectEvidence } : {}),
    },
    {
      name: "Detalhamento",
      found: Boolean(detailingEvidence),
      detail: "Explicação, exemplo ou especificação de um dos 4 elementos (ex.: 'órgão responsável por...', 'com foco inicial em...')",
      ...(detailingEvidence ? { evidence: detailingEvidence } : {}),
    },
  ];

  const foundCount = elements.filter((e) => e.found).length;
  const missingElements = elements.filter((e) => !e.found);

  let score = foundCount * 40;
  if (topicAdherence.status === "fuga") {
    score = 0;
  } else if (topicAdherence.status === "tangenciamento" && score > 120) {
    score = 120;
  } else if (paragraphs.length < 2 && score > 120) {
    score = 120;
  }

  let feedback: string;
  let nextStep: string;

  if (foundCount === 5 && score === 200) {
    feedback =
      "Proposta de intervenção completa (5/5 elementos válidos): Agente, Ação, Meio/Modo, Finalidade e Detalhamento estão articulados ao texto e respeitam os Direitos Humanos.";
    nextStep = "Proposta nota 200! Certifique-se sempre de que ela resolve diretamente os dois problemas citados em D1 e D2.";
  } else if (foundCount === 4) {
    feedback = `Proposta bem estruturada (4/5 elementos presentes). Faltou explicitar: ${missingElements[0]?.name}.`;
    nextStep = `Inclua ${missingElements[0]?.name} (${missingElements[0]?.detail}) para ganhar os +40 pontos restantes na C5.`;
  } else if (foundCount === 3) {
    feedback = `Proposta mediana (3/5 elementos identificados). Faltam: ${missingElements.map((e) => e.name).join(" e ")}.`;
    nextStep = `Complete a conclusão respondendo explicitamente a: ${missingElements.map((e) => e.name).join(" + ")}.`;
  } else if (foundCount === 2) {
    feedback = `Proposta incompleta (2/5 elementos). Ainda faltam: ${missingElements.map((e) => e.name).join(", ")}.`;
    nextStep = "Use a estrutura-guia: 'Portanto, cabe ao [Agente], [detalhamento do agente], [Ação], por meio de [Meio], a fim de [Finalidade].'";
  } else if (foundCount === 1) {
    feedback = "Proposta incipiente: apenas 1 elemento válido foi identificado na conclusão.";
    nextStep = "Desenvolva um parágrafo conclusivo dedicado com Agente, Ação, Meio/Modo, Finalidade e Detalhamento.";
  } else {
    feedback =
      "Ausência de proposta de intervenção social válida na conclusão. No ENEM, a conclusão precisa propor uma solução concreta ao problema discutido.";
    nextStep = "Reserve o último parágrafo para propor quem deve agir, o que fazer, por qual meio, com qual finalidade e detalhando um desses pontos.";
  }

  return { score, feedback, nextStep, humanRightsViolation: false, elements };
}

// ─── RAIO-X POR PARÁGRAFO ────────────────────────────────────────────────────

function avaliarParagrafos(
  paragraphs: string[],
  repertoireFound: { label: string; excerpt: string }[],
  c5Count: number,
): Array<z.infer<typeof ParagraphFeedbackSchema>> {
  const total = paragraphs.length;
  return paragraphs.map((p, i) => {
    const wc = p.split(/\s+/).filter(Boolean).length;
    let role = `Parágrafo ${i + 1}`;
    if (total >= 4) {
      if (i === 0) role = "Introdução";
      else if (i === total - 1) role = "Conclusão";
      else role = `Desenvolvimento ${i}`;
    } else if (total === 3) {
      role = i === 0 ? "Introdução" : i === 1 ? "Desenvolvimento" : "Conclusão";
    } else if (total === 2) {
      role = i === 0 ? "Introdução / Desenvolvimento" : "Conclusão";
    } else {
      role = "Bloco único (sem divisão)";
    }

    let status: "forte" | "atencao" | "incompleto" = "forte";
    let comment = "";

    if (total === 1) {
      status = "incompleto";
      comment = `Texto sem divisão de parágrafos (${wc} palavras). Separe em Introdução, Desenvolvimento 1, Desenvolvimento 2 e Conclusão.`;
    } else if (i === 0) {
      const hasRep = repertoireFound.some((r) => p.includes(r.excerpt.slice(0, 18)));
      if (wc < 28) {
        status = "incompleto";
        comment = `Introdução curta (${wc} palavras). Contextualize o tema e finalize com uma tese clara antecipando seus 2 argumentos.`;
      } else if (wc > 95) {
        status = "atencao";
        comment = `Introdução extensa (${wc} palavras). Tente deixá-la mais objetiva (4 a 6 linhas) para sobrar espaço aos desenvolvimentos.`;
      } else {
        status = "forte";
        comment = hasRep
          ? `Introdução equilibrada (${wc} palavras), com contextualização por repertório e boa entrada para o desenvolvimento.`
          : `Introdução bem dimensionada (${wc} palavras). Dica: iniciar com um repertório sociocultural já fortalece a C2 logo no começo.`;
      }
    } else if (i === total - 1) {
      if (wc < 30 || c5Count <= 2) {
        status = "incompleto";
        comment = `Conclusão incompleta (${wc} palavras · ${c5Count}/5 elementos na C5). Garanta Agente, Ação, Meio/Modo, Finalidade e Detalhamento.`;
      } else if (c5Count < 5) {
        status = "atencao";
        comment = `Boa conclusão (${wc} palavras · ${c5Count}/5 elementos na C5). Falta apenas completar o elemento ausente para atingir 200 pontos.`;
      } else {
        status = "forte";
        comment = `Conclusão completa (${wc} palavras) com todos os 5 elementos da proposta de intervenção articulados.`;
      }
    } else {
      const hasOpener =
        /^(?:em\s+primeiro|primeiramente|a\s+princ[íi]pio|em\s+segundo|ademais|outrossim|al[ée]m\s+disso|por\s+outro\s+lado|sob\s+essa|diante|nesse|paralelamente|somado)/i.test(
          p.trim(),
        );
      if (wc < 38) {
        status = "incompleto";
        comment = `${role} raso (${wc} palavras). Aprofunde a causa/consequência do argumento com um exemplo concreto ou repertório.`;
      } else if (!hasOpener) {
        status = "atencao";
        comment = `${role} com boa extensão (${wc} palavras), mas sem conectivo interparágrafo na abertura — incluir um eleva a C4.`;
      } else {
        status = "forte";
        comment = `${role} bem desenvolvido (${wc} palavras), com conector de abertura adequado e espaço consistente para argumentação.`;
      }
    }

    return {
      index: i,
      role,
      status,
      wordCount: wc,
      comment,
    };
  });
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
  const neutralTopic: z.infer<typeof TopicAdherenceSchema> = {
    status: "completo",
    matchedKeywords: [],
    comment: "",
  };

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
    const r1 = avaliarC1(text, [text], Math.max(words, 160));
    const score = Math.max(40, r1.score);
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    const strengths: string[] = [];
    const tips: string[] = [];

    if (r1.findings.length === 0) {
      strengths.push("Bom registro formal, sem desvios gramaticais ou marcas evidentes de oralidade.");
    } else if (r1.findings[0]) {
      tips.push(`Ajuste "${r1.findings[0].excerpt}": ${r1.findings[0].reason} (Sugestão: ${r1.findings[0].fix})`);
    }
    if (tips.length === 0) {
      tips.push("Mantenha o foco na pontuação precisa entre orações subordinadas e uso da crase.");
    }

    return {
      score,
      status,
      feedback: r1.feedback,
      strengths: strengths.length > 0 ? strengths : ["Texto compreensível e estruturado."],
      tips,
    };
  }

  if (comp === "C2") {
    const r2 = avaliarC2(text, [text], Math.max(words, 200), neutralTopic);
    const hasNominal = r2.repertoireFound.length > 0;
    const score = hasNominal ? 200 : words >= 35 ? 160 : 120;
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    const strengths: string[] = [];
    const tips: string[] = [];

    if (hasNominal && r2.repertoireFound[0]) {
      strengths.push(`Repertório legitimado identificado: ${r2.repertoireFound[0].label}.`);
      strengths.push("Boa articulação com a proposta do exercício.");
      tips.push("Sempre interprete o repertório ligando-o diretamente à sua tese sobre o tema.");
    } else {
      strengths.push("Desenvolvimento coerente da ideia em relação ao tema.");
      tips.push(`Para nota máxima na C2 sobre "${topic}", cite uma lei (Constituição de 1988), pensador ou dado oficial (IBGE/ONU).`);
    }

    return {
      score,
      status,
      feedback:
        hasNominal && r2.repertoireFound[0]
          ? `Excelente aplicação de repertório sociocultural legitimado (${r2.repertoireFound[0].label})!`
          : "Bom desenvolvimento da ideia, porém o repertório ainda permanece no senso comum. Adicione uma referência legitimada.",
      strengths,
      tips,
    };
  }

  if (comp === "C3") {
    const hasCausal = /\b(visto que|porque|uma vez que|em virtude de|haja vista|desse modo|consequentemente|contudo|portanto)\b/i.test(text);
    const score = words >= 38 && hasCausal ? 200 : words >= 28 ? 160 : 120;
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    return {
      score,
      status,
      feedback:
        score >= 160
          ? `Ótimo direcionamento argumentativo na seção (${section}) com defesa clara de ponto de vista.`
          : "Argumentação compreensível, mas pode aprofundar mais a relação de causa e consequência.",
      strengths: [
        hasCausal
          ? "Uso de operadores que explicitam relação de causa e consequência."
          : "Posicionamento coerente diante da problemática.",
      ],
      tips: ["Explique claramente o porquê do problema e qual impacto ele gera na sociedade."],
    };
  }

  if (comp === "C4") {
    const hasConns = /\b(portanto|ademais|além disso|nesse sentido|sob essa ótica|visto que|contudo|entretanto|desse modo|diante disso|outrossim)\b/i.test(text);
    const score = hasConns && words >= 25 ? 200 : hasConns ? 160 : words >= 20 ? 120 : 80;
    const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : "regular";
    return {
      score,
      status,
      feedback: hasConns
        ? "Ótimo emprego de operadores coesivos para articular os períodos com fluidez!"
        : "O trecho precisa de operadores coesivos explícitos (ex.: 'Nesse contexto', 'Ademais', 'Por conseguinte').",
      strengths: hasConns ? ["Emprego funcional de conectivos.", "Boa fluidez de leitura."] : ["Estrutura frasal compreensível."],
      tips: hasConns
        ? ["Continue variando os conectivos para não repeti-los ao longo da redação."]
        : ["Inicie os períodos com conectivos variados como 'Sob essa perspectiva' ou 'Ademais'."],
    };
  }

  const r5 = avaliarC5(text, [text], neutralTopic);
  const foundCount = r5.elements.filter((e) => e.found).length;
  const score = r5.humanRightsViolation ? 0 : Math.max(40, foundCount * 40);
  const status = score >= 160 ? "excelente" : score >= 120 ? "bom" : score >= 80 ? "regular" : "insuficiente";
  const missing = r5.elements.filter((e) => !e.found).map((e) => e.name);

  return {
    score,
    status,
    feedback: r5.feedback,
    strengths: r5.elements.filter((e) => e.found).map((e) => `${e.name} identificado${e.evidence ? `: "${e.evidence}"` : "."}`),
    tips: missing.length > 0 ? [`Adicione explicitamente: ${missing.join(", ")} para alcançar 200 na C5.`] : [r5.nextStep],
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

// ─── MOTOR PRINCIPAL CALIBRADO NO PADRÃO OFICIAL DO INEP ─────────────────────

function buildCompetency(
  id: "C1" | "C2" | "C3" | "C4" | "C5",
  rawScore: number,
  technicalFeedback: string,
  nextStep?: string,
) {
  const score = clampInepScore(rawScore);
  const meta = INEP_MATRIX[id];
  const level = Math.max(0, Math.min(5, Math.round(score / 40)));
  const descriptor = meta.levels[score] || meta.levels[0] || "";
  return {
    name: `${id} · ${meta.shortName}`,
    score,
    level,
    descriptor,
    feedback: technicalFeedback,
    ...(nextStep ? { nextStep } : {}),
  };
}

export function evaluateEssayHeuristically(
  essayText: string,
  context?: {
    topic?: string | undefined;
    themeHint?: string | undefined;
    targetScore?: string | undefined;
    college?: string | undefined;
    course?: string | undefined;
    telemetry?: WritingTelemetry | null | undefined;
  },
): CorrectionResult {
  const text = essayText.trim();
  const paragraphs = extractParagraphs(text);
  const textMetrics = computeTextMetrics(text, paragraphs, context?.topic, context?.themeHint);
  const aiDetection = analyzeAiAuthorship(text, context?.telemetry);
  const topicAdherence = avaliarAderenciaTema(text, context?.topic, context?.themeHint);

  // ── Checagem eliminatória (nota zero oficial ENEM: texto < 7 linhas, desconexo ou fuga total) ──
  const qualityZero = checkEliminatoryQuality(text, textMetrics.wordCount);
  const zeroReason =
    qualityZero ||
    (topicAdherence.status === "fuga" ? topicAdherence.comment : undefined);

  if (zeroReason) {
    const emptyC5 = [
      { name: "Agente", found: false, detail: "Avaliação zerada por critério eliminatório do ENEM." },
      { name: "Ação", found: false, detail: "Avaliação zerada por critério eliminatório do ENEM." },
      { name: "Meio/Modo", found: false, detail: "Avaliação zerada por critério eliminatório do ENEM." },
      { name: "Finalidade/Efeito", found: false, detail: "Avaliação zerada por critério eliminatório do ENEM." },
      { name: "Detalhamento", found: false, detail: "Avaliação zerada por critério eliminatório do ENEM." },
    ];
    return CorrectionSchema.parse({
      score: 0,
      overallSummary: `Redação anulada pela banca (0 pontos): ${zeroReason}`,
      zeroReason,
      evaluationMode: "oficial_calibrado",
      topicAdherence,
      textMetrics,
      paragraphFeedback: avaliarParagrafos(paragraphs, [], 0),
      competencies: [
        buildCompetency("C1", 0, zeroReason, "Escreva um texto dissertativo completo em língua portuguesa padrão."),
        buildCompetency("C2", 0, zeroReason, "Aborde diretamente as palavras-chave da frase temática em 4 parágrafos."),
        buildCompetency("C3", 0, zeroReason, "Apresente tese clara e 2 argumentos desenvolvidos sobre o tema."),
        buildCompetency("C4", 0, zeroReason, "Articule frases e parágrafos com conectivos variados."),
        buildCompetency("C5", 0, zeroReason, "Inclua proposta de intervenção completa na conclusão."),
      ],
      c5Elements: emptyC5,
      strengths: ["Você iniciou o rascunho no laboratório — ajuste o texto seguindo o diagnóstico acima."],
      improvements: [
        zeroReason,
        "Escreva entre 20 e 30 linhas (cerca de 220 a 350 palavras) divididas em Introdução, Desenvolvimento 1, Desenvolvimento 2 e Conclusão.",
      ],
      annotations: [],
      aiDetection,
    });
  }

  const r1 = avaliarC1(text, paragraphs, textMetrics.wordCount);
  const r2 = avaliarC2(text, paragraphs, textMetrics.wordCount, topicAdherence);
  const r3 = avaliarC3(text, paragraphs, textMetrics.wordCount, topicAdherence);
  const r4 = avaliarC4(text, paragraphs, textMetrics.wordCount, textMetrics.repeatedWords);
  const r5 = avaliarC5(text, paragraphs, topicAdherence);

  const totalScore = r1.score + r2.score + r3.score + r4.score + r5.score;
  const c5FoundCount = r5.elements.filter((e) => e.found).length;
  const paragraphFeedback = avaliarParagrafos(paragraphs, r2.repertoireFound, c5FoundCount);

  // ── Diagnóstico Executivo Geral ──
  const targetNum = context?.targetScore ? parseInt(context.targetScore, 10) : 900;
  const lowestComp = [
    { id: "C1", name: "Norma culta", score: r1.score },
    { id: "C2", name: "Tema e repertório", score: r2.score },
    { id: "C3", name: "Projeto de texto", score: r3.score },
    { id: "C4", name: "Coesão", score: r4.score },
    { id: "C5", name: "Proposta de intervenção", score: r5.score },
  ].sort((a, b) => a.score - b.score)[0]!;

  let overallSummary: string;
  if (totalScore >= 920) {
    overallSummary = `Redação de altíssimo nível (${totalScore}/1000), alinhada ao padrão de excelência do INEP. Estrutura dissertativa madura, boa articulação temática e argumento convincente.`;
  } else if (totalScore >= 800) {
    overallSummary = `Ótima base dissertativa (${totalScore}/1000). Você já demonstra domínio consistente do modelo ENEM; o ganho mais rápido para passar de ${Math.max(900, targetNum)} está em ${lowestComp.id} (${lowestComp.name}: ${lowestComp.score}/200).`;
  } else if (totalScore >= 640) {
    overallSummary = `Redação intermediária (${totalScore}/1000), com estrutura compreensível, mas com perdas evitáveis principalmente em ${lowestComp.id} (${lowestComp.name}: ${lowestComp.score}/200). Ajustando os pontos listados abaixo, sua nota sobe rapidamente.`;
  } else {
    overallSummary = `Redação em fase de construção (${totalScore}/1000). Foque primeiro em consolidar os 4 parágrafos, garantir aderência direta ao tema e corrigir ${lowestComp.id} (${lowestComp.name}: ${lowestComp.score}/200).`;
  }

  // ── Pontos fortes concretos ──
  const strengths: string[] = [];
  if (topicAdherence.status === "completo" && topicAdherence.matchedKeywords.length > 0) {
    strengths.push(`Boa aderência ao recorte temático, retomando conceitos-chave (${topicAdherence.matchedKeywords.slice(0, 3).join(", ")}).`);
  }
  if (r1.score >= 160) {
    strengths.push("Registro formal consistente e boa clareza sintática na modalidade escrita padrão (C1).");
  }
  if (r2.repertoireFound.length > 0 && r2.score >= 160) {
    strengths.push(`Repertório sociocultural legitimado bem mobilizado: ${r2.repertoireFound.map((r) => r.label).slice(0, 2).join(" e ")} (C2).`);
  }
  if (r3.score >= 160) {
    strengths.push("Projeto de texto organizado, com defesa nítida de tese e relações de causa e consequência (C3).");
  }
  if (r4.score >= 160) {
    strengths.push(`Boa articulação coesiva com ${r4.interCount} operador(es) interparágrafo e fluidez entre os períodos (C4).`);
  }
  if (r5.score >= 160) {
    strengths.push(`Proposta de intervenção sólida (${c5FoundCount}/5 elementos presentes) e alinhada aos Direitos Humanos (C5).`);
  }
  if (strengths.length === 0) {
    strengths.push("Iniciativa de estruturar um texto argumentativo enfrentando a proposta temática.");
  }

  // ── Melhorias prioritárias ordenadas pelo maior ganho de nota ──
  const improvements: string[] = [];
  const sortedGaps = [
    { id: "C5", score: r5.score, tip: r5.nextStep },
    { id: "C2", score: r2.score, tip: r2.nextStep },
    { id: "C3", score: r3.score, tip: r3.nextStep },
    { id: "C4", score: r4.score, tip: r4.nextStep },
    { id: "C1", score: r1.score, tip: r1.nextStep },
  ]
    .filter((g) => g.score < 200)
    .sort((a, b) => a.score - b.score);

  for (const gap of sortedGaps.slice(0, 4)) {
    improvements.push(`${gap.id} (${gap.score}/200): ${gap.tip}`);
  }
  if (improvements.length === 0) {
    improvements.push(
      `Desempenho máximo simulado! Para manter esse nível rumo a ${context?.course || "sua aprovação"}, continue treinando temas variados sob cronômetro.`,
    );
  }

  // ── Anotações literais exatas no texto (sem "..." para garantir grifo 100% preciso) ──
  const annotations: Array<z.infer<typeof AnnotationSchema>> = [];
  const usedExcerpts = new Set<string>();
  const pushAnnotation = (ann: z.infer<typeof AnnotationSchema>) => {
    const clean = ann.excerpt.trim();
    if (clean.length < 3 || usedExcerpts.has(clean.toLowerCase())) return;
    if (!text.toLowerCase().includes(clean.toLowerCase())) return;
    usedExcerpts.add(clean.toLowerCase());
    annotations.push({ ...ann, excerpt: clean });
  };

  // Erros C1 reais (com reescrita!)
  for (const f of r1.findings.slice(0, 3)) {
    if (f.excerpt) {
      pushAnnotation({
        excerpt: f.excerpt,
        suggestion: f.reason,
        rewrite: f.fix,
        type: "erro",
        competency: "C1",
      });
    }
  }

  // Repetição lexical na C4
  if (textMetrics.repeatedWords[0] && textMetrics.repeatedWords[0].count >= 5) {
    const repWord = textMetrics.repeatedWords[0];
    const ex = findLiteralExcerpt(text, ptRegex(repWord.word), 18);
    if (ex) {
      pushAnnotation({
        excerpt: ex,
        suggestion: `A palavra "${repWord.word}" apareceu ${repWord.count} vezes no texto. Substitua algumas ocorrências por sinônimos ou pronomes referenciais.`,
        type: "erro",
        competency: "C4",
      });
    }
  }

  // Erro C5 (elemento faltante na conclusão)
  const missingC5 = r5.elements.find((e) => !e.found);
  if (missingC5 && r5.score < 200 && paragraphs.length > 0) {
    const lastP = paragraphs[paragraphs.length - 1] || "";
    const firstSentence = lastP.match(/^[^.!?]{15,80}/)?.[0]?.trim();
    if (firstSentence) {
      pushAnnotation({
        excerpt: firstSentence,
        suggestion: `Proposta de intervenção com ${c5FoundCount}/5 elementos: adicione "${missingC5.name}" (${missingC5.detail}) para ganhar +40 pontos.`,
        type: "erro",
        competency: "C5",
      });
    }
  }

  // Acertos C2 (Repertório)
  if (r2.repertoireFound[0]) {
    pushAnnotation({
      excerpt: r2.repertoireFound[0].excerpt,
      suggestion: `${r2.repertoireFound[0].label}: repertório sociocultural legitimado que fortalece a fundamentação da tese.`,
      type: "acerto",
      competency: "C2",
    });
  }

  // Acertos C4 (Conectivos interparágrafos em D2 e Conclusão)
  if (paragraphs.length >= 3 && paragraphs[2]) {
    const d2Conn = findLiteralExcerpt(
      paragraphs[2],
      /^(?:ademais|outrossim|al[ée]m\s+disso|por\s+outro\s+lado|em\s+segundo\s+lugar|paralelamente|somado\s+a\s+isso)/i,
      20,
    );
    if (d2Conn) {
      pushAnnotation({
        excerpt: d2Conn,
        suggestion: "Excelente conector interparágrafo abrindo o 2º desenvolvimento, garantindo progressão coesiva.",
        type: "acerto",
        competency: "C4",
      });
    }
  }

  const concConn = findLiteralExcerpt(
    paragraphs[paragraphs.length - 1] || "",
    /^(?:portanto|diante\s+disso|diante\s+do\s+exposto|em\s+suma|infere-se|conclui-se|logo|desse\s+modo|dessa\s+forma)/i,
    22,
  );
  if (concConn) {
    pushAnnotation({
      excerpt: concConn,
      suggestion: "Conectivo conclusivo bem empregado na abertura da proposta de intervenção.",
      type: "acerto",
      competency: "C4",
    });
  }

  return CorrectionSchema.parse({
    score: totalScore,
    overallSummary,
    evaluationMode: "oficial_calibrado",
    topicAdherence,
    textMetrics,
    paragraphFeedback,
    competencies: [
      buildCompetency("C1", r1.score, r1.feedback, r1.nextStep),
      buildCompetency("C2", r2.score, r2.feedback, r2.nextStep),
      buildCompetency("C3", r3.score, r3.feedback, r3.nextStep),
      buildCompetency("C4", r4.score, r4.feedback, r4.nextStep),
      buildCompetency("C5", r5.score, r5.feedback, r5.nextStep),
    ],
    c5Elements: r5.elements,
    strengths: strengths.slice(0, 5),
    improvements: improvements.slice(0, 5),
    annotations: annotations.slice(0, 8),
    aiDetection,
  });
}

// ─── SERVER FUNCTION ──────────────────────────────────────────────────────────

export const correctEssay = createServerFn({ method: "POST" })
  .validator((input: unknown) => EssayInput.parse(input))
  .handler(async ({ data }) => {
    const trimmed = data.essay.trim();
    const paragraphs = extractParagraphs(trimmed);
    const textMetrics = computeTextMetrics(trimmed, paragraphs, data.topic, data.themeHint);
    const localAiReport = analyzeAiAuthorship(trimmed, data.telemetry);

    // Guardrail imediato: se o texto for gibberish ou < 7 linhas, não desperdiça chamada de LLM
    const immediateZero = checkEliminatoryQuality(trimmed, textMetrics.wordCount);
    if (immediateZero) {
      return evaluateEssayHeuristically(trimmed, {
        ...(data.topic ? { topic: data.topic } : {}),
        ...(data.themeHint ? { themeHint: data.themeHint } : {}),
        ...(data.course ? { course: data.course } : {}),
        ...(data.college ? { college: data.college } : {}),
        ...(data.targetScore ? { targetScore: data.targetScore } : {}),
        ...(data.telemetry ? { telemetry: data.telemetry } : {}),
      });
    }

    const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || process.env["LOVABLE_API_KEY"];

    if (apiKey && !apiKey.startsWith("AQ.")) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });

        const goalContext =
          data.course && data.college
            ? `O candidato pretende ingressar em ${data.course} na instituição ${data.college}, com meta de atingir ${data.targetScore || 900} pontos no ENEM.`
            : `O candidato tem como objetivo alcançar ${data.targetScore || 900} pontos no ENEM.`;

        const topicSection = data.topic
          ? `TEMA OFICIAL PROPOSTO: "${data.topic}"${data.themeHint ? `\nRECORTE / ORIENTAÇÃO DO TEMA: ${data.themeHint}` : ""}`
          : "TEMA OFICIAL PROPOSTO: Tema livre (avalie a clareza do recorte definido pelo próprio candidato).";

        const result = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: GeminiCorrectionSchema,
          prompt: `Você é um corretor sênior da banca oficial de redação do ENEM (INEP) e auditor de autenticidade autoral.
Avalie a redação abaixo com RIGOR REALISTA e DIDATISMO — sem inflar notas facilmente, mas sendo justo quando o texto realmente merece.
${goalContext}
${topicSection}

REGRAS ELIMINATÓRIAS OFICIAIS DO INEP (NOTA ZERO):
- Fuga total ao tema proposto → zera a redação inteira (score = 0, todas competências = 0, preencha zeroReason).
- Texto desconexo, não dissertativo ou com menos de 7 linhas → nota zero (preencha zeroReason).
- Proposta de intervenção que desrespeita os Direitos Humanos → zera a C5 (0 pontos na C5).

MATRIZ OFICIAL DO INEP (cada competência DEVE ser exatamente 0, 40, 80, 120, 160 ou 200):
- C1 (Domínio da norma culta): 200 exige sintaxe excelente e no máximo 2 desvios leves isolados. Verifique ortografia, acentuação, crase, regência, concordância, pontuação e registro impessoal.
- C2 (Compreensão do tema, estrutura e repertório): Verifique aderência ao TEMA OFICIAL PROPOSTO! Tangenciamento limita C2 a 40. Sem repertório sociocultural legitimado externo = máximo 120. Repertório citado mas pouco articulado = 160. Repertório legitimado, pertinente E produtivo + 4 parágrafos bem estruturados = 200.
- C3 (Projeto de texto e argumentação): Verifique tese clara na introdução, 2 desenvolvimentos consistentes sem lacunas nem contradições, causalidade e autoria crítica.
- C4 (Coesão): 200 exige presença expressiva de conectivos intraparágrafos, AO MENOS 2 operadores interparágrafos (abrindo D1/D2/Conclusão) e ausência de repetições lexicais/conectivas excessivas.
- C5 (Proposta de intervenção — 40 pts por elemento válido): Agente (não nulo — "alguém/todos" não conta), Ação concreta, Meio/Modo, Finalidade/Efeito e Detalhamento de um dos 4 elementos. Preencha 'c5Elements' com os 5 itens e coloque em 'evidence' o trecho literal encontrado no texto quando found=true.

INSTRUÇÕES OBRIGATÓRIAS DE QUALIDADE DO FEEDBACK:
1. 'overallSummary': resumo executivo em 2–3 frases explicando a nota geral, o maior ponto forte e o principal gargalo para subir de patamar.
2. 'topicAdherence': avalie honestamente se o texto fez abordagem 'completo', 'parcial', 'tangenciamento' ou 'fuga' em relação ao TEMA OFICIAL PROPOSTO.
3. 'competencies': retorne EXATAMENTE 5 itens na ordem C1, C2, C3, C4, C5. Em cada item, preencha 'name' ("C1 · Domínio da norma culta", etc.), 'score' (múltiplo de 40), 'level' (score/40), 'descriptor', 'feedback' (específico citando fatos do texto do aluno!) e 'nextStep' (passo prático para subir +40 pts).
4. 'paragraphFeedback': analise CADA parágrafo do texto (index 0, 1, 2...) com 'role' ("Introdução", "Desenvolvimento 1", "Desenvolvimento 2", "Conclusão"), 'status' ("forte", "atencao" ou "incompleto"), 'wordCount' e 'comment' objetivo.
5. 'annotations': forneça de 4 a 8 anotações (misturando 'erro' e 'acerto') com 'competency' ("C1"–"C5"). CRÍTICO: 'excerpt' DEVE ser uma cópia LITERAL EXATA de um trecho curto (15 a 75 caracteres) do texto do participante, SEM reticências ("...") nem alterações, para funcionar o destaque no editor. Nos erros, preencha 'rewrite' com uma sugestão concreta de reescrita.
6. 'aiAssessment': avalie com justiça se o texto parece gerado por IA (ChatGPT/Gemini/Claude). NÃO penalize alunos reais apenas por usarem conectivos padrão de cursinho ("Ademais", "Portanto", "Constituição de 1988"). Dê >= 70 só com padrão sintético forte; 45–69 se duvidoso; < 45 se parecer humano.

TEXTO DO PARTICIPANTE:
${trimmed}`,
        });

        if (result?.object) {
          const { aiAssessment, ...correctionBase } = result.object;
          const mergedAiDetection = mergeServerAiAssessment(localAiReport, aiAssessment);

          // Normaliza pontuações para múltiplos exatos de 40 e garante soma matemática exata
          const ids: Array<"C1" | "C2" | "C3" | "C4" | "C5"> = ["C1", "C2", "C3", "C4", "C5"];
          const normalizedCompetencies = ids.map((id, idx) => {
            const raw = correctionBase.competencies[idx];
            const score = clampInepScore(raw?.score ?? 0);
            const meta = INEP_MATRIX[id];
            const level = Math.round(score / 40);
            return {
              name: raw?.name?.startsWith(id) ? raw.name : `${id} · ${meta.shortName}`,
              score,
              level,
              descriptor: raw?.descriptor || meta.levels[score] || meta.levels[0] || "",
              feedback: raw?.feedback || meta.levels[score] || "",
              ...(raw?.nextStep ? { nextStep: raw.nextStep } : {}),
            };
          });

          const computedTotal = correctionBase.zeroReason
            ? 0
            : normalizedCompetencies.reduce((acc, c) => acc + c.score, 0);

          // Filtra anotações garantindo que o excerpt exista no texto (remove reticências se o modelo colocou)
          const cleanAnnotations = (correctionBase.annotations || [])
            .map((a) => ({
              ...a,
              excerpt: a.excerpt.replace(/^[…."“]+|[…."”]+$/g, "").trim(),
            }))
            .filter((a) => a.excerpt.length >= 4);

          return CorrectionSchema.parse({
            ...correctionBase,
            score: computedTotal,
            evaluationMode: "gemini",
            textMetrics,
            competencies: normalizedCompetencies,
            annotations: cleanAnnotations,
            aiDetection: mergedAiDetection,
          });
        }
      } catch (err: unknown) {
        console.warn(
          "[correctEssay] Gemini API indisponível. Usando motor oficial ENEM calibrado:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    return evaluateEssayHeuristically(trimmed, {
      ...(data.topic ? { topic: data.topic } : {}),
      ...(data.themeHint ? { themeHint: data.themeHint } : {}),
      ...(data.course ? { course: data.course } : {}),
      ...(data.college ? { college: data.college } : {}),
      ...(data.targetScore ? { targetScore: data.targetScore } : {}),
      ...(data.telemetry ? { telemetry: data.telemetry } : {}),
    });
  });
