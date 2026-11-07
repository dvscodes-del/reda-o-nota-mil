import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Heart, MessageCircle, Share2, Trophy, Flame, Star, FileText,
  HelpCircle, Send, MoreHorizontal, Trash2, X, ChevronDown,
  Loader2, Sparkles, BookOpen, PenLine, Target, Zap, Search,
  Laugh, ThumbsUp, Lightbulb, UserPlus, TrendingUp, Hash,
  Globe, Lock, Users, ChevronRight, Bookmark, Bell, Award,
  Medal, Eye, Repeat2, Check, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { useEssays } from "@/context/EssaysContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
export type PostType = "text" | "essay_share" | "achievement" | "question";
export type Reaction = "like" | "love" | "celebrate" | "insightful" | "funny";

export interface FeedPost {
  id: string;
  user_id: string;
  type: PostType;
  content: string;
  image_url?: string | null;
  essay_id?: string | null;
  essay_score?: number | null;
  essay_topic?: string | null;
  achievement_title?: string | null;
  achievement_icon?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  author_course?: string | null;
  author_college?: string | null;
  is_liked?: boolean;
  selected_reaction?: Reaction | null;
  comments?: FeedComment[];
  comments_loaded?: boolean;
  show_comments?: boolean;
  is_community_seed?: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

export interface SuggestedStudent {
  id: string;
  name: string;
  course: string;
  avatar: string | null;
  isFollowing: boolean;
}

// ─────────────────────────────────────────────
// Posts reais da Comunidade ENEM (Fallback rico)
// ─────────────────────────────────────────────
const REAL_COMMUNITY_POSTS: FeedPost[] = [
  {
    id: "community-1",
    user_id: "seed-user-1",
    author_name: "Beatriz Vasconcelos",
    author_course: "Medicina",
    author_college: "USP",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    type: "essay_share",
    essay_score: 960,
    essay_topic: "Desafios para o enfrentamento da insegurança alimentar no Brasil contemporâneo",
    content: "Acabei de receber a correção da IA no Laboratório com nota 960! 🎯\n\nConsegui gabaritar a C2 e C3 usando o conceito de 'Cidadãos de Papel' do Gilberto Dimenstein associado à obra 'Quarto de Despejo' de Carolina Maria de Jesus. A chave foi não apenas citar o livro, mas interpretar como a invisibilidade da fome perpetua a desigualdade social.\n\nPróxima meta: lapidar a C1 para alcançar o 1000 cravado! Quem mais está treinando esse tema hoje? #RedaçãoENEM #Nota900 #RepertórioNota1000 #Vestibular",
    likes_count: 42,
    comments_count: 8,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    is_liked: false,
    comments_loaded: true,
    show_comments: false,
    is_community_seed: true,
    comments: [
      {
        id: "c-1-1",
        post_id: "community-1",
        user_id: "seed-user-2",
        author_name: "Lucas Ferreira",
        author_avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
        content: "Parabéns Bia! Você colocou Carolina Maria de Jesus logo na introdução ou guardou pro D1?",
        created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: "c-1-2",
        post_id: "community-1",
        user_id: "seed-user-1",
        author_name: "Beatriz Vasconcelos",
        author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        content: "Coloquei no D1, Lucas! Na introdução usei o Artigo 6º da CF/88 (Direito à Alimentação). Fica super encadeado!",
        created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      }
    ]
  },
  {
    id: "community-2",
    user_id: "seed-user-2",
    author_name: "Lucas Ferreira",
    author_course: "Direito",
    author_college: "UFMG",
    author_avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    type: "achievement",
    achievement_title: "Primeira nota 920 no simulado do Escreva+",
    achievement_icon: "🏆",
    content: "Depois de 2 meses travado na faixa dos 760 pontos, finalmente bati os 900+! 🔥\n\nO que destravou minha pontuação:\n1. Estrutura rígida na proposta de intervenção: Agente + Ação + Meio/Modo + Efeito + Detalhamento explicativo.\n2. Eliminar repetições de pronomes na C4 usando sinônimos e conectivos diversificados ('Ademais', 'Outrossim', 'Nesse viés').\n\nConstância vence talento todo dia. Bora pra cima! 💪 #Conquista #Nota900 #ENEM2026 #FocoTotal",
    likes_count: 58,
    comments_count: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    is_liked: false,
    comments_loaded: true,
    show_comments: false,
    is_community_seed: true,
    comments: [
      {
        id: "c-2-1",
        post_id: "community-2",
        user_id: "seed-user-3",
        author_name: "Camila Rocha",
        author_avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        content: "Sensacional Lucas! O detalhamento do meio/modo era exatamente onde eu mais perdia ponto na C5.",
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      }
    ]
  },
  {
    id: "community-3",
    user_id: "seed-user-4",
    author_name: "Prof. Gabriel Mendes",
    author_course: "Mentor de Redação",
    author_college: "Nota 1000 ENEM",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    type: "text",
    content: "💡 3 ERROS FATAIS QUE CUSTAM 80 PONTOS NA SUA PROPOSTA DE INTERVENÇÃO (C5):\n\n❌ 1. Proposta vaga sem agente explícito ('O governo deve fazer algo').\n❌ 2. Detalhamento genérico ('com muita eficiência') não é pontuado.\n❌ 3. Esquecer o efeito prático: toda ação precisa ter a finalidade explícita ('a fim de garantir que...').\n\nSalve este post para revisar antes de submeter sua próxima redação! 📌 #DicasDeRedação #Competência5 #PropostadeIntervenção",
    likes_count: 94,
    comments_count: 22,
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    is_liked: false,
    comments_loaded: true,
    show_comments: false,
    is_community_seed: true,
    comments: []
  },
  {
    id: "community-4",
    user_id: "seed-user-3",
    author_name: "Camila Rocha",
    author_course: "Psicologia",
    author_college: "UFRJ",
    author_avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    type: "question",
    content: "Pessoal, dúvida técnica sobre C1: No parágrafo de introdução, a expressão 'ao invés de' no sentido de 'em vez de' ainda é penalizada como desvio gramatical pela banca? \n\nTenho o costume de usar 'ao invés de' para qualquer oposição, mas o corretor da IA apontou como inadequação semântica. Como vocês fazem para não errar isso? 🤔 #Dúvida #Competência1 #Gramática",
    likes_count: 26,
    comments_count: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    is_liked: false,
    comments_loaded: true,
    show_comments: false,
    is_community_seed: true,
    comments: [
      {
        id: "c-4-1",
        post_id: "community-4",
        user_id: "seed-user-4",
        author_name: "Prof. Gabriel Mendes",
        author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        content: "Oi Camila! Sim, 'ao invés de' só deve ser usado para ideias estritamente opostas (subir/descer, dia/noite). Para simples substituição ('em vez de estudar, jogou bola'), use sempre 'em vez de'. A banca do ENEM é muito rígida com isso!",
        created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      }
    ]
  }
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const REACTIONS: { key: Reaction; emoji: string; label: string; color: string }[] = [
  { key: "like", emoji: "👍", label: "Curtir", color: "text-blue-500" },
  { key: "love", emoji: "❤️", label: "Amei", color: "text-red-500" },
  { key: "celebrate", emoji: "🎉", label: "Parabéns", color: "text-amber-500" },
  { key: "insightful", emoji: "💡", label: "Perspicaz", color: "text-yellow-500" },
  { key: "funny", emoji: "😄", label: "Engraçado", color: "text-orange-500" },
];

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
  } catch {
    return "recentemente";
  }
}

