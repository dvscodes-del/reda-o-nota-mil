import { StudentProfile } from "./StudentProfile";
import { Messages } from "./Messages";
import { useMemo, useRef, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Flame,
  ImagePlus,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  PenLine,
  Play,
  Quote,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
  X,
  User,
  MapPin,
  Calendar,
  Badge,
  Medal,
  Search,
  UserPlus,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { correctEssay } from "@/lib/essay.functions";
import constituicaoImage from "@/assets/repertorio-constituicao.jpg";
import geografiaImage from "@/assets/repertorio-geografia.jpg";
import cinemaImage from "@/assets/repertorio-cinema.jpg";

type Section = "dashboard" | "mural" | "competencias" | "repertorio" | "laboratorio" | "curso" | "perfil" | "mensagens";
type Correction = Awaited<ReturnType<typeof correctEssay>>;

const navItems = [
  { id: "dashboard" as const, label: "Visão geral", icon: LayoutDashboard },
  { id: "perfil" as const, label: "Meu Perfil", icon: User },
  { id: "mensagens" as const, label: "Mensagens", icon: MessageCircle },
  { id: "curso" as const, label: "Seu Curso", icon: TrendingUp },
  { id: "mural" as const, label: "Mural nota mil", icon: Award },
  { id: "competencias" as const, label: "Competências", icon: Target },
  { id: "repertorio" as const, label: "Repertório", icon: BookOpen },
  { id: "laboratorio" as const, label: "Laboratório", icon: PenLine },
];

import { dailyThemes } from "../data/themes";

const competencyTraining: Array<{
  code: string;
  title: string;
  description: string;
  sections: Array<{
    id: string;
    label: string;
    theory: string;
    exercise: (topic: string) => string;
    placeholder: string;
  }>;
}> = [
  {
    code: "C1",
    title: "Domínio da norma culta",
    description: "Gramática, ortografia, pontuação e registro formal em toda a redação.",
    sections: [
      {
        id: "intro", label: "Introdução",
        theory: "Na introdução, a C1 é avaliada desde a primeira linha. Evite coloquialismos, use vírgula corretamente após adjuntos adverbiais e empregue a norma culta do início ao fim.",
        exercise: (t) => `Escreva a primeira frase da sua introdução sobre o tema "${t}" usando a norma culta. Depois, identifique: você usou vírgula depois do adjunto adverbial? Há algum coloquialismo que deva ser trocado?`,
        placeholder: "Escreva sua frase de abertura e depois analise a norma culta usada...",
      },
      {
        id: "des1", label: "Desenvolvimento 1",
        theory: "No primeiro argumento, cuidado com regência verbal (ex: 'assistir AO filme') e concordância nominal. Cada ideia deve estar conectada por uma conjunção adequada.",
        exercise: (t) => `Escreva o tópico frasal (primeira frase) do seu 1º parágrafo sobre "${t}". Depois corrija: você usou regência verbal correta? Há concordância nominal e verbal adequadas?`,
        placeholder: "Escreva o tópico frasal e revise a norma culta...",
      },
      {
        id: "des2", label: "Desenvolvimento 2",
        theory: "No segundo argumento, atenção especial ao uso de pronomes relativos (que, o qual, cujo) e às regras de crase. Isso garante elegância e sofisticação à escrita.",
        exercise: (t) => `Escreva uma frase sobre "${t}" que use corretamente um pronome relativo (que / o qual / cujo) E uma crase. Depois identifique e justifique os dois usos.`,
        placeholder: "Escreva a frase com pronome relativo e crase, e justifique cada escolha...",
      },
      {
        id: "conc", label: "Conclusão",
        theory: "Na conclusão, o domínio da norma culta fecha o texto com autoridade. Atenção à regência do verbo 'propor' (propõe-se que + subjuntivo) e ao ponto final após cada ideia completa.",
        exercise: (t) => `Escreva a proposta de intervenção da conclusão sobre "${t}" usando o verbo 'propor' na estrutura correta: 'Propõe-se que + subjuntivo'. Liste 2 outros erros gramaticais comuns para evitar na conclusão.`,
        placeholder: "Escreva a conclusão com a proposta na norma culta e liste os erros a evitar...",
      },
    ],
  },
  {
    code: "C2",
    title: "Compreensão e repertório",
    description: "Leitura do tema e uso de repertório produtivo, pertinente e legitimado.",
    sections: [
      {
        id: "intro", label: "Introdução",
        theory: "A introdução é o lugar ideal para inserir o repertório! Cite uma lei, obra literária, dado ou fato histórico para contextualizar o problema. A referência deve ser apresentada, relacionada ao tema e interpretada — não apenas citada.",
        exercise: (t) => `Construa uma introdução de 3–4 linhas sobre "${t}" usando UM destes repertórios: (1) Constituição Federal, (2) um dado do IBGE ou ONU, ou (3) uma obra literária/filosófica. Siga a lógica: Apresentar → Relacionar ao tema → Interpretar.`,
        placeholder: "Escreva sua introdução com repertório seguindo Apresentar → Relacionar → Interpretar...",
      },
      {
        id: "des1", label: "Desenvolvimento 1",
        theory: "No 1º desenvolvimento, reforce sua tese com um repertório diferente do da introdução: teoria social (Bourdieu, Foucault), dado estatístico ou episódio histórico. Apresente → Relacione → Interprete.",
        exercise: (t) => `Para o tema "${t}", escreva o 1º parágrafo de desenvolvimento usando um teórico ou dado estatístico como repertório. Use a estrutura: 'Segundo [fonte], _____. Isso evidencia que _____. Assim, _____.'`,
        placeholder: "Escreva o Desenvolvimento 1 com repertório acadêmico/estatístico...",
      },
      {
        id: "des2", label: "Desenvolvimento 2",
        theory: "O 2º desenvolvimento aprofunda uma causa ou consequência. Cite repertório que evidencie EFEITOS concretos: notícia de jornal, relatório de ONG, série de dados históricos.",
        exercise: (t) => `Para o tema "${t}", escreva o 2º parágrafo usando um repertório que mostre CONSEQUÊNCIAS do problema (notícia, relatório, dados históricos). O parágrafo deve começar com 'Ademais' ou 'Outrossim'.`,
        placeholder: "Escreva o Desenvolvimento 2 com repertório de consequências...",
      },
      {
        id: "conc", label: "Conclusão",
        theory: "A conclusão NÃO é lugar de inserir novo repertório — ela deve retomar o argumento principal e propor a solução. Evite citações novas aqui para não dispersar o foco.",
        exercise: (t) => `Escreva uma conclusão de 3 linhas sobre "${t}" SEM nenhuma citação nova. Apenas: retome a tese + sintetize os argumentos + apresente a proposta de intervenção.`,
        placeholder: "Escreva a conclusão sem repertório novo — só retomada da tese e proposta...",
      },
    ],
  },
  {
    code: "C3",
    title: "Projeto de texto",
    description: "Seleção e organização de argumentos para defender uma tese.",
    sections: [
      {
        id: "intro", label: "Introdução",
        theory: "Uma boa introdução de C3 termina com a TESE: a afirmação central que você vai defender. A tese deve ser clara, posicionada e antever os 2 argumentos que você desenvolverá.",
        exercise: (t) => `Escreva uma introdução de 4 linhas sobre "${t}" que: (1) contextualize o problema, (2) apresente o recorte temático e (3) finalize com uma TESE que já anuncie 2 argumentos que você vai desenvolver.`,
        placeholder: "Escreva sua introdução com tese clara que anuncia 2 argumentos...",
      },
      {
        id: "des1", label: "Desenvolvimento 1",
        theory: "O 1º parágrafo defende o PRIMEIRO argumento da tese. Estrutura eficaz: (1) tópico frasal, (2) desenvolvimento, (3) exemplo/dado, (4) interpretação que reforça a tese.",
        exercise: (t) => `Escreva o 1º parágrafo de desenvolvimento sobre "${t}" usando a estrutura: tópico frasal → argumento → exemplo concreto → conclusão parcial que reforça a tese.`,
        placeholder: "Escreva o Desenvolvimento 1 com estrutura: tópico frasal → argumento → exemplo → conclusão parcial...",
      },
      {
        id: "des2", label: "Desenvolvimento 2",
        theory: "O 2º parágrafo traz um argumento DIFERENTE e complementar. Não repita o raciocínio anterior. Conecte com 'Ademais', 'Por outro lado' ou 'A esse cenário soma-se'.",
        exercise: (t) => `Escreva o 2º parágrafo sobre "${t}" com um ângulo DIFERENTE do 1º argumento. Comece com 'Ademais' ou 'A esse cenário soma-se' e explore uma causa ou consequência distinta.`,
        placeholder: "Escreva o Desenvolvimento 2 com argumento diferente do primeiro...",
      },
      {
        id: "conc", label: "Conclusão",
        theory: "A conclusão deve RETOMAR a tese (sem repetir exatamente) e antecipar a proposta. É o 'para tanto' do texto: fecha os argumentos e aponta a saída.",
        exercise: (t) => `Escreva uma conclusão sobre "${t}" que: (1) retome a tese com outras palavras, (2) sintetize os 2 argumentos em 1 frase e (3) introduza a proposta com 'Portanto' ou 'Diante do exposto'.`,
        placeholder: "Escreva a conclusão retomando a tese e introduzindo a proposta...",
      },
    ],
  },
  {
    code: "C4",
    title: "Coesão",
    description: "Conectivos e mecanismos linguísticos que articulam as ideias do texto.",
    sections: [
      {
        id: "intro", label: "Introdução",
        theory: "Na introdução, a coesão garante que o contexto, o recorte e a tese fluam sem interrupções. Evite listar ideias com 'e...e...e'. Prefira: 'Nesse sentido', 'Sob essa ótica', 'Diante disso'.",
        exercise: (t) => `Reescreva esta introdução sobre "${t}" trocando os conectivos fracos por opções sofisticadas: 'O Brasil tem muitos problemas e ${t.toLowerCase()} é um deles e por isso o governo deve agir e resolver isso.'`,
        placeholder: "Reescreva a introdução com conectivos sofisticados...",
      },
      {
        id: "des1", label: "Desenvolvimento 1",
        theory: "O início do 1º parágrafo NUNCA deve começar com 'E'. Use: 'Em primeiro lugar', 'Primeiramente', 'Nesse contexto', 'Sob essa perspectiva'.",
        exercise: (t) => `Escreva as primeiras 2 frases do 1º parágrafo sobre "${t}" usando um conector de abertura sofisticado (não use 'Em primeiro lugar'). Depois justifique por que o conector escolhido é adequado.`,
        placeholder: "Escreva as primeiras frases com conector sofisticado e justifique a escolha...",
      },
      {
        id: "des2", label: "Desenvolvimento 2",
        theory: "Para o 2º argumento, use conectivos de ADIÇÃO sofisticados: 'Outrossim', 'Ademais', 'A esse contexto soma-se', 'Corrobora esse cenário'. Eles mostram que você amplia, não repete.",
        exercise: (t) => `Escreva o tópico frasal (primeira frase) do 2º parágrafo sobre "${t}" usando 'Ademais' ou 'Outrossim'. Depois reescreva a mesma ideia usando 'A esse cenário soma-se'. Compare os dois.`,
        placeholder: "Escreva com 'Ademais' e depois com 'A esse cenário soma-se' e compare...",
      },
      {
        id: "conc", label: "Conclusão",
        theory: "A conclusão tem conectivos próprios de fechamento: 'Portanto', 'Logo', 'Conclui-se que', 'Diante do exposto'. Escolha um e NÃO repita o conector já usado no texto.",
        exercise: (t) => `Escreva a primeira linha de uma conclusão sobre "${t}" usando um conectivo conclusivo diferente de 'Portanto'. Depois escreva mais 2 opções de primeira linha com conectivos diferentes para treinar a variedade.`,
        placeholder: "Escreva 3 opções de primeira frase da conclusão com conectivos diferentes...",
      },
    ],
  },
  {
    code: "C5",
    title: "Proposta de intervenção",
    description: "Ação detalhada, completa e alinhada aos direitos humanos.",
    sections: [
      {
        id: "intro", label: "Introdução",
        theory: "A introdução NÃO é o lugar da proposta. Aqui, você apenas CONTEXTUALIZA o problema que será resolvido na conclusão. Não adiante soluções antes de argumentar.",
        exercise: (t) => `Escreva uma introdução sobre "${t}" SEM incluir nenhuma proposta de solução — apenas contextualize o problema e apresente sua tese. Depois sublinhue mentalmente onde estaria a tentação de adiantar a proposta.`,
        placeholder: "Escreva a introdução apenas contextualizando o problema, sem proposta...",
      },
      {
        id: "des1", label: "Desenvolvimento 1",
        theory: "No desenvolvimento, explore as CAUSAS do problema para embasar a proposta futura. Ex: 'A falta de investimento público... gera como consequência...'. Isso prepara o leitor para a solução.",
        exercise: (t) => `Escreva um parágrafo sobre "${t}" explorando as CAUSAS estruturais do problema. Termine o parágrafo com uma frase que crie urgência para a solução (sem ainda propô-la).`,
        placeholder: "Explore as causas do problema e crie urgência sem ainda propor a solução...",
      },
      {
        id: "des2", label: "Desenvolvimento 2",
        theory: "O 2º desenvolvimento explora as CONSEQUÊNCIAS do problema — o que agrava a situação. Isso cria urgência para a solução que virá. Use 'Esse cenário perpetua... o que aprofunda...'.",
        exercise: (t) => `Escreva um parágrafo sobre "${t}" explorando as CONSEQUÊNCIAS do problema a longo prazo. Comece com 'Ademais' e mostre como o problema se perpetua e se agrava sem intervenção.`,
        placeholder: "Explore as consequências do problema começando com 'Ademais'...",
      },
      {
        id: "conc", label: "Conclusão",
        theory: "A proposta COMPLETA tem 5 elementos obrigatórios: (1) AGENTE — quem age? (2) AÇÃO — o que faz? (3) MEIO — como faz? (4) FINALIDADE — por quê? (5) DETALHAMENTO — com qual recurso/lei? Faltando um, a nota cai.",
        exercise: (t) => `Monte a proposta de intervenção COMPLETA para o tema "${t}". Use o modelo: 'Cabe ao [AGENTE], por meio de [MEIO], [AÇÃO], a fim de [FINALIDADE], com [DETALHAMENTO].' Preencha todos os 5 elementos obrigatórios.`,
        placeholder: "Cabe ao [AGENTE], por meio de [MEIO], [AÇÃO], a fim de [FINALIDADE], com [DETALHAMENTO]...",
      },
    ],
  },
];



// Daily Themes are imported from src/data/themes.ts



const repertories = [
  { category: "Leis", title: "Constituição Federal de 1988", author: "Artigo 6º", image: constituicaoImage, body: "Use para sustentar direitos sociais como educação, saúde, moradia e alimentação — sempre conectando o direito à falha de sua efetivação." },
  { category: "Livros", title: "Geografia da Fome", author: "Josué de Castro", image: geografiaImage, body: "Ajuda a argumentar que a fome não é natural: decorre de escolhas políticas e estruturas econômicas excludentes." },
  { category: "Filmes", title: "Nunca Me Sonharam", author: "Cacau Rhoden", image: cinemaImage, body: "Documentário útil em temas sobre ensino médio, desigualdade educacional, juventude e projeto de vida." },
];

export function EssayApp() {
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedEssay, setSelectedEssay] = useState<any | null>(null);
  const [activeCompetency, setActiveCompetency] = useState(0);
  const [filter, setFilter] = useState("Todos");
  const [labTab, setLabTab] = useState<"digital" | "photo">("digital");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Correction | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(false);
  const [selectedDay, setSelectedDay] = useState(2); // dia atual (0-indexed)
  const fileRef = useRef<HTMLInputElement>(null);
  const runCorrection = useServerFn(correctEssay);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { preferences } = useUserPreferences();

  useEffect(() => {
    if (user === null) {
      navigate({ to: '/login' });
    } else if (user && preferences && !preferences.hasCompletedOnboarding) {
      navigate({ to: '/onboarding' });
    }
  }, [user, preferences, navigate]);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length, lines: Math.min(30, Math.max(1, Math.ceil(text.length / 78))) };
  }, [text]);

  function goTo(next: Section) {
    setSection(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCorrection() {
    if (text.trim().length < 120) {
      setError("Escreva pelo menos um parágrafo completo antes de solicitar a correção.");
      return;
    }
    setCorrecting(true);
    setError("");
    try {
      const correction = await runCorrection({ 
        data: { 
          essay: text,
          targetScore: preferences?.targetScore,
          college: preferences?.college,
          course: preferences?.course
        } 
      });
      setResult(correction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível corrigir agora. Tente novamente em instantes.");
    } finally {
      setCorrecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-sidebar p-5 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="mb-10 flex items-center justify-between">
            <button type="button" onClick={() => goTo("dashboard")} className="flex items-center gap-3" aria-label="Ir para o início">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><PenLine className="size-5" /></span>
              <span className="text-left"><strong className="block text-lg leading-none">Escreva+</strong><small className="text-muted-foreground">Seu treino ENEM</small></span>
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X /></Button>
          </div>
          <nav className="space-y-1.5 flex-1" aria-label="Navegação principal">
            {navItems.map((item) => <Button key={item.id} variant="ghost" onClick={() => goTo(item.id)} className={`h-11 w-full justify-start rounded-xl px-3 ${section === item.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"}`}><item.icon className="mr-2" />{item.label}</Button>)}
          </nav>
          <div className="mt-auto space-y-4">
            <div className="rounded-xl bg-sidebar-accent p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flame className="text-highlight opacity-50" /> 0 dias de sequência</div>
              <Progress value={0} className="bg-background" />
              <p className="mt-2 text-xs text-muted-foreground">Escreva hoje para começar sua sequência.</p>
            </div>
            <Button variant="ghost" onClick={async () => { await signOut(); navigate({ to: '/login' }); }} className="w-full justify-start rounded-xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="mr-2 size-4" /> Sair do Perfil
            </Button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></Button>
          <div className="hidden text-sm text-muted-foreground sm:block">Foco no seu objetivo!</div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <strong className="block text-sm">{user?.email?.split('@')[0] || 'Estudante'}</strong>
              <small className="text-muted-foreground">Nível 8 · 1.240 XP</small>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <div className="grid h-full w-full place-items-center rounded-full bg-accent font-bold text-accent-foreground ring-2 ring-transparent transition-all hover:ring-primary">
                    {user?.email?.[0].toUpperCase() || 'ES'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: '/onboarding' })} className="cursor-pointer gap-2">
                  <Settings className="size-4" />
                  Editar Metas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: '/login' }); }} className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 md:p-8 lg:p-10">
          {section === "dashboard" && <Dashboard goTo={goTo} />}
          {section === "perfil" && <StudentProfile onOpen={setSelectedEssay} goTo={goTo} />}
          {section === "mensagens" && <Messages />}
          {section === "curso" && <CourseTarget goTo={goTo} />}
          {section === "mural" && <Mural onOpen={setSelectedEssay} currentTheme={dailyThemes[selectedDay]} />}
          {section === "competencias" && <Competencies active={activeCompetency} setActive={setActiveCompetency} currentTheme={dailyThemes[selectedDay]} />}
          {section === "repertorio" && <Repertory filter={filter} setFilter={setFilter} currentTheme={dailyThemes[selectedDay]} />}
          {section === "laboratorio" && <Laboratory tab={labTab} setTab={setLabTab} text={text} setText={setText} stats={stats} timer={timer} setTimer={setTimer} preview={preview} fileRef={fileRef} setPreview={setPreview} correcting={correcting} error={error} handleCorrection={handleCorrection} result={result} setResult={setResult} selectedDay={selectedDay} setSelectedDay={setSelectedDay} />}
        </div>
      </main>

      <Dialog open={Boolean(selectedEssay)} onOpenChange={(open) => !open && setSelectedEssay(null)}>
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto rounded-xl">
          {selectedEssay && <><DialogHeader><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Award className="size-4" /> Redação comentada</div><DialogTitle className="text-2xl">{selectedEssay.title}</DialogTitle><DialogDescription>{selectedEssay.author}</DialogDescription></DialogHeader><div className="space-y-4 leading-7 text-foreground mt-4">{selectedEssay.text.map((p: string, i: number) => {
            const sentences = p.split('. ');
            const firstSentence = sentences[0] + (sentences.length > 1 ? '.' : '');
            const restOfText = sentences.length > 1 ? ' ' + sentences.slice(1).join('. ') : '';
            
            const highlightColor = i === 0 ? "bg-blue-200/60 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100" : i === 1 ? "bg-green-200/60 text-green-900 dark:bg-green-900/40 dark:text-green-100" : "bg-purple-200/60 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100";
            const tipColorClass = i === 0 ? "border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-50" : i === 1 ? "border-green-500 bg-green-100 text-green-900 dark:bg-green-900/60 dark:text-green-50" : "border-purple-500 bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-50";
            const label = i === 0 ? "Ponto Positivo: Tese clara e repertório bem conectado." : i === 1 ? "Ponto Positivo: Argumentação progressiva, mantendo o recorte temático." : "Ponto Positivo: Intervenção completa (agente, ação, meio e finalidade).";
            
            return (
              <div key={i} className="relative p-5 rounded-xl border border-border bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] shadow-sm">
                <p className="text-base relative z-10">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${highlightColor}`}>{firstSentence}</span>
                  {restOfText}
                </p>
                <p className={`mt-4 flex items-center rounded-lg border-l-4 p-3 text-sm font-semibold relative z-10 shadow-sm ${tipColorClass}`}>
                  <Lightbulb className="mr-2 size-4 flex-shrink-0" />
                  {label}
                </p>
              </div>
            );
          })}</div></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p><h1 className="text-3xl font-bold md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{description}</p></div>;
}

function CourseTarget({ goTo }: { goTo: (section: Section) => void }) {
  const { preferences } = useUserPreferences();
  const targetScoreNum = preferences?.targetScore ? parseInt(preferences.targetScore, 10) : 900;
  const course = preferences?.course || "seu curso";
  const college = preferences?.college || "sua universidade";
  
  const avgRequired = Math.max(700, targetScoreNum - 40);
  const hoursPerWeek = targetScoreNum > 800 ? 4 : targetScoreNum > 700 ? 3 : 2;
  const currentAvg = 840;
  const distance = Math.max(0, targetScoreNum - currentAvg);
  
  return (
    <>
      <PageTitle eyebrow="Seu Alvo" title={`Meta: ${course} na ${college}`} description="Entenda os números e o esforço necessário para alcançar sua vaga." />
      
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 text-primary"><Target className="size-8" /></div>
          <h3 className="text-lg font-bold">Nota de Corte Estimada</h3>
          <p className="mt-2 text-3xl font-black">{targetScoreNum}</p>
          <p className="mt-2 text-sm text-muted-foreground">Essa é a meta que você deve buscar na redação para garantir uma margem segura.</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 text-primary"><TrendingUp className="size-8" /></div>
          <h3 className="text-lg font-bold">Média dos Aprovados</h3>
          <p className="mt-2 text-3xl font-black">{avgRequired}</p>
          <p className="mt-2 text-sm text-muted-foreground">A maioria dos aprovados neste curso tirou notas próximas a essa.</p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 text-primary"><Clock3 className="size-8" /></div>
          <h3 className="text-lg font-bold">Carga Horária Ideal</h3>
          <p className="mt-2 text-3xl font-black">{hoursPerWeek}h / semana</p>
          <p className="mt-2 text-sm text-muted-foreground">Tempo recomendado focado apenas em redação (prática e correção) para o seu nível de meta.</p>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <h3 className="text-xl font-bold mb-4">Onde você está vs. Onde precisa chegar</h3>
        <p className="mb-6 text-muted-foreground">Sua média atual nas últimas redações é de <strong>{currentAvg}</strong> pontos. Você precisa de mais <strong>{distance}</strong> pontos para atingir sua meta com segurança.</p>
        <Progress value={(currentAvg / targetScoreNum) * 100} className="mb-4 h-3" />
        <div className="flex justify-between text-sm font-semibold">
          <span>Atual: {currentAvg}</span>
          <span className="text-primary">Meta: {targetScoreNum}</span>
        </div>
        
        <div className="mt-8">
          <Button onClick={() => goTo("laboratorio")} className="rounded-xl w-full md:w-auto">
            Continuar treinando <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function Dashboard({ goTo }: { goTo: (section: Section) => void }) {
  const { preferences } = useUserPreferences();
  const { user } = useAuth();
  const targetScoreNum = preferences?.targetScore ? parseInt(preferences.targetScore, 10) : 900;
  
  const dashboardStats: Array<[string, string, LucideIcon]> = [
    ["12", "Redações enviadas", FileText],
    ["840", "Média atual", TrendingUp],
    ["+80", "Evolução recente", BrainCircuit],
  ];
  return <><PageTitle eyebrow="Seu espaço de evolução" title={`Boa tarde, ${user?.email?.split('@')[0] || 'Estudante'}!`} description={preferences ? `Seu foco: ${preferences.course} na ${preferences.college}` : "Cada parágrafo é um passo. Continue construindo sua melhor nota."} />
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm md:p-10">
      <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-15 md:block"><Quote className="size-52" /></div>
      <div className="relative max-w-3xl"><span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold uppercase"><Sparkles className="size-3" /> Desafio do dia · +120 XP</span><h2 className="text-2xl font-bold leading-tight md:text-4xl">Desafios para o enfrentamento da insegurança alimentar no Brasil contemporâneo</h2><p className="mt-4 text-primary-foreground/75">Pratique repertório produtivo, construção de tese e proposta de intervenção completa.</p><Button onClick={() => goTo("laboratorio")} className="mt-7 rounded-xl bg-background text-foreground hover:bg-background/90">Começar a escrever <ArrowRight /></Button></div>
    </section>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">{dashboardStats.map(([value,label,Icon]) => <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-5" /></span><span className="text-xs font-semibold text-success">este mês</span></div><strong className="text-3xl">{value}</strong><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>)}</section>
    <section className="mt-8">
      <h3 className="font-bold text-lg mb-4">Acesso Rápido</h3>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Button variant="outline" onClick={() => goTo("laboratorio")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><PenLine className="size-5" /></span>
          <span className="font-semibold">Escrever Redação</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("competencias")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Target className="size-5" /></span>
          <span className="font-semibold">Treinar Competências</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("repertorio")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><BookOpen className="size-5" /></span>
          <span className="font-semibold">Ver Repertórios</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("mural")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Award className="size-5" /></span>
          <span className="font-semibold">Mural Nota 1000</span>
        </Button>
      </div>
    </section>
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><div className="mb-8 flex items-center justify-between"><div><h3 className="font-bold">Sua evolução</h3><p className="text-sm text-muted-foreground">Últimas cinco redações</p></div><span className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-primary">+10,5%</span></div><div className="flex h-44 items-end justify-between gap-3 border-b border-border px-2">{[620,700,680,780,840].map((score,i) => <div key={score} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-xs font-bold">{score}</span><div className="rounded-t-md bg-primary/20 transition-colors hover:bg-primary" style={{height: `${score/10}%`}} /><span className="pb-2 text-xs text-muted-foreground">R{i+1}</span></div>)}</div></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h3 className="font-bold">Sua Meta (Target)</h3><p className="mt-1 text-sm text-muted-foreground">Chegue à média {targetScoreNum}</p><div className="my-6 grid place-items-center"><div className="grid size-32 place-items-center rounded-full border-[12px] border-accent"><div className="text-center"><strong className="text-2xl">840</strong><small className="block text-muted-foreground">de {targetScoreNum}</small></div></div></div><Progress value={(840 / targetScoreNum) * 100} /><p className="mt-3 text-center text-xs text-muted-foreground">Você está a {Math.max(0, targetScoreNum - 840)} pontos da meta.</p></div></section>
  </>;
}

function Mural({ onOpen, currentTheme }: { onOpen: (essay: any) => void; currentTheme: typeof dailyThemes[number] }) {
  const themeEssays = currentTheme.essays || [];
  return <><PageTitle eyebrow="Inspire-se" title="Mural nota mil" description={`Leia textos exemplares sobre o tema do dia: ${currentTheme.topic}`} /><div className="grid gap-5 md:grid-cols-3">{themeEssays.map((essay,i) => <article key={essay.title} onClick={() => onOpen(essay)} className="group cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"><div className="mb-5 flex items-center justify-between"><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">NOTA 1000</span><span className="text-5xl font-black text-primary/10">0{i+1}</span></div><h2 className="text-xl font-bold leading-snug group-hover:text-primary">{essay.title}</h2><p className="mt-2 text-xs font-semibold text-muted-foreground">{essay.author}</p><p className="mt-5 line-clamp-4 text-sm leading-6 text-muted-foreground">{essay.intro}</p><div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">Ler e analisar <ArrowRight className="size-4" /></div></article>)}</div></>;
}

function Competencies({ active, setActive, currentTheme }: {
  active: number;
  setActive: (value: number) => void;
  currentTheme: typeof dailyThemes[number];
}) {
  const [activeSection, setActiveSection] = useState<Record<number, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const sectionLabels: Record<string, { short: string; color: string }> = {
    intro: { short: "Introdução", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    des1:  { short: "Dev. 1",     color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    des2:  { short: "Dev. 2",     color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    conc:  { short: "Conclusão",  color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  };

  return <><PageTitle eyebrow="Teoria em prática" title="Domine as competências" description="Para cada competência, pratique especificamente em cada parte da redação: Introdução, Desenvolvimento 1 e 2, e Conclusão." />

  {/* Tema ativo do Laboratório */}
  <div className={`mb-6 flex items-center gap-3 rounded-xl p-4 ${currentTheme.hot ? 'border border-orange-400/30 bg-orange-500/8' : 'border border-border bg-accent/40'}`}>
    <div className={`grid size-10 shrink-0 place-items-center rounded-lg text-white ${currentTheme.hot ? 'bg-orange-500' : 'bg-primary'}`}>
      {currentTheme.hot ? <span className="text-lg">🔥</span> : <FileText className="size-5" />}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-xs font-bold uppercase tracking-wide ${currentTheme.hot ? 'text-orange-600' : 'text-primary'}`}>Tema do laboratório — Dia {currentTheme.day}</p>
      <p className="truncate font-semibold text-sm">{currentTheme.topic}</p>
    </div>
    <span className="shrink-0 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground">Treino ativo</span>
  </div>
  <div className="space-y-4">
    {competencyTraining.map((comp, i) => {
      const currentSection = activeSection[i] ?? 'intro';
      const currentSectionData = comp.sections.find(s => s.id === currentSection)!;
      const answerKey = `${i}-${currentSection}`;
      return (
        <div key={comp.code} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Header */}
          <button type="button" onClick={() => setActive(active === i ? -1 : i)} className="flex w-full items-center gap-4 p-5 text-left">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent font-bold text-primary">{comp.code}</span>
            <span className="flex-1">
              <strong className="block">{comp.title}</strong>
              <small className="text-muted-foreground">0 a 200 pontos</small>
            </span>
            <ChevronDown className={`size-5 transition-transform ${active === i ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded Content */}
          {active === i && (
            <div className="border-t border-border">
              {/* Section Tabs */}
              <div className="flex gap-2 overflow-x-auto border-b border-border bg-muted/30 px-5 py-3">
                {comp.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(prev => ({ ...prev, [i]: section.id }))}
                    className={`shrink-0 rounded-lg border px-4 py-1.5 text-sm font-semibold transition-all ${
                      currentSection === section.id
                        ? sectionLabels[section.id].color + ' shadow-sm'
                        : 'border-transparent text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {sectionLabels[section.id].short}
                  </button>
                ))}
              </div>

              {/* Theory + Exercise */}
              <div className="px-5 py-6 md:px-8">
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-accent/60 p-4">
                  <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">{currentSectionData.label} — teoria</p>
                    <p className="text-sm leading-6 text-foreground">{currentSectionData.theory}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <strong className="flex items-center gap-2 text-sm text-foreground">
                    <Play className="size-4 text-primary" />
                    Exercício — {currentSectionData.label}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentSectionData.exercise(currentTheme.topic)}</p>
                  <textarea
                    value={answers[answerKey] ?? ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [answerKey]: e.target.value }))}
                    placeholder={currentSectionData.placeholder}
                    rows={4}
                    className="mt-4 w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-6 outline-none transition-all focus:ring-2 focus:ring-primary"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{(answers[answerKey] ?? '').length} caracteres</span>
                    <Button size="sm" className="rounded-lg gap-1.5">
                      <Sparkles className="size-3.5" /> Verificar com IA
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
  </>;
}

function Repertory({ filter, setFilter, currentTheme }: { filter: string; setFilter: (value: string) => void; currentTheme: typeof dailyThemes[number] }) {
  const filters = ["Todos", "Leis", "Livros", "Filmes", "Séries", "Documentários", "Fatos Históricos", "Citações", "Músicas", "Conceitos"];
  const [selectedItem, setSelectedItem] = useState<typeof currentTheme.repertories[number] | null>(null);
  
  return (
    <>
      <PageTitle eyebrow="Banco de ideias" title="Repertório sociocultural" description="Referências legitimadas e explicadas para você usar com pertinência — sem decorar frases soltas." />
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button key={item} variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)} className="rounded-full">
            {item}
          </Button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {currentTheme.repertories.filter((item) => filter === "Todos" || item.category === filter).map((item) => (
          <article 
            key={item.title} 
            onClick={() => setSelectedItem(item)}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div className="p-5">
              <span className="text-xs font-bold uppercase text-primary">{item.category}</span>
              <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{item.author}</p>
              <div className="mt-5 rounded-lg bg-accent p-3 text-xs font-semibold text-primary/80 flex items-center justify-center">
                Clique para ver detalhes
              </div>
            </div>
          </article>
        ))}
      </div>
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedItem?.title}</DialogTitle>
            <DialogDescription className="text-sm font-semibold text-primary uppercase tracking-wide">
              {selectedItem?.category} • {selectedItem?.author}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm leading-6 text-foreground">{selectedItem?.body}</p>
            <div className="mt-5 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
              <Lightbulb className="mr-1 inline size-4" /> Dica: apresente, relacione e interprete a referência.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Laboratory(props: { tab: "digital"|"photo"; setTab: (v:"digital"|"photo")=>void; text:string; setText:(v:string)=>void; stats:{words:number;chars:number;lines:number}; timer:boolean; setTimer:(v:boolean)=>void; preview:string|null; fileRef:React.RefObject<HTMLInputElement|null>; setPreview:(v:string|null)=>void; correcting:boolean; error:string; handleCorrection:()=>void; result:Correction|null; setResult:(v:Correction|null)=>void; selectedDay: number; setSelectedDay: (v: number) => void }) {
  const { preferences } = useUserPreferences();
  const currentTheme = dailyThemes[props.selectedDay];

  const handleSelectDay = (idx: number) => {
    props.setSelectedDay(idx);
    props.setText('');
  };

  if (props.result) return <Feedback result={props.result} onBack={() => props.setResult(null)} />;

  return <>
    <PageTitle eyebrow="Hora de escrever" title="Laboratório de redação" description={`A Inteligência Artificial avaliará no nível de exigência para ${preferences?.course || 'o seu curso'}. Escolha o tema do dia abaixo!`} />

    {/* Daily Themes Strip */}
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold">📅 Trilha de temas — 14 dias</p>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">{dailyThemes.filter(d => d.done).length}/{dailyThemes.length} concluídos</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dailyThemes.map((theme, idx) => {
          const isCourseHot = !!preferences?.course && theme.courseHot.some(
            c => preferences.course.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(preferences.course.toLowerCase())
          );
          const isHot = theme.hot || isCourseHot;
          const isSelected = props.selectedDay === idx;
          return (
            <button
              key={theme.day}
              type="button"
              onClick={() => handleSelectDay(idx)}
              className={`relative flex min-w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-105'
                  : theme.done
                  ? 'border-success/40 bg-success/5 text-foreground hover:bg-success/10'
                  : isHot
                  ? 'border-orange-400/40 bg-orange-500/5 text-foreground hover:bg-orange-500/10'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent'
              }`}
            >
              {isHot && !theme.done && (
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-orange-100 text-sm shadow-sm ring-2 ring-background">🔥</span>
              )}
              
              <span className={`text-[11px] font-extrabold uppercase tracking-widest ${isSelected ? 'text-primary-foreground/80' : theme.done ? 'text-success' : 'opacity-70'}`}>
                {theme.label}
              </span>
              <span className="text-2xl font-black leading-none">{String(theme.day).padStart(2, '0')}</span>
              
              {theme.done ? (
                <div className={`mt-1 flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-primary-foreground text-primary' : 'bg-success/20 text-success'}`}>
                  <CheckCircle2 className="mr-1 size-3" /> {860 + (idx * 20)}
                </div>
              ) : (
                <div className="mt-1 h-4 w-full" /> 
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Theme Card */}
      {(() => {
        const isCourseHot = !!preferences?.course && currentTheme.courseHot.some(
          c => preferences.course.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(preferences.course.toLowerCase())
        );
        const isHot = currentTheme.hot || isCourseHot;
        return (
          <div className={`mt-3 rounded-xl p-4 ${isHot ? 'border border-orange-400/30 bg-orange-500/8' : 'bg-accent/60'}`}>
            <div className="flex items-start gap-3">
              <div className={`grid size-10 shrink-0 place-items-center rounded-lg text-primary-foreground ${isHot ? 'bg-orange-500' : 'bg-primary'}`}>
                {isHot ? <span className="text-xl leading-none">🔥</span> : <FileText className="size-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${isHot ? 'text-orange-600' : 'text-primary'}`}>
                    Tema do Dia {currentTheme.day}
                  </p>
                  {isHot && (
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      {isCourseHot && currentTheme.hot
                        ? `Alta chance no ENEM e para ${preferences?.course}`
                        : isCourseHot
                        ? `Alta chance para ${preferences?.course}`
                        : 'Alta chance no ENEM'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-semibold leading-snug">{currentTheme.topic}</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentTheme.hint}</p>
              </div>
              <Button size="sm" variant="outline" className={`shrink-0 rounded-lg ${isHot ? 'border-orange-400/40 hover:bg-orange-500/10' : ''}`} onClick={() => props.setText('')}>
                Comecar
              </Button>
            </div>
            {isHot && currentTheme.hotReason && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-500/10 px-3 py-2">
                <span className="text-sm">📊</span>
                <p className="text-xs leading-5 text-orange-700">{currentTheme.hotReason}</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>

    <div className="mb-5 inline-flex rounded-xl bg-muted p-1">
      <Button variant={props.tab === "digital" ? "default" : "ghost"} onClick={() => props.setTab("digital")} className="rounded-lg"><PenLine /> Redação digital</Button>
      <Button variant={props.tab === "photo" ? "default" : "ghost"} onClick={() => props.setTab("photo")} className="rounded-lg"><Camera /> Redação escrita</Button>
    </div>
    {props.tab === "digital" ? <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground"><span>{props.stats.words} palavras</span><span>{props.stats.chars} caracteres</span><span>{props.stats.lines}/30 linhas</span></div><Button variant="outline" size="sm" onClick={() => props.setTimer(!props.timer)} className="rounded-lg"><Clock3 /> {props.timer ? "01:29:42" : "Ativar temporizador"}</Button></div><textarea value={props.text} onChange={(e) => props.setText(e.target.value)} placeholder={`Tema: "${currentTheme.topic}"

Comece pela sua tese. O que você defende sobre este tema?`} className="min-h-[480px] w-full resize-none bg-card p-6 text-base leading-8 outline-none md:p-10" style={{ backgroundImage: "linear-gradient(to bottom, transparent 31px, var(--line) 32px)", backgroundSize: "100% 32px" }} /><div className="flex flex-col items-end gap-2 border-t border-border p-4"><Button size="lg" onClick={props.handleCorrection} disabled={props.correcting} className="h-12 rounded-xl px-6"><Sparkles /> {props.correcting ? "Analisando com rigor adaptado..." : "Corrigir com Inteligência Artificial"}</Button>{props.error && <p className="text-sm text-destructive">{props.error}</p>}</div></div> : <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center shadow-sm md:p-16"><input ref={props.fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file=e.target.files?.[0]; if(file) props.setPreview(URL.createObjectURL(file)); }} />{props.preview ? <img src={props.preview} alt="Prévia da redação" className="mx-auto max-h-[520px] rounded-xl object-contain shadow-sm" /> : <><span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary"><UploadCloud className="size-7" /></span><h2 className="mt-5 text-xl font-bold">Envie uma foto nítida da sua redação</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Posicione a folha inteira, evite sombras e confira se o texto está legível.</p></>}<div className="mt-6 flex flex-wrap justify-center gap-2"><Button className="rounded-xl" onClick={() => props.fileRef.current?.click()}><ImagePlus /> Escolher imagem</Button><Button variant="outline" className="rounded-xl" onClick={() => props.fileRef.current?.click()}><Camera /> Usar câmera</Button></div></div>}
  </>;
}

function Feedback({ result, onBack }: { result: Correction; onBack: () => void }) {
  const score = Math.max(0, Math.min(1000, Math.round(result.score)));
  return <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><PageTitle eyebrow="Correção concluída" title="Seu feedback personalizado" description="Use os comentários como um mapa para a próxima versão do seu texto." /><Button variant="outline" onClick={onBack} className="rounded-xl">Voltar ao texto</Button></div><div className="grid gap-6 lg:grid-cols-[320px_1fr]"><div className="rounded-xl border border-border bg-card p-7 text-center shadow-sm"><div className="mx-auto grid size-48 place-items-center rounded-full border-[14px] border-primary bg-accent"><div><strong className="text-5xl text-primary">{score}</strong><span className="block text-sm text-muted-foreground">de 1000</span></div></div><h2 className="mt-6 text-xl font-bold">Ótimo avanço!</h2><p className="mt-2 text-sm text-muted-foreground">Sua argumentação tem uma base promissora. Agora é hora de lapidar.</p></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="text-xl font-bold">Desempenho por competência</h2><div className="mt-6 space-y-5">{result.competencies.slice(0,5).map((item,i) => <div key={`${item.name}-${i}`}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold">C{i+1} · {item.name}</span><strong className="text-primary">{Math.round(item.score)}/200</strong></div><Progress value={Math.max(0,Math.min(100,item.score/2))} /><p className="mt-2 text-xs text-muted-foreground">{item.feedback}</p></div>)}</div></div></div><div className="mt-6 grid gap-6 md:grid-cols-2"><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-success"><CheckCircle2 /> O que está excelente</h2><ul className="mt-5 space-y-4">{result.strengths.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />{item}</li>)}</ul></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-highlight"><AlertCircle /> O que precisa melhorar</h2><ul className="mt-5 space-y-4">{result.improvements.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><AlertCircle className="mt-1 size-4 shrink-0 text-highlight" />{item}</li>)}</ul></div></div>{result.annotations.length > 0 && <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="text-lg font-bold">Intervenções no seu texto</h2><div className="mt-5 space-y-4">{result.annotations.map((item) => <div key={item.excerpt} className="rounded-lg border-l-4 border-primary bg-accent p-4"><p className="font-medium">“{item.excerpt}”</p><p className="mt-2 text-sm text-muted-foreground"><Sparkles className="mr-2 inline size-4 text-primary" />{item.suggestion}</p></div>)}</div></div>}</>;
}