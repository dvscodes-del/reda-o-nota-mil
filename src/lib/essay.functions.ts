import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

const EssayInput = z.object({ essay: z.string().min(120) });

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
    }),
  ),
});

export const correctEssay = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EssayInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A correção inteligente ainda não está configurada.");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: CorrectionSchema }),
      prompt: `Atue como corretor pedagógico de redações do ENEM. Avalie o texto abaixo pelas cinco competências oficiais. Cada competência vale de 0 a 200 e a soma deve ser a nota final de 0 a 1000. Seja criterioso, acolhedor e específico. Produza exatamente cinco competências em ordem, 2 a 4 forças, 2 a 4 melhorias e até 3 anotações com trechos literais do texto.\n\nREDAÇÃO:\n${data.essay}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    return await result.output;
  });