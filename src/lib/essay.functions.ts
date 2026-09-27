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

export const correctEssay = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EssayInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"] || process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("A correção inteligente ainda não está configurada (Falta API Key).");

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    const goalContext = data.course && data.college 
      ? `O aluno tem o objetivo de ingressar em ${data.course} na ${data.college} com uma meta de ${data.targetScore || 900} pontos. Ajuste seu rigor, sua exigência gramatical e a profundidade dos argumentos esperados de acordo com essa concorrência.`
      : `O aluno tem uma meta de ${data.targetScore || 900} pontos.`;

    const result = await generateObject({
      model: google("gemini-1.5-pro-latest"),
      schema: CorrectionSchema,
      prompt: `Atue como corretor pedagógico implacável de redações do ENEM. ${goalContext} Avalie o texto abaixo pelas cinco competências oficiais. Cada competência vale de 0 a 200 e a soma deve ser a nota final de 0 a 1000. Seja criterioso, focado no objetivo do aluno e específico. Produza exatamente cinco competências em ordem, 2 a 4 forças, 2 a 4 melhorias e até 5 anotações (indicando o tipo 'acerto' ou 'erro') com trechos literais do texto.\n\nREDAÇÃO:\n${data.essay}`,
    });

    return result.object;
  });