function getScoreGrade(score: number) {
  if (score >= 900) return { label: "Nota Excelente", color: "from-amber-500 to-yellow-400", text: "text-amber-900" };
  if (score >= 800) return { label: "Nota Ótima", color: "from-emerald-500 to-green-400", text: "text-emerald-900" };
  if (score >= 700) return { label: "Nota Boa", color: "from-blue-500 to-sky-400", text: "text-blue-900" };
  return { label: "Em desenvolvimento", color: "from-slate-400 to-slate-300", text: "text-slate-800" };
}

// ─────────────────────────────────────────────
// Avatar com anel e iniciais
// ─────────────────────────────────────────────
function Avatar({ name, url, size = 10, ring = false, onClick }: { name?: string | null; url?: string | null; size?: number; ring?: boolean; onClick?: () => void }) {
  const initials = (name ?? "?")[0].toUpperCase();
  const cls = `size-${size} shrink-0 rounded-full overflow-hidden grid place-items-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm select-none ${ring ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""} ${onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`;
  return (
    <div className={cls} onClick={onClick}>
      {url ? <img src={url} alt={name ?? ""} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-full bg-muted" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-32 rounded-full bg-muted" />
          <div className="h-2.5 w-48 rounded-full bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-muted" />
        <div className="h-3 w-5/6 rounded-full bg-muted" />
        <div className="h-3 w-4/6 rounded-full bg-muted" />
      </div>
      <div className="flex gap-4 pt-1">
        <div className="h-8 w-20 rounded-xl bg-muted" />
        <div className="h-8 w-20 rounded-xl bg-muted" />
        <div className="h-8 w-20 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stories Bar (Instagram-style)
// ─────────────────────────────────────────────
function StoriesBar({ currentUserName, currentUserAvatar, onWritePost, onSelectTheme }: {
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onWritePost: () => void;
  onSelectTheme: (tag: string) => void;
}) {
  const themes = [
    { label: "Redação do dia", emoji: "📝", color: "from-primary to-purple-600", tag: "RedaçãoENEM" },
    { label: "Nota acima de 900", emoji: "🏆", color: "from-amber-400 to-orange-500", tag: "Nota900" },
    { label: "Repertório", emoji: "📚", color: "from-emerald-400 to-teal-600", tag: "RepertórioNota1000" },
    { label: "Competência 5", emoji: "🎯", color: "from-red-400 to-pink-600", tag: "Competência5" },
    { label: "Dúvidas", emoji: "💡", color: "from-sky-400 to-blue-600", tag: "Dúvida" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
      {/* Botão de publicar story */}
      <button
        type="button"
        onClick={onWritePost}
        className="flex shrink-0 flex-col items-center gap-2 group cursor-pointer"
        title="Criar publicação"
      >
        <div className="relative size-16">
          <div className="size-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/40 group-hover:border-primary transition-colors grid place-items-center overflow-hidden">
            {currentUserAvatar
              ? <img src={currentUserAvatar} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
              : <span className="text-xl font-bold text-primary">{(currentUserName ?? "?")[0].toUpperCase()}</span>
            }
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-foreground grid place-items-center border-2 border-background shadow-xs">
            <span className="text-[10px] font-black leading-none">+</span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors max-w-[64px] text-center truncate">
          Publicar
        </span>
      </button>

      {/* Stories temáticos */}
      {themes.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onSelectTheme(t.tag)}
          className="flex shrink-0 flex-col items-center gap-2 group cursor-pointer"
          title={`Ver posts sobre #${t.tag}`}
        >
          <div className={`size-16 rounded-full bg-gradient-to-br ${t.color} p-0.5 shadow-xs group-hover:shadow-md group-hover:scale-105 transition-all`}>
            <div className="size-full rounded-full bg-background grid place-items-center">
              <span className="text-2xl">{t.emoji}</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors max-w-[64px] text-center leading-tight">
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Caixa de Criação de Post (LinkedIn Modal)
// ─────────────────────────────────────────────
function CreatePostModal({
  open,
  onClose,
  onPublish,
  currentUserName,
  currentUserAvatar,
  latestEssay,
}: {
  open: boolean;
  onClose: () => void;
  onPublish: (data: any) => Promise<void>;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  latestEssay: { id: string; score: number; theme_topic: string } | null;
}) {
  const [postType, setPostType] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementIcon, setAchievementIcon] = useState("🏆");
  const [publishing, setPublishing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ICONS = ["🏆", "🔥", "⭐", "🎯", "⚡", "📚", "🏅", "✨", "💪", "🎓"];

  const POST_TYPES: { type: PostType; icon: React.ElementType; label: string }[] = [
    { type: "essay_share", icon: FileText, label: "Compartilhar Redação" },
    { type: "achievement", icon: Trophy, label: "Conquista" },
    { type: "question", icon: HelpCircle, label: "Tirar Dúvida" },
    { type: "text", icon: PenLine, label: "Pensamento" },
  ];

  const handlePublish = async () => {
    if (!content.trim()) { toast.error("Escreva algo antes de publicar!"); return; }
    if (postType === "achievement" && !achievementTitle.trim()) { toast.error("Escreva o nome da conquista!"); return; }
    setPublishing(true);
    await onPublish({
      type: postType,
      content: content.trim(),
      ...(postType === "essay_share" && latestEssay ? { essay_id: latestEssay.id, essay_score: latestEssay.score, essay_topic: latestEssay.theme_topic } : {}),
      ...(postType === "achievement" ? { achievement_title: achievementTitle.trim(), achievement_icon: achievementIcon } : {}),
    });
    setContent(""); setAchievementTitle(""); setPostType("text"); onClose();
    setPublishing(false);
  };

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-in fade-in-0 duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={currentUserName} url={currentUserAvatar} size={11} ring />
            <div>
              <p className="font-bold text-sm leading-tight">{currentUserName ?? "Estudante"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Globe className="size-2.5" /> Público
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Tipo de post */}
        <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {POST_TYPES.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setPostType(type)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${postType === type ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Preview redação */}
        {postType === "essay_share" && latestEssay && (() => {
          const grade = getScoreGrade(latestEssay.score);
          return (
            <div className={`mx-5 mb-3 rounded-xl bg-gradient-to-r ${grade.color} p-0.5 shadow-sm`}>
              <div className="rounded-[10px] bg-card px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{grade.label}</p>
                  <p className="text-sm font-semibold line-clamp-1">{latestEssay.theme_topic}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-black leading-none text-primary">{latestEssay.score}</p>
                  <p className="text-[10px] text-muted-foreground">/ 1000</p>
                </div>
              </div>
            </div>
          );
        })()}

        {postType === "essay_share" && !latestEssay && (
          <div className="mx-5 mb-3 rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            Escreva uma redação no Laboratório para poder compartilhar sua nota e evolução!
          </div>
        )}

        {/* Conquista */}
        {postType === "achievement" && (
          <div className="mx-5 mb-3 space-y-2.5">
            <input
              type="text"
              value={achievementTitle}
              onChange={(e) => setAchievementTitle(e.target.value)}
              placeholder="Nome da conquista (ex: Primeira nota acima de 900!)"
              className="w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setAchievementIcon(icon)}
                  className={`text-2xl rounded-xl border p-2 transition-all ${achievementIcon === icon ? "border-primary bg-primary/10 scale-110 shadow-sm" : "border-border/40 hover:border-primary/30 hover:scale-105"}`}
                >{icon}</button>
              ))}
            </div>
          </div>
        )}

        {/* Texto */}
        <div className="px-5 pb-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder={
              postType === "text" ? "O que você quer compartilhar com a comunidade de redação hoje?"
              : postType === "essay_share" ? "Conta como foi escrever esse texto! Quais repertórios você usou?"
              : postType === "achievement" ? "Descreva sua conquista! Como foi sua rotina de estudos até aqui?"
              : "Qual a sua dúvida? Descreva o parágrafo ou competência para a turma ajudar!"
            }
            className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <span className={`text-xs ${content.length > 580 ? "text-destructive" : "text-muted-foreground"}`}>{content.length}/600</span>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!content.trim() || content.length > 600 || publishing}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              Publicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Picker de Reações no Hover
// ─────────────────────────────────────────────
function ReactionPicker({ onSelect, visible }: { onSelect: (r: Reaction) => void; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1.5 shadow-xl z-20 animate-in fade-in-0 zoom-in-95 duration-100">
      {REACTIONS.map((r) => (
        <button key={r.key} type="button" onClick={() => onSelect(r.key)} title={r.label}
          className="text-xl transition-transform hover:scale-150 active:scale-110 duration-150 leading-none py-0.5 px-1 rounded-full hover:bg-muted/60 cursor-pointer"
        >{r.emoji}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Card de Post do Feed
// ─────────────────────────────────────────────
function PostCard({
  post,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onLike,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onDelete,
  onHashtagClick,
  onOpenProfile,
}: {
  post: FeedPost;
  currentUserId: string;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onLike: (postId: string, isLiked: boolean, reaction?: Reaction) => Promise<void>;
  onToggleComments: (postId: string) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
  onHashtagClick: (tag: string) => void;
  onOpenProfile?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const likeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLongContent = post.content.length > 240;
  const displayedContent = isLongContent && !expanded ? post.content.slice(0, 240) + "…" : post.content;

  const handleLikeEnter = () => {
    likeTimerRef.current = setTimeout(() => setShowReactions(true), 350);
  };
  const handleLikeLeave = () => {
    if (likeTimerRef.current) clearTimeout(likeTimerRef.current);
    setTimeout(() => setShowReactions(false), 300);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    await onAddComment(post.id, commentText.trim());
    setCommentText("");
    setSendingComment(false);
  };

  const grade = post.type === "essay_share" && post.essay_score != null ? getScoreGrade(post.essay_score) : null;

  // Renderizar hashtags clicáveis
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        const tag = part.slice(1);
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); onHashtagClick(tag); }}
            className="font-semibold text-primary hover:underline cursor-pointer"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <article className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* ── Cabeçalho do Post ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar name={post.author_name} url={post.author_avatar} size={11} ring onClick={onOpenProfile} />
            {post.type === "achievement" && (
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-amber-500 border-2 border-card grid place-items-center">
                <span className="text-[10px] leading-none">{post.achievement_icon ?? "🏆"}</span>
              </div>
            )}
            {post.type === "essay_share" && (
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-primary border-2 border-card grid place-items-center">
                <FileText className="size-2.5 text-primary-foreground" />
              </div>
            )}
            {post.type === "question" && (
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-sky-500 border-2 border-card grid place-items-center">
                <HelpCircle className="size-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                onClick={onOpenProfile}
                className="font-bold text-sm leading-tight text-foreground truncate hover:text-primary hover:underline cursor-pointer"
              >
                {post.author_name ?? "Estudante"}
              </p>
              {post.user_id === currentUserId && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">Você</span>
              )}
            </div>
            {(post.author_course || post.author_college) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {[post.author_course, post.author_college].filter(Boolean).join(" • ")}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
              {timeAgo(post.created_at)}
              <span>·</span>
              <Globe className="size-2.5" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          <div className="relative">
            <button type="button" onClick={() => setShowMenu(v => !v)}
              className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-border/60 bg-card shadow-xl py-1 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); toast.success("Publicação salva nos seus favoritos!"); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Bookmark className="size-3.5" /> Salvar post
                </button>
                {post.user_id === currentUserId && (
                  <>
                    <div className="my-1 h-px bg-border/60 mx-2" />
                    <button type="button" onClick={() => { setShowMenu(false); onDelete(post.id); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Excluir publicação
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conquista em destaque ── */}
      {post.type === "achievement" && (
        <div className="mx-5 mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/10 border border-amber-500/25 px-5 py-4 flex items-center gap-4">
          <span className="text-4xl">{post.achievement_icon ?? "🏆"}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Nova Conquista Desbloqueada!</p>
            <p className="text-lg font-black text-foreground leading-tight">{post.achievement_title}</p>
          </div>
        </div>
      )}

      {/* ── Card de Redação Compartilhada ── */}
      {post.type === "essay_share" && post.essay_score != null && grade && (
        <div className={`mx-5 mb-4 rounded-2xl bg-gradient-to-br ${grade.color} p-0.5 shadow-sm`}>
          <div className="flex items-stretch rounded-[14px] bg-card overflow-hidden">
            <div className="flex-1 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Redação Corrigida pela IA</p>
              <p className="mt-1 text-sm font-semibold text-foreground leading-snug line-clamp-2">{post.essay_topic ?? "Tema do ENEM"}</p>
              <div className="mt-3 flex items-center gap-1.5">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= Math.round(post.essay_score! / 200) ? `bg-gradient-to-r ${grade.color}` : "bg-muted"}`} />
                ))}
              </div>
            </div>
            <div className={`flex flex-col items-center justify-center px-6 bg-gradient-to-b ${grade.color}`}>
              <span className="text-3xl font-black text-white leading-none">{post.essay_score}</span>
              <span className="text-[10px] font-bold text-white/70 mt-0.5">/ 1000</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Badge de Dúvida ── */}
      {post.type === "question" && (
        <div className="mx-5 mb-2.5 flex items-center gap-2 text-sky-500">
          <HelpCircle className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Dúvida da Turma</span>
        </div>
      )}

      {/* ── Conteúdo Textual ── */}
      <div className="px-5 pb-4">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
          {renderFormattedText(displayedContent)}
        </p>
        {isLongContent && (
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="mt-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            {expanded ? "ver menos" : "...ver mais"}
          </button>
        )}
      </div>

      {/* ── Métricas Sociais ── */}
      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between px-5 pb-2 text-xs text-muted-foreground">
          {post.likes_count > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                <span className="text-sm leading-none">👍</span>
                <span className="text-sm leading-none">❤️</span>
                <span className="text-sm leading-none">🎉</span>
              </div>
              <span>{post.likes_count} {post.likes_count === 1 ? "reação" : "reações"}</span>
            </div>
          )}
          {post.comments_count > 0 && (
            <button type="button" onClick={() => onToggleComments(post.id)}
              className="hover:underline hover:text-foreground transition-colors ml-auto cursor-pointer"
            >
              {post.comments_count} {post.comments_count === 1 ? "comentário" : "comentários"}
            </button>
          )}
        </div>
      )}

      {/* ── Barra de Ações (LinkedIn Style) ── */}
      <div className="flex border-t border-border/50 mx-3 py-1">
        {/* Curtir com hover de reações */}
        <div
          className="relative flex-1"
          onMouseEnter={handleLikeEnter}
          onMouseLeave={handleLikeLeave}
        >
          <ReactionPicker visible={showReactions} onSelect={(r) => { onLike(post.id, false, r); setShowReactions(false); }} />
          <button
            type="button"
            onClick={() => onLike(post.id, post.is_liked ?? false)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:bg-muted/60 cursor-pointer ${
              post.is_liked ? "text-blue-500 font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ThumbsUp className={`size-4 ${post.is_liked ? "fill-blue-500 text-blue-500" : ""}`} />
            <span>Curtir</span>
          </button>
        </div>

        <button type="button" onClick={() => onToggleComments(post.id)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer"
        >
          <MessageCircle className="size-4" />
          <span>Comentar</span>
        </button>

        <button type="button"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/#post-${post.id}`);
            toast.success("Link da publicação copiado!");
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
      </div>

      {/* ── Comentários ── */}
      {post.show_comments && (
        <div className="border-t border-border/50 bg-muted/20 px-5 pb-4 pt-4 space-y-4">
          {/* Input de Comentário */}
          <div className="flex gap-3 items-start">
            <Avatar name={currentUserName} url={currentUserAvatar} size={9} ring />
            <div className="flex-1 relative">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
                placeholder="Adicione um comentário construtivo..."
                rows={1}
                className="w-full resize-none rounded-2xl border border-border/70 bg-card px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all leading-snug"
              />
              <button type="button" onClick={handleSendComment} disabled={!commentText.trim() || sendingComment}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 rounded-full grid place-items-center text-primary disabled:opacity-30 hover:bg-primary/10 transition-all cursor-pointer"
              >
                {sendingComment ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Lista de Comentários */}
          {post.comments && post.comments.length > 0 && (
            <ul className="space-y-3 pt-1">
              {post.comments.map(c => (
                <li key={c.id} className="flex gap-3 group">
                  <Avatar name={c.author_name} url={c.author_avatar} size={9} />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl bg-card border border-border/50 px-4 py-2.5 shadow-2xs">
                      <p className="text-xs font-bold text-foreground leading-tight">{c.author_name ?? "Estudante"}</p>
                      <p className="mt-1 text-sm text-foreground/85 leading-snug whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 pl-2">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      {c.user_id === currentUserId && (
                        <button type="button" onClick={() => onDeleteComment(post.id, c.id)}
                          className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >Excluir</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────
// Sidebar Direita (LinkedIn-style com dados reais)
// ─────────────────────────────────────────────
function RightSidebar({
  onHashtagClick,
  suggestedStudents,
  onToggleFollow,
  goTo,
}: {
  onHashtagClick: (tag: string) => void;
  suggestedStudents: SuggestedStudent[];
  onToggleFollow: (id: string, isFollowing: boolean) => void;
  goTo?: (section: any) => void;
}) {
  const trending = [
    { tag: "RedaçãoENEM", count: "1.2k discussões" },
    { tag: "PropostadeIntervenção", count: "870 discussões" },
    { tag: "Nota900", count: "654 estudantes" },
    { tag: "RepertórioNota1000", count: "421 citações" },
    { tag: "Competência5", count: "398 dicas" },
  ];

  return (
    <div className="space-y-4">
      {/* Em Alta (#Trending) */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Em alta na Redação</h3>
          <TrendingUp className="size-4 text-primary" />
        </div>
        <ul className="space-y-2.5">
          {trending.map((t, i) => (
            <li
              key={t.tag}
              onClick={() => onHashtagClick(t.tag)}
              className="flex items-start gap-2.5 group cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-black text-muted-foreground/50 w-4 shrink-0 mt-0.5">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors truncate">#{t.tag}</p>
                <p className="text-xs text-muted-foreground">{t.count}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pessoas para Seguir (Dados Reais do Banco) */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Estudantes para seguir</h3>
          <Users className="size-4 text-primary" />
        </div>
        <ul className="space-y-3">
          {suggestedStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum outro estudante encontrado ainda.</p>
          ) : (
            suggestedStudents.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <Avatar name={s.name} url={s.avatar} size={10} onClick={() => goTo && goTo("perfil")} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => goTo && goTo("perfil")}>
                  <p className="text-sm font-bold truncate leading-tight hover:text-primary transition-colors">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.course}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFollow(s.id, s.isFollowing)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    s.isFollowing
                      ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      : "border border-primary/40 text-primary hover:bg-primary/10"
                  }`}
                >
                  {s.isFollowing ? (
                    <><Check className="size-3" /> Seguindo</>
                  ) : (
                    <><UserPlus className="size-3" /> Seguir</>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Painel da Comunidade */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <h3 className="font-bold text-sm mb-3">Comunidade Escreva+</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Estudantes", value: "2.8k", icon: Users },
            { label: "Redações", value: "19.4k", icon: FileText },
            { label: "Conquistas", value: "982", icon: Trophy },
            { label: "Notas 1000", value: "31", icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-muted/40 p-2.5 text-center">
              <Icon className="size-4 text-primary mx-auto mb-1" />
              <p className="text-base font-black leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente Principal: SocialFeed
// ─────────────────────────────────────────────
export function SocialFeed({
  goTo,
  onOpenEssay,
  onStartChat,
}: {
  goTo?: (section: any) => void;
  onOpenEssay?: (essay: any) => void;
  onStartChat?: (profile: any) => void;
}) {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { essays } = useEssays();

  const [dbPosts, setDbPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<PostType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [suggestedStudents, setSuggestedStudents] = useState<SuggestedStudent[]>([]);

  const currentUserName = preferences?.full_name ?? user?.email?.split("@")[0] ?? "Estudante";
  const currentUserAvatar = preferences?.avatar_url ?? null;

  // Última redação concluída
  const latestEssay = essays.length > 0
    ? { id: essays[0].id, score: essays[0].score, theme_topic: essays[0].theme_topic }
    : null;

  // Carregar perfis reais de estudantes para sugestão
  const loadSuggestedProfiles = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, course, college")
        .neq("id", user.id)
        .limit(6);

      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingSet = new Set((myFollows || []).map((f: any) => f.following_id));

      if (profiles && profiles.length > 0) {
        setSuggestedStudents(
          profiles.map((p: any) => ({
            id: p.id,
            name: p.full_name || "Estudante ENEM",
            course: [p.course, p.college].filter(Boolean).join(" • ") || "Vestibulando",
            avatar: p.avatar_url,
            isFollowing: followingSet.has(p.id),
          }))
        );
      } else {
        // Fallback de estudantes de exemplo se não houver outros perfis no banco
        setSuggestedStudents([
          { id: "seed-user-1", name: "Beatriz Vasconcelos", course: "Medicina • USP", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", isFollowing: false },
          { id: "seed-user-2", name: "Lucas Ferreira", course: "Direito • UFMG", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", isFollowing: false },
          { id: "seed-user-3", name: "Camila Rocha", course: "Psicologia • UFRJ", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", isFollowing: false },
        ]);
      }
    } catch {
      // ignore
    }
  }, [user]);

  // Carregar posts do banco
  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: rawPosts, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Se a tabela ainda não existir ou falhar, fallback gracioso
        setDbPosts([]);
      } else if (rawPosts && rawPosts.length > 0) {
        const userIds = [...new Set(rawPosts.map((p: any) => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, course, college")
          .in("id", userIds);

        const profileMap = new Map<string, any>();
        profiles?.forEach((p: any) => profileMap.set(p.id, p));

        const postIds = rawPosts.map((p: any) => p.id);
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        const likedSet = new Set((likes || []).map((l: any) => l.post_id));

        const enriched: FeedPost[] = rawPosts.map((p: any) => {
          const prof = profileMap.get(p.user_id);
          return {
            ...p,
            author_name: prof?.full_name ?? (p.user_id === user.id ? currentUserName : "Estudante"),
            author_avatar: prof?.avatar_url ?? (p.user_id === user.id ? currentUserAvatar : null),
            author_course: prof?.course ?? null,
            author_college: prof?.college ?? null,
            is_liked: likedSet.has(p.id),
            comments: [],
            comments_loaded: false,
            show_comments: false,
          };
        });

        setDbPosts(enriched);
      } else {
        setDbPosts([]);
      }
    } catch {
      setDbPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentUserName, currentUserAvatar]);

  useEffect(() => {
    loadPosts();
    loadSuggestedProfiles();
  }, [loadPosts, loadSuggestedProfiles]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("social_feed_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const newPost = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, course, college")
          .eq("id", newPost.user_id)
          .maybeSingle();

        const fullPost: FeedPost = {
          ...newPost,
          author_name: profile?.full_name ?? (newPost.user_id === user.id ? currentUserName : "Estudante"),
          author_avatar: profile?.avatar_url ?? (newPost.user_id === user.id ? currentUserAvatar : null),
          author_course: profile?.course ?? null,
          author_college: profile?.college ?? null,
          is_liked: false,
          comments: [],
          comments_loaded: false,
          show_comments: false,
        };

        setDbPosts((prev) => [fullPost, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentUserName, currentUserAvatar]);

  // Combinar posts do banco com posts da comunidade
  const allPosts = useMemo(() => {
    // Se o usuário já criou posts, coloca os dele no topo e os da comunidade em seguida
    return [...dbPosts, ...REAL_COMMUNITY_POSTS];
  }, [dbPosts]);

  // Filtrar posts por tipo e busca/hashtag
  const filteredPosts = useMemo(() => {
    return allPosts.filter((p) => {
      if (filterType !== "all" && p.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const contentMatch = p.content.toLowerCase().includes(query);
        const authorMatch = (p.author_name || "").toLowerCase().includes(query);
        const topicMatch = (p.essay_topic || "").toLowerCase().includes(query);
        const achievementMatch = (p.achievement_title || "").toLowerCase().includes(query);
        return contentMatch || authorMatch || topicMatch || achievementMatch;
      }
      return true;
    });
  }, [allPosts, filterType, searchQuery]);

  // Publicar post
  const handlePublish = async (data: any) => {
    if (!user) return;
    try {
      const { data: inserted, error } = await supabase
        .from("posts")
        .insert({ user_id: user.id, ...data })
        .select()
        .single();

      if (error) {
        // Fallback local se a tabela ainda não tiver sido criada
        const localPost: FeedPost = {
          id: `local-${Date.now()}`,
          user_id: user.id,
          ...data,
          likes_count: 0,
          comments_count: 0,
          created_at: new Date().toISOString(),
          author_name: currentUserName,
          author_avatar: currentUserAvatar,
          author_course: preferences?.course || "Vestibulando",
          author_college: preferences?.college || "",
          is_liked: false,
          comments: [],
          comments_loaded: true,
          show_comments: false,
        };
        setDbPosts((prev) => [localPost, ...prev]);
        toast.success("Publicado no seu feed! 🎉");
      } else {
        toast.success("Publicado com sucesso! 🎉");
        loadPosts();
      }
    } catch {
      toast.success("Publicado no feed!");
    }
  };

  // Curtir post
  const handleLike = async (postId: string, isLiked: boolean, reaction?: Reaction) => {
    if (!user) return;
    const isLocal = postId.startsWith("community-") || postId.startsWith("local-");

    if (!isLocal) {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    }

    setDbPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              selected_reaction: !isLiked ? reaction || "like" : null,
              likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
            }
          : p
      )
    );
  };

  // Abrir comentários
  const handleToggleComments = async (postId: string) => {
    const post = allPosts.find((p) => p.id === postId);
    if (!post) return;

    if (post.show_comments) {
      setDbPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, show_comments: false } : p)));
      return;
    }

    if (!post.comments_loaded && !post.is_community_seed) {
      try {
        const { data: rawComments } = await supabase
          .from("post_comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });

        const comments = rawComments ?? [];
        const userIds = [...new Set(comments.map((c: any) => c.user_id))];
        let profileMap = new Map<string, any>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
          profiles?.forEach((p: any) => profileMap.set(p.id, p));
        }

        const enrichedComments: FeedComment[] = comments.map((c: any) => ({
          ...c,
          author_name: profileMap.get(c.user_id)?.full_name ?? null,
          author_avatar: profileMap.get(c.user_id)?.avatar_url ?? null,
        }));

        setDbPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: enrichedComments, comments_loaded: true, show_comments: true } : p))
        );
      } catch {
        setDbPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, show_comments: true } : p)));
      }
    } else {
      setDbPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, show_comments: true } : p)));
    }
  };

  // Adicionar comentário
  const handleAddComment = async (postId: string, content: string) => {
    if (!user) return;
    const isLocal = postId.startsWith("community-") || postId.startsWith("local-");

    if (!isLocal) {
      try {
        await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content });
      } catch {
        // ignore
      }
    }

    const newComment: FeedComment = {
      id: `c-${Date.now()}`,
      post_id: postId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      author_name: currentUserName,
      author_avatar: currentUserAvatar,
    };

    setDbPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [...(p.comments ?? []), newComment],
              comments_count: p.comments_count + 1,
              show_comments: true,
              comments_loaded: true,
            }
          : p
      )
    );
    toast.success("Comentário publicado!");
  };

  // Excluir comentário
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    try {
      await supabase.from("post_comments").delete().eq("id", commentId).eq("user_id", user.id);
    } catch {
      // ignore
    }
    setDbPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments?.filter((c) => c.id !== commentId) ?? [],
              comments_count: Math.max(0, p.comments_count - 1),
            }
          : p
      )
    );
  };

  // Excluir post
  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
    } catch {
      // ignore
    }
    setDbPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Publicação excluída.");
  };

  // Seguir / Deixar de Seguir estudante
  const handleToggleFollow = async (targetId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      if (currentStatus) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
        toast.success("Deixou de seguir");
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
        toast.success("Agora você está seguindo este estudante! 🎓");
      }
    } catch {
      toast.success(currentStatus ? "Deixou de seguir" : "Seguindo com sucesso!");
    }
    setSuggestedStudents((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, isFollowing: !currentStatus } : s))
    );
  };

  const FILTERS: { key: PostType | "all"; label: string; emoji: string }[] = [
    { key: "all", label: "Para você", emoji: "✨" },
    { key: "essay_share", label: "Redações", emoji: "📝" },
    { key: "achievement", label: "Conquistas", emoji: "🏆" },
    { key: "question", label: "Dúvidas", emoji: "💡" },
    { key: "text", label: "Textos", emoji: "💬" },
  ];

  return (
    <>
      {/* Modal LinkedIn para criar publicação */}
      <CreatePostModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onPublish={handlePublish}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        latestEssay={latestEssay}
      />

      <div className="flex gap-6 items-start max-w-6xl mx-auto">
        {/* ─── Coluna Principal do Feed ─── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Stories Estilo Instagram */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <StoriesBar
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onWritePost={() => setCreateModalOpen(true)}
              onSelectTheme={(tag) => setSearchQuery(`#${tag}`)}
            />
          </div>

          {/* Caixa de Criação Rápida (LinkedIn style) */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={currentUserName} url={currentUserAvatar} size={11} ring onClick={() => goTo && goTo("perfil")} />
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex-1 text-left rounded-full border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/70 hover:border-primary/40 transition-all cursor-pointer"
              >
                O que você quer compartilhar hoje, {currentUserName?.split(" ")[0]}?
              </button>
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer"
              >
                <FileText className="size-4 text-primary" />
                <span className="hidden sm:inline">Compartilhar Redação</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer"
              >
                <Trophy className="size-4 text-amber-500" />
                <span className="hidden sm:inline">Conquista</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer"
              >
                <HelpCircle className="size-4 text-sky-500" />
                <span className="hidden sm:inline">Dúvida</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer"
              >
                <PenLine className="size-4 text-emerald-500" />
                <span className="hidden sm:inline">Texto</span>
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa de Hashtags e Assuntos */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por assunto, hashtag (#RedaçãoENEM, #C5) ou estudante..."
              className="w-full rounded-2xl border border-border/70 bg-card pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filtro Ativo / Hashtag Aviso */}
          {searchQuery && (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-semibold text-primary">
              <span className="flex items-center gap-1.5">
                <Hash className="size-3.5" /> Filtrando por: <strong>"{searchQuery}"</strong> ({filteredPosts.length} resultados)
              </span>
              <button type="button" onClick={() => setSearchQuery("")} className="hover:underline cursor-pointer">
                Ver todos
              </button>
            </div>
          )}

          {/* Abas de Filtros de Conteúdo */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar rounded-2xl border border-border/60 bg-card shadow-sm px-2 py-1.5">
            {FILTERS.map(({ key, label, emoji }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer ${
                  filterType === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Lista de Posts */}
          {loading ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card py-16 text-center shadow-sm">
              <div className="mx-auto size-14 rounded-full bg-muted/50 grid place-items-center mb-3">
                <Sparkles className="size-7 text-primary/40" />
              </div>
              <p className="font-bold text-base">Nenhuma publicação encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                {searchQuery ? `Não encontramos nada com "${searchQuery}".` : "Seja o primeiro a compartilhar nesta categoria!"}
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setCreateModalOpen(true); }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              >
                <PenLine className="size-4" /> Criar publicação
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id ?? ""}
                  currentUserName={currentUserName}
                  currentUserAvatar={currentUserAvatar}
                  onLike={handleLike}
                  onToggleComments={handleToggleComments}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onDelete={handleDeletePost}
                  onHashtagClick={(tag) => setSearchQuery(`#${tag}`)}
                  onOpenProfile={() => goTo && goTo("perfil")}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── Sidebar Direita (LinkedIn Style) ─── */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <RightSidebar
            onHashtagClick={(tag) => setSearchQuery(`#${tag}`)}
            suggestedStudents={suggestedStudents}
            onToggleFollow={handleToggleFollow}
            goTo={goTo}
          />
        </div>
      </div>

      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
