import { createFileRoute } from "@tanstack/react-router";
import { EssayApp } from "@/components/essay-app";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escreva+ — Treino de Redação ENEM" },
      { name: "description", content: "Treine redações, domine as competências do ENEM e receba feedback pedagógico por inteligência artificial." },
      { property: "og:title", content: "Escreva+ — Treino de Redação ENEM" },
      { property: "og:description", content: "Seu espaço de treino, repertório e evolução para a redação do ENEM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EssayApp,
});
