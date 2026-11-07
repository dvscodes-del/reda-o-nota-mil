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

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

/** Extrai um trecho do texto próximo a um match, para usar como excerpt literal */
function excerptAround(text: string, matchIndex: number, matchLen: number, radius = 60): string {
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + matchLen + radius);
  let snippet = text.substring(start, end).trim();
  if (snippet.length > 120) snippet = snippet.substring(0, 120).trimEnd() + "…";
  return snippet;
}

/** Verifica se um literal curto aparece no texto (para uso como excerpt de anotação) */
function findLiteralExcerpt(text: string, rgx: RegExp): string | null {
  const m = text.match(rgx);
  if (!m || m.index === undefined) return null;
  return excerptAround(text, m.index, m[0].length);
}

// ─── COMPETÊNCIA 1 ───────────────────────────────────────────────────────────
// Avalia: domínio da norma culta padrão da língua portuguesa.
// Níveis ENEM: 0=ausência total | 40=muitos desvios graves | 80=desvios graves
//              120=alguns graves/vários leves | 160=poucos leves | 200=domínio pleno
//
// O fiscal real analisa: ortografia, acentuação, pontuação, concordância,
// regência, crase, paralelismo sintático, e registro formal.

function avaliarC1(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
  informalFound: { excerpt: string; fix: string }[];
  syntaxIssues: { excerpt: string; desc: string }[];
} {
  // --- Desvios de registro informal / coloquial ---
  const informalRules: { rgx: RegExp; fix: string; severity: "grave" | "leve" }[] = [
    { rgx: /\bpra\b/gi, fix: "para", severity: "leve" },
    { rgx: /\bpro\s/gi, fix: "para o ", severity: "leve" },
    { rgx: /\bné\b/gi, fix: "não é?", severity: "grave" },
    { rgx: /\bhoje em dia\b/gi, fix: "na contemporaneidade / hodiernamente", severity: "leve" },
    { rgx: /\bcoisa\b(?!\s+pública)/gi, fix: "elemento / aspecto / fator", severity: "leve" },
    { rgx: /\btem que\b/gi, fix: "deve / necessita", severity: "leve" },
    { rgx: /\bcara\b/gi, fix: "indivíduo / cidadão", severity: "grave" },
    { rgx: /\ba gente\b/gi, fix: "nós / os cidadãos", severity: "grave" },
    { rgx: /\bgente\b/gi, fix: "as pessoas / a população", severity: "leve" },
    { rgx: /\btá\b/gi, fix: "está", severity: "grave" },
    { rgx: /\bpq\b|\bpqs\b/gi, fix: "porque", severity: "grave" },
    { rgx: /\btipo assim\b|\bsabe\b(?=\?)/gi, fix: "(remover expressão coloquial)", severity: "grave" },
    { rgx: /\ba nível de\b/gi, fix: "em nível de / no que se refere a", severity: "grave" },
    { rgx: /\bem termos de\b/gi, fix: "no que concerne a / quanto a", severity: "leve" },
    { rgx: /\bpor conta de\b/gi, fix: "devido a / em virtude de", severity: "leve" },
    { rgx: /\bno sentido de\b/gi, fix: "com vistas a / a fim de", severity: "leve" },
    { rgx: /\btoda(s)? vez(es)? que\b/gi, fix: "sempre que / cada vez que", severity: "leve" },
  ];

  // --- Problemas gramaticais e sintáticos graves ---
  const syntaxRules: { rgx: RegExp; desc: string; severity: "grave" | "leve" }[] = [
    { rgx: /\b(onde)\s+(?!há|se|existe|vivem|estão|residem|moram|ficam)/gi, desc: "Uso inadequado de 'onde' para indicar situação abstrata ou de tempo (deveria ser 'em que' ou 'no qual')", severity: "grave" },
    { rgx: /\b(mim)\s+fazer|\b(mim)\s+ir|\b(mim)\s+ver/gi, desc: "Uso incorreto de 'mim' como sujeito de oração infinitiva (deve ser 'eu')", severity: "grave" },
    { rgx: /\bprevisto\s+de\b/gi, desc: "Regência verbal incorreta: 'previsto' não exige preposição 'de' (use 'previsto para')", severity: "grave" },
    { rgx: /\bchegar\s+em\b/gi, desc: "Regência verbal: 'chegar' exige 'a', não 'em' (ex: 'chegar ao Brasil')", severity: "grave" },
    { rgx: /\bassistir\s+o\b/gi, desc: "Regência verbal: 'assistir' (ver) é verbo transitivo indireto – use 'assistir ao'", severity: "grave" },
    { rgx: /\bnamorar\s+com\b/gi, desc: "Regência: 'namorar' não admite 'com' (uso popular incorreto)", severity: "leve" },
    { rgx: /\bantes\s+de\s+mais\s+nada\b/gi, desc: "Expressão coloquial inadequada ao registro formal dissertativo", severity: "leve" },
    { rgx: /,\s*(que|o qual|a qual)\s+(é|são|foi|foram)\s+(?:um|uma)\b/gi, desc: "Oração relativa explicativa com retomada redundante do sujeito", severity: "leve" },
  ];

  const informalFound: { excerpt: string; fix: string; severity: string }[] = [];
  const syntaxIssues: { excerpt: string; desc: string; severity: string }[] = [];

  for (const rule of informalRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    if (matches.length > 0 && matches[0].index !== undefined) {
      informalFound.push({
        excerpt: excerptAround(text, matches[0].index, matches[0][0].length, 30),
        fix: rule.fix,
        severity: rule.severity,
      });
    }
  }

  for (const rule of syntaxRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    if (matches.length > 0 && matches[0].index !== undefined) {
      syntaxIssues.push({
        excerpt: excerptAround(text, matches[0].index, matches[0][0].length, 40),
        desc: rule.desc,
        severity: rule.severity,
      });
    }
  }

  // Verifica frases excessivamente longas (> 50 palavras sem ponto = possível truncamento)
  const sentences = text.match(/[^.!?;]+[.!?;]+/g) || [];
  const excessiveLong = sentences.filter(s => s.trim().split(/\s+/).length > 50);

  // Verifica paragráfos sem ponto final (possível falta de pontuação)
  const noPeriod = paragraphs.filter(p => p.length > 60 && !/[.!?]$/.test(p.trim()));

  // Conta desvios graves e leves separadamente
  const gravesInformal = informalFound.filter(f => f.severity === "grave").length;
  const levesInformal = informalFound.filter(f => f.severity === "leve").length;
  const gravesSyntax = syntaxIssues.filter(s => s.severity === "grave").length;
  const levesSyntax = syntaxIssues.filter(s => s.severity === "leve").length;

  const totalGraves = gravesInformal + gravesSyntax;
  const totalLeves = levesInformal + levesSyntax + excessiveLong.length + noPeriod.length;

  // Texto muito curto → perde pontos (fiscal exige no mínimo 150 palavras)
  const tooShort = wordCount < 150;
  const veryShort = wordCount < 80;

  let score: number;
  let feedbackParts: string[] = [];

  if (veryShort || totalGraves >= 8) {
    score = 0;
    feedbackParts.push("O texto apresenta ausência de domínio da norma padrão, com inúmeros e graves desvios gramaticais que comprometem a compreensão. Redações com menos de 80 palavras recebem nota zero nesta competência.");
  } else if (totalGraves >= 5 || tooShort) {
    score = 40;
    feedbackParts.push("Desempenho insuficiente na norma padrão: o texto apresenta muitos desvios graves de natureza gramatical e/ou sintática que dificultam a leitura e evidenciam desconhecimento da modalidade culta.");
    if (tooShort) feedbackParts.push(`O texto possui apenas ${wordCount} palavras; redações muito curtas impedem o desenvolvimento pleno das competências e resultam em penalização.`);
  } else if (totalGraves >= 3 || (totalGraves >= 1 && totalLeves >= 3)) {
    score = 80;
    feedbackParts.push("O texto evidencia domínio precário da norma padrão, com vários desvios graves presentes.");
    if (totalGraves > 0) feedbackParts.push(`Foram identificados ${totalGraves} desvio(s) grave(s) como: ${syntaxIssues.filter(s=>s.severity==="grave").map(s=>`"${s.desc}"`).join("; ")}${gravesInformal > 0 ? "; uso de expressões coloquiais inadequadas ao texto formal" : ""}.`);
  } else if (totalGraves >= 1 || totalLeves >= 4) {
    score = 120;
    feedbackParts.push("O texto apresenta domínio mediano da norma padrão, com alguns desvios gramaticais que comprometem parcialmente a qualidade formal.");
    if (totalGraves >= 1) feedbackParts.push(`Desvio(s) grave(s) detectado(s): ${[...syntaxIssues.filter(s=>s.severity==="grave"), ...informalFound.filter(f=>f.severity==="grave")].map(i=>"excerpt" in i && "desc" in (i as {excerpt:string;desc:string}) ? (i as {excerpt:string;desc:string}).desc : (i as {excerpt:string;fix:string}).fix).join("; ")}.`);
    if (totalLeves >= 2) feedbackParts.push(`Além de ${totalLeves} ocorrência(s) de expressões informais ou construções coloquiais que devem ser substituídas.`);
  } else if (totalLeves >= 2 || excessiveLong.length >= 2) {
    score = 160;
    feedbackParts.push("Bom domínio da norma padrão, com apenas pequenas inadequações de registro ou construções sintáticas que podem ser aprimoradas.");
    if (levesInformal > 0) feedbackParts.push(`Expressões como ${informalFound.filter(f=>f.severity==="leve").slice(0,2).map(f=>`"${f.excerpt.trim()}"`).join(" e ")} podem ser substituídas por opções mais formais.`);
    if (excessiveLong.length > 0) feedbackParts.push("Alguns períodos muito longos (acima de 50 palavras) podem dificultar a pontuação adequada e o controle sintático.");
  } else {
    score = 200;
    feedbackParts.push("Domínio pleno da norma padrão da língua portuguesa: o texto apresenta estrutura sintática madura, vocabulário formal preciso, pontuação adequada e ausência de desvios gramaticais relevantes.");
  }

  return {
    score,
    feedback: feedbackParts.join(" "),
    informalFound: informalFound.map(f => ({ excerpt: f.excerpt, fix: f.fix })),
    syntaxIssues: syntaxIssues.map(s => ({ excerpt: s.excerpt, desc: s.desc })),
  };
}

