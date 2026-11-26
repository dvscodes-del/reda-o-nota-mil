export interface WritingTelemetry {
  pasteAttempts: number;
  pastedChars: number;
  largeInsertChars: number;
  typedChars: number;
  backspaces: number;
  tabSwitches: number;
  startedAt: number | null;
  submittedAt?: number | undefined;
}

export interface AiDetectionSignal {
  label: string;
  severity: "alto" | "medio" | "baixo";
  detail: string;
}

export interface AiDetectionReport {
  aiProbability: number; // 0 a 100
  verdict: "humano" | "suspeito" | "provavel_ia";
  blocked: boolean;
  summary: string;
  signals: AiDetectionSignal[];
  flaggedExcerpts: string[];
  telemetrySummary?: {
    pasteAttempts: number;
    largeInsertPercent: number;
    writingSeconds: number;
    wordsPerMinute: number;
  };
}

// ─── PADRÕES LINGUÍSTICOS CARACTERÍSTICOS DE LLMs EM REDAÇÕES PT-BR ───────────

// Marcadores diretos de resposta copiada de chat de IA (peso crítico)
const CHAT_ARTIFACT_PATTERNS: Array<{ rgx: RegExp; label: string }> = [
  { rgx: /\b(claro!?\s+aqui\s+est[áa]|certamente!?\s+segue|com\s+certeza,?\s+posso|espero\s+que\s+(esta|essa)\s+reda[çc][ãa]o|se\s+precisar\s+de\s+ajustes)\b/i, label: "Saudação/encerramento típico de chat de IA" },
  { rgx: /\*\*[^*\n]{3,60}\*\*/, label: "Formatação Markdown (**negrito**) de chat de IA" },
  { rgx: /^#{1,3}\s+\S/m, label: "Cabeçalho Markdown (#) típico de saída de IA" },
  { rgx: /^\s*[-•*]\s+\*\*[^*\n]+\*\*:/m, label: "Lista estruturada em tópicos no padrão de IA" },
  { rgx: /\b(t[íi]tulo\s+sugerido|introdu[çc][ãa]o:|desenvolvimento\s*[12]:|conclus[ãa]o:)\b/i, label: "Rótulos estruturais explícitos de modelo gerado por IA" },
];

// Fraseologia recorrente de modelos generativos (GPT, Gemini, Claude) em PT-BR
const AI_PHRASE_PATTERNS: Array<{ rgx: RegExp; weight: number; phrase: string }> = [
  { rgx: /\bcen[áa]rio\s+(contempor[âa]neo|atual|multifacetado|complexo)\b/gi, weight: 8, phrase: "cenário contemporâneo/multifacetado" },
  { rgx: /\bquest[ãa]o\s+(complexa|multifacetada|intr[íi]nseca)\b/gi, weight: 8, phrase: "questão complexa/multifacetada" },
  { rgx: /\bdesempenha[rm]?\s+um\s+papel\s+(fundamental|crucial|essencial|vital)\b/gi, weight: 10, phrase: "desempenha um papel fundamental/crucial" },
  { rgx: /\bpapel\s+(crucial|fundamental|vital|primordial)\b/gi, weight: 7, phrase: "papel crucial/fundamental" },
  { rgx: /\btecido\s+social\b/gi, weight: 8, phrase: "tecido social" },
  { rgx: /\b[ée]\s+(imperativo|imprescind[íi]vel|crucial|fundamental|indispens[áa]vel)\s+que\b/gi, weight: 7, phrase: "é imperativo/imprescindível que" },
  { rgx: /\bmitigar\s+(os\s+)?(impactos|efeitos|danos|desafios|problemas)\b/gi, weight: 9, phrase: "mitigar os impactos/efeitos" },
  { rgx: /\bfomentar\s+(a\s+|o\s+)?(conscientiza[çc][ãa]o|debate|di[áa]logo|inclus[ãa]o|educa[çc][ãa]o)\b/gi, weight: 8, phrase: "fomentar a conscientização/inclusão" },
  { rgx: /\bsociedade\s+mais\s+(justa|igualit[áa]ria|equitativa|inclusiva|sustent[áa]vel)\s+e\s+(justa|igualit[áa]ria|equitativa|inclusiva|sustent[áa]vel|pr[óo]spera|harm[ôo]nica)\b/gi, weight: 12, phrase: "sociedade mais justa e igualitária/equitativa" },
  { rgx: /\bfuturo\s+mais\s+(justo|sustent[áa]vel|promissor|inclusivo|equitativo|pr[óo]spero)\b/gi, weight: 11, phrase: "futuro mais justo/promissor" },
  { rgx: /\bem\s+suma,\s*[ée]\s*(imperativo|evidente|crucial|necess[áa]rio|fundamental)\b/gi, weight: 9, phrase: "em suma, é imperativo/evidente" },
  { rgx: /\bem\s+[úu]ltima\s+an[áa]lise\b/gi, weight: 7, phrase: "em última análise" },
  { rgx: /\bpor\s+fim,?\s+mas\s+n[ãa]o\s+menos\s+importante\b/gi, weight: 14, phrase: "por fim, mas não menos importante" },
  { rgx: /\bvale\s+(ressaltar|salientar|destacar)\s+que\b/gi, weight: 5, phrase: "vale ressaltar/salientar que" },
  { rgx: /\bcabe\s+(ressaltar|salientar|destacar)\s+que\b/gi, weight: 6, phrase: "cabe ressaltar que" },
  { rgx: /\bdiante\s+desse\s+(cen[áa]rio|panorama|contexto)\b/gi, weight: 6, phrase: "diante desse cenário/panorama" },
  { rgx: /\bno\s+[âa]mbito\s+(social|educacional|contempor[âa]neo|digital|brasileiro)\b/gi, weight: 6, phrase: "no âmbito contemporâneo/social" },
  { rgx: /\babordagem\s+(hol[íi]stica|multifacetada|abrangente|integrada)\b/gi, weight: 12, phrase: "abordagem holística/multifacetada" },
  { rgx: /\b(multifacetad[ao]s?|intr[íi]nsec[ao]s?|catalisador(a|es)?|paradigma|hol[íi]stic[ao]|equitativ[ao]s?|fomentar|mitigar)\b/gi, weight: 5, phrase: "vocabulário típico de LLMs" },
  { rgx: /\bn[ãa]o\s+(apenas|somente|s[óo])[^.!?]{5,65}\bmas\s+tamb[ée]m\b/gi, weight: 6, phrase: "estrutura simétrica 'não apenas..., mas também'" },
  { rgx: /\b(exacerba|perpetua|reverbera|delineia|corrobora|evidencia-se|torna-se\s+imperativo|faz-se\s+mister)\b/gi, weight: 5, phrase: "verbos recorrentes em textos gerados por IA" },
  { rgx: /\b(esfor[çc]o\s+conjunto|a[çc][ãa]o\s+conjunta|sinergia\s+entre)\b/gi, weight: 8, phrase: "esforço conjunto / sinergia entre" },
  { rgx: /\bsomente\s+assim\s+(ser[áa]\s+poss[íi]vel|poderemos|conseguiremos)\b/gi, weight: 8, phrase: "somente assim será possível" },
  { rgx: /\bconstruir\s+um\s+(pa[íi]s|mundo|futuro|brasil)\s+mais\b/gi, weight: 8, phrase: "construir um futuro/país mais..." },
];

function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 28);
  const end = Math.min(text.length, index + length + 38);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet;
}

function getSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 4);
}

function getParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).filter(Boolean).length >= 12);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Analisa autenticidade autoral da redação combinando:
 * 1. Sinais comportamentais de escrita (tentativas de cola, inserções em bloco, velocidade impossível)
 * 2. Artefatos explícitos de chat/markdown de IA
 * 3. Assinaturas fraseológicas e estilométricas (uniformidade de frases/parágrafos, tríades retóricas, etc.)
 */
export function analyzeAiAuthorship(
  essayText: string,
  telemetry?: WritingTelemetry | null,
): AiDetectionReport {
  const text = essayText.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;

  const signals: AiDetectionSignal[] = [];
  const flaggedExcerpts: string[] = [];
  let score = 0;

  // ── 1. ARTEFATOS EXPLÍCITOS DE CHAT DE IA ──
  for (const rule of CHAT_ARTIFACT_PATTERNS) {
    const m = text.match(rule.rgx);
    if (m && m.index !== undefined) {
      score += 55;
      signals.push({
        label: rule.label,
        severity: "alto",
        detail: "O texto contém marcas diretas de resposta copiada de assistente de IA.",
      });
      flaggedExcerpts.push(extractSnippet(text, m.index, m[0].length));
    }
  }

  // Caracteres invisíveis / travessões longos em excesso (comuns ao copiar do ChatGPT)
  const zeroWidthMatches = (text.match(/[\u200B-\u200D\uFEFF]/g) || []).length;
  if (zeroWidthMatches >= 2) {
    score += 30;
    signals.push({
      label: "Caracteres invisíveis de cópia digital",
      severity: "alto",
      detail: `Foram detectados ${zeroWidthMatches} caracteres invisíveis frequentemente inseridos ao copiar texto externo.`,
    });
  }

  const emDashCount = (text.match(/—/g) || []).length;
  if (emDashCount >= 4) {
    score += Math.min(20, emDashCount * 4);
    signals.push({
      label: "Uso incomum de travessões tipográficos (—)",
      severity: "medio",
      detail: `Foram encontrados ${emDashCount} travessões longos, marca frequente em textos gerados automaticamente.`,
    });
  }

  // ── 2. TELEMETRIA COMPORTAMENTAL DE ESCRITA ──
  let telemetrySummary: AiDetectionReport["telemetrySummary"];

  if (telemetry && charCount >= 60) {
    const now = telemetry.submittedAt || Date.now();
    const writingSeconds = telemetry.startedAt
      ? Math.max(1, Math.round((now - telemetry.startedAt) / 1000))
      : 0;
    const wordsPerMinute = writingSeconds > 0 ? Math.round((wordCount / writingSeconds) * 60) : 0;
    const largeInsertPercent = Math.min(
      100,
      Math.round(((telemetry.largeInsertChars + telemetry.pastedChars) / Math.max(1, charCount)) * 100),
    );

    telemetrySummary = {
      pasteAttempts: telemetry.pasteAttempts,
      largeInsertPercent,
      writingSeconds,
      wordsPerMinute,
    };

    // Inserção em bloco grande (bypass de cola, extensão, script ou colar texto pronto)
    if (largeInsertPercent >= 45 && charCount >= 140) {
      score += 65;
      signals.push({
        label: "Texto inserido em bloco (não digitado)",
        severity: "alto",
        detail: `${largeInsertPercent}% do texto entrou de uma só vez, sem digitação progressiva no laboratório.`,
      });
    } else if (largeInsertPercent >= 20 && charCount >= 140) {
      score += 32;
      signals.push({
        label: "Trechos inseridos em bloco",
        severity: "medio",
        detail: `${largeInsertPercent}% da redação foi inserida em saltos grandes em vez de digitada normalmente.`,
      });
    }

    // Múltiplas tentativas de colar texto bloqueadas
    if (telemetry.pasteAttempts >= 2) {
      score += Math.min(35, telemetry.pasteAttempts * 12);
      signals.push({
        label: "Tentativas de colagem registradas",
        severity: telemetry.pasteAttempts >= 3 ? "alto" : "medio",
        detail: `Foram bloqueadas ${telemetry.pasteAttempts} tentativas de colar texto externo durante esta redação.`,
      });
    }

    // Velocidade sobre-humana sustentada (humanos digitam em média 35–80 WPM compondo uma redação)
    if (wordCount >= 90 && writingSeconds > 0 && wordsPerMinute >= 145) {
      score += 50;
      signals.push({
        label: "Velocidade de escrita incompatível com redação autoral",
        severity: "alto",
        detail: `${wordCount} palavras produzidas em ${writingSeconds}s (~${wordsPerMinute} palavras/min), muito acima da escrita humana espontânea.`,
      });
    } else if (wordCount >= 120 && writingSeconds > 0 && wordsPerMinute >= 105 && telemetry.backspaces <= 2) {
      score += 24;
      signals.push({
        label: "Digitação muito rápida sem revisões",
        severity: "medio",
        detail: `Velocidade de ~${wordsPerMinute} palavras/min com quase nenhuma correção durante a escrita.`,
      });
    }

    // Texto médio/longo escrito sem praticamente nenhum backspace/edição
    if (charCount >= 400 && telemetry.typedChars >= 300 && telemetry.backspaces <= 2) {
      score += 18;
      signals.push({
        label: "Ausência de pausas e correções humanas",
        severity: "medio",
        detail: "Redações autorais longas costumam ter reescritas e apagamentos ao longo do raciocínio.",
      });
    }

    // Múltiplas trocas de aba durante a redação (usado apenas como reforço se já houver padrões de IA no texto)
    if (telemetry.tabSwitches >= 3 && charCount >= 250) {
      score += Math.min(12, telemetry.tabSwitches * 3);
      signals.push({
        label: "Trocas frequentes de aba durante a escrita",
        severity: "baixo",
        detail: `O editor perdeu foco ${telemetry.tabSwitches} vezes enquanto o texto era redigido.`,
      });
    }
  }

  // ── 3. ASSINATURAS FRASEOLÓGICAS DE IA EM PORTUGUÊS ──
  const matchedPhrases: string[] = [];
  let phraseScore = 0;

  for (const rule of AI_PHRASE_PATTERNS) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    if (matches.length > 0) {
      matchedPhrases.push(rule.phrase);
      phraseScore += rule.weight * Math.min(2, matches.length);
      const first = matches[0];
      if (first && first.index !== undefined && flaggedExcerpts.length < 5) {
        flaggedExcerpts.push(extractSnippet(text, first.index, first[0].length));
      }
    }
  }

  // Só penaliza fortemente quando há ACÚMULO de vários padrões de IA juntos (evita falso positivo em bons alunos!)
  const uniquePhraseHits = matchedPhrases.length;
  if (uniquePhraseHits >= 8 || phraseScore >= 65) {
    const add = Math.min(72, Math.round(phraseScore * 0.85));
    score += add;
    signals.push({
      label: "Padrão fraseológico típico de IA (alta densidade)",
      severity: "alto",
      detail: `Foram identificados ${uniquePhraseHits} padrões característicos de modelos de IA no mesmo texto (${matchedPhrases.slice(0, 3).join(", ")}).`,
    });
  } else if (uniquePhraseHits >= 5 || phraseScore >= 40) {
    const add = Math.min(54, Math.round(phraseScore * 0.78));
    score += add;
    signals.push({
      label: "Alta densidade de clichês típicos de IA",
      severity: "alto",
      detail: `Foram identificados ${uniquePhraseHits} padrões fraseológicos muito recorrentes em textos gerados por IA (${matchedPhrases.slice(0, 3).join(", ")}).`,
    });
  } else if (uniquePhraseHits >= 3 || phraseScore >= 24) {
    const add = Math.min(28, Math.round(phraseScore * 0.6));
    score += add;
    signals.push({
      label: "Expressões recorrentes de escrita automatizada",
      severity: "medio",
      detail: `Presença combinada de fórmulas típicas de LLMs (${matchedPhrases.slice(0, 3).join(", ")}).`,
    });
  } else if (uniquePhraseHits >= 2 && phraseScore >= 16) {
    score += 8;
  }

  // ── 4. ESTILOMETRIA: BURSTINESS (UNIFORMIDADE DE FRASES E PARÁGRAFOS) ──
  const sentences = getSentences(text);
  if (sentences.length >= 6 && wordCount >= 140) {
    const sentLengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
    const avgLen = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
    const sd = stdDev(sentLengths);
    const cv = avgLen > 0 ? sd / avgLen : 1; // Coeficiente de variação

    // IAs costumam ter CV muito baixo (< 0.24) com frases médias/longas muito uniformes
    if (cv < 0.22 && avgLen >= 16) {
      score += 20;
      signals.push({
        label: "Ritmo de frases artificialmente uniforme",
        severity: "medio",
        detail: "Quase todas as frases possuem exatamente a mesma extensão, padrão comum em gerações automáticas (baixa variação natural).",
      });
    } else if (cv < 0.28 && avgLen >= 18 && uniquePhraseHits >= 3) {
      score += 12;
      signals.push({
        label: "Cadência sintática altamente regular",
        severity: "baixo",
        detail: "Estrutura frasal muito homogênea ao longo do texto.",
      });
    }
  }

  // Uniformidade extrema entre parágrafos (4 parágrafos com quase exatamente o mesmo tamanho)
  const paragraphs = getParagraphs(text);
  if (paragraphs.length >= 4 && wordCount >= 200) {
    const pLens = paragraphs.map((p) => p.split(/\s+/).filter(Boolean).length);
    const pAvg = pLens.reduce((a, b) => a + b, 0) / pLens.length;
    const pCv = pAvg > 0 ? stdDev(pLens) / pAvg : 1;

    // Aberturas perfeitamente simétricas em todos os parágrafos + tamanho quase idêntico
    const formulaOpenings = paragraphs.filter((p) =>
      /^(na\s+contemporaneidade|no\s+cen[áa]rio|em\s+primeiro\s+lugar|primeiramente|em\s+segundo\s+lugar|ademais|al[ée]m\s+disso|outrossim|portanto|em\s+suma|diante\s+do\s+exposto)/i.test(p),
    ).length;

    if (pCv < 0.14 && formulaOpenings >= 3 && uniquePhraseHits >= 3) {
      score += 16;
      signals.push({
        label: "Simetria artificial entre parágrafos",
        severity: "medio",
        detail: "Todos os parágrafos apresentam extensão quase idêntica e aberturas mecânicas.",
      });
    }
  }

  // Tríades retóricas repetitivas ("X, Y e Z") muito frequentes em LLMs
  const triadMatches = text.match(/\b[a-záéíóúâêôãõç]{4,},\s+[a-záéíóúâêôãõç]{4,}\s+e\s+[a-záéíóúâêôãõç]{4,}\b/gi) || [];
  if (triadMatches.length >= 5 && wordCount <= 450) {
    score += 12;
    signals.push({
      label: "Repetição de enumerações em trio",
      severity: "baixo",
      detail: `Foram detectadas ${triadMatches.length} enumerações triplas ("X, Y e Z"), tique estilístico comum em IAs.`,
    });
  }

  // ── 5. SINAIS DE AUTENTICIDADE HUMANA (reduz falsos positivos) ──
  // Se o aluno digitou naturalmente por um tempo compatível, com revisões/apagamentos e sem cola
  if (
    telemetry &&
    telemetrySummary &&
    telemetry.pasteAttempts === 0 &&
    telemetrySummary.largeInsertPercent < 8 &&
    telemetrySummary.writingSeconds >= 90 &&
    telemetrySummary.wordsPerMinute > 0 &&
    telemetrySummary.wordsPerMinute <= 75 &&
    telemetry.backspaces >= 12 &&
    !signals.some((s) => s.label.includes("chat de IA") || s.label.includes("Markdown"))
  ) {
    score = Math.max(0, score - 14);
  }

  const aiProbability = Math.max(0, Math.min(99, Math.round(score)));

  let verdict: AiDetectionReport["verdict"];
  let blocked = false;
  let summary: string;

  if (aiProbability >= 70) {
    verdict = "provavel_ia";
    blocked = true;
    summary =
      "Detectamos fortes indícios de texto gerado por inteligência artificial ou inserido sem escrita autoral. Para manter seu treino real e justo, esta redação não foi contabilizada na sua média.";
  } else if (aiProbability >= 45) {
    verdict = "suspeito";
    blocked = false;
    summary =
      "Alguns trechos apresentam padrões semelhantes aos de textos gerados automaticamente. A correção foi exibida, mas recomendamos reforçar sua voz autoral.";
  } else {
    verdict = "humano";
    blocked = false;
    summary =
      "A escrita apresenta características naturais e compatíveis com produção autoral.";
  }

  return {
    aiProbability,
    verdict,
    blocked,
    summary,
    signals: signals.slice(0, 6),
    flaggedExcerpts: Array.from(new Set(flaggedExcerpts)).slice(0, 4),
    ...(telemetrySummary ? { telemetrySummary } : {}),
  };
}

