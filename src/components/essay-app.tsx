import { StudentProfile } from "./StudentProfile";
import { Messages } from "./Messages";
import { Notifications } from "./Notifications";
import { SocialFeed } from "./SocialFeed";
import { ArenaOfArguments } from "./ArenaOfArguments";
import { useMemo, useRef, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { useEssays } from "@/context/EssaysContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
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
  GraduationCap,
  Eye,
  Star,
  ChevronRight,
  Pause,
  Swords,
  Copy,
  Check,
  Scale,
  Film,
  Tv,
  Video,
  Landmark,
  Music,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  correctEssay,
  evaluateCompetencyExercise,
  evaluateEssayHeuristically,
  evaluateCompetencyHeuristically,
  type CompetencyExerciseResult,
} from "@/lib/essay.functions";
import constituicaoImage from "@/assets/repertorio-constituicao.jpg";
import geografiaImage from "@/assets/repertorio-geografia.jpg";
import cinemaImage from "@/assets/repertorio-cinema.jpg";
import { getThemeMedia, getRepertoryImage } from "@/data/theme-media";

type Section = "dashboard" | "feed" | "arena" | "mural" | "competencias" | "repertorio" | "laboratorio" | "curso" | "perfil" | "mensagens" | "notificacoes" | "treinamento";
type Correction = Awaited<ReturnType<typeof correctEssay>>;

const mainNavItems = [
  { id: "dashboard" as const, label: "Visão geral", icon: LayoutDashboard },
  { id: "feed" as const, label: "Feed da Turma", icon: Sparkles },
  { id: "arena" as const, label: "Arena de Argumentos", icon: Swords },
  { id: "notificacoes" as const, label: "Notificações", icon: Bell },
  { id: "mensagens" as const, label: "Mensagens", icon: MessageCircle },
  { id: "curso" as const, label: "Seu Curso & Meta", icon: TrendingUp },
];

const studyNavItems = [
  { id: "treinamento" as const, label: "Treinamento 900+", icon: GraduationCap },
  { id: "mural" as const, label: "Mural nota mil", icon: Award },
  { id: "repertorio" as const, label: "Repertório", icon: BookOpen },
  { id: "competencias" as const, label: "Competências", icon: Target },
];