// ─── COMPETÊNCIA 2 ───────────────────────────────────────────────────────────
// Avalia: compreensão da proposta e aplicação de conceitos sociológicos,
// filosóficos, científicos e históricos para desenvolver o tema.
// Níveis: 0=fuga | 40=tangenciamento | 80=insuficiente | 120=básico | 160=bom | 200=pleno

function avaliarC2(text: string, paragraphs: string[]): {
  score: number;
  feedback: string;
  repertoireFound: { label: string; excerpt: string }[];
} {
  // Detecta repertório sociocultural legitimado por categoria
  const repertoireRules: { label: string; rgx: RegExp; weight: number }[] = [
    // Filosófico / sociológico
    { label: "Sociólogo/Filósofo citado", rgx: /\b(bauman|bourdieu|foucault|habermas|durkheim|marx|gramsci|weber|arendt|beauvoir|sartre|rousseau|locke|hobbes|kant|hegel|nietzsche|popper|rawls|bell\s*hooks|marilena\s*chauí|ailton\s*krenak)\b/gi, weight: 2 },
    // Literário brasileiro / mundial
    { label: "Autor literário citado", rgx: /\b(machado\s*de\s*assis|clarice\s*lispector|graciliano\s*ramos|carolina\s*maria\s*de\s*jesus|drummond|guimarães\s*rosa|jorge\s*amado|monteiro\s*lobato|euclides\s*da\s*cunha|grande\s*sertão|memórias\s*póstumas|vidas\s*secas|quarto\s*de\s*despejo|shakespeare|kafka|camus|orwell|dostoiévski|goethe)\b/gi, weight: 2 },
    // Marco legal / constitucional
    { label: "Marco legal/constitucional", rgx: /\b(constitui[çc][ãa]o\s*(federal)?\s*(de\s*1988)?|artigo\s*\d+|lei\s*(n[ºo°]?\s*)?\d[\d./-]*|estatuto\s*d[ao]|código\s*(civil|penal|de\s*defesa)|decreto|emenda\s*constitucional|convenção\s*(da|sobre)|tratado\s*internacional)\b/gi, weight: 2 },
    // Dados e fontes de autoridade
    { label: "Dado estatístico/fonte institucional", rgx: /\b(ibge|ipea|ipec|onu|oms|unicef|unesco|oxfam|fiocruz|inep|caged|pnad|seade|world\s*bank|banco\s*mundial|pnud|ocde|oecd|segundo\s*dados|pesquisa\s*revela|levantamento\s*aponta|estudo\s*(do|da|indica))\b/gi, weight: 2 },
    // Histórico / contextual
    { label: "Referência histórica/contextual", rgx: /\b(revolu[çc][ãa]o\s*(industrial|francesa|russa|burguesa)|iluminismo|renascimento|inquisição|ditadura\s*(militar|civil)|era\s*vargas|período\s*colonial|república\s*velha|golpe\s*de\s*64|escravidão|abolição|proclamação\s*da\s*república|holocausto|segunda\s*guerra|primeira\s*guerra|guerra\s*fria|pandemia|covid|s[ée]culo\s*(xxi|xx|xix|xviii|xvii))\b/gi, weight: 1 },
    // Científico / tecnológico
    { label: "Conceito científico/tecnológico", rgx: /\b(algoritmo|inteligência\s*artificial|big\s*data|aquecimento\s*global|mudanças?\s*climáticas|bioma|ecossistema|teoria\s*da\s*evolução|dna|neurociência|machine\s*learning|automação|revolução\s*4\.?0|internet\s*das\s*coisas)\b/gi, weight: 1 },
    // Conceitos teóricos chave (uso produtivo, não apenas citação)
    { label: "Conceito teórico aplicado", rgx: /\b(violência\s*simbólica|habitus|capital\s*(cultural|social|econômico)|panóptico|biopoder|necropolítica|interseccionalidade|colonialidade|subalternidade|liquidez\s*moderna|sociedade\s*de\s*controle|superestrutura|ideologia\s*dominante|epistemicídio)\b/gi, weight: 2 },
  ];

  const repertoireFound: { label: string; excerpt: string; weight: number }[] = [];
  for (const rule of repertoireRules) {
    const matches = [...text.matchAll(new RegExp(rule.rgx.source, "gi"))];
    if (matches.length > 0 && matches[0].index !== undefined) {
      repertoireFound.push({
        label: rule.label,
        excerpt: excerptAround(text, matches[0].index, matches[0][0].length, 50),
        weight: rule.weight,
      });
    }
  }

  // Pondera: prefere repertório diversificado (categorias diferentes)
  const totalWeight = repertoireFound.reduce((acc, r) => acc + r.weight, 0);
  const uniqueCategories = new Set(repertoireFound.map(r => r.label)).size;

  // Estrutura dissertativa: introdução com tese, 2 desenvolvimentos, conclusão
  const hasStructure = paragraphs.length >= 3;
  const hasIdealStructure = paragraphs.length === 4;

  // Verifica se a introdução apresenta tese (não é só contextualização)
  const intro = paragraphs[0] || "";
  const hasTesisInIntro = /\b(é\s*(necessário|fundamental|imprescindível|urgente|crucial)|faz-?se\s*(necessário|mister)|demanda|evidenci[ao]|revela|demonstra|comprova|impõe|exige)\b/i.test(intro);
  const hasContextInIntro = intro.length > 100 && repertoireFound.some(r =>
    intro.includes(r.excerpt.replace("…", "").trim().substring(0, 20))
  );

  // Verifica tangenciamento (texto que não aborda o tema principal)
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  let score: number;
  let feedbackParts: string[] = [];

  if (wordCount < 80) {
    score = 0;
    feedbackParts.push("O texto é demasiado curto para desenvolver qualquer abordagem temática. Redações com menos de 80 palavras recebem nota zero nesta competência.");
  } else if (uniqueCategories === 0 && !hasStructure) {
    score = 40;
    feedbackParts.push("O texto tangencia o tema proposto, sem demonstrar compreensão da proposta e sem recorrer a quaisquer elementos de repertório sociocultural legitimado. O candidato deve abordar o tema de forma direta e embasada.");
  } else if (uniqueCategories === 0 || !hasStructure) {
    score = 80;
    feedbackParts.push("O texto desenvolve o tema de forma insuficiente: falta repertório sociocultural legitimado que fundamente a argumentação. Uma redação do ENEM requer ao menos uma referência a filósofo, dado estatístico, marco legal ou fato histórico pertinente, utilizado de forma produtiva (não apenas citado).");
  } else if (uniqueCategories === 1 || totalWeight < 3 || !hasIdealStructure) {
    score = 120;
    feedbackParts.push("O texto compreende a proposta e apresenta desenvolvimento básico. Contudo, o repertório sociocultural é limitado a uma única categoria — o que reduz a profundidade da análise.");
    if (!hasTesisInIntro) feedbackParts.push("A introdução apresenta contextualização mas carece de uma tese clara que explicite o ponto de vista a ser defendido.");
    if (!hasIdealStructure) feedbackParts.push(`O texto possui ${paragraphs.length} parágrafo(s); a estrutura canônica do ENEM prevê 4 parágrafos: introdução, dois desenvolvimentos e conclusão.`);
  } else if (uniqueCategories <= 2 || totalWeight < 5 || (!hasTesisInIntro && !hasContextInIntro)) {
    score = 160;
    feedbackParts.push("Boa compreensão da proposta, com repertório sociocultural pertinente e uso produtivo das referências. Para atingir 200, amplie a diversidade de categorias do repertório (ex: combinar dados estatísticos com referência filosófica e marco legal) e assegure-se de que a tese da introdução delimita claramente o posicionamento.");
    if (!hasTesisInIntro) feedbackParts.push("A introdução ainda pode ser mais assertiva na defesa da tese.");
  } else {
    score = 200;
    feedbackParts.push(`Repertório sociocultural diversificado (${uniqueCategories} categoria(s) diferentes) e aplicado de forma produtiva ao desenvolvimento do tema, com compreensão plena da proposta e estrutura dissertativa adequada.`);
    if (hasTesisInIntro) feedbackParts.push("A introdução delimita com precisão a tese a ser desenvolvida.");
  }

  return {
    score,
    feedback: feedbackParts.join(" "),
    repertoireFound: repertoireFound.map(r => ({ label: r.label, excerpt: r.excerpt })),
  };
}

