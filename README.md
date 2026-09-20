# Redação Nota Mil

Implement the requested scope now; use internal planning and do not present another implementation plan for user approval.

# User Request
Crie uma aplicação web moderna, responsiva e inovadora focada no treinamento e correção de redações (estilo ENEM/Vestibular). O design deve ser limpo, focado na experiência do estudante e usar uma paleta de cores baseada em Roxo (Primary) e Off-White (Background), transmitindo calma, foco e tecnologia.

# DIRETRIZES DE DESIGN E TEMA
- Cor de Fundo Principal: Off-white (#FAF9F6 ou similar).
- Cor Primária (Botões, Destaques, Header): Roxo moderno e vibrante (ex: tons de #7C3AED ou #6D28D9).
- Texto: Cinza escuro/chumbo para garantir alta legibilidade no fundo off-white.
- Estilo: Minimalista, cantos arredondados (rounded-xl), sombras suaves (shadow-sm) em cards, visual "clean" e gamificado, hover suave.

# ESTRUTURA DO APLICATIVO E NAVEGAÇÃO
Menu lateral (Sidebar) ou Topbar responsiva com as seções:
1. DASHBOARD (Início)
   - Banner de "Desafio do Dia": proposta de redação diária em destaque com botão "Começar a Escrever" redirecionando para o laboratório.
   - Cards de atalho rápido para as outras áreas.
   - Gráfico de progresso do aluno (redações enviadas, média de notas, evolução recente).

2. MURAL NOTA MIL (Inspiração)
   - Galeria de cards com redações nota 1000 reais/exemplares.
   - Cada card com tema, autor/ano e resumo; ao clicar, abre modal com o texto completo estruturado em parágrafos e comentários pedagógicos.

3. DOMINE AS COMPETÊNCIAS (Teoria e Treino Isolado)
   - 5 seções expansíveis (Accordion) ou cards para as 5 competências do ENEM.
   - Instruções do que é avaliado e critérios de nota (0 a 200).
   - Botão de "Treinamento Isolado" com mini-exercícios práticos e interativos (ex: conectivos para Competência 4, proposta de intervenção completa com 5 elementos para Competência 5).

4. REPERTÓRIO SOCIOCULTURAL
   - Mural estilo Pinterest/grid com filtros por categoria (Livros, Filmes, Séries, Músicas, Filosofia/Sociologia, Citações).
   - Cards com imagem ilustrativa, título, autor/contexto e sinopse prática explicando como aplicar como repertório legitimado na redação.

5. LABORATÓRIO DE REDAÇÃO
   - Duas abas (Tabs):
     - Aba 1: "Redação Digital" - Editor de texto estilo Notion/distraction-free com contagem de palavras, caracteres e linhas (simulando as 30 linhas da folha oficial), além de temporizador opcional.
     - Aba 2: "Redação Escrita (Foto)" - Área de upload drag-and-drop com visualização da foto e botão de captura de câmera.
   - Botão roxo em destaque: "Corrigir com Inteligência Artificial".

6. TELA DE FEEDBACK DA IA (Simulação de Resultado / Correção Instantânea)
   - Nota final em destaque em mostrador circular (0 a 1000).
   - Detalhamento com barras de progresso para as 5 competências (0 a 200 cada).
   - Colunas de feedback detalhado: "O que está excelente" (ícones de check) e "O que precisa melhorar" (ícones de alerta/orientação pedagógica).
   - Pontos de intervenção no próprio texto sugerindo melhorias.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ed0a44d6-1a80-497b-9667-31862d7c9da5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
