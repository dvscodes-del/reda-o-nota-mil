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

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

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
// ENEM Real:
// 200: Excelente estrutura sintática; no máximo 2 desvios gramaticais leves tolerados.
// 160: Boa estrutura sintática; poucos desvios leves (3 a 5).
// 120: Estrutura mediana; desvios moderados ou vocabulário simples.
// 80: Domínio insuficiente; muitos desvios gramaticais.
// 40: Domínio precário com desvios graves sistemáticos.
// 0: Menos de 50 palavras ou texto incompreensível.

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
  ];

  const syntaxRules = [
    { rgx: /\b(onde)\s+(?!há|se|existe|vivem|estão|residem|moram|ficam)/gi, desc: "Uso de 'onde' para situações abstratas (prefira 'em que' ou 'no qual')", severity: "grave" },
    { rgx: /\bchegar\s+em\b/gi, desc: "Regência do verbo chegar ('chegar ao' em vez de 'chegar no')", severity: "leve" },
    { rgx: /\bassistir\s+o\b/gi, desc: "Regência: 'assistir ao' no sentido de ver/presenciar", severity: "leve" },
  ];

  const informalFound: { excerpt: string; fix: string; severity: string }[] = [];
  const syntaxIssues: { excerpt: string; desc: string; severity: string }[] = [];

  for (const rule of informalRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    if (matches.length > 0 && matches[0].index !== undefined) {
      informalFound.push({
        excerpt: excerptAround(text, matches[0].index, matches[0][0].length, 25),
        fix: rule.fix,
        severity: rule.severity,
      });
    }
  }

  for (const rule of syntaxRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    if (matches.length > 0 && matches[0].index !== undefined) {
      syntaxIssues.push({
        excerpt: excerptAround(text, matches[0].index, matches[0][0].length, 35),
        desc: rule.desc,
        severity: rule.severity,
      });
    }
  }

  const sentences = text.match(/[^.!?;]+[.!?;]+/g) || [];
  const excessiveLong = sentences.filter(s => s.trim().split(/\s+/).length > 55).length;

  const gravesCount = informalFound.filter(f => f.severity === "grave").length + syntaxIssues.filter(s => s.severity === "grave").length;
  const levesCount = informalFound.filter(f => f.severity === "leve").length + syntaxIssues.filter(s => s.severity === "leve").length + excessiveLong;

  let score: number;
  let feedback: string;

  if (wordCount < 60) {
    score = 0;
    feedback = "Texto insuficiente em extensão (menos de 60 palavras) para avaliação do domínio da norma culta.";
  } else if (gravesCount >= 4 || (gravesCount >= 2 && levesCount >= 5)) {
    score = 80;
    feedback = "Domínio insuficiente da norma culta formal: presença recorrente de marcas da oralidade e desvios de concordância/regência que demandam revisão.";
  } else if (gravesCount >= 2 || levesCount >= 4) {
    score = 120;
    feedback = "Domínio mediano da modalidade escrita formal: a redação é compreensível, mas apresenta desvios gramaticais ou escolhas lexicais coloquiais que devem ser aprimoradas.";
  } else if (gravesCount === 1 || levesCount >= 2) {
    score = 160;
    feedback = "Bom domínio da norma culta formal: estrutura sintática bem articulada, com apenas poucos desvios pontuais de pontuação ou registro que não comprometem o texto.";
  } else {
    score = 200;
    feedback = "Excelente domínio da modalidade escrita formal da Língua Portuguesa: sintaxe madura, vocabulário acadêmico preciso e respeito rigoroso às convenções da norma padrão.";
  }

  return {
    score,
    feedback,
    informalFound: informalFound.map(f => ({ excerpt: f.excerpt, fix: f.fix })),
    syntaxIssues: syntaxIssues.map(s => ({ excerpt: s.excerpt, desc: s.desc })),
  };
}

// ─── COMPETÊNCIA 2: REPERTÓRIO E TEMA ────────────────────────────────────────
// ENEM Real:
// 200: Compreende o tema, tipo dissertativo em 4 parágrafos e pelo menos 1 repertório legitimado produtivo.
// 160: Repertório legitimado pertinente, mas de uso pouco produtivo, ou 2 bons repertórios em texto de 3 parágrafos.
// 120: Aborda o tema com repertório baseado no senso comum ou textos motivadores.
// 80: Tangencia o tema ou estrutura dissertativa frágil.
// 40: Tangenciamento grave.
// 0: Fuga total ao tema.