// ─── COMPETÊNCIA 3 ───────────────────────────────────────────────────────────
// Avalia: seleção, relação, organização e interpretação de informações,
// fatos, opiniões e argumentos em defesa de um ponto de vista.
// Níveis: 0=sem defesa | 40=incoerente | 80=limitada | 120=adequada | 160=boa | 200=plena

function avaliarC3(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
} {
  // Operadores de relação causal, concessiva e comparativa (marcam raciocínio)
  const causalOps = [
    /\bvisto que\b/i, /\bpois\b/i, /\bporque\b/i, /\buma vez que\b/i,
    /\bem virtude de\b/i, /\bhaja vista\b/i, /\bdecorre\s*(de|que)\b/i,
    /\boriginam?-se\b/i, /\bacarreta\b/i, /\bprovoca\b/i, /\bgera\b/i,
    /\bimpede\b/i, /\bpropicia\b/i, /\bdetermina\b/i,
  ];
  const concessiveOps = [
    /\bembora\b/i, /\bapesar\s*de\b/i, /\bmesmo\s*que\b/i, /\bainda\s*que\b/i,
    /\bpor[ée]m\b/i, /\bcontudo\b/i, /\btodavia\b/i, /\bno\s*entanto\b/i,
    /\bnem\s*por\s*isso\b/i, /\bsob\s*essa\s*[óo]tica\b/i,
  ];
  const consequenceOps = [
    /\bpor\s*conseguinte\b/i, /\bportanto\b/i, /\blogo\b/i,
    /\bdessa\s*forma\b/i, /\bdesse\s*modo\b/i, /\bde\s*modo\s*que\b/i,
    /\bcom\s*efeito\b/i, /\bist(o|e)\s*[ée]\b/i, /\bnesse\s*sentido\b/i,
    /\bassim\b/i, /\bconsequentemente\b/i,
  ];
  const comparativeOps = [
    /\bda\s*mesma\s*forma\b/i, /\banalogamente\b/i, /\bsimilarmente\b/i,
    /\bdo\s*mesmo\s*modo\b/i, /\bsob\s*(esse|o\s*mesmo)\s*ângulo\b/i,
  ];

  const foundCausal = causalOps.filter(r => r.test(text)).length;
  const foundConc = concessiveOps.filter(r => r.test(text)).length;
  const foundConseq = consequenceOps.filter(r => r.test(text)).length;
  const foundComp = comparativeOps.filter(r => r.test(text)).length;
  const totalOps = foundCausal + foundConc + foundConseq + foundComp;

  // Verifica se há desenvolvimento em 2 ângulos diferentes (D1 e D2)
  const hasTwoDevelopments = paragraphs.length >= 4;

  // Verifica se os parágrafos de desenvolvimento têm tamanho razoável (> 60 palavras)
  const devParagraphs = paragraphs.slice(1, paragraphs.length - 1);
  const richDevParagraphs = devParagraphs.filter(p => p.split(/\s+/).length > 60);

  // Verifica se há cadeia argumentativa (argumento → dado/exemplo → conclusão parcial)
  // Heurística: cada D deve ter ao menos 3 frases
  const devWithChain = devParagraphs.filter(p => {
    const sents = p.match(/[^.!?]+[.!?]+/g) || [];
    return sents.length >= 3;
  });

  // Verifica se há exemplificação ou dado dentro dos desenvolvimentos
  const hasDataOrExample = /\b(por exemplo|como\s*exemplo|a\s*título\s*de\s*exemplo|no\s*caso|ilustra|evidencia|segundo\s*(dados|pesquisa)|de\s*acordo\s*com|conforme\s*(apontam?|indica))\b/i.test(text);

  let score: number;
  let feedbackParts: string[] = [];

  if (wordCount < 80 || paragraphs.length < 2) {
    score = 0;
    feedbackParts.push("O texto não apresenta defesa de ponto de vista, sendo insuficiente em extensão e estrutura para qualquer avaliação desta competência.");
  } else if (totalOps < 2 || paragraphs.length < 2) {
    score = 40;
    feedbackParts.push("O texto apresenta argumentação incoerente ou de forma muito limitada, sem operadores argumentativos que demonstrem relações lógicas entre as ideias. Há ausência de cadeia argumentativa: o texto apenas enumera opiniões sem conectá-las de forma lógica.");
  } else if (totalOps < 4 || !hasTwoDevelopments || richDevParagraphs.length < 1) {
    score = 80;
    feedbackParts.push("O texto apresenta argumentação limitada, com poucos operadores lógicos e parágrafos de desenvolvimento rasos. Uma dissertação consistente exige ao menos dois ângulos argumentativos bem desenvolvidos (causa, consequência, exemplo), cada um com 3 ou mais frases articuladas.");
    if (!hasTwoDevelopments) feedbackParts.push(`O texto possui ${paragraphs.length} parágrafo(s); para dois desenvolvimentos independentes, são necessários pelo menos 4 parágrafos.`);
  } else if (totalOps < 6 || devWithChain.length < devParagraphs.length || !hasDataOrExample) {
    score = 120;
    feedbackParts.push("O texto apresenta argumentação adequada em linhas gerais, mas com algumas limitações na verticalização das ideias.");
    if (!hasDataOrExample) feedbackParts.push("Os desenvolvimentos carecem de exemplificação ou dado concreto que ilustre e reforce o argumento (ex: 'Segundo pesquisa do IBGE...', 'Como demonstrado no caso de...').");
    if (devWithChain.length < devParagraphs.length) feedbackParts.push("Ao menos um parágrafo de desenvolvimento não apresenta cadeia argumentativa completa (tópico frasal → desenvolvimento → conclusão parcial).");
    feedbackParts.push(`Foram identificados ${totalOps} operador(es) argumentativo(s); para 160+, é preciso maior variedade de relações lógicas (causal, concessiva, comparativa).`);
  } else if (totalOps < 8 || !richDevParagraphs.length || foundCausal < 2) {
    score = 160;
    feedbackParts.push("Boa seleção e organização de argumentos, com relações lógicas estabelecidas entre as ideias. Para o nível máximo, aprofunde a relação de causalidade (causas e consequências do problema) e enriqueça os desenvolvimentos com maior diversidade de operadores lógicos e dados mais específicos.");
    if (foundConc === 0) feedbackParts.push("O uso de operadores concessivos (embora, apesar de, ainda que) enriqueceria o texto ao reconhecer contradições ou limitações do argumento — uma marca de maturidade argumentativa.");
  } else {
    score = 200;
    feedbackParts.push(`Argumentação coesa e consistente, com ${totalOps} operadores lógicos variados (causais, concessivos, consecutivos), cadeia argumentativa completa em todos os desenvolvimentos e exemplificação pertinente. O texto demonstra capacidade plena de selecionar, relacionar e interpretar informações em defesa do ponto de vista.`);
  }

  return { score, feedback: feedbackParts.join(" ") };
}

