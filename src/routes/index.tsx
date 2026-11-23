import { createFileRoute } from "@tanstack/react-router";
import { EssayApp } from "@/components/essay-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aprova Red — Estúdio de Redação ENEM" },
      { name: "description", content: "Treine redações no padrão ENEM, construa repertório sólido e acompanhe sua evolução rumo à aprovação." },
      { property: "og:title", content: "Aprova Red — Estúdio de Redação ENEM" },
      { property: "og:description", content: "Seu estúdio de treino, repertório sociocultural e correção detalhada para a redação do ENEM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EssayApp,
});