function avaliarC2(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
  repertoireFound: { label: string; excerpt: string }[];
} {
  const repRules: { label: string; rgx: RegExp; weight: number }[] = [
    { label: "Filósofo/Sociólogo", rgx: /\b(bauman|bourdieu|foucault|habermas|durkheim|marx|gramsci|weber|arendt|beauvoir|sartre|rousseau|locke|hobbes|kant|hegel|nietzsche|marilena\s*chauí|ailton\s*krenak|arist[óo]teles|plat[ãa]o)\b/gi, weight: 2 },
    { label: "Literatura", rgx: /\b(machado\s*de\s*assis|clarice\s*lispector|graciliano|carolina\s*maria\s*de\s*jesus|drummond|guimarães\s*rosa|orwell|kafka|vidas\s*secas|quarto\s*de\s*despejo|segundo\s*sexo)\b/gi, weight: 2 },
    { label: "Marco legal/Constitucional", rgx: /\b(constitui[çc][ãa]o\s*(federal)?\s*(de\s*1988)?|artigo\s*\d+|carta\s*magna|cidad[ãa]os?\s*de\s*papel|declaração\s*universal|direitos\s*humanos|lei\s*n[ºo°]?\s*\d+|estatuto|código)\b/gi, weight: 2 },
    { label: "Dados e Autoridades", rgx: /\b(ibge|ipea|onu|oms|unicef|unesco|oxfam|fiocruz|inep|dados?\s*d[ao]|pesquisa|estudo|censo)\b/gi, weight: 2 },
    { label: "Contexto Histórico", rgx: /\b(revolu[çc][ãa]o\s*(industrial|francesa)|iluminismo|ditadura|era\s*vargas|período\s*colonial|escravidão|república|s[ée]culo\s*(xxi|xx|xix|xviii))\b/gi, weight: 1 },
    { label: "Conceito Científico/Teórico", rgx: /\b(violência\s*simbólica|habitus|capital\s*(cultural|social)|panóptico|necropolítica|interseccionalidade|liquidez|cidadania)\b/gi, weight: 2 },
  ];

  const found: { label: string; excerpt: string; weight: number }[] = [];
  for (const r of repRules) {
    const m = [...text.matchAll(new RegExp(r.rgx.source, "gi"))];
    if (m.length > 0 && m[0].index !== undefined) {
      found.push({
        label: r.label,
        excerpt: excerptAround(text, m[0].index, m[0][0].length, 40),
        weight: r.weight,
      });
    }
  }

  const uniqueCats = new Set(found.map(r => r.label)).size;
  const hasParagraphStructure = paragraphs.length >= 3;
  const isCanonical4 = paragraphs.length === 4;

  let score: number;
  let feedback: string;

  if (wordCount < 60) {
    score = 0;
    feedback = "Texto com extensão insuficiente para demonstrar compreensão do tema proposto.";
  } else if (uniqueCats === 0 && !hasParagraphStructure) {
    score = 80;
    feedback = "Desenvolvimento temático elementar, sem repertório legitimado externo e com estrutura textual que demanda melhor organização em introdução, desenvolvimento e conclusão.";
  } else if (uniqueCats === 0) {
    score = 120;
    feedback = "Compreensão adequada da proposta e da estrutura dissertativa, porém a argumentação permanece presa ao senso comum. Para avançar, insira referências a pensadores, dados estatísticos ou marcos legais pertinentes.";
  } else if (uniqueCats === 1 && !isCanonical4) {
    score = 160;
    feedback = "Bom repertório sociocultural legitimado e pertinente à temática. Para alcançar os 200 pontos, garanta a divisão clássica em 4 parágrafos e amarre o repertório de forma ainda mais produtiva à sua tese.";
  } else if (uniqueCats >= 1) {
    score = 200;
    feedback = `Excelente domínio temático e repertório sociocultural legitimado (${found.map(f => f.label).slice(0, 2).join(", ")}). O repertório foi articulado de modo produtivo em defesa da tese.`;
  } else {
    score = 160;
    feedback = "Boa abordagem da proposta dissertativa-argumentativa, demonstrando reflexão sólida sobre os desafios do tema.";
  }

  return {
    score,
    feedback,
    repertoireFound: found.map(f => ({ label: f.label, excerpt: f.excerpt })),
  };
}