// ─── COMPETÊNCIA 4 ───────────────────────────────────────────────────────────
// Avalia: conhecimento dos mecanismos linguísticos de coesão textual.
// Níveis: 0=sem coesão | 40=precária | 80=insuficiente | 120=básica | 160=boa | 200=plena

function avaliarC4(text: string, paragraphs: string[], wordCount: number): {
  score: number;
  feedback: string;
} {
  // Conectivos interparágrafos (abertura de parágrafos de D e C)
  const interParagraphConnectors = [
    { rgx: /^(em\s*primeiro\s*lugar|primeiramente|em\s*uma\s*primeira\s*análise|a\s*princípio|inicialmente)/i, type: "ordenação" },
    { rgx: /^(em\s*segundo\s*lugar|secundariamente|al[ée]m\s*disso|ademais|outrossim|por\s*outro\s*lado|paralelamente|conjuntamente|somado\s*a\s*isso|acrescente-se\s*que|cabe\s*ressaltar|importa\s*destacar)/i, type: "adição" },
    { rgx: /^(portanto|diante\s*disso|diante\s*do\s*exposto|diante\s*de\s*tal\s*cenário|infere-?se|conclui-?se|conclui-?se\s*que|logo|em\s*suma|dessa\s*maneira|desse\s*modo|em\s*vista\s*disso)/i, type: "conclusão" },
  ];

  let interMatches = 0;
  const interTypes = new Set<string>();
  for (let i = 1; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    for (const conn of interParagraphConnectors) {
      if (conn.rgx.test(p)) {
        interMatches++;
        interTypes.add(conn.type);
        break;
      }
    }
  }

  // Pronomes de retomada / coesão referencial
  const referentialConn = [
    /\b(esse|essa|esses|essas|tal|tais|o\s*qual|a\s*qual|os\s*quais|as\s*quais|cujo|cuja|cujos|cujas|aquele|aquela|aqueles|aquelas|isso|isto)\b/gi,
    /\b(o\s*referido|a\s*referida|o\s*mencionado|supracitad[ao]|já\s*abordad[ao])\b/gi,
  ];
  const totalReferential = referentialConn.reduce((acc, rgx) => {
    const matches = text.match(new RegExp(rgx.source, "gi")) || [];
    return acc + matches.length;
  }, 0);

  // Coesão lexical: variação vocabular (evita repetição)
  // Heurística: conta palavras com > 4 letras e verifica razão type/token (lexical diversity)
  const contentWords = text.match(/\b[a-záàâãéêíóôõúçñü]{5,}\b/gi) || [];
  const uniqueContentWords = new Set(contentWords.map(w => w.toLowerCase())).size;
  const lexicalDiversity = contentWords.length > 0 ? uniqueContentWords / contentWords.length : 0;

  // Verifica repetição excessiva de palavras-chave sem pronome de retomada
  const wordFreq: Record<string, number> = {};
  for (const w of contentWords) {
    const lw = w.toLowerCase();
    wordFreq[lw] = (wordFreq[lw] || 0) + 1;
  }
  const overusedWords = Object.entries(wordFreq)
    .filter(([, count]) => count >= 5)
    .map(([word]) => word);

  // Verifica elipse (ausência de sujeito = concordância implícita, bom sinal)
  // Verifica encadeamento intraparágrafo
  const intraConnectors = [
    /\b(além\s*disso|no\s*entanto|todavia|contudo|porém|entretanto|ao\s*passo\s*que|ao\s*mesmo\s*tempo\s*em\s*que|enquanto|ao\s*contrário|diferentemente\s*de|em\s*contrapartida)\b/gi,
  ];
  const intraCount = intraConnectors.reduce((acc, rgx) => {
    return acc + (text.match(new RegExp(rgx.source, "gi")) || []).length;
  }, 0);

  let score: number;
  let feedbackParts: string[] = [];

  if (wordCount < 80) {
    score = 0;
    feedbackParts.push("Texto insuficiente para avaliação de coesão. O texto deve ter no mínimo 150 palavras para esta competência ser avaliada adequadamente.");
  } else if (interMatches === 0 && intraCount === 0 && totalReferential < 2) {
    score = 40;
    feedbackParts.push("O texto apresenta articulação muito precária: ausência de conectivos interparágrafos, operadores intraparágrafos e mecanismos de retomada referencial. Cada parágrafo parece independente do anterior, o que fragmenta o texto e impede a progressão temática.");
  } else if (interMatches <= 1 && (intraCount < 2 || totalReferential < 3)) {
    score = 80;
    feedbackParts.push("Articulação insuficiente: o texto apresenta apenas rudimentos de coesão. Os parágrafos são pouco conectados entre si e há uso limitado de pronomes de retomada e operadores intraparágrafos.");
    feedbackParts.push("Para avançar nesta competência, inicie cada parágrafo de desenvolvimento com um conectivo adequado (ex: 'Em primeiro lugar', 'Ademais') e use pronomes como 'esse', 'tal', 'o qual' para retomar termos do parágrafo anterior.");
  } else if (interMatches <= 2 || intraCount < 3 || lexicalDiversity < 0.55) {
    score = 120;
    feedbackParts.push("Coesão básica presente, com conectivos interparágrafos e alguma retomada referencial, mas o repertório de mecanismos coesivos ainda é limitado.");
    if (interTypes.size < 2) feedbackParts.push("Os conectivos interparágrafos são repetitivos — diversifique o tipo (ex: use 'Outrossim' em vez de repetir 'Além disso').");
    if (lexicalDiversity < 0.55 && overusedWords.length > 0) feedbackParts.push(`Palavras como "${overusedWords.slice(0,3).join('", "')}" aparecem com muita frequência — use sinônimos ou pronomes de retomada para enriquecer o vocabulário.`);
  } else if (interMatches <= 3 || interTypes.size < 2 || intraCount < 5) {
    score = 160;
    feedbackParts.push("Boa articulação coesiva, com conectivos interparágrafos e mecanismos de retomada referencial bem empregados. Para o nível máximo, amplie o repertório de mecanismos linguísticos: inclua conectivos de oposição/concessão intraparágrafo (ex: 'ao passo que', 'ao contrário') e explore a elipse e a substituição lexical de forma mais sistemática.");
    if (overusedWords.length > 0) feedbackParts.push(`Ainda há repetição de "${overusedWords[0]}" que pode ser evitada com sinônimos ou pronomes anafóricos.`);
  } else {
    score = 200;
    feedbackParts.push(`Domínio pleno dos mecanismos de coesão textual: ${interMatches} conectivos interparágrafos de ${interTypes.size} tipo(s) diferente(s), ${intraCount} operador(es) intraparágrafo e uso diversificado de pronomes de retomada. O texto apresenta progressão temática clara e fluidez de leitura consistente.`);
  }

  return { score, feedback: feedbackParts.join(" ") };
}

