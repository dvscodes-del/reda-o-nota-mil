import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, MessageCircle, Share2, Trophy, Flame, Star, FileText,
  HelpCircle, Send, MoreHorizontal, Trash2, X, ChevronDown,
  Loader2, Sparkles, BookOpen, PenLine, Target, Zap, Image,
  Laugh, ThumbsUp, Lightbulb, UserPlus, TrendingUp, Hash,
  Globe, Lock, Users, ChevronRight, Bookmark, Bell, Award,
  Medal, Eye, Repeat2,
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
  comments?: FeedComment[];
  comments_loaded?: boolean;
  show_comments?: boolean;
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
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
}

function getScoreGrade(score: number) {
  if (score >= 900) return { label: "Nota Excelente", color: "from-amber-500 to-yellow-400", text: "text-amber-900" };
  if (score >= 800) return { label: "Nota Ótima", color: "from-emerald-500 to-green-400", text: "text-emerald-900" };
  if (score >= 700) return { label: "Nota Boa", color: "from-blue-500 to-sky-400", text: "text-blue-900" };
  return { label: "Em desenvolvimento", color: "from-slate-400 to-slate-300", text: "text-slate-800" };
}

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────
function Avatar({ name, url, size = 10, ring = false }: { name?: string | null; url?: string | null; size?: number; ring?: boolean }) {
  const initials = (name ?? "?")[0].toUpperCase();
  const cls = `size-${size} shrink-0 rounded-full overflow-hidden grid place-items-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm select-none ${ring ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`;
  return (
    <div className={cls}>
      {url ? <img src={url} alt={name ?? ""} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton loader (Instagram-style)
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
// Stories bar (like Instagram)
// ─────────────────────────────────────────────
function StoriesBar({ currentUserName, currentUserAvatar, onWritePost }: {
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onWritePost: () => void;
}) {
  const themes = [
    { label: "Redação do dia", emoji: "📝", color: "from-primary to-purple-600" },
    { label: "Nota acima de 800", emoji: "🏆", color: "from-amber-400 to-orange-500" },
    { label: "Dica de Repertório", emoji: "📚", color: "from-emerald-400 to-teal-600" },
    { label: "Superação", emoji: "🔥", color: "from-red-400 to-pink-600" },
    { label: "Dúvida C3", emoji: "💡", color: "from-sky-400 to-blue-600" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
      {/* Seu story */}
      <button
        type="button"
        onClick={onWritePost}
        className="flex shrink-0 flex-col items-center gap-2 group"
        title="Criar publicação"
      >
        <div className="relative size-16">
          <div className="size-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/40 group-hover:border-primary transition-colors grid place-items-center overflow-hidden">
            {currentUserAvatar
              ? <img src={currentUserAvatar} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
              : <span className="text-xl font-bold text-primary">{(currentUserName ?? "?")[0].toUpperCase()}</span>
            }
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-foreground grid place-items-center border-2 border-background">
            <span className="text-[10px] font-black leading-none">+</span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors max-w-[64px] text-center truncate">
          Publicar
        </span>
      </button>

      {/* Stories temáticos */}
      {themes.map((t) => (
        <button key={t.label} type="button" className="flex shrink-0 flex-col items-center gap-2 group" title={t.label}>
          <div className={`size-16 rounded-full bg-gradient-to-br ${t.color} p-0.5 shadow-sm group-hover:shadow-md transition-shadow`}>
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
// Caixa de criação de post (LinkedIn-style)
// ─────────────────────────────────────────────
function CreatePostBox({ onPublish, currentUserName, currentUserAvatar, latestEssay }: {
  onPublish: (data: any) => Promise<void>;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  latestEssay: { id: string; score: number; theme_topic: string } | null;
}) {
  const [open, setOpen] = useState(false);
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
    setContent(""); setAchievementTitle(""); setPostType("text"); setOpen(false);
    setPublishing(false);
  };

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  if (!open) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={currentUserName} url={currentUserAvatar} size={11} ring />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 text-left rounded-full border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/70 hover:border-primary/40 transition-all"
          >
            O que você quer compartilhar, {currentUserName?.split(" ")[0] ?? "estudante"}?
          </button>
        </div>
        <div className="flex items-center gap-1">
          {POST_TYPES.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => { setPostType(type); setOpen(true); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
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
          <button type="button" onClick={() => setOpen(false)} className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
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
            Escreva uma redação no Laboratório para poder compartilhar sua nota!
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
              postType === "text" ? "O que você quer compartilhar com a turma?"
              : postType === "essay_share" ? "Como foi essa redação? O que você aprendeu?"
              : postType === "achievement" ? "Conta como foi! Como você chegou até essa conquista?"
              : "Qual a sua dúvida? Seja específico para ajudar a turma a te responder!"
            }
            className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <span className={`text-xs ${content.length > 580 ? "text-destructive" : "text-muted-foreground"}`}>{content.length}/600</span>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!content.trim() || content.length > 600 || publishing}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
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
// Painel de reações (hover)
// ─────────────────────────────────────────────
function ReactionPicker({ onSelect, visible }: { onSelect: (r: Reaction) => void; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-1.5 shadow-xl z-20 animate-in fade-in-0 zoom-in-95 duration-100">
      {REACTIONS.map((r) => (
        <button key={r.key} type="button" onClick={() => onSelect(r.key)} title={r.label}
          className="text-xl transition-transform hover:scale-150 active:scale-110 duration-150 leading-none py-0.5 px-1 rounded-full hover:bg-muted/60"
        >{r.emoji}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Card de Post
// ─────────────────────────────────────────────
function PostCard({ post, currentUserId, currentUserName, currentUserAvatar, onLike, onToggleComments, onAddComment, onDeleteComment, onDelete }: {
  post: FeedPost;
  currentUserId: string;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onLike: (postId: string, isLiked: boolean) => Promise<void>;
  onToggleComments: (postId: string) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const likeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isLongContent = post.content.length > 220;
  const displayedContent = isLongContent && !expanded ? post.content.slice(0, 220) + "…" : post.content;

  const handleLikeEnter = () => {
    likeTimerRef.current = setTimeout(() => setShowReactions(true), 400);
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

  return (
    <article className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar name={post.author_name} url={post.author_avatar} size={11} ring />
            {/* Indicador de tipo */}
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
            <p className="font-bold text-sm leading-tight text-foreground truncate">{post.author_name ?? "Estudante"}</p>
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
          {post.user_id !== currentUserId && (
            <button type="button" className="flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-colors">
              <UserPlus className="size-3" /> Seguir
            </button>
          )}
          <div className="relative">
            <button type="button" onClick={() => setShowMenu(v => !v)}
              className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-border/60 bg-card shadow-xl py-1 overflow-hidden">
                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                  <Bookmark className="size-3.5" /> Salvar post
                </button>
                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                  <Bell className="size-3.5" /> Silenciar
                </button>
                {post.user_id === currentUserId && (
                  <>
                    <div className="my-1 h-px bg-border/60 mx-2" />
                    <button type="button" onClick={() => { setShowMenu(false); onDelete(post.id); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" /> Excluir
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

      {/* ── Card de redação ── */}
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

      {/* ── Dúvida ── */}
      {post.type === "question" && (
        <div className="mx-5 mb-3 flex items-center gap-2 text-sky-500">
          <HelpCircle className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Dúvida da Turma</span>
        </div>
      )}

      {/* ── Conteúdo textual ── */}
      <div ref={contentRef} className="px-5 pb-4">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
          {displayedContent}
        </p>
        {isLongContent && (
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="mt-1 text-sm font-semibold text-primary hover:underline"
          >
            {expanded ? "ver menos" : "ver mais"}
          </button>
        )}
      </div>

      {/* ── Métricas ── */}
      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between px-5 pb-2 text-xs text-muted-foreground">
          {post.likes_count > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-0.5">
                {["👍","❤️","🎉"].slice(0, 3).map((e, i) => (
                  <span key={i} className="text-sm leading-none">{e}</span>
                ))}
              </div>
              <span>{post.likes_count} {post.likes_count === 1 ? "reação" : "reações"}</span>
            </div>
          )}
          {post.comments_count > 0 && (
            <button type="button" onClick={() => onToggleComments(post.id)}
              className="hover:underline hover:text-foreground transition-colors"
            >
              {post.comments_count} {post.comments_count === 1 ? "comentário" : "comentários"}
            </button>
          )}
        </div>
      )}

      {/* ── Ações ── */}
      <div className="flex border-t border-border/50 mx-3">
        {/* Curtir com hover de reações */}
        <div
          className="relative flex-1"
          onMouseEnter={handleLikeEnter}
          onMouseLeave={handleLikeLeave}
        >
          <ReactionPicker visible={showReactions} onSelect={(r) => { onLike(post.id, false); setShowReactions(false); }} />
          <button
            type="button"
            onClick={() => onLike(post.id, post.is_liked ?? false)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:bg-muted/60 ${
              post.is_liked ? "text-blue-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ThumbsUp className={`size-4 ${post.is_liked ? "fill-blue-500 text-blue-500" : ""}`} />
            <span>Curtir</span>
          </button>
        </div>

        <button type="button" onClick={() => onToggleComments(post.id)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        >
          <MessageCircle className="size-4" />
          <span>Comentar</span>
        </button>

        <button type="button"
          onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copiado!"); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        >
          <Repeat2 className="size-4" />
          <span>Repostar</span>
        </button>

        <button type="button"
          onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copiado!"); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>

      {/* ── Área de Comentários ── */}
      {post.show_comments && (
        <div className="border-t border-border/50 px-5 pb-4 pt-4 space-y-4">
          {/* Input de comentário */}
          <div className="flex gap-3 items-start">
            <Avatar name={currentUserName} url={currentUserAvatar} size={9} ring />
            <div className="flex-1 relative">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
                placeholder="Adicione um comentário..."
                rows={1}
                className="w-full resize-none rounded-2xl border border-border/70 bg-muted/40 px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all leading-snug"
              />
              <button type="button" onClick={handleSendComment} disabled={!commentText.trim() || sendingComment}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 rounded-full grid place-items-center text-primary disabled:opacity-30 hover:bg-primary/10 transition-all"
              >
                {sendingComment ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Lista de comentários */}
          {post.comments && post.comments.length > 0 && (
            <ul className="space-y-3">
              {post.comments.map(c => (
                <li key={c.id} className="flex gap-3 group">
                  <Avatar name={c.author_name} url={c.author_avatar} size={9} />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl bg-muted/50 px-4 py-2.5">
                      <p className="text-xs font-bold text-foreground leading-tight">{c.author_name ?? "Estudante"}</p>
                      <p className="mt-1 text-sm text-foreground/85 leading-snug whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 pl-2">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      <button type="button" className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">Curtir</button>
                      <button type="button" className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">Responder</button>
                      {c.user_id === currentUserId && (
                        <button type="button" onClick={() => onDeleteComment(post.id, c.id)}
                          className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
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
// Sidebar direita (LinkedIn-style)
// ─────────────────────────────────────────────
function RightSidebar() {
  const trending = [
    { tag: "RedaçãoENEM", count: "1.2k estudantes" },
    { tag: "Proposta de Intervenção", count: "870 estudantes" },
    { tag: "Coesão e Coerência", count: "654 estudantes" },
    { tag: "Nota 1000", count: "421 estudantes" },
    { tag: "Competência 3", count: "398 estudantes" },
  ];

  const suggestions = [
    { name: "Mariana Souza", course: "Medicina • USP", avatar: null },
    { name: "Pedro Alves", course: "Direito • FGV", avatar: null },
    { name: "Ana Lima", course: "Engenharia • Unicamp", avatar: null },
  ];

  return (
    <div className="space-y-4">
      {/* Trending */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Em alta agora</h3>
          <TrendingUp className="size-4 text-primary" />
        </div>
        <ul className="space-y-3">
          {trending.map((t, i) => (
            <li key={t.tag} className="flex items-start gap-2 group cursor-pointer">
              <span className="text-xs font-black text-muted-foreground/50 w-5 shrink-0 mt-0.5">{i + 1}</span>
              <div>
                <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">#{t.tag}</p>
                <p className="text-xs text-muted-foreground">{t.count}</p>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
          Ver mais <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Quem seguir */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <h3 className="font-bold text-sm mb-3">Pessoas para seguir</h3>
        <ul className="space-y-3">
          {suggestions.map(s => (
            <li key={s.name} className="flex items-center gap-3">
              <Avatar name={s.name} url={s.avatar} size={10} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-tight">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.course}</p>
              </div>
              <button type="button" className="shrink-0 rounded-full border border-primary/40 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1">
                <UserPlus className="size-3" /> Seguir
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
          Ver mais <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <h3 className="font-bold text-sm mb-3">Comunidade Escreva+</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Estudantes", value: "2.4k", icon: Users },
            { label: "Redações", value: "18k", icon: FileText },
            { label: "Conquistas", value: "843", icon: Trophy },
            { label: "Notas 1000", value: "27", icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
              <Icon className="size-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-black leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal: SocialFeed
// ─────────────────────────────────────────────
export function SocialFeed() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { essays } = useEssays();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<PostType | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const PAGE_SIZE = 10;

  const currentUserName = preferences?.full_name ?? user?.email?.split("@")[0] ?? "Estudante";
  const currentUserAvatar = preferences?.avatar_url ?? null;
  const latestEssay = essays.length > 0 ? { id: essays[0].id, score: essays[0].score, theme_topic: essays[0].theme_topic } : null;

  const enrichWithProfiles = useCallback(async (rawPosts: any[]): Promise<FeedPost[]> => {
    if (!rawPosts.length) return [];
    const userIds = [...new Set(rawPosts.map((p: any) => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, course, college").in("id", userIds);
    const profileMap = new Map<string, any>();
    profiles?.forEach((p: any) => profileMap.set(p.id, p));

    let likedSet = new Set<string>();
    if (user) {
      const postIds = rawPosts.map((p: any) => p.id);
      const { data: likes } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      likes?.forEach((l: any) => likedSet.add(l.post_id));
    }

    return rawPosts.map((p: any) => {
      const prof = profileMap.get(p.user_id);
      return { ...p, author_name: prof?.full_name ?? null, author_avatar: prof?.avatar_url ?? null, author_course: prof?.course ?? null, author_college: prof?.college ?? null, is_liked: likedSet.has(p.id), comments: [], comments_loaded: false, show_comments: false };
    });
  }, [user]);

  const loadPosts = useCallback(async (reset = true) => {
    if (!user) return;
    if (reset) setLoading(true); else setLoadingMore(true);

    const from = reset ? 0 : posts.length;
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (filterType !== "all") query = query.eq("type", filterType);

    const { data, error } = await query;
    if (error) { toast.error("Erro ao carregar o feed."); setLoading(false); setLoadingMore(false); return; }

    const enriched = await enrichWithProfiles(data ?? []);
    if (reset) setPosts(enriched); else setPosts(prev => [...prev, ...enriched]);
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    setLoading(false); setLoadingMore(false);
  }, [user, filterType, posts.length, enrichWithProfiles]);

  useEffect(() => { loadPosts(true); }, [user, filterType]); // eslint-disable-line

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("feed_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const enriched = await enrichWithProfiles([payload.new]);
        setPosts(prev => [enriched[0], ...prev]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, enrichWithProfiles]);

  const handlePublish = async (data: any) => {
    if (!user) return;
    const { error } = await supabase.from("posts").insert({ user_id: user.id, ...data });
    if (error) toast.error("Não foi possível publicar."); else toast.success("Publicado! 🎉");
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    if (isLiked) await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    else await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 } : p));
  };

  const handleToggleComments = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.show_comments) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, show_comments: false } : p));
      return;
    }

    if (!post.comments_loaded) {
      const { data: rawComments } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      const comments = rawComments ?? [];
      const userIds = [...new Set(comments.map((c: any) => c.user_id))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
        profiles?.forEach((p: any) => profileMap.set(p.id, p));
      }
      const enrichedComments: FeedComment[] = comments.map((c: any) => ({ ...c, author_name: profileMap.get(c.user_id)?.full_name ?? null, author_avatar: profileMap.get(c.user_id)?.avatar_url ?? null }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: enrichedComments, comments_loaded: true, show_comments: true } : p));
    } else {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, show_comments: true } : p));
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    if (!user) return;
    const { data, error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content }).select().single();
    if (error) { toast.error("Erro ao comentar."); return; }
    const newComment: FeedComment = { ...data, author_name: currentUserName, author_avatar: currentUserAvatar };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments ?? []), newComment], comments_count: p.comments_count + 1, show_comments: true, comments_loaded: true } : p));
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    await supabase.from("post_comments").delete().eq("id", commentId).eq("user_id", user.id);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments?.filter(c => c.id !== commentId) ?? [], comments_count: Math.max(0, p.comments_count - 1) } : p));
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast.success("Post excluído.");
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
      {/* Modal de criação de post */}
      {createOpen && (
        <CreatePostBox
          onPublish={async (data) => { await handlePublish(data); setCreateOpen(false); }}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          latestEssay={latestEssay}
        />
      )}

      <div className="flex gap-6 items-start">
        {/* ─── Coluna central ─── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Stories */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <StoriesBar
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onWritePost={() => setCreateOpen(true)}
            />
          </div>

          {/* Caixa de criação compacta */}
          <CreatePostBox
            onPublish={handlePublish}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            latestEssay={latestEssay}
          />

          {/* Filtros estilo abas */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar rounded-2xl border border-border/60 bg-card shadow-sm px-2 py-1.5">
            {FILTERS.map(({ key, label, emoji }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
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

          {/* Feed */}
          {loading ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card py-20 text-center shadow-sm">
              <div className="mx-auto size-16 rounded-full bg-muted/50 grid place-items-center mb-4">
                <Sparkles className="size-8 text-primary/40" />
              </div>
              <p className="font-bold text-lg">Nenhuma publicação ainda</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                Seja o primeiro a compartilhar algo com a turma. Suas conquistas inspiram outros estudantes!
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <PenLine className="size-4" /> Fazer primeira publicação
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
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
                />
              ))}
              {hasMore && (
                <div className="flex justify-center py-2">
                  <button type="button" onClick={() => loadPosts(false)} disabled={loadingMore}
                    className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:shadow-sm transition-all disabled:opacity-40"
                  >
                    {loadingMore ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
                    {loadingMore ? "Carregando..." : "Ver mais publicações"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Sidebar direita ─── */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <RightSidebar />
        </div>
      </div>

      {/* CSS helper: esconder scrollbar sem remover funcionalidade */}
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