// ─── COMPETÊNCIA 3: PROJETO DE TEXTO E ARGUMENTAÇÃO ──────────────────────────
// ENEM Real:
// 200: Projeto de texto estratégico consistente, com progressão clara de ideias e defesa de tese.
// 160: Projeto de texto com pequenos deslizes de aprofundamento, mas com boa relação lógica.
// 120: Argumentação previsível ou prioritariamente expositiva.
// 80: Argumentação desorganizada ou de projeto falho.
// 40: Amontoado de argumentos sem coerência.

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
    /\bassim\b/i, /\bconsequentemente\b/i,
  ];

  const opsCount = logicalOps.filter(r => r.test(text)).length;
  const hasMultipleParagraphs = paragraphs.length >= 3;

  let score: number;
  let feedback: string;

  if (wordCount < 60 || paragraphs.length < 2) {
    score = 40;
    feedback = "Argumentação incipiente, sem projeto de texto delimitado ou sustentação suficiente de um ponto de vista.";
  } else if (opsCount < 2 || !hasMultipleParagraphs) {
    score = 80;
    feedback = "Projeto de texto com fragilidades: faltam operadores argumentativos para articular as causas e os efeitos do problema, resultando em raciocínio truncado.";
  } else if (opsCount < 4 || paragraphs.length < 4) {
    score = 120;
    feedback = "Projeto de texto presente, mas a argumentação é prioritariamente expositiva. Procure aprofundar o porquê dos problemas apontados com maior criticidade e autoria.";
  } else if (opsCount < 6) {
    score = 160;
    feedback = "Bom projeto de texto, com desenvolvimento coerente das ideias e defesa nítida da tese. Para nota 200, verticalize ainda mais o desdobramento entre causas e consequências nos parágrafos centrais.";
  } else {
    score = 200;
    feedback = "Projeto de texto estratégico e consistente: há progressão temática bem delineada da introdução à conclusão, com defesa convincente e autoral do ponto de vista.";
  }

  return { score, feedback };
}

// ─── COMPETÊNCIA 4: COESÃO TEXTUAL ───────────────────────────────────────────
// ENEM Real:
// 200: Presença expressiva de conectivos interparágrafos (ao menos 2) e variedade de conectivos intraparágrafos, com poucas repetições.
// 160: Conectivos interparágrafos funcionais e coesão intraparágrafo satisfatória.
// 120: Uso mediano de conectivos; repetições lexicais pontuais.
// 80: Coesão precária com frases justapostas sem conectivos.
// 40: Quase nenhuma articulação coesiva.

function avaliarC4(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
} {
  const interParagraphConnectors = [
    /^(em primeiro lugar|primeiramente|a princípio|de início|em uma primeira análise)/i,
    /^(em segundo lugar|ademais|outrossim|além disso|por outro lado|paralelamente|somado a isso)/i,
    /^(portanto|diante disso|diante do exposto|infere-se|conclui-se|logo|em suma|desse modo)/i,
  ];

  let interMatches = 0;
  for (let i = 1; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (interParagraphConnectors.some(rgx => rgx.test(p))) {
      interMatches++;
    }
  }

  const intraConnectors = [
    /\b(além disso|no entanto|todavia|contudo|porém|entretanto|visto que|desse modo|nesse sentido|por conseguinte|dessa forma)\b/gi,
  ];
  const intraCount = (text.match(intraConnectors[0]) || []).length;

  let score: number;
  let feedback: string;

  if (wordCount < 60) {
    score = 40;
    feedback = "Texto curto demais para demonstrar repertório de recursos coesivos.";
  } else if (interMatches === 0 && intraCount < 2) {
    score = 80;
    feedback = "Recursos coesivos muito escassos: as ideias aparecem desconectadas. Inicie os parágrafos de desenvolvimento e conclusão com conectivos lógicos.";
  } else if (interMatches === 1 || intraCount < 3) {
    score = 120;
    feedback = "Coesão mediana: o texto utiliza conectivos básicos, mas falta variedade na transição interparágrafos para garantir fluidez perfeita.";
  } else if (interMatches >= 2 && intraCount >= 3 && paragraphs.length >= 4) {
    score = 200;
    feedback = "Excelente domínio dos mecanismos linguísticos de coesão: conectivos interparágrafos canônicos, ampla articulação interna e leitura fluida.";
  } else {
    score = 160;
    feedback = "Boa articulação textual, com conectivos bem posicionados e transições adequadas entre as partes do texto.";
  }

  return { score, feedback };
}