/**
 * Combina o parecer estilométrico/comportamental local com uma eventual análise semântica do modelo no servidor.
 */
export function mergeServerAiAssessment(
  localReport: AiDetectionReport,
  serverAssessment?: {
    aiProbability: number;
    reasons: string[];
    flaggedExcerpts: string[];
  } | null,
): AiDetectionReport {
  if (!serverAssessment) return localReport;

  const serverProb = Math.max(0, Math.min(100, Math.round(serverAssessment.aiProbability)));

  // Se o comportamento local já provou cola/artefato explícito (>= 75), mantém o bloqueio forte;
  // caso contrário, combina de forma ponderada (55% local/telemetria + 45% análise semântica)
  const combinedProb =
    localReport.aiProbability >= 75
      ? Math.max(localReport.aiProbability, Math.round(localReport.aiProbability * 0.7 + serverProb * 0.3))
      : Math.max(
          Math.round(localReport.aiProbability * 0.55 + serverProb * 0.45),
          serverProb >= 85 ? Math.round(serverProb * 0.85) : 0,
        );

  const mergedSignals: AiDetectionSignal[] = [...localReport.signals];
  for (const reason of serverAssessment.reasons || []) {
    if (reason && mergedSignals.length < 6 && !mergedSignals.some((s) => s.detail === reason)) {
      mergedSignals.push({
        label: "Análise semântica de autoria",
        severity: serverProb >= 70 ? "alto" : "medio",
        detail: reason,
      });
    }
  }

  const mergedExcerpts = Array.from(
    new Set([...localReport.flaggedExcerpts, ...(serverAssessment.flaggedExcerpts || [])]),
  ).slice(0, 4);

  const verdict: AiDetectionReport["verdict"] =
    combinedProb >= 70 ? "provavel_ia" : combinedProb >= 45 ? "suspeito" : "humano";
  const blocked = combinedProb >= 70;

  const summary = blocked
    ? "Detectamos fortes indícios de texto gerado por inteligência artificial ou inserido sem escrita autoral. Para manter seu treino real e justo, esta redação não foi contabilizada na sua média."
    : verdict === "suspeito"
    ? "Alguns trechos apresentam padrões semelhantes aos de textos gerados automaticamente. A correção foi exibida, mas recomendamos reforçar sua voz autoral."
    : "A escrita apresenta características naturais e compatíveis com produção autoral.";

  return {
    ...localReport,
    aiProbability: Math.max(0, Math.min(99, combinedProb)),
    verdict,
    blocked,
    summary,
    signals: mergedSignals,
    flaggedExcerpts: mergedExcerpts,
  };
}