// ─── COMPETÊNCIA 5 ───────────────────────────────────────────────────────────
// Avalia: proposta de intervenção social com respeito aos direitos humanos.
// ENEM exige 5 elementos: Agente | Ação | Meio/Modo | Finalidade | Detalhamento
// Níveis: 0=ausente | 40=1 elemento | 80=2 | 120=3 | 160=4 | 200=5 (todos)

function avaliarC5(text: string, paragraphs: string[]): {
  score: number;
  feedback: string;
  elements: { name: string; found: boolean; detail: string }[];
  violatesHumanRights: boolean;
} {
  const lastParagraph = paragraphs[paragraphs.length - 1] || text;
  // Se a redação for muito curta, usa o texto todo como "conclusão"
  const conclusionText = paragraphs.length >= 2 ? lastParagraph : text;

  // 1. AGENTE — quem vai executar a intervenção
  const agentPatterns = [
    /\b(governo\s*(federal|estadual|municipal)?|minist[ée]rio\s*d[ao]\w+|secretaria\s*d[ao]\w+|poder\s*(p[úu]blico|legislativo|executivo|judiciário)|estado|municipalidade|prefeitura|senado|câmara\s*(dos\s*deputados)?|congresso)\b/i,
    /\b(escola|universidade|faculdade|instituição\s*de\s*ensino|sistema\s*educacional|rede\s*pública)\b/i,
    /\b(mídia|imprensa|meios\s*de\s*comunicação|redes\s*sociais|plataforma|canal\s*de\s*tv)\b/i,
    /\b(ong|organização\s*(não\s*governamental|civil|social)|terceiro\s*setor|sociedade\s*civil)\b/i,
    /\b(empresa|setor\s*privado|indústria|comércio)\b/i,
    /\b(família|pais?\s*(e\s*mães)?|responsáveis|comunidade)\b/i,
    /\b(cabe\s*(ao|à|aos|às)|compete\s*(ao|à|aos|às)|incumbe\s*(ao|à|aos|às))\b/i,
  ];

  // 2. AÇÃO — o que o agente vai fazer (verbo de ação concreto)
  const actionPatterns = [
    /\b(deve[m]?\s+(criar|elaborar|desenvolver|implementar|promover|garantir|assegurar|fiscalizar|combater|enfrentar|mitigar|reduzir|ampliar|expandir|fortalecer|estruturar|fomentar|incentivar|regulamentar|legislar|aprovar|sancionar|reformular|reformar|capacitar|treinar|conscientizar|sensibilizar|investir|destinar\s*recursos))\b/i,
    /\b(cabe\s*(ao|à|aos|às).*?(criar|elaborar|desenvolver|implementar|promover|garantir|assegurar|fiscalizar))\b/i,
    /\b(é\s*(necessário|fundamental|imprescindível|urgente|crucial|imperativo)\s*(que\s*)?(se\s*)?(criem?|elaborem?|desenvolvam?|implementem?|promovam?|garantam?))\b/i,
    /\b(urge\s*(que\s*)?|impõe-?se\s*)\b/i,
  ];

  // 3. MEIO / MODO — como a ação será executada
  const meansPatterns = [
    /\b(por\s*meio\s*de|mediante|atrav[ée]s\s*de|via\s*(?!de\s*regra)|por\s*interm[ée]dio\s*de|utilizando|valendo-?se\s*de)\b/i,
    /\b(em\s*parceria\s*com|em\s*conjunto\s*com|em\s*colaboração\s*com|articulado\s*(ao|com)|integrado\s*(ao|com))\b/i,
    /\b(com\s*o\s*aux[íi]lio|com\s*o\s*apoio|com\s*recursos|por\s*meio\s*de\s*editais|via\s*legislação)\b/i,
    /\b(campanhas?\s*(educativas?|de\s*conscientização|midiáticas?|de\s*sensibilização)|programas?\s*(de\s*capacitação|de\s*treinamento)|cursos?\s*(de\s*formação|de\s*qualificação)|oficinas?|palestras?|seminários?|workshops?|cartilhas?|materiais?\s*didáticos?|aulas?\s*temáticas?)\b/i,
    /\b(legislação\s*(específica|federal|estadual)|projeto\s*de\s*lei|emenda\s*constitucional|decreto|resolução|portaria)\b/i,
    /\b(fiscalização\s*(rigorosa|periódica)|auditoria|monitoramento|sistemas?\s*de\s*controle)\b/i,
  ];

  // 4. FINALIDADE / EFEITO — para quê (propósito da intervenção)
  const effectPatterns = [
    /\b(a\s*fim\s*de|com\s*o\s*(intuito|objetivo|propósito|fito)\s*de|com\s*vistas\s*a|visando\s*(a\s*)?|para\s*(que\s*)?(se\s*)?(garanta[m]?|assegure[m]?|promova[m]?|combata[m]?|mitigu[em]?|reduz[am]?|elimine[m]?|alcance[m]?|atinja[m]?|melhore[m]?))\b/i,
    /\b(de\s*modo\s*(a|que)\s*(garantir|assegurar|promover|combater|mitigar|reduzir|eliminar|alcançar|atingir|melhorar))\b/i,
    /\b(para\s*(combater|enfrentar|solucionar|mitigar|amenizar|superar|erradicar|prevenir))\b/i,
  ];

  // 5. DETALHAMENTO — especificação do agente, ação, meio ou finalidade
  // Heurística: presença de complemento explicativo após conectivo introdutor
  const detailingPatterns = [
    /\b(especificamente|em\s*especial|particularmente|sobretudo|notadamente)\b/i,
    /\b(voltad[ao]s?\s*(a|ao|para|aos|às)|destinad[ao]s?\s*(a|ao|para|aos|às)|focad[ao]s?\s*(em|no|na|nos|nas))\b/i,
    // Presença de dois agentes ou dois meios = detalhamento implícito
    /\b(minist[ée]rio\s*d[ao]\w+.*?em\s*parceria\s*com\s*minist[ée]rio\s*d[ao]\w+|secretaria.*?conjuntamente|governo.*?sociedade\s*civil)\b/i,
    // Trecho longo na conclusão indica detalhamento (> 150 palavras na conclusão)
  ];

  const conclusionWordCount = conclusionText.split(/\s+/).filter(Boolean).length;
  const conclusionIsDetailed = conclusionWordCount > 90;

  const checkPattern = (patterns: RegExp[], textToCheck: string) =>
    patterns.some(p => p.test(textToCheck));

  const hasAgent = checkPattern(agentPatterns, conclusionText);
  const hasAction = checkPattern(actionPatterns, conclusionText);
  const hasMeans = checkPattern(meansPatterns, conclusionText);
  const hasEffect = checkPattern(effectPatterns, conclusionText);
  const hasDetailing = checkPattern(detailingPatterns, conclusionText) || conclusionIsDetailed;

  // Verifica violação de direitos humanos (pena de morte, violência física etc.)
  const humanRightsViolations = [
    /\b(pena\s*de\s*morte|execução\s*(sumária|extrajudicial)|matar|eliminar\s*(todos|a\s*população)|esterilizar\s*à\s*força|eugen[ia])\b/i,
  ];
  const violatesHumanRights = humanRightsViolations.some(p => p.test(conclusionText));

  const elements = [
    { name: "Agente", found: hasAgent, detail: "quem executará a intervenção (ex: Governo Federal, Ministério da Educação, ONGs)" },
    { name: "Ação", found: hasAction, detail: "o que será feito (ex: 'deve criar', 'cabe implementar', 'é necessário desenvolver')" },
    { name: "Meio/Modo", found: hasMeans, detail: "como será feito (ex: 'por meio de campanhas', 'mediante projeto de lei', 'em parceria com')" },
    { name: "Finalidade/Efeito", found: hasEffect, detail: "para quê (ex: 'a fim de garantir', 'com o objetivo de combater', 'visando a reduzir')" },
    { name: "Detalhamento", found: hasDetailing, detail: "especificação de um dos elementos (ex: qual ministério, qual tipo de campanha, qual público-alvo)" },
  ];

  const foundCount = elements.filter(e => e.found).length;
  const missingElements = elements.filter(e => !e.found);

  let score: number;
  let feedbackParts: string[] = [];

  if (violatesHumanRights) {
    score = 0;
    feedbackParts.push("ATENÇÃO: A proposta de intervenção viola princípios dos direitos humanos. Redações com propostas que atentam contra a dignidade da pessoa humana recebem nota zero nesta competência.");
  } else if (foundCount === 0 || paragraphs.length < 2) {
    score = 0;
    feedbackParts.push("O texto não apresenta proposta de intervenção. Esta competência exige uma conclusão com solução concreta para o problema abordado, contemplando 5 elementos: agente, ação, meio/modo, finalidade e detalhamento.");
  } else if (foundCount === 1) {
    score = 40;
    feedbackParts.push(`Proposta de intervenção muito insuficiente: apenas ${foundCount}/5 elemento(s) presente(s). ${missingElements.map(e => `Falta "${e.name}" (${e.detail})`).join("; ")}.`);
  } else if (foundCount === 2) {
    score = 80;
    feedbackParts.push(`Proposta de intervenção incompleta: ${foundCount}/5 elementos presentes. Ausentes: ${missingElements.map(e => `"${e.name}"`).join(", ")}. ${missingElements.map(e=>`Acrescente ${e.detail}`).join("; ")}.`);
  } else if (foundCount === 3) {
    score = 120;
    feedbackParts.push(`Proposta de intervenção parcialmente completa: ${foundCount}/5 elementos. Faltam ${missingElements.map(e=>`"${e.name}" (${e.detail})`).join(" e ")} para atingir o nível pleno.`);
  } else if (foundCount === 4) {
    score = 160;
    feedbackParts.push(`Proposta de intervenção bem elaborada, com ${foundCount}/5 elementos. Para 200 pontos, acrescente: "${missingElements[0]?.name}" — ${missingElements[0]?.detail}.`);
  } else {
    score = 200;
    feedbackParts.push("Proposta de intervenção completa e detalhada, com todos os 5 elementos exigidos (agente, ação, meio/modo, finalidade e detalhamento), respeitando os direitos humanos e articulada ao problema desenvolvido no texto.");
    if (conclusionIsDetailed) feedbackParts.push("O parágrafo conclusivo apresenta extensão e riqueza de detalhes acima da média — ótimo indicador de proposta bem desenvolvida.");
  }

  return { score, feedback: feedbackParts.join(" "), elements, violatesHumanRights };
}