// ─── COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO ──────────────────────────────────
// ENEM Real (Matriz Oficial):
// 5 elementos = 40 pontos cada:
// 1. Agente (quem faz)
// 2. Ação (o que fazer)
// 3. Meio/Modo (como fazer - "por meio de", "mediante", "através de", oficinas, etc.)
// 4. Finalidade (para que fazer - "a fim de", "com o intuito de", "para que", etc.)
// 5. Detalhamento (especificação de qualquer elemento - aposto, explicação, parceiros)
//
// 5 elementos = 200
// 4 elementos = 160
// 3 elementos = 120
// 2 elementos = 80
// 1 elemento = 40
// 0 elementos = 0

function avaliarC5(text: string, paragraphs: string[]): {
  score: number;
  feedback: string;
  elements: { name: string; found: boolean; detail: string }[];
} {
  const lastParagraph = paragraphs[paragraphs.length - 1] || text;
  const conclusionText = paragraphs.length >= 2 ? lastParagraph : text;

  const hasAgent = /\b(governo|minist[ée]rio|secretaria|poder\s*p[úu]blico|estado|escola|universidade|ong|fam[íi]lia|m[íi]dia|sociedade|cabe\s*(ao|à)|compete\s*(ao|à))\b/i.test(conclusionText);
  const hasAction = /\b(deve[m]?\s+(criar|elaborar|implementar|promover|garantir|assegurar|fiscalizar|combater|fomentar|investir)|cabe\s+(ao|à|aos|às).*?(criar|implementar|promover|agir)|é\s*(necessário|fundamental|urgente)|precisa|urge)\b/i.test(conclusionText);
  const hasMeans = /\b(por\s*meio\s*de|mediante|atrav[ée]s\s*de|em\s*parceria\s*com|em\s*conjunto\s*com|por\s*interm[ée]dio\s*de|campanhas?|programas?|oficinas?|palestras?|legislação|projeto\s*de\s*lei|com\s*o\s*auxílio)\b/i.test(conclusionText);
  const hasEffect = /\b(a\s*fim\s*de|com\s*o\s*(intuito|objetivo|propósito)\s*de|visando\s*a|para\s*(que\s*)?(se\s*)?(garanta|assegure|combata|mitigue|reduza|elimine|melhore)|de\s*modo\s*a)\b/i.test(conclusionText);
  const hasDetailing = /\b(especificamente|em\s*especial|voltad[ao]s?\s*(a|ao|para)|destinad[ao]s?\s*(a|ao|para)|–[^-]+–|,\s*(?:órgão|responsável|com\s*o\s*foco|por\s*exemplo))/i.test(conclusionText) || conclusionText.split(/\s+/).filter(Boolean).length > 65;

  const elements = [
    { name: "Agente", found: hasAgent, detail: "quem executará a intervenção (ex: Ministério da Educação, Governo Federal)" },
    { name: "Ação", found: hasAction, detail: "o que será feito concretamente (ex: 'deve implementar', 'cabe fiscalizar')" },
    { name: "Meio/Modo", found: hasMeans, detail: "como a ação será realizada (ex: 'por meio de oficinas escolares', 'mediante parcerias')" },
    { name: "Finalidade/Efeito", found: hasEffect, detail: "qual o objetivo ou impacto esperado (ex: 'a fim de garantir a igualdade de oportunidades')" },
    { name: "Detalhamento", found: hasDetailing, detail: "especificação de um dos elementos (ex: explicando o agente ou especificando as oficinas)" },
  ];

  const foundCount = elements.filter(e => e.found).length;
  const missingElements = elements.filter(e => !e.found);

  let score = foundCount * 40;
  if (paragraphs.length < 2 && foundCount > 1) {
    score = Math.min(score, 120);
  }

  let feedback: string;
  if (foundCount === 5) {
    score = 200;
    feedback = "Proposta de intervenção completa e exemplar (5/5 elementos): agente, ação, meio/modo, finalidade e detalhamento estão claramente contemplados e articulados à discussão.";
  } else if (foundCount === 4) {
    score = 160;
    feedback = `Proposta de intervenção muito bem estruturada (4/5 elementos). Para alcançar a nota máxima de 200, adicione explicitamente o elemento ausente: ${missingElements[0]?.name} (${missingElements[0]?.detail}).`;
  } else if (foundCount === 3) {
    score = 120;
    feedback = `Proposta de intervenção satisfatória (3/5 elementos presentes). Faltam: ${missingElements.map(e => e.name).join(" e ")}. Encorpore a proposta com mais detalhes sobre a execução.`;
  } else if (foundCount === 2) {
    score = 80;
    feedback = `Proposta de intervenção incompleta (2/5 elementos). Desenvolva melhor a solução indicando quem fará, por qual meio e com qual finalidade específica.`;
  } else if (foundCount === 1) {
    score = 40;
    feedback = "Proposta de intervenção incipiente: apenas um elemento identificado. Aponte ações e meios concretos para solucionar o problema.";
  } else {
    score = 0;
    feedback = "Ausência de proposta de intervenção social. O último parágrafo deve apresentar soluções práticas para o tema abordado.";
  }

  return { score, feedback, elements };
}