import { dailyThemes } from "../data/themes";
import { trainingEssays, type TrainingEssay } from "../data/training-essays";

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
  const [timerSeconds, setTimerSeconds] = useState(5400); // 1h30min
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimer(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timer]);
  const [chatTarget, setChatTarget] = useState<any>(null);
  const [profileTarget, setProfileTarget] = useState<any>(null);
  const getTodayThemeIndex = () => {
    const day = new Date().getDay(); // 0 = Domingo, 1 = Segunda...
    const index = day === 0 ? 6 : day - 1;
    // Garante que o índice não passe do tamanho do array
    return index < dailyThemes.length ? index : 0;
  };

  const [selectedDay, setSelectedDay] = useState(getTodayThemeIndex()); // dia atual dinâmico
  const fileRef = useRef<HTMLInputElement>(null);
  const runCorrection = useServerFn(correctEssay);
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const { preferences, isLoading: isPrefsLoading } = useUserPreferences();
  const { saveEssay, essays } = useEssays();
  const { unreadCount, refreshNotifications, notifications, sendCustomDeviceNotification } = useNotifications();

  const unreadMessagesCount = useMemo(() => {
    return notifications?.filter((n) => n.type === "message" && !n.isRead).length || 0;
  }, [notifications]);

  const unreadNotifsCount = useMemo(() => {
    return notifications?.filter((n) => n.type !== "message" && !n.isRead).length || 0;
  }, [notifications]);

  const streakDays = useMemo(() => {
    if (!essays || essays.length === 0) return 0;
    const dates = new Set(
      essays.map((e) => new Date(e.created_at).toISOString().split("T")[0])
    );

    let streak = 0;
    const checkDate = new Date();
    const todayStr = checkDate.toISOString().split("T")[0];

    if (!dates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split("T")[0];
      if (!dates.has(yesterdayStr)) {
        return 0;
      }
    }

    while (true) {
      const dStr = checkDate.toISOString().split("T")[0];
      if (dates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [essays]);

  useEffect(() => {
    if (isLoading || (user && isPrefsLoading)) return;
    if (user === null) {
      navigate({ to: '/login' });
    } else if (user && preferences && !preferences.hasCompletedOnboarding) {
      navigate({ to: '/onboarding' });
    }
  }, [user, preferences, isLoading, isPrefsLoading, navigate]);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length, lines: Math.min(30, Math.max(1, Math.ceil(text.length / 78))) };
  }, [text]);
  const activeTheme = (dailyThemes[selectedDay] || dailyThemes[0])!;

  function goTo(next: Section) {
    setSection(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCorrection() {
    const trimmed = text.trim();
    if (trimmed.length < 30) {
      const msg = "Escreva pelo menos algumas frases (mínimo de 30 caracteres) antes de solicitar a correção.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setCorrecting(true);
    setError("");
    try {
      let correction: Correction;
      try {
        // Tenta enviar para o servidor de correção
        correction = await runCorrection({
          data: {
            essay: trimmed,
            ...(preferences?.targetScore ? { targetScore: preferences.targetScore } : {}),
            ...(preferences?.college ? { college: preferences.college } : {}),
            ...(preferences?.course ? { course: preferences.course } : {}),
          }
        });
      } catch (networkOrServerErr) {
        console.warn("[handleCorrection] Fallback local ativado para mobile/offline:", networkOrServerErr);
        // Fallback imediato: roda a avaliação oficial diretamente no navegador sem depender de rede!
        correction = evaluateEssayHeuristically(trimmed, {
          ...(preferences?.targetScore ? { targetScore: preferences.targetScore } : {}),
          ...(preferences?.college ? { college: preferences.college } : {}),
          ...(preferences?.course ? { course: preferences.course } : {}),
        });
      }

      setResult(correction);
      // Rola a tela para o topo para que o resultado apareça de imediato no celular
      window.scrollTo({ top: 0, behavior: "smooth" });

      const currentThemeItem = dailyThemes[selectedDay];
      if (currentThemeItem) {
        await saveEssay({
          theme_day: currentThemeItem.day,
          theme_topic: currentThemeItem.topic,
          essay_text: text,
          score: correction.score,
          competencies: correction.competencies,
          strengths: correction.strengths,
          improvements: correction.improvements,
          annotations: correction.annotations,
        });
        await refreshNotifications();
      }
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Não foi possível corrigir agora. Tente novamente em instantes.";
      setError(msg);
      toast.error(msg);
    } finally {
      setCorrecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border/80 bg-sidebar/95 backdrop-blur-md p-4 lg:p-5 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          {/* Logo & Marca */}
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goTo("dashboard")}
              className="group flex items-center gap-3 text-left transition-opacity hover:opacity-90"
              aria-label="Ir para o início"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
                <PenLine className="size-5" />
              </span>
              <div>
                <strong className="block text-lg font-bold leading-tight tracking-tight">Escreva<span className="text-primary">+</span></strong>
                <small className="text-xs font-medium text-muted-foreground">Plataforma Nota 1000</small>
              </div>
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden rounded-lg" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
              <X className="size-5" />
            </Button>
          </div>

          {/* Destaque Principal: Laboratório */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => goTo("laboratorio")}
              className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 shadow-sm ${section === "laboratorio"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-2 ring-primary/40"
                  : "bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15 hover:border-primary/45 hover:shadow-xs"
                }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`grid size-7 place-items-center rounded-lg transition-transform group-hover:scale-110 ${section === "laboratorio" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                  <PenLine className="size-3.5" />
                </span>
                <span className="font-bold">Laboratório</span>
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${section === "laboratorio"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/20 text-primary"
                }`}>
                Escrever
              </span>
            </button>
          </div>

          {/* Navegação Principal em Categorias */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 -mr-1">
            {/* Seção Principal */}
            <div>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Principal
              </p>
              <nav className="space-y-1" aria-label="Navegação principal">
                {mainNavItems.map((item) => {
                  const isActive = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(item.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5"
                        }`}
                    >
                      <item.icon className={`size-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                        }`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Seção de Estudo & Prática */}
            <div>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Estudo & Prática
              </p>
              <nav className="space-y-1" aria-label="Navegação de estudos">
                {studyNavItems.map((item) => {
                  const isActive = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(item.id)}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5"
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className={`size-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                          }`} />
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Atalhos Rápidos Compactos (Chat e Notificações) */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Atalhos Rápidos
                </span>
                <span className="text-[10px] text-muted-foreground">Social</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => goTo("mensagens")}
                  className={`flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${section === "mensagens"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent border border-border/50"
                    }`}
                  title="Abrir Mensagens"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <MessageCircle className="size-3.5 shrink-0" />
                    <span>Chat</span>
                  </span>
                  {unreadMessagesCount > 0 && (
                    <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${section === "mensagens"
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary text-primary-foreground"
                      }`}>
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => goTo("notificacoes")}
                  className={`flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${section === "notificacoes"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent border border-border/50"
                    }`}
                  title="Abrir Notificações"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Bell className="size-3.5 shrink-0" />
                    <span>Avisos</span>
                  </span>
                  {unreadNotifsCount > 0 && (
                    <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${section === "notificacoes"
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary text-primary-foreground"
                      }`}>
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Rodapé: Sequência & Logout */}
          <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
            <div className="rounded-xl border border-border/60 bg-sidebar-accent/40 p-3 shadow-2xs">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <span className="grid size-6 place-items-center rounded-md bg-amber-500/15 text-amber-500">
                    <Flame className="size-3.5" />
                  </span>
                  <span>{streakDays} {streakDays === 1 ? 'dia' : 'dias'} de sequência</span>
                </div>
                {streakDays > 0 && (
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Ativo</span>
                )}
              </div>
              <Progress value={streakDays > 0 ? Math.min(100, streakDays * 20) : 0} className="h-1.5 bg-background" />
              <p className="mt-2 text-[11px] leading-tight text-muted-foreground">
                {streakDays > 0
                  ? "Excelente ritmo! Continue escrevendo para não perder a sequência."
                  : "Escreva hoje no laboratório para iniciar sua sequência de estudos."}
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={async () => { await signOut(); navigate({ to: '/login' }); }}
              className="w-full justify-start rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="mr-2 size-3.5" /> Sair do Perfil
            </Button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
            <div className="hidden text-sm font-medium text-muted-foreground sm:flex sm:items-center sm:gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              <span>Foco no seu objetivo ENEM</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Atalho Desktop: Escrever Redação */}
            <Button
              onClick={() => goTo("laboratorio")}
              size="sm"
              className="hidden md:inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs h-9 px-3.5"
            >
              <PenLine className="size-3.5" />
              <span>Escrever Redação</span>
            </Button>

            {/* Atalho Rápido: Mensagens */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo("mensagens")}
              className={`relative size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${section === "mensagens" ? "bg-accent text-primary ring-2 ring-primary/20" : ""
                }`}
              title="Mensagens"
              aria-label="Abrir mensagens"
            >
              <MessageCircle className="size-4" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm animate-pulse">
                  {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                </span>
              )}
            </Button>

            {/* Atalho Rápido: Notificações */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo("notificacoes")}
              className={`relative size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${section === "notificacoes" ? "bg-accent text-primary ring-2 ring-primary/20" : ""
                }`}
              title="Notificações"
              aria-label="Abrir notificações"
            >
              <Bell className="size-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm">
                  {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                </span>
              )}
            </Button>

            <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

            {/* Dados do usuário e Avatar */}
            <div className="hidden text-right sm:block">
              <strong className="block text-sm font-semibold leading-tight">{preferences?.full_name || user?.email?.split('@')[0] || 'Estudante'}</strong>
              <small className="text-xs text-muted-foreground">Meta: {preferences?.targetScore ? `${preferences.targetScore} pts` : '900+ pts'}</small>
            </div>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" onClick={() => { setProfileTarget(null); goTo("perfil"); }} aria-label="Ir para meu perfil" title="Meu perfil">
              <div className="grid h-full w-full place-items-center rounded-full bg-accent font-bold text-accent-foreground ring-2 ring-transparent transition-all hover:ring-primary overflow-hidden">
                {preferences?.avatar_url ? (
                  <img src={preferences.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  user?.email?.[0]?.toUpperCase() || 'ES'
                )}
              </div>
            </Button>
          </div>
        </header>

        <div className={`mx-auto max-w-7xl ${section === "mensagens" ? "p-0 md:p-6 lg:p-8" : "p-4 md:p-8 lg:p-10"}`}>
          {section === "dashboard" && <Dashboard goTo={goTo} />}
          {section === "feed" && (
            <SocialFeed
              goTo={goTo}
              onOpenEssay={setSelectedEssay}
              onStartChat={(profile) => {
                setChatTarget(profile);
                goTo("mensagens");
              }}
              onOpenProfile={(profile) => {
                setProfileTarget(profile);
                setSection("perfil");
              }}
            />
          )}
          {section === "arena" && (
            <ArenaOfArguments
              goTo={goTo}
              onStartChat={(profile) => {
                setChatTarget(profile);
                goTo("mensagens");
              }}
            />
          )}
          {section === "perfil" && (
            <StudentProfile
              targetProfile={profileTarget}
              onBackToMyProfile={() => setProfileTarget(null)}
              onOpen={setSelectedEssay}
              goTo={(s: string) => {
                if (s === "perfil") setProfileTarget(null);
                goTo(s as Section);
              }}
              onStartChat={(profile) => {
                setChatTarget(profile);
                goTo("mensagens");
              }}
            />
          )}
          {section === "notificacoes" && <Notifications goTo={goTo} onStartChat={(profile) => { setChatTarget(profile); goTo("mensagens"); }} onOpenEssay={(essay) => setSelectedEssay(essay)} />}
          {section === "mensagens" && <Messages initialUser={chatTarget} onClearInitial={() => setChatTarget(null)} />}
          {section === "curso" && <CourseTarget goTo={goTo} />}
          {section === "mural" && <Mural onOpen={setSelectedEssay} currentTheme={activeTheme} />}
          {section === "competencias" && <Competencies active={activeCompetency} setActive={setActiveCompetency} currentTheme={activeTheme} />}
          {section === "repertorio" && (
            <Repertory
              filter={filter}
              setFilter={setFilter}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              goTo={goTo}
            />
          )}
          {section === "treinamento" && <TrainingSection goTo={goTo} />}
          {section === "laboratorio" && <Laboratory tab={labTab} setTab={setLabTab} text={text} setText={setText} stats={stats} timer={timer} setTimer={setTimer} timerSeconds={timerSeconds} setTimerSeconds={setTimerSeconds} preview={preview} fileRef={fileRef} setPreview={setPreview} correcting={correcting} error={error} handleCorrection={handleCorrection} result={result} setResult={setResult} selectedDay={selectedDay} setSelectedDay={setSelectedDay} />}
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
  const { stats: essayStats } = useEssays();
  const targetScoreNum = preferences?.targetScore ? parseInt(preferences.targetScore, 10) : 900;
  const course = preferences?.course || "seu curso";
  const college = preferences?.college || "sua universidade";

  const avgRequired = Math.max(700, targetScoreNum - 40);
  const hoursPerWeek = targetScoreNum > 800 ? 4 : targetScoreNum > 700 ? 3 : 2;
  const currentAvg = essayStats.averageScore;
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
        <Progress value={targetScoreNum > 0 ? Math.min(100, Math.round((currentAvg / targetScoreNum) * 100)) : 0} className="mb-4 h-3" />
        <div className="flex justify-between text-sm font-semibold">
          <span>Atual: {currentAvg}</span>
          <span className="text-primary">Meta: {targetScoreNum}</span>
        </div>

        <div className="mt-8">
          <Button onClick={() => goTo("laboratorio")} className="rounded-xl w-full md:w-auto">
            Começar a treinar <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function Dashboard({ goTo }: { goTo: (section: Section) => void }) {
  const { preferences } = useUserPreferences();
  const { user } = useAuth();
  const { stats: essayStats } = useEssays();
  const targetScoreNum = preferences?.targetScore ? parseInt(preferences.targetScore, 10) : 900;

  const dashboardStats: Array<[string, string, LucideIcon]> = [
    [essayStats.totalCompleted.toString(), "Redações enviadas", FileText],
    [essayStats.totalCompleted > 0 ? essayStats.averageScore.toString() : "-", "Média atual", TrendingUp],
    [essayStats.totalCompleted > 1 ? `${essayStats.evolutionPercent >= 0 ? '+' : ''}${essayStats.evolutionPercent}%` : (essayStats.totalCompleted === 1 ? "1ª concluída" : "-"), "Evolução recente", BrainCircuit],
  ];
  return <><PageTitle eyebrow="Seu espaço de evolução" title={`Boa tarde, ${user?.email?.split('@')[0] || 'Estudante'}!`} description={preferences ? `Seu foco: ${preferences.course} na ${preferences.college}` : "Cada parágrafo é um passo. Continue construindo sua melhor nota."} />
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm md:p-10">
      <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-15 md:block"><Quote className="size-52" /></div>
      <div className="relative max-w-3xl"><span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold uppercase"><Sparkles className="size-3" /> Desafio do dia · +120 XP</span><h2 className="text-2xl font-bold leading-tight md:text-4xl">Desafios para o enfrentamento da insegurança alimentar no Brasil contemporâneo</h2><p className="mt-4 text-primary-foreground/75">Pratique repertório produtivo, construção de tese e proposta de intervenção completa.</p><Button onClick={() => goTo("laboratorio")} className="mt-7 rounded-xl bg-background text-foreground hover:bg-background/90">Começar a escrever <ArrowRight /></Button></div>
    </section>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">{dashboardStats.map(([value, label, Icon]) => <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-5" /></span><span className="text-xs font-semibold text-success">este mês</span></div><strong className="text-3xl">{value}</strong><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>)}</section>
    <section className="mt-8">
      <h3 className="font-bold text-lg mb-4">Acesso Rápido</h3>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Button variant="outline" onClick={() => goTo("laboratorio")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><PenLine className="size-5" /></span>
          <span className="font-semibold text-center">Escrever Redação</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("arena")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary border-primary/30 bg-primary/5">
          <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs"><Swords className="size-5" /></span>
          <span className="font-semibold text-center text-primary">Arena de Argumentos</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("competencias")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Target className="size-5" /></span>
          <span className="font-semibold text-center">Competências</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("repertorio")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><BookOpen className="size-5" /></span>
          <span className="font-semibold text-center">Repertórios</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("mural")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Award className="size-5" /></span>
          <span className="font-semibold text-center">Mural Nota 1000</span>
        </Button>
        <Button variant="outline" onClick={() => goTo("treinamento")} className="h-auto flex-col gap-3 p-4 rounded-xl border-border bg-card hover:bg-accent hover:border-primary">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><GraduationCap className="size-5" /></span>
          <span className="font-semibold text-center">Treinamento 900+</span>
        </Button>
      </div>
    </section>
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><div className="mb-8 flex items-center justify-between"><div><h3 className="font-bold">Sua evolução</h3><p className="text-sm text-muted-foreground">Últimas cinco redações</p></div><span className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-primary">{essayStats.totalCompleted > 1 ? `${essayStats.evolutionPercent >= 0 ? '+' : ''}${essayStats.evolutionPercent}%` : `${essayStats.totalCompleted} concluída(s)`}</span></div><div className="flex h-44 items-end justify-between gap-3 border-b border-border px-2">{essayStats.recentScores.map((score, i) => <div key={i} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-xs font-bold">{score > 0 ? score : "-"}</span><div className="rounded-t-md bg-primary/20 transition-colors hover:bg-primary" style={{ height: `${score > 0 ? score / 10 : 0}%` }} /><span className="pb-2 text-xs text-muted-foreground">R{i + 1}</span></div>)}</div></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h3 className="font-bold">Sua Meta (Target)</h3><p className="mt-1 text-sm text-muted-foreground">Chegue à média {targetScoreNum}</p><div className="my-6 grid place-items-center"><div className="grid size-32 place-items-center rounded-full border-[12px] border-accent"><div className="text-center"><strong className="text-2xl">{essayStats.averageScore}</strong><small className="block text-muted-foreground">de {targetScoreNum}</small></div></div></div><Progress value={targetScoreNum > 0 ? Math.min(100, Math.round((essayStats.averageScore / targetScoreNum) * 100)) : 0} /><p className="mt-3 text-center text-xs text-muted-foreground">{essayStats.totalCompleted === 0 ? "Envie sua primeira redação para começar a medir a distância da meta." : essayStats.averageScore >= targetScoreNum ? "🎉 Parabéns! Você já superou sua meta!" : `Você está a ${Math.max(0, targetScoreNum - essayStats.averageScore)} pontos da meta.`}</p></div></section>
  </>;
}

function Mural({ onOpen, currentTheme }: { onOpen: (essay: any) => void; currentTheme: typeof dailyThemes[number] }) {
  const themeEssays = currentTheme.essays || [];
  return <><PageTitle eyebrow="Inspire-se" title="Mural nota mil" description={`Leia textos exemplares sobre o tema do dia: ${currentTheme.topic}`} /><div className="grid gap-5 md:grid-cols-3">{themeEssays.map((essay, i) => <article key={essay.title} onClick={() => onOpen(essay)} className="group cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"><div className="mb-5 flex items-center justify-between"><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">NOTA 1000</span><span className="text-5xl font-black text-primary/10">0{i + 1}</span></div><h2 className="text-xl font-bold leading-snug group-hover:text-primary">{essay.title}</h2><p className="mt-2 text-xs font-semibold text-muted-foreground">{essay.author}</p><p className="mt-5 line-clamp-4 text-sm leading-6 text-muted-foreground">{essay.intro}</p><div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">Ler e analisar <ArrowRight className="size-4" /></div></article>)}</div></>;
}

function Competencies({ active, setActive, currentTheme }: {
  active: number;
  setActive: (value: number) => void;
  currentTheme: typeof dailyThemes[number];
}) {
  const [activeSection, setActiveSection] = useState<Record<number, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});
  const [evalResults, setEvalResults] = useState<Record<string, CompetencyExerciseResult>>({});

  const sectionLabels: Record<string, { short: string; color: string }> = {
    intro: { short: "Introdução", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    des1: { short: "Dev. 1", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    des2: { short: "Dev. 2", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    conc: { short: "Conclusão", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  };

  const handleVerifyExercise = async (
    compCode: "C1" | "C2" | "C3" | "C4" | "C5",
    sectionId: "intro" | "des1" | "des2" | "conc",
    key: string,
  ) => {
    const text = (answers[key] ?? "").trim();
    if (text.length < 15) {
      toast.error("Escreva pelo menos uma frase completa (15+ caracteres) antes de verificar.");
      return;
    }

    setEvaluating(prev => ({ ...prev, [key]: true }));
    try {
      let res: CompetencyExerciseResult;
      try {
        res = await evaluateCompetencyExercise({
          data: {
            competencyCode: compCode,
            sectionId,
            topic: currentTheme.topic,
            exerciseText: text,
          },
        });
      } catch (networkErr) {
        console.warn("[handleVerifyExercise] Usando motor local no mobile/offline:", networkErr);
        res = evaluateCompetencyHeuristically(compCode, sectionId, currentTheme.topic, text);
      }
      setEvalResults(prev => ({ ...prev, [key]: res }));
      toast.success("Exercício avaliado!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível verificar agora. Tente novamente.");
    } finally {
      setEvaluating(prev => ({ ...prev, [key]: false }));
    }
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
        const currentSection = (activeSection[i] ?? 'intro') as "intro" | "des1" | "des2" | "conc";
        const currentSectionData = comp.sections.find(s => s.id === currentSection)!;
        const answerKey = `${i}-${currentSection}`;
        const isEvaluatingThis = !!evaluating[answerKey];
        const currentEval = evalResults[answerKey];

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
                      className={`shrink-0 rounded-lg border px-4 py-1.5 text-sm font-semibold transition-all ${currentSection === section.id
                          ? (sectionLabels[section.id]?.color || '') + ' shadow-sm'
                          : 'border-transparent text-muted-foreground hover:bg-accent'
                        }`}
                    >
                      {sectionLabels[section.id]?.short || section.label}
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
                      <Button
                        size="sm"
                        className="rounded-lg gap-1.5"
                        disabled={isEvaluatingThis}
                        onClick={() => handleVerifyExercise(comp.code as "C1" | "C2" | "C3" | "C4" | "C5", currentSection, answerKey)}
                      >
                        <Sparkles className="size-3.5" />
                        {isEvaluatingThis ? "Avaliando..." : "Verificar com IA"}
                      </Button>
                    </div>

                    {/* Feedback da IA para o Exercício */}
                    {currentEval && (
                      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs sm:text-sm space-y-3 shadow-sm animate-in fade-in-50 duration-200">
                        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                          <span className="font-bold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-primary" /> Avaliação da Competência
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-xs ${currentEval.score >= 160 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" :
                              currentEval.score >= 120 ? "bg-blue-500/10 text-blue-600 border border-blue-500/30" :
                                "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            }`}>
                            {currentEval.score} / 200 pts
                          </span>
                        </div>

                        <p className="text-foreground leading-relaxed font-medium">
                          {currentEval.feedback}
                        </p>

                        {currentEval.strengths.length > 0 && (
                          <div className="space-y-1">
                            <strong className="block text-[11px] uppercase tracking-wide text-success font-bold">Acertos:</strong>
                            <ul className="space-y-1">
                              {currentEval.strengths.map((s, idx) => (
                                <li key={idx} className="text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-success font-bold">✓</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentEval.tips.length > 0 && (
                          <div className="space-y-1">
                            <strong className="block text-[11px] uppercase tracking-wide text-primary font-bold">Dica para os 200 pontos:</strong>
                            <ul className="space-y-1">
                              {currentEval.tips.map((t, idx) => (
                                <li key={idx} className="text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-primary font-bold">💡</span> {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
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

function Repertory({
  filter,
  setFilter,
  selectedDay,
  setSelectedDay,
  goTo,
}: {
  filter: string;
  setFilter: (value: string) => void;
  selectedDay: number;
  setSelectedDay: (value: number) => void;
  goTo: (section: Section) => void;
}) {
  const currentTheme = dailyThemes[selectedDay] || dailyThemes[0]!;
  const themeMedia = getThemeMedia(currentTheme.day);
  const [selectedItem, setSelectedItem] = useState<typeof currentTheme.repertories[number] | null>(null);
  const [copied, setCopied] = useState(false);

  const filters = ["Todos", "Leis", "Livros", "Filmes", "Séries", "Documentários", "Fatos Históricos", "Citações", "Músicas", "Conceitos"];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Leis": return Scale;
      case "Livros": return BookOpen;
      case "Filmes": return Film;
      case "Séries": return Tv;
      case "Documentários": return Video;
      case "Fatos Históricos": return Landmark;
      case "Citações": return Quote;
      case "Músicas": return Music;
      case "Conceitos": return Brain;
      default: return Sparkles;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredRepertories = currentTheme.repertories.filter(
    (item) => filter === "Todos" || item.category === filter
  );

  return (
    <>
      <PageTitle
        eyebrow="Banco de ideias nota 1000"
        title="Repertório Sociocultural por Tema"
        description="Imagens, referências legitimadas e direcionamento crítico estruturados para você brilhar na Competência 2 e 3 do ENEM."
      />

      {/* Trilha de Temas com Miniaturas e Imagens */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Selecione o Tema da Redação ({dailyThemes.length} temas disponíveis)
              </h3>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Cada tema possui acervo visual exclusivo com leis, livros, filmes e teorias sociológicas
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Tema {currentTheme.day} de {dailyThemes.length}
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
          {dailyThemes.map((theme, idx) => {
            const media = getThemeMedia(theme.day);
            const isSelected = selectedDay === idx;
            return (
              <button
                key={theme.day}
                type="button"
                onClick={() => {
                  setSelectedDay(idx);
                  setFilter("Todos");
                }}
                className={`group relative flex-shrink-0 w-44 overflow-hidden rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/50 shadow-md scale-[1.02] bg-accent/40"
                    : "border-border hover:border-primary/50 bg-card opacity-85 hover:opacity-100"
                }`}
              >
                <div className="relative h-20 w-full overflow-hidden">
                  <img
                    src={media.themeImage}
                    alt={theme.topic}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Dia {theme.day}
                  </span>
                  {theme.hot && (
                    <span className="absolute top-1.5 right-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                      🔥 Quente
                    </span>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-bold text-white truncate">
                    {media.themeTag}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold line-clamp-2 leading-snug text-foreground">
                    {theme.topic}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Banner do Tema Selecionado com Imagem de Destaque */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border shadow-lg">
        <div className="relative min-h-[240px] md:min-h-[280px] w-full">
          <img
            src={themeMedia.themeImage}
            alt={currentTheme.topic}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/35 md:from-black/90 md:via-black/60 md:to-black/30" />

          <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs">
                Tema {currentTheme.day} de {dailyThemes.length}
              </span>
              <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                {themeMedia.themeTag}
              </span>
              {currentTheme.hot && (
                <span className="rounded-full bg-amber-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-xs flex items-center gap-1">
                  <Flame className="size-3.5 fill-white" />
                  Tema quente ENEM 2025
                </span>
              )}
            </div>

            <div className="my-4 space-y-3">
              <h2 className="text-xl font-extrabold sm:text-2xl md:text-3xl leading-tight max-w-4xl text-white drop-shadow-sm">
                "{currentTheme.topic}"
              </h2>
              <div className="flex items-start gap-2.5 max-w-3xl rounded-xl bg-white/10 backdrop-blur-md p-3.5 border border-white/15">
                <Lightbulb className="size-4 shrink-0 text-amber-300 mt-0.5" />
                <p className="text-xs md:text-sm text-white/95 leading-relaxed">
                  <strong className="text-white font-semibold">Dica de abordagem:</strong> {currentTheme.hint}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/20">
              <div className="flex items-center gap-3 text-xs font-medium text-white/80">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-3.5" />
                  {currentTheme.repertories.length} referências catalogadas
                </span>
                <span>•</span>
                <span>Ilustradas e comentadas</span>
              </div>
              <Button
                onClick={() => goTo("laboratorio")}
                size="sm"
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex items-center gap-1.5"
              >
                <PenLine className="size-4" />
                Escrever redação deste tema
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de Categorias com Contadores */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider">
          Filtrar:
        </span>
        {filters.map((cat) => {
          const count = cat === "Todos"
            ? currentTheme.repertories.length
            : currentTheme.repertories.filter((r) => r.category === cat).length;
          if (cat !== "Todos" && count === 0) return null;
          const Icon = getCategoryIcon(cat);
          return (
            <Button
              key={cat}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat)}
              className="rounded-full text-xs flex items-center gap-1.5 h-8 px-3"
            >
              <Icon className="size-3.5" />
              {cat}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === cat
                    ? "bg-primary-foreground/25 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Grid de Cards de Repertório com Imagens Reais */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredRepertories.map((item) => {
          const itemImage = getRepertoryImage(currentTheme.day, item.title, item.category);
          const CategoryIcon = getCategoryIcon(item.category);
          return (
            <article
              key={item.title}
              onClick={() => setSelectedItem(item)}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col"
            >
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                <img
                  src={itemImage}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white border border-white/20 shadow-xs">
                    <CategoryIcon className="size-3 text-primary" />
                    {item.category}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs font-medium text-white/95 truncate">
                    Por <strong className="text-white">{item.author}</strong>
                  </p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1 text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {item.body}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5" />
                    Ver como citar na redação
                  </span>
                  <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de Detalhes do Repertório */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0">
          {selectedItem && (
            <div>
              {/* Header com Imagem */}
              <div className="relative h-56 w-full overflow-hidden bg-muted">
                <img
                  src={getRepertoryImage(currentTheme.day, selectedItem.title, selectedItem.category)}
                  alt={selectedItem.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                      {selectedItem.category}
                    </span>
                    <span className="rounded-md bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-xs font-medium text-white">
                      {selectedItem.author}
                    </span>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                    {selectedItem.title}
                  </DialogTitle>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Fundamentação e Justificativa
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedItem.body}
                  </p>
                </div>

                {/* Guia Prático: Como Aplicar na Redação */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                    <Award className="size-4" />
                    Como aplicar no texto (Estrutura Nota 1000)
                  </div>
                  <div className="space-y-2 text-xs text-foreground/90">
                    <div className="flex gap-2">
                      <span className="font-bold text-primary shrink-0">1. Apresentar:</span>
                      <span>Introduza a obra ou lei com precisão contextual, citando o autor ou órgão responsável.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-primary shrink-0">2. Relacionar:</span>
                      <span>Faça o elo explícito com a frase temática: <em>"{currentTheme.topic}"</em>.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-primary shrink-0">3. Interpretar:</span>
                      <span>Mostre que a realidade brasileira contrasta com o ideal da referência, sustentando sua tese crítica.</span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(`${selectedItem.title} (${selectedItem.author}): ${selectedItem.body}`)}
                    className="flex-1 rounded-xl flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="size-4 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        <span>Copiar Repertório</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedItem(null);
                      goTo("laboratorio");
                    }}
                    className="flex-1 rounded-xl flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold shadow-md"
                  >
                    <PenLine className="size-4" />
                    <span>Treinar no Laboratório</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Laboratory(props: { tab: "digital" | "photo"; setTab: (v: "digital" | "photo") => void; text: string; setText: (v: string) => void; stats: { words: number; chars: number; lines: number }; timer: boolean; setTimer: (v: boolean) => void; timerSeconds: number; setTimerSeconds: (v: number) => void; preview: string | null; fileRef: React.RefObject<HTMLInputElement | null>; setPreview: (v: string | null) => void; correcting: boolean; error: string; handleCorrection: () => void; result: Correction | null; setResult: (v: Correction | null) => void; selectedDay: number; setSelectedDay: (v: number) => void }) {
  const { preferences } = useUserPreferences();
  const { getEssayForTheme, essays } = useEssays();
  const currentTheme = dailyThemes[props.selectedDay] ?? dailyThemes[0]!;

  const handleSelectDay = (idx: number) => {
    props.setSelectedDay(idx);
    const targetTheme = dailyThemes[idx];
    if (targetTheme) {
      const existing = getEssayForTheme(targetTheme.day);
      if (existing) {
        props.setText(existing.essay_text);
        return;
      }
    }
    props.setText('');
  };

  if (props.result) return <Feedback result={props.result} text={props.text} onBack={() => props.setResult(null)} />;

  return <>
    <PageTitle eyebrow="Hora de escrever" title="Laboratório de redação" description={`A Inteligência Artificial avaliará no nível de exigência para ${preferences?.course || 'o seu curso'}. Escolha o tema do dia abaixo!`} />

    {/* Daily Themes Strip */}
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold">📅 Trilha de temas — 14 dias</p>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">{dailyThemes.filter(d => !!getEssayForTheme(d.day)).length}/{dailyThemes.length} concluídos</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dailyThemes.map((theme, idx) => {
          const isCourseHot = !!preferences?.course && theme.courseHot.some(
            c => preferences.course.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(preferences.course.toLowerCase())
          );
          const isHot = theme.hot || isCourseHot;
          const completedEssay = getEssayForTheme(theme.day);
          const isDone = Boolean(completedEssay);
          const score = completedEssay?.score;
          const isSelected = props.selectedDay === idx;
          return (
            <button
              key={theme.day}
              type="button"
              onClick={() => handleSelectDay(idx)}
              className={`relative flex min-w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all ${isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-105'
                  : isDone
                    ? 'border-success/40 bg-success/5 text-foreground hover:bg-success/10'
                    : isHot
                      ? 'border-orange-400/40 bg-orange-500/5 text-foreground hover:bg-orange-500/10'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent'
                }`}
            >
              {isHot && !isDone && (
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-orange-100 text-sm shadow-sm ring-2 ring-background">🔥</span>
              )}

              <span className={`text-[11px] font-extrabold uppercase tracking-widest ${isSelected ? 'text-primary-foreground/80' : isDone ? 'text-success' : 'opacity-70'}`}>
                {theme.label}
              </span>
              <span className="text-2xl font-black leading-none">{String(theme.day).padStart(2, '0')}</span>

              {isDone ? (
                <div className={`mt-1 flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-primary-foreground text-primary' : 'bg-success/20 text-success'}`}>
                  <CheckCircle2 className="mr-1 size-3" /> {score}
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
        const currentCompleted = getEssayForTheme(currentTheme.day);
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
                {currentCompleted ? "Reescrever" : "Começar"}
              </Button>
            </div>
            {isHot && currentTheme.hotReason && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-500/10 px-3 py-2">
                <span className="text-sm">📊</span>
                <p className="text-xs leading-5 text-orange-700">{currentTheme.hotReason}</p>
              </div>
            )}
            {currentCompleted && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>
                    Redação concluída neste tema! Nota: <strong>{currentCompleted.score}/1000</strong>
                  </span>
                </div>
                {currentCompleted.competencies && currentCompleted.competencies.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md border-emerald-600/30 bg-card text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                    onClick={() => {
                      props.setResult({
                        score: currentCompleted.score,
                        competencies: currentCompleted.competencies as any,
                        strengths: currentCompleted.strengths || [],
                        improvements: currentCompleted.improvements || [],
                        annotations: (currentCompleted.annotations || []) as any,
                        c5Elements: (currentCompleted as any).c5Elements || [],
                      });
                      if (currentCompleted.essay_text) {
                        props.setText(currentCompleted.essay_text);
                      }
                    }}
                  >
                    Ver correção anterior
                  </Button>
                )}
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
    {props.tab === "digital" ? <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground"><span>{props.stats.words} palavras</span><span>{props.stats.chars} caracteres</span><span>{props.stats.lines}/30 linhas</span></div><div className="flex items-center gap-2">{(props.timer || props.timerSeconds < 5400) && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); props.setTimer(false); props.setTimerSeconds(5400); }} className="rounded-lg text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10">Resetar</Button>}{(props.timer || props.timerSeconds < 5400) && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); props.setTimer(!props.timer); }} className="rounded-lg text-xs px-2 text-primary hover:text-primary hover:bg-primary/10">{props.timer ? <><Pause className="size-3.5 mr-1" />Pausar</> : <><Play className="size-3.5 mr-1" />Retomar</>}</Button>}<Button variant="outline" size="sm" onClick={() => { if (!props.timer && props.timerSeconds === 0) props.setTimerSeconds(5400); props.setTimer(!props.timer); }} className={`rounded-lg ${props.timer ? "border-primary text-primary" : props.timerSeconds < 5400 ? (props.timerSeconds === 0 ? "border-destructive text-destructive" : "border-orange-500 text-orange-600") : ""}`}><Clock3 /> {props.timer || props.timerSeconds < 5400 ? (() => { const h = Math.floor(props.timerSeconds / 3600); const m = Math.floor((props.timerSeconds % 3600) / 60); const s = props.timerSeconds % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; })() : "Ativar temporizador"}</Button></div></div><textarea value={props.text} onChange={(e) => props.setText(e.target.value)} placeholder={`Tema: "${currentTheme.topic}"

Comece pela sua tese. O que você defende sobre este tema?`} className="min-h-[480px] w-full resize-none bg-card p-6 text-base leading-8 outline-none md:p-10" style={{ backgroundImage: "linear-gradient(to bottom, transparent 31px, var(--line) 32px)", backgroundSize: "100% 32px" }} /><div className="flex flex-col items-end gap-2 border-t border-border p-4"><Button size="lg" onClick={props.handleCorrection} disabled={props.correcting} className="h-12 rounded-xl px-6"><Sparkles /> {props.correcting ? "Analisando com rigor adaptado..." : "Corrigir com Inteligência Artificial"}</Button>{props.error && <p className="text-sm text-destructive">{props.error}</p>}</div></div> : <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center shadow-sm md:p-16"><input ref={props.fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) props.setPreview(URL.createObjectURL(file)); }} />{props.preview ? <img src={props.preview} alt="Prévia da redação" className="mx-auto max-h-[520px] rounded-xl object-contain shadow-sm" /> : <><span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary"><UploadCloud className="size-7" /></span><h2 className="mt-5 text-xl font-bold">Envie uma foto nítida da sua redação</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Posicione a folha inteira, evite sombras e confira se o texto está legível.</p></>}<div className="mt-6 flex flex-wrap justify-center gap-2"><Button className="rounded-xl" onClick={() => props.fileRef.current?.click()}><ImagePlus /> Escolher imagem</Button><Button variant="outline" className="rounded-xl" onClick={() => props.fileRef.current?.click()}><Camera /> Usar câmera</Button></div></div>}
  </>;
}

function HighlightedText({ text, annotations }: { text: string; annotations: Correction['annotations'] }) {
  if (!annotations || annotations.length === 0) return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>;

  const matches: { start: number, end: number, type: 'acerto' | 'erro' }[] = [];
  annotations.forEach(ann => {
    let index = text.indexOf(ann.excerpt);
    while (index !== -1) {
      matches.push({ start: index, end: index + ann.excerpt.length, type: ann.type || 'erro' });
      index = text.indexOf(ann.excerpt, index + 1);
    }
  });

  matches.sort((a, b) => a.start - b.start);
  const validMatches: typeof matches = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      validMatches.push(match);
      lastEnd = match.end;
    }
  }

  const nodes = [];
  let currentIndex = 0;
  validMatches.forEach((match, i) => {
    if (match.start > currentIndex) {
      nodes.push(<span key={`text-${i}`}>{text.substring(currentIndex, match.start)}</span>);
    }
    const colorClass = match.type === 'acerto' ? 'bg-success/20 text-success-foreground border-b-2 border-success' : 'bg-highlight/20 text-highlight-foreground border-b-2 border-highlight';
    nodes.push(
      <span key={`match-${i}`} className={`px-1 py-0.5 rounded-sm font-medium ${colorClass}`} title={match.type === 'acerto' ? 'Acerto' : 'Ponto de melhoria'}>
        {text.substring(match.start, match.end)}
      </span>
    );
    currentIndex = match.end;
  });

  if (currentIndex < text.length) {
    nodes.push(<span key="text-end">{text.substring(currentIndex)}</span>);
  }

  return <div className="whitespace-pre-wrap leading-relaxed">{nodes}</div>;
}

function Feedback({ result, text, onBack }: { result: Correction; text: string; onBack: () => void }) {
  const score = Math.max(0, Math.min(1000, Math.round(result.score)));
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow="Correção concluída" title="Seu feedback personalizado" description="Use os comentários como um mapa para a próxima versão do seu texto." />
        <Button variant="outline" onClick={onBack} className="rounded-xl">Voltar ao texto</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Lado Esquerdo: Texto Grifado (no mobile fica abaixo da nota para ver a nota primeiro) */}
        <div className="order-2 xl:order-1 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm h-fit xl:sticky xl:top-24">
          <h2 className="text-xl font-bold mb-4">Sua Redação</h2>
          <div className="text-base text-foreground/90 bg-accent/30 p-4 sm:p-5 rounded-lg border border-border/50 max-h-[55vh] sm:max-h-[70vh] overflow-y-auto">
            <HighlightedText text={text} annotations={result.annotations} />
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
            <span className="flex items-center gap-2"><div className="size-3 rounded-full bg-success"></div> Acertos</span>
            <span className="flex items-center gap-2"><div className="size-3 rounded-full bg-highlight"></div> Pontos de Melhoria</span>
          </div>
        </div>

        {/* Lado Direito: Feedback e Nota (no mobile aparece primeiro no topo) */}
        <div className="order-1 xl:order-2 space-y-6">
          <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
            <div className="rounded-xl border border-border bg-card p-7 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="mx-auto grid size-32 sm:size-40 place-items-center rounded-full border-[10px] sm:border-[14px] border-primary bg-accent">
                <div>
                  <strong className="text-4xl sm:text-5xl text-primary">{score}</strong>
                  <span className="block text-xs sm:text-sm text-muted-foreground">de 1000</span>
                </div>
              </div>
              <h2 className="mt-6 text-lg sm:text-xl font-bold">
                {score >= 900 ? "Excelente desempenho!" : score >= 700 ? "Ótimo avanço!" : score >= 500 ? "Bom trabalho!" : "Continue praticando!"}
              </h2>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">Competências</h2>
              <div className="mt-4 space-y-4">
                {result.competencies.slice(0, 5).map((item, i) => (
                  <div key={`${item.name}-${i}`}>
                    <div className="mb-1.5 flex justify-between gap-3 text-xs sm:text-sm">
                      <span className="font-semibold truncate">{item.name}</span>
                      <strong className="text-primary">{Math.round(item.score)}/200</strong>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, item.score / 2))} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-bold text-success"><CheckCircle2 className="size-5" /> O que está excelente</h2>
              <ul className="mt-4 space-y-3">
                {result.strengths.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />{item}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-bold text-highlight"><AlertCircle className="size-5" /> O que precisa melhorar</h2>
              <ul className="mt-4 space-y-3">
                {result.improvements.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><AlertCircle className="mt-1 size-4 shrink-0 text-highlight" />{item}</li>)}
              </ul>
            </div>
          </div>

          {result.annotations.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">Intervenções no seu texto</h2>
              <div className="mt-5 space-y-4">
                {result.annotations.map((item) => (
                  <div key={item.excerpt} className={`rounded-lg border-l-4 p-4 ${item.type === 'acerto' ? 'border-success bg-success/10' : 'border-highlight bg-highlight/10'}`}>
                    <p className="font-medium text-sm italic">“{item.excerpt}”</p>
                    <p className={`mt-2 text-sm font-medium ${item.type === 'acerto' ? 'text-success' : 'text-highlight'}`}>
                      <Sparkles className="mr-1.5 inline size-4" />{item.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}



function TrainingSection({ goTo }: { goTo: (section: Section) => void }) {
  const [openEssay, setOpenEssay] = useState<TrainingEssay | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = trainingEssays.filter(e =>
    !searchTerm ||
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.theme.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scoreColor = (score: number) => {
    if (score >= 960) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 940) return "text-blue-600 bg-blue-500/10 border-blue-500/30";
    return "text-amber-600 bg-amber-500/10 border-amber-500/30";
  };

  const paragraphColors = [
    { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: "Introdução" },
    { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", label: "Desenvolvimento 1" },
    { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "Desenvolvimento 2" },
    { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", label: "Conclusão" },
  ];

  if (openEssay) {
    return (
      <>
        <div className="mb-6">
          <button type="button" onClick={() => setOpenEssay(null)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <ArrowRight className="size-4 rotate-180" /> Voltar ao Treinamento
          </button>
        </div>

        {/* Header da redação */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Redação Modelo</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${scoreColor(openEssay.score)}`}>
                  <Star className="mr-1 inline size-3" /> {openEssay.score} pontos
                </span>
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">{openEssay.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{openEssay.theme}</p>
            </div>
          </div>

          {/* Competências */}
          <div className="mt-6 grid grid-cols-5 gap-3">
            {Object.entries(openEssay.competencies).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-accent p-3 text-center">
                <span className="block text-xs font-bold uppercase text-muted-foreground">{key.toUpperCase()}</span>
                <span className="block text-lg font-black text-primary">{value}</span>
                <Progress value={value / 2} className="mt-1 h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Parágrafos da redação */}
        <div className="space-y-5">
          {openEssay.paragraphs.map((paragraph, i) => {
            const color = paragraphColors[i] ?? paragraphColors[0]!;
            const highlight = openEssay.highlights.find(h => h.paragraph === i);
            return (
              <div key={i} className={`rounded-xl border ${color.border} ${color.bg} p-5 md:p-6 shadow-sm`}>
                <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${color.badge}`}>
                  {color.label}
                </span>
                <p className="text-base leading-8 text-foreground">{paragraph}</p>
                {highlight && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/60 p-3">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <span className="text-xs font-bold text-primary">{highlight.label}</span>
                      <p className="mt-0.5 text-sm text-muted-foreground">{highlight.tip}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA para escrever */}
        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <GraduationCap className="mx-auto mb-3 size-10 text-primary" />
          <h3 className="text-lg font-bold">Agora é sua vez!</h3>
          <p className="mt-1 text-sm text-muted-foreground">Inspirou-se nesta redação? Vá ao Laboratório e escreva a sua baseando-se na estrutura e repertórios estudados.</p>
          <Button onClick={() => goTo("laboratorio")} className="mt-4 rounded-xl">
            Escrever minha redação <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle eyebrow="Modelos para inspirar sua escrita" title="Treinamento" description="Leia redações com notas acima de 900 comentadas passo a passo. Estude a estrutura, os repertórios legítimos e a proposta de intervenção para se basear nelas e escrever suas próprias redações." />

      {/* Barra de pesquisa */}
      <div className="mb-6 flex max-w-md items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por tema ou palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
            Limpar
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="size-5" /></span>
          </div>
          <strong className="text-2xl">{filtered.length}</strong>
          <p className="mt-1 text-sm text-muted-foreground">Redações para estudo</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600"><Star className="size-5" /></span>
          </div>
          <strong className="text-2xl">{Math.round(filtered.reduce((s, e) => s + e.score, 0) / (filtered.length || 1))}</strong>
          <p className="mt-1 text-sm text-muted-foreground">Média de pontuação</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-lg bg-purple-500/10 text-purple-600"><Award className="size-5" /></span>
          </div>
          <strong className="text-2xl">Nota 900+</strong>
          <p className="mt-1 text-sm text-muted-foreground">Padrão de excelência</p>
        </div>
      </div>

      {/* Lista de redações */}
      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((essay) => (
          <article
            key={essay.id}
            onClick={() => setOpenEssay(essay)}
            className="group cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Redação Modelo</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${scoreColor(essay.score)}`}>
                {essay.score} pts
              </span>
            </div>
            <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors">{essay.title}</h2>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{essay.theme}</p>

            <div className="mt-4 flex items-center gap-3">
              {Object.entries(essay.competencies).map(([key, value]) => (
                <span key={key} className="text-xs font-semibold text-muted-foreground">
                  <span className="uppercase">{key}</span>: <span className={value >= 200 ? "text-emerald-600" : value >= 180 ? "text-blue-600" : "text-amber-600"}>{value}</span>
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-primary">
              <Eye className="size-4" /> Ler e estudar <ChevronRight className="size-4" />
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-12 text-center">
          <FileText className="mx-auto size-12 text-muted-foreground/30" />
          <p className="mt-3 text-muted-foreground">Nenhuma redação encontrada para essa pesquisa.</p>
        </div>
      )}
    </>
  );
}
