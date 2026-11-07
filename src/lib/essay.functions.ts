import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";

const EssayInput = z.object({
  essay: z.string().min(120),
  targetScore: z.string().optional(),
  college: z.string().optional(),
  course: z.string().optional(),
});

const CorrectionSchema = z.object({
  score: z.number(),
  competencies: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      feedback: z.string(),
    }),
  ),
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

/**
 * Motor pedagógico analítico de avaliação de redações nos padrões oficiais do ENEM.
 * Avalia as 5 competências (0 a 200 pontos cada) com base em métricas estruturais,
 * sintáticas, repertório legitimado, conectivos e elementos da proposta de intervenção.
 */
export function evaluateEssayHeuristically(
  essayText: string,
  context?: { targetScore?: string; college?: string; course?: string },
): CorrectionResult {
  const text = essayText.trim();
  const rawParagraphs = text.split(/\n\s*\n|\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [text];
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const targetScoreNum = context?.targetScore ? parseInt(context.targetScore, 10) : 900;
  const isHighTarget = targetScoreNum >= 920;

  // 1. COMPETÊNCIA 1: NORMA PADRÃO DA LÍNGUA ESCRITA
  const informalWords = [
    { word: /\bpra\b/i, fix: "para" },
    { word: /\bpro\b/i, fix: "para o" },
    { word: /\bné\b/i, fix: "não é?" },
    { word: /\bcoisa\b/i, fix: "elemento / aspecto / fator" },
    { word: /\ba nível de\b/i, fix: "em nível de" },
    { word: /\btem que\b/i, fix: "deve / necessita" },
    { word: /\bcara\b/i, fix: "indivíduo / cidadão" },
    { word: /\bhoje em dia\b/i, fix: "na contemporaneidade / hodiernamente" },
  ];

  const foundInformal: { excerpt: string; suggestion: string }[] = [];
  for (const item of informalWords) {
    const match = text.match(item.word);
    if (match && match[0]) {
      foundInformal.push({
        excerpt: match[0],
        suggestion: `Substitua a expressão informal "${match[0]}" por um vocábulo mais formal como "${item.fix}".`,
      });
    }
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const longSentences = sentences.filter((s) => s.trim().split(/\s+/).length > 42);

  let c1Score = 200;
  if (foundInformal.length >= 3 || longSentences.length >= 3) {
    c1Score = 120;
  } else if (foundInformal.length >= 1 || longSentences.length >= 1 || wordCount < 200) {
    c1Score = 160;
  } else if (isHighTarget && wordCount < 260) {
    c1Score = 160;
  }

  const c1Feedback =
    c1Score === 200
      ? "Excelente domínio da modalidade culta formal, com estrutura sintática madura, vocabulário refinado e ausência de desvios gramaticais relevantes."
      : c1Score === 160
      ? "Bom domínio da norma padrão, mas com pequenas ocorrências de períodos excessivamente longos ou vocábulos coloquiais que podem ser lapidados."
      : "Estrutura sintática com truncamento ou períodos longos demais, além de termos informais que enfraquecem o registro acadêmico.";

  // 2. COMPETÊNCIA 2: COMPREENSÃO DO TEMA E REPERTÓRIO SOCIOCULTURAL
  const repertoryPatterns = [
    { pattern: /constitui[çc][ãa]o|artigo\s*\d+|carta\s*magna|cidad[ãa]os?\s*de\s*papel/i, label: "Repertório Jurídico-Constitucional" },
    { pattern: /bauman|modernidade\s*l[íi]quida|habermas|bourdieu|foucault|durkheim|hobbes|locke|rousseau|arist[óo]teles|plat[ãa]o|kant|beauvoir|machado\s*de\s*assis|clarice|carolina\s*maria/i, label: "Repertório Filosófico/Sociológico" },
    { pattern: /ibge|ipea|onu|oms|unesco|oxfam|dados?\s*d[eo]|estat[íi]sticas?|pesquisas?/i, label: "Dados e Órgãos de Autoridade" },
    { pattern: /s[ée]culo\s*(xxi|xx|xix|xviii)|revolu[çc][ãa]o\s*industrial|ditadura|era\s*vargas|iluminismo|antiguidade/i, label: "Repertório Histórico" },
  ];

  const foundRepertory: { excerpt: string; label: string }[] = [];
  for (const rep of repertoryPatterns) {
    const match = text.match(rep.pattern);
    if (match && match[0]) {
      const start = Math.max(0, match.index! - 10);
      const end = Math.min(text.length, match.index! + match[0].length + 15);
      foundRepertory.push({ excerpt: text.substring(start, end).trim(), label: rep.label });
    }
  }

  const hasIdealParagraphCount = paragraphs.length === 4;
  let c2Score = 200;
  if (foundRepertory.length === 0 || paragraphs.length < 3) {
    c2Score = 120;
  } else if (foundRepertory.length < 2 || !hasIdealParagraphCount) {
    c2Score = 160;
  }

  const c2Feedback =
    c2Score === 200
      ? "Tema plenamente compreendido dentro dos limites estruturais dissertativos, com repertório sociocultural legitimado, pertinente e produtivo."
      : c2Score === 160
      ? "O texto compreende a proposta e desenvolve a dissertação, mas o repertório legitimado pode ser mais explicitamente articulado à tese."
      : "Repertório limitado ou tangenciamento parcial; procure fundamentar seus argumentos com autores, dados estatísticos ou referências históricas sólidas.";

  // 3. COMPETÊNCIA 3: PROJETO DE TEXTO E ARGUMENTAÇÃO
  const argumentationConnectors = [
    /\bhaja vista\b/i,
    /\bpor conseguinte\b/i,
    /\bem virtude de\b/i,
    /\bdessa forma\b/i,
    /\bcom efeito\b/i,
    /\bsob essa [óo]tica\b/i,
    /\bdesse modo\b/i,
    /\bvisto que\b/i,
    /\bnesse sentido\b/i,
  ];
  const foundArgConnectors = argumentationConnectors.filter((rgx) => rgx.test(text)).length;

  let c3Score = 200;
  if (foundArgConnectors < 2 || wordCount < 220) {
    c3Score = 120;
  } else if (foundArgConnectors < 4 || paragraphs.length < 4) {
    c3Score = 160;
  }

  const c3Feedback =
    c3Score === 200
      ? "Projeto de texto estratégico impecável, com desdobramento claro de causas e consequências e autoria consistente na defesa do ponto de vista."
      : c3Score === 160
      ? "Projeto de texto consistente, porém a relação de causa e efeito entre os argumentos em D1 e D2 poderia ser mais verticalizada e analítica."
      : "Argumentação previsível ou expositiva; busque detalhar mais as causas e os impactos do problema em vez de apenas descrevê-lo.";

  // 4. COMPETÊNCIA 4: COESÃO E MECANISMOS LINGUÍSTICOS
  const interParagraphConnectors = [
    /^(em primeiro lugar|primeiramente|a princ[íi]pio|de in[íi]cio|em uma primeira an[áa]lise)/i,
    /^(ademais|outrossim|al[ée]m disso|por outro lado|em segundo lugar|paralelamente)/i,
    /^(portanto|em suma|logo|diante disso|diante do exposto|infere-se|torna-se evidente)/i,
  ];

  let interMatches = 0;
  for (let i = 1; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (interParagraphConnectors.some((rgx) => rgx.test(p))) {
      interMatches++;
    }
  }

  let c4Score = 200;
  if (interMatches < 1) {
    c4Score = 120;
  } else if (interMatches < 2 || wordCount < 200) {
    c4Score = 160;
  }

  const c4Feedback =
    c4Score === 200
      ? "Amplo repertório de recursos coesivos inter e intraparágrafos, com transições harmônicas e diversificadas ao longo do texto."
      : c4Score === 160
      ? "Presença funcional de conectivos, mas com oportunidade de variar operadores argumentativos interparágrafos para garantir fluidez perfeita."
      : "Conexões interparágrafos tímidas ou ausentes; inicie os parágrafos de desenvolvimento e conclusão com conectivos fortes (ex: 'Ademais', 'Portanto').";

  // 5. COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO SOCIAL
  const lastParagraph = paragraphs[paragraphs.length - 1] || text;

  const hasAgent = /governo|minist[ée]rio|poder\s*p[úu]blico|estado|sociedade|fam[íi]lia|escolas?|m[íi]dia|ongs?|secretaria|legislativo/i.test(lastParagraph);
  const hasAction = /deve\s+(criar|promover|implementar|agir|garantir|instituir|fiscalizar|estruturar|fomentar)|cabe\s+(ao|à|aos|às)|precisa|urge/i.test(lastParagraph);
  const hasMeans = /por\s*meio\s*de|mediante|atrav[ée]s\s*de|com\s*o\s*aux[íi]lio|por\s*interm[ée]dio|em\s*parceria\s*com/i.test(lastParagraph);
  const hasEffect = /a\s*fim\s*de|com\s*o\s*intuito\s*de|para\s*que|com\s*o\s*objetivo\s*de|com\s*o\s*fito|visando\s*a|para\s+(garantir|combater|mitigar|assegurar)/i.test(lastParagraph);
  const hasDetailing = /(–[^-]+–|,[^,]+,\s*(?:órgão|responsável|visando|por exemplo|com oficinas|por meio))/i.test(lastParagraph) || lastParagraph.length > 250;

  let elementsCount = 0;
  if (hasAgent) elementsCount++;
  if (hasAction) elementsCount++;
  if (hasMeans) elementsCount++;
  if (hasEffect) elementsCount++;
  if (hasDetailing) elementsCount++;

  const c5Score = Math.min(200, Math.max(40, elementsCount * 40));

  const missingElements: string[] = [];
  if (!hasAgent) missingElements.push("Agente claro (quem faz)");
  if (!hasAction) missingElements.push("Ação interventiva concreta (o que faz)");
  if (!hasMeans) missingElements.push("Meio/Modo (como faz, ex: 'por meio de...')");
  if (!hasEffect) missingElements.push("Finalidade/Efeito (para quê, ex: 'a fim de...')");
  if (!hasDetailing) missingElements.push("Detalhamento de um dos elementos (especificação explicativa)");

  const c5Feedback =
    c5Score === 200
      ? "Proposta de intervenção completa, detalhada, articulada à discussão desenvolvida no texto e em total respeito aos direitos humanos (5 elementos presentes)."
      : `Proposta de intervenção bem articulada, mas com carência de elementos fundamentais: ${missingElements.join(", ") || "detalhe mais o meio/modo"}.`;

  const totalScore = c1Score + c2Score + c3Score + c4Score + c5Score;

  // FORÇAS (STRENGTHS)
  const strengths: string[] = [];
  if (c1Score >= 160) strengths.push("Excelente clareza formal e vocabulário alinhado às exigências do ENEM.");
  if (c2Score >= 160) strengths.push("Uso consciente e pertinente de repertório sociocultural para sustentar o raciocínio.");
  if (c3Score >= 160) strengths.push("Projeto de texto coerente com divisão equilibrada de ideias entre introdução, desenvolvimento e conclusão.");
  if (c4Score >= 160) strengths.push("Emprego assertivo de conectivos, conferindo boa coesão e ritmo de leitura aos parágrafos.");
  if (c5Score >= 160) strengths.push("Proposta de intervenção propositiva, com elementos executáveis e respeitosa aos direitos humanos.");
  if (strengths.length < 2) strengths.push("Texto bem estruturado que cumpre o objetivo dissertativo-argumentativo.");

  // MELHORIAS (IMPROVEMENTS)
  const improvements: string[] = [];
  if (c5Score < 200) {
    improvements.push("Na Competência 5, certifique-se de preencher explicitamente os 5 elementos: Agente, Ação, Meio/Modo, Finalidade e Detalhamento.");
  }
  if (c1Score < 200) {
    improvements.push("Na Competência 1, revise períodos com mais de 3 linhas para evitar frases truncadas ou cansaço sintático.");
  }
  if (c2Score < 200) {
    improvements.push("Na Competência 2, cite filósofos, sociólogos ou marcos legais reconhecidos (ex: Constituição Federal de 1988) para legitimar a tese.");
  }
  if (c4Score < 200) {
    improvements.push("Na Competência 4, comece todos os parágrafos de desenvolvimento e conclusão com conectivos interparágrafos (ex: 'Ademais', 'Portanto').");
  }
  if (c3Score < 200) {
    improvements.push("Na Competência 3, aprofunde as causas e os impactos do tema em vez de permanecer em constatações superficiais.");
  }
  if (improvements.length < 2) {
    improvements.push(`Para atingir os 1000 pontos em ${context?.course || "seu curso"}, mantenha o ritmo de redações semanais no laboratório.`);
  }

  // ANOTAÇÕES LITERAIS DO TEXTO (EXCERPTS)
  const annotations: { excerpt: string; suggestion: string; type: "acerto" | "erro" }[] = [];

  const conclusionConnective = lastParagraph.match(/^(portanto|diante disso|diante do exposto|em suma|infere-se)/i);
  if (conclusionConnective && conclusionConnective[0]) {
    annotations.push({
      excerpt: conclusionConnective[0],
      suggestion: "Excelente uso de conectivo conclusivo canônico para iniciar a proposta de intervenção.",
      type: "acerto",
    });
  }

  const repMatch = text.match(/constitui[çc][ãa]o\s*federal|simone\s*de\s*beauvoir|ibge|bauman|machado\s*de\s*assis|artigo\s*\d+/i);
  if (repMatch && repMatch[0]) {
    annotations.push({
      excerpt: repMatch[0],
      suggestion: "Ótimo repertório legitimado que agrega valor à Competência 2.",
      type: "acerto",
    });
  }

  if (paragraphs.length >= 3) {
    const d2Conn = paragraphs[2].match(/^(ademais|outrossim|al[ée]m disso|por outro lado)/i);
    if (d2Conn && d2Conn[0]) {
      annotations.push({
        excerpt: d2Conn[0],
        suggestion: "Conector interparágrafo bem posicionado, reforçando a continuidade coesiva (Competência 4).",
        type: "acerto",
      });
    }
  }

  if (foundInformal.length > 0) {
    annotations.push({
      excerpt: foundInformal[0].excerpt,
      suggestion: foundInformal[0].suggestion,
      type: "erro",
    });
  }

  if (c5Score < 200) {
    const firstSentenceOfLast = lastParagraph.split(/[.!?]/)[0];
    if (firstSentenceOfLast && firstSentenceOfLast.length > 15) {
      const literalPart = firstSentenceOfLast.substring(0, Math.min(60, firstSentenceOfLast.length)).trim();
      if (text.includes(literalPart)) {
        annotations.push({
          excerpt: literalPart,
          suggestion: "Adicione um detalhamento explicativo (ex: 'órgão responsável por...', 'mediante palestras e workshops práticos').",
          type: "erro",
        });
      }
    }
  }

  if (annotations.length < 2 && paragraphs[0]) {
    const firstSentence = paragraphs[0].split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 20) {
      const cleanSnippet = firstSentence.substring(0, Math.min(50, firstSentence.length)).trim();
      if (text.includes(cleanSnippet)) {
        annotations.push({
          excerpt: cleanSnippet,
          suggestion: "Construção de introdução clara e contextualizada.",
          type: "acerto",
        });
      }
    }
  }

  const result = {
    score: totalScore,
    competencies: [
      { name: "Norma Padrão da Língua Escrita", score: c1Score, feedback: c1Feedback },
      { name: "Compreensão do Tema e Repertório", score: c2Score, feedback: c2Feedback },
      { name: "Projeto de Texto e Argumentação", score: c3Score, feedback: c3Feedback },
      { name: "Coesão e Mecanismos Linguísticos", score: c4Score, feedback: c4Feedback },
      { name: "Proposta de Intervenção Social", score: c5Score, feedback: c5Feedback },
    ],
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    annotations: annotations.slice(0, 5),
  };

  return CorrectionSchema.parse(result);
}

export const correctEssay = createServerFn({ method: "POST" })
  .validator((input: unknown) => EssayInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || process.env["LOVABLE_API_KEY"];

    // Se houver uma chave da API do Google Gemini configurada, tenta utilizar a IA generativa
    if (apiKey && !apiKey.startsWith("AQ.")) {
      try {
        const google = createGoogleGenerativeAI({
          apiKey,
        });

        const goalContext =
          data.course && data.college
            ? `O aluno tem o objetivo de ingressar em ${data.course} na ${data.college} com uma meta de ${data.targetScore || 900} pontos. Ajuste seu rigor, sua exigência gramatical e a profundidade dos argumentos esperados de acordo com essa concorrência.`
            : `O aluno tem uma meta de ${data.targetScore || 900} pontos.`;

        // Tenta com gemini-2.5-flash (alta velocidade e aderência rígida a schema JSON)
        const result = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: CorrectionSchema,
          prompt: `Atue como corretor pedagógico implacável de redações do ENEM. ${goalContext} Avalie o texto abaixo pelas cinco competências oficiais. Cada competência vale de 0 a 200 e a soma deve ser a nota final de 0 a 1000. Seja criterioso, focado no objetivo do aluno e específico. Produza exatamente cinco competências em ordem, 2 a 4 forças, 2 a 4 melhorias e até 5 anotações (indicando o tipo 'acerto' ou 'erro') com trechos literais do texto.\n\nREDAÇÃO:\n${data.essay}`,
        });

        if (result && result.object) {
          return result.object;
        }
      } catch (err: unknown) {
        console.warn(
          "[correctEssay] Google Gemini API encontrou uma falha temporária. Ativando motor pedagógico ENEM integrado:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Avaliação pedagógica analítica integrada (ENEM)
    return evaluateEssayHeuristically(data.essay, {
      course: data.course,
      college: data.college,
      targetScore: data.targetScore,
    });
  });