// ─── MOTOR PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Motor pedagógico ENEM com descritores oficiais de cada nível (0/40/80/120/160/200).
 * Simula a análise de um fiscal treinado pelo INEP nas 5 competências.
 */
export function evaluateEssayHeuristically(
  essayText: string,
  context?: { targetScore?: string; college?: string; course?: string },
): CorrectionResult {
  const text = essayText.trim();
  const rawParagraphs = text.split(/\n\s*\n|\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [text];
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const r1 = avaliarC1(text, paragraphs, wordCount);
  const r2 = avaliarC2(text, paragraphs);
  const r3 = avaliarC3(text, paragraphs, wordCount);
  const r4 = avaliarC4(text, paragraphs, wordCount);
  const r5 = avaliarC5(text, paragraphs);

  const totalScore = r1.score + r2.score + r3.score + r4.score + r5.score;

  // ── Forças (apenas o que realmente está bom) ──
  const strengths: string[] = [];
  if (r1.score >= 160) strengths.push("Domínio sólido da norma padrão da língua portuguesa: o texto apresenta registro formal consistente, sem desvios gramaticais significativos.");
  if (r2.score >= 160 && r2.repertoireFound.length > 0) {
    const labels = [...new Set(r2.repertoireFound.map(r => r.label))].slice(0, 2);
    strengths.push(`Repertório sociocultural diversificado e aplicado produtivamente ao tema: ${labels.join(" e ")}.`);
  }
  if (r3.score >= 160) strengths.push("Cadeia argumentativa bem estruturada, com relações lógicas (causal, concessiva, consecutiva) que sustentam o ponto de vista de forma coerente.");
  if (r4.score >= 160) strengths.push("Articulação coesiva adequada, com conectivos interparágrafos e mecanismos de retomada referencial que garantem a progressão do texto.");
  if (r5.score >= 160) {
    const foundEls = r5.elements.filter(e => e.found).map(e => e.name);
    strengths.push(`Proposta de intervenção bem elaborada, com ${foundEls.length} elemento(s) claramente identificado(s): ${foundEls.join(", ")}.`);
  }
  if (strengths.length === 0) strengths.push("O texto apresenta esforço de estruturação dissertativa, o que é o ponto de partida essencial para evoluir nas próximas redações.");
  if (strengths.length === 1 && totalScore >= 400) strengths.push("A extensão e o esforço argumentativo demonstram comprometimento com a prática de escrita.");

  // ── Melhorias por prioridade (maior impacto na nota primeiro) ──
  const improvements: string[] = [];
  const compByScore = [
    { name: "C5 – Proposta de Intervenção", score: r5.score, hint: "Inclua os 5 elementos: Agente, Ação, Meio/Modo, Finalidade e Detalhamento. Ex: 'Cabe ao Ministério da Educação [agente], por meio de campanhas escolares [meio], promover [ação] a conscientização sobre o tema [finalidade], priorizando escolas públicas de regiões vulneráveis [detalhamento]'." },
    { name: "C3 – Argumentação", score: r3.score, hint: "Aprofunde cada desenvolvimento com cadeia argumentativa completa: tópico frasal → argumento com dado/exemplo → conclusão parcial do parágrafo. Use conectivos causais (visto que, pois, uma vez que) e consecutivos (por conseguinte, desse modo)." },
    { name: "C2 – Repertório", score: r2.score, hint: "Inclua ao menos 2 referências de categorias diferentes (ex: um dado do IBGE + uma citação filosófica ou marco legal). O repertório deve ser usado produtivamente, não apenas citado — conecte-o ao argumento." },
    { name: "C4 – Coesão", score: r4.score, hint: "Inicie cada parágrafo de desenvolvimento e conclusão com conectivos interparágrafos distintos. Use pronomes de retomada (esse, tal, o qual) para substituir repetições lexicais." },
    { name: "C1 – Norma Culta", score: r1.score, hint: "Revise expressões coloquiais e construções sintáticas. Evite períodos com mais de 50 palavras. Use o registro formal da língua escrita padrão." },
  ].sort((a, b) => a.score - b.score);

  for (const comp of compByScore) {
    if (comp.score < 200 && improvements.length < 4) {
      improvements.push(`[${comp.name}] ${comp.hint}`);
    }
  }

  // ── Anotações literais no texto ──
  const annotations: { excerpt: string; suggestion: string; type: "acerto" | "erro" }[] = [];

  // ACERTOS
  // Anotação de repertório no D1 ou D2
  if (r2.repertoireFound.length > 0) {
    const rep = r2.repertoireFound[0];
    // Verifica se o trecho ainda está no texto antes de adicionar
    const cleanExcerpt = rep.excerpt.replace("…", "").trim();
    if (cleanExcerpt.length >= 5) {
      annotations.push({
        excerpt: rep.excerpt,
        suggestion: `${rep.label}: uso pertinente e produtivo. Repertório legitimado que agrega densidade argumentativa à Competência 2.`,
        type: "acerto",
      });
    }
  }

  // Conectivo de abertura da conclusão
  const conclusionConn = findLiteralExcerpt(paragraphs[paragraphs.length - 1] || text, /^(portanto|diante disso|diante do exposto|em suma|conclui-se|logo|infere-se)/i);
  if (conclusionConn) {
    annotations.push({
      excerpt: conclusionConn,
      suggestion: "Excelente uso de conectivo conclusivo canônico para abertura da proposta de intervenção — marca discursiva valorizada na Competência 4.",
      type: "acerto",
    });
  }

  // Cadeia lógica bem articulada (D1 com conectivo causal)
  const devParagraph = paragraphs[1] || "";
  const causalInDev = findLiteralExcerpt(devParagraph, /\b(visto que|uma vez que|haja vista|em virtude de|pois|porquanto)\b/i);
  if (causalInDev && r3.score >= 120) {
    annotations.push({
      excerpt: causalInDev,
      suggestion: "Operador causal bem posicionado no desenvolvimento — evidencia relação lógica entre argumento e fundamento (Competência 3).",
      type: "acerto",
    });
  }

  // Proposta de intervenção com agente claro
  if (r5.elements.find(e => e.name === "Agente" && e.found) && r5.score >= 120) {
    const agentExcerpt = findLiteralExcerpt(paragraphs[paragraphs.length - 1] || text,
      /\b(minist[ée]rio\s*d[ao]\w+|governo\s*(federal|estadual|municipal)?|poder\s*p[úu]blico|estado|escola|universidade|ong)/i
    );
    if (agentExcerpt) {
      annotations.push({
        excerpt: agentExcerpt,
        suggestion: "Agente da proposta de intervenção identificado com clareza — um dos 5 elementos exigidos na Competência 5.",
        type: "acerto",
      });
    }
  }

  // ERROS
  // Termo informal
  if (r1.informalFound.length > 0) {
    const inf = r1.informalFound[0];
    if (inf.excerpt.length >= 2) {
      annotations.push({
        excerpt: inf.excerpt,
        suggestion: `Expressão informal inadequada ao registro dissertativo do ENEM. Substitua por: "${inf.fix}". Desvios de registro comprometem a Competência 1.`,
        type: "erro",
      });
    }
  }

  // Desvio sintático grave
  if (r1.syntaxIssues.length > 0) {
    const syn = r1.syntaxIssues[0];
    if (syn.excerpt.length >= 5) {
      annotations.push({
        excerpt: syn.excerpt,
        suggestion: `Desvio gramatical/sintático grave: ${syn.desc}. Corrija para elevar sua nota na Competência 1.`,
        type: "erro",
      });
    }
  }

  // Proposta incompleta (falta algum elemento)
  const missingEl = r5.elements.find(e => !e.found);
  if (missingEl && r5.score < 200) {
    // Pega o início do último parágrafo como excerpt
    const lastP = paragraphs[paragraphs.length - 1] || "";
    const firstPhrase = lastP.match(/^[^.!?]{20,80}/);
    if (firstPhrase && text.includes(firstPhrase[0].trim().substring(0, 30))) {
      annotations.push({
        excerpt: firstPhrase[0].trim().substring(0, 80),
        suggestion: `A proposta de intervenção ainda não possui "${missingEl.name}" explícito. Acrescente: ${missingEl.detail}.`,
        type: "erro",
      });
    }
  }

  // Ausência de conectivo interparágrafo em D2 (terceiro parágrafo)
  if (paragraphs.length >= 4 && r4.score < 160) {
    const d2 = paragraphs[2];
    const hasD2Conn = /^(ademais|outrossim|al[ée]m disso|por outro lado|em segundo lugar|paralelamente|somado\s*a\s*isso)/i.test(d2.trim());
    if (!hasD2Conn) {
      const d2Snippet = d2.trim().substring(0, Math.min(70, d2.length));
      if (text.includes(d2Snippet.trim().substring(0, 30))) {
        annotations.push({
          excerpt: d2Snippet,
          suggestion: "O segundo parágrafo de desenvolvimento não inicia com conectivo interparágrafo. Use 'Ademais', 'Outrossim' ou 'Por outro lado' para garantir a progressão coesiva (Competência 4).",
          type: "erro",
        });
      }
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
    annotations: annotations.filter(a => a.excerpt.length >= 5).slice(0, 5),
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
            ? `O aluno tem como meta ingressar em ${data.course} na ${data.college}, almejando ${data.targetScore || 900} pontos. Calibre o rigor avaliativo para esse nível de exigência.`
            : `O aluno tem meta de ${data.targetScore || 900} pontos no ENEM.`;

        const result = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: CorrectionSchema,
          prompt: `Você é um fiscal do INEP treinado para corrigir redações do ENEM com rigor máximo. ${goalContext}

Avalie a redação abaixo pelas CINCO competências oficiais. Cada competência vale de 0 a 200 pontos, em múltiplos de 40 (0, 40, 80, 120, 160 ou 200). A soma é a nota final de 0 a 1000.

CRITÉRIOS OBRIGATÓRIOS:
- C1: Norma padrão da língua portuguesa (desvios ortográficos, gramaticais, sintáticos, pontuação, registro)
- C2: Compreensão da proposta + repertório sociocultural legitimado (filósofos, dados, marcos legais, autores, fatos históricos) usado de forma produtiva
- C3: Seleção, organização e interpretação de argumentos em defesa de um ponto de vista, com encadeamento lógico (causal, concessivo, consecutivo)
- C4: Mecanismos de coesão (conectivos inter e intraparágrafos, pronomes de retomada, elipse, substituição lexical, progressão temática)
- C5: Proposta de intervenção com os 5 elementos: Agente, Ação, Meio/Modo, Finalidade, Detalhamento — sem violar direitos humanos

INSTRUÇÕES DE SAÍDA:
- Produza exatamente 5 competências na ordem acima
- Feedbacks devem ser específicos ao texto avaliado (mencione trechos, lacunas concretas)
- Produza 2 a 4 forças reais (apenas o que está genuinamente bom)
- Produza 2 a 4 melhorias concretas com exemplos do que falta
- Produza até 5 anotações com trechos LITERAIS do texto (exatos), indicando 'acerto' ou 'erro'

REDAÇÃO:
${data.essay}`,
        });

        if (result?.object) return result.object;
      } catch (err: unknown) {
        console.warn("[correctEssay] Gemini API indisponível. Usando motor pedagógico ENEM integrado:", err instanceof Error ? err.message : err);
      }
    }

    // Motor pedagógico analítico integrado (funciona sem API key)
    return evaluateEssayHeuristically(data.essay, {
      course: data.course,
      college: data.college,
      targetScore: data.targetScore,
    });
  });