// ─── MOTOR PRINCIPAL ENCORAJADOR E JUSTO ──────────────────────────────────────

export function evaluateEssayHeuristically(
  essayText: string,
  context?: { targetScore?: string; college?: string; course?: string },
): CorrectionResult {
  const text = essayText.trim();
  const rawParagraphs = text.split(/\n\s*\n|\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [text];
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
  if (r2.repertoireFound.length > 0) {
    annotations.push({
      excerpt: r2.repertoireFound[0].excerpt,
      suggestion: `${r2.repertoireFound[0].label}: repertório pertinente que enriquece a fundamentação da tese (Competência 2).`,
      type: "acerto",
    });
  }

  // Acerto de conectivo em D2
  if (paragraphs.length >= 3) {
    const d2Conn = findLiteralExcerpt(paragraphs[2], /^(ademais|outrossim|além disso|por outro lado|em segundo lugar)/i);
    if (d2Conn) {
      annotations.push({
        excerpt: d2Conn,
        suggestion: "Conector interparágrafo bem posicionado, reforçando a continuidade textual (Competência 4).",
        type: "acerto",
      });
    }
  }

  // Erro de termo informal
  if (r1.informalFound.length > 0) {
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

  return CorrectionSchema.parse({
    score: totalScore,
    competencies: [
      { name: "C1 – Norma Padrão da Língua Portuguesa", score: r1.score, feedback: r1.feedback },
      { name: "C2 – Compreensão da Proposta e Repertório", score: r2.score, feedback: r2.feedback },
      { name: "C3 – Seleção e Organização de Argumentos", score: r3.score, feedback: r3.feedback },
      { name: "C4 – Mecanismos Linguísticos de Coesão", score: r4.score, feedback: r4.feedback },
      { name: "C5 – Proposta de Intervenção Social", score: r5.score, feedback: r5.feedback },
    ],
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
            ? `O aluno pretende ingressar em ${data.course} na ${data.college}, almejando ${data.targetScore || 900} pontos. Ajuste o feedback de forma construtiva e realista.`
            : `O aluno tem meta de ${data.targetScore || 900} pontos no ENEM.`;

        const result = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: CorrectionSchema,
          prompt: `Você é um corretor experiente e justo da banca do ENEM (INEP). ${goalContext}

Avalie a redação abaixo pelas cinco competências oficiais com rigor calibrado (notas justas que refletem a régua real do ENEM, sem punir excessivamente pequenos deslizes). Cada competência vale de 0 a 200 pontos (múltiplos de 40: 0, 40, 80, 120, 160 ou 200). A soma das cinco é a nota final de 0 a 1000.

CRITÉRIOS OFICIAIS DO ENEM:
- C1: Norma culta padrão (pequenos desvios isolados não impedem 160 ou 200).
- C2: Compreensão da proposta dissertativa e repertório sociocultural legitimado e produtivo.
- C3: Projeto de texto e argumentação coerente em defesa de um ponto de vista.
- C4: Coesão textual (conectivos interparágrafos e intraparágrafos).
- C5: Proposta de intervenção social com os 5 elementos (Agente, Ação, Meio/Modo, Finalidade e Detalhamento) — 40 pontos por elemento presente.

DIRETRIZES:
- Mantenha um tom pedagógico, motivador e claro.
- Aponte pontos fortes concretos e orientações práticas para atingir os 1000 pontos.
- Extraia trechos literais do texto para as anotações ('acerto' ou 'erro').

REDAÇÃO:
${data.essay}`,
        });

        if (result?.object) return result.object;
      } catch (err: unknown) {
        console.warn("[correctEssay] Gemini API indisponível. Usando motor pedagógico ENEM calibrado:", err instanceof Error ? err.message : err);
      }
    }

    // Motor pedagógico ENEM calibrado
    return evaluateEssayHeuristically(data.essay, {
      course: data.course,
      college: data.college,
      targetScore: data.targetScore,
    });
  });
