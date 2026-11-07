import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Trophy,
  Flame,
  Star,
  FileText,
  HelpCircle,
  Send,
  MoreHorizontal,
  Trash2,
  X,
  ChevronDown,
  Loader2,
  Sparkles,
  BookOpen,
  PenLine,
  Medal,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { useEssays } from "@/context/EssaysContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
export type PostType = "text" | "essay_share" | "achievement" | "question";

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
  // Enriquecido no front
  author_name?: string | null;
  author_avatar?: string | null;
  is_liked?: boolean;
  comments?: FeedComment[];
  comments_loaded?: boolean;
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

// ----------------------------------------------------------------
// Componente Avatar miniatura
// ----------------------------------------------------------------
function MiniAvatar({ name, url, size = "sm" }: { name?: string | null; url?: string | null; size?: "sm" | "md" | "lg" }) {
  const szCls = size === "lg" ? "size-11" : size === "md" ? "size-9" : "size-8";
  const textCls = size === "lg" ? "text-sm" : "text-xs";
  return (
    <div className={`${szCls} shrink-0 rounded-full bg-primary/15 ring-2 ring-primary/20 overflow-hidden grid place-items-center font-bold text-primary ${textCls}`}>
      {url ? (
        <img src={url} alt={name ?? "user"} className="w-full h-full object-cover" />
      ) : (
        (name?.[0] ?? "?").toUpperCase()
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Chip de tipo do post
// ----------------------------------------------------------------
const POST_TYPE_META: Record<PostType, { label: string; Icon: React.ElementType; color: string }> = {
  text: { label: "Texto", Icon: PenLine, color: "text-muted-foreground" },
  essay_share: { label: "Redação", Icon: FileText, color: "text-primary" },
  achievement: { label: "Conquista", Icon: Trophy, color: "text-amber-500" },
  question: { label: "Dúvida", Icon: HelpCircle, color: "text-sky-500" },
};

// ----------------------------------------------------------------
// Badge de conquista
// ----------------------------------------------------------------
const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  "🏆": Trophy,
  "🔥": Flame,
  "⭐": Star,
  "🎯": Target,
  "⚡": Zap,
  "📚": BookOpen,
  "🏅": Medal,
  "✨": Sparkles,
};

function getScoreColor(score: number) {
  if (score >= 900) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
  if (score >= 800) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  if (score >= 700) return "text-primary bg-primary/10 border-primary/30";
  return "text-muted-foreground bg-muted border-border";
}

// ----------------------------------------------------------------
// Caixa de comentários
// ----------------------------------------------------------------
function CommentsSection({
  post,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onAddComment,
  onDeleteComment,
}: {
  post: FeedPost;
  currentUserId: string;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await onAddComment(post.id, text.trim());
    setText("");
    setSending(false);
  };

  return (
    <div className="border-t border-border/60 px-4 pb-3 pt-3 space-y-3">
      {/* Lista de comentários */}
      {post.comments && post.comments.length > 0 && (
        <ul className="space-y-2.5">
          {post.comments.map((c) => (
            <li key={c.id} className="flex gap-2.5 group">
              <MiniAvatar name={c.author_name} url={c.author_avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-xs font-bold leading-tight text-foreground/90">{c.author_name ?? "Estudante"}</p>
                  <p className="mt-0.5 text-sm text-foreground/80 leading-snug whitespace-pre-wrap break-words">{c.content}</p>
                </div>
                <div className="mt-0.5 flex items-center gap-3 pl-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                  {c.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(post.id, c.id)}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Input de novo comentário */}
      <div className="flex gap-2.5 items-start">
        <MiniAvatar name={currentUserName} url={currentUserAvatar} size="sm" />
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
            placeholder="Escreva um comentário... (Enter para enviar)"
            rows={1}
            className="w-full resize-none rounded-xl border border-border/70 bg-muted/40 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all leading-snug"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-30 transition-all"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Card de Post Individual
// ----------------------------------------------------------------
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
}: {
  post: FeedPost;
  currentUserId: string;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onLike: (postId: string, isLiked: boolean) => Promise<void>;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const typeMeta = POST_TYPE_META[post.type];

  const handleLike = () => onLike(post.id, post.is_liked ?? false);

  return (
    <article className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <MiniAvatar name={post.author_name} url={post.author_avatar} size="md" />
          <div>
            <p className="text-sm font-bold leading-tight text-foreground">{post.author_name ?? "Estudante"}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <typeMeta.Icon className={`size-3 ${typeMeta.color}`} />
              <span className={typeMeta.color}>{typeMeta.label}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {post.user_id === currentUserId && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setShowMenu((v) => !v)}
            >
              <MoreHorizontal className="size-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-10 w-40 rounded-xl border border-border bg-card shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDelete(post.id); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  Excluir post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conquista em destaque */}
      {post.type === "achievement" && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <span className="text-2xl">{post.achievement_icon ?? "🏆"}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Nova Conquista</p>
            <p className="font-bold text-foreground">{post.achievement_title}</p>
          </div>
        </div>
      )}

      {/* Card de redação compartilhada */}
      {post.type === "essay_share" && post.essay_score != null && (
        <div className={`mx-4 mb-3 flex items-center justify-between rounded-xl border px-4 py-3 ${getScoreColor(post.essay_score)}`}>
          <div className="flex items-center gap-2">
            <FileText className="size-4" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Redação Corrigida</p>
              <p className="text-sm font-semibold leading-tight line-clamp-1">{post.essay_topic ?? "Tema do ENEM"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black leading-none">{post.essay_score}</p>
            <p className="text-[10px] font-bold opacity-60">/ 1000</p>
          </div>
        </div>
      )}

      {/* Conteúdo textual */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">{post.content}</p>
      </div>

      {/* Imagem opcional */}
      {post.image_url && (
        <div className="mb-3 mx-4 overflow-hidden rounded-xl">
          <img src={post.image_url} alt="Imagem do post" className="w-full object-cover max-h-80" />
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-1 border-t border-border/50 px-3 py-1.5">
        <button
          type="button"
          onClick={handleLike}
          className={`group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            post.is_liked
              ? "text-red-500 bg-red-500/10 hover:bg-red-500/15"
              : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
          }`}
        >
          <Heart className={`size-4 transition-transform group-active:scale-125 ${post.is_liked ? "fill-current" : ""}`} />
          <span>{post.likes_count > 0 ? post.likes_count : ""}</span>
          <span className="hidden sm:inline">{post.is_liked ? "Curtido" : "Curtir"}</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleComments(post.id)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
        >
          <MessageCircle className="size-4" />
          <span>{post.comments_count > 0 ? post.comments_count : ""}</span>
          <span className="hidden sm:inline">Comentar</span>
        </button>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copiado!");
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 transition-all"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
      </div>

      {/* Seção de comentários */}
      {post.comments_loaded && (
        <CommentsSection
          post={post}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </article>
  );
}

// ----------------------------------------------------------------
// Caixa de Criação de Post
// ----------------------------------------------------------------
function CreatePostBox({
  onPublish,
  currentUserName,
  currentUserAvatar,
  latestEssay,
}: {
  onPublish: (data: {
    type: PostType;
    content: string;
    essay_id?: string;
    essay_score?: number;
    essay_topic?: string;
    achievement_title?: string;
    achievement_icon?: string;
  }) => Promise<void>;
  currentUserName: string | null;
  currentUserAvatar: string | null;
  latestEssay: { id: string; score: number; theme_topic: string } | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [postType, setPostType] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementIcon, setAchievementIcon] = useState("🏆");
  const [publishing, setPublishing] = useState(false);

  const ICONS = ["🏆", "🔥", "⭐", "🎯", "⚡", "📚", "🏅", "✨"];

  const POST_TYPES: { type: PostType; label: string; Icon: React.ElementType; desc: string }[] = [
    { type: "text", label: "Pensamento", Icon: PenLine, desc: "Compartilhe algo com a comunidade" },
    { type: "essay_share", label: "Redação", Icon: FileText, desc: "Divulgue sua nota e conquistas" },
    { type: "achievement", label: "Conquista", Icon: Trophy, desc: "Celebre uma vitória sua" },
    { type: "question", label: "Dúvida", Icon: HelpCircle, desc: "Tire dúvidas com a comunidade" },
  ];

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error("Escreva algo antes de publicar!");
      return;
    }
    if (postType === "achievement" && !achievementTitle.trim()) {
      toast.error("Preencha o nome da conquista!");
      return;
    }
    setPublishing(true);
    await onPublish({
      type: postType,
      content: content.trim(),
      ...(postType === "essay_share" && latestEssay
        ? { essay_id: latestEssay.id, essay_score: latestEssay.score, essay_topic: latestEssay.theme_topic }
        : {}),
      ...(postType === "achievement"
        ? { achievement_title: achievementTitle.trim(), achievement_icon: achievementIcon }
        : {}),
    });
    setContent("");
    setAchievementTitle("");
    setAchievementIcon("🏆");
    setPostType("text");
    setIsExpanded(false);
    setPublishing(false);
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
      >
        <MiniAvatar name={currentUserName} url={currentUserAvatar} size="md" />
        <span className="flex-1 text-left text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          Compartilhe algo com a turma... 🎓
        </span>
        <span className="hidden sm:flex items-center gap-2">
          <span className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
            Publicar
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card shadow-md ring-1 ring-primary/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MiniAvatar name={currentUserName} url={currentUserAvatar} size="md" />
          <div>
            <p className="text-sm font-bold">{currentUserName ?? "Estudante"}</p>
            <p className="text-xs text-muted-foreground">Nova publicação</p>
          </div>
        </div>
        <button type="button" onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>

      {/* Seletor de tipo de post */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de publicação</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {POST_TYPES.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setPostType(type)}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all ${
                postType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview de redação */}
      {postType === "essay_share" && latestEssay && (
        <div className={`mx-4 mb-2 flex items-center justify-between rounded-xl border px-3 py-2.5 ${getScoreColor(latestEssay.score)}`}>
          <div className="flex items-center gap-2">
            <FileText className="size-4" />
            <div>
              <p className="text-xs font-bold uppercase opacity-70">Sua última redação</p>
              <p className="text-xs line-clamp-1">{latestEssay.theme_topic}</p>
            </div>
          </div>
          <span className="text-xl font-black">{latestEssay.score}<span className="text-xs font-normal opacity-60">/1000</span></span>
        </div>
      )}

      {postType === "essay_share" && !latestEssay && (
        <div className="mx-4 mb-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          Escreva uma redação no Laboratório para poder compartilhar!
        </div>
      )}

      {/* Conquista */}
      {postType === "achievement" && (
        <div className="mx-4 mb-2 space-y-2">
          <input
            type="text"
            value={achievementTitle}
            onChange={(e) => setAchievementTitle(e.target.value)}
            placeholder="Título da conquista (ex: Primeira nota acima de 900!)"
            className="w-full rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setAchievementIcon(icon)}
                className={`text-xl rounded-lg border p-1.5 transition-all ${
                  achievementIcon === icon
                    ? "border-primary bg-primary/10 scale-110"
                    : "border-border/50 hover:border-primary/30 hover:scale-105"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Textarea principal */}
      <div className="px-4 pb-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            postType === "text" ? "O que você está pensando sobre sua jornada ENEM?"
            : postType === "essay_share" ? "Conta como foi escrever essa redação! Compartilhe sua experiência..."
            : postType === "achievement" ? "Descreva sua conquista! Como você chegou até aqui?"
            : "Qual a sua dúvida? A comunidade vai te ajudar!"
          }
          rows={4}
          className="w-full resize-none rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all leading-relaxed"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${content.length > 500 ? "text-destructive" : "text-muted-foreground"}`}>
            {content.length}/600
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(false)} className="rounded-xl h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!content.trim() || content.length > 600 || publishing}
              className="rounded-xl h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {publishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5 mr-1.5" />}
              Publicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Componente principal: SocialFeed
// ----------------------------------------------------------------
export function SocialFeed() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { essays } = useEssays();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<PostType | "all">("all");
  const PAGE_SIZE = 10;

  const currentUserName = preferences?.full_name ?? user?.email?.split("@")[0] ?? "Estudante";
  const currentUserAvatar = preferences?.avatar_url ?? null;

  // A última redação do usuário para sugerir compartilhamento
  const latestEssay = essays.length > 0
    ? { id: essays[0].id, score: essays[0].score, theme_topic: essays[0].theme_topic }
    : null;

  // Buscar profiles em batch
  const enrichWithProfiles = useCallback(async (rawPosts: any[]): Promise<FeedPost[]> => {
    if (!rawPosts.length) return [];
    const userIds = [...new Set(rawPosts.map((p: any) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    profiles?.forEach((p: any) => profileMap.set(p.id, p));

    // Buscar curtidas do usuário atual para esses posts
    let likedSet = new Set<string>();
    if (user) {
      const postIds = rawPosts.map((p: any) => p.id);
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      likes?.forEach((l: any) => likedSet.add(l.post_id));
    }

    return rawPosts.map((p: any) => {
      const profile = profileMap.get(p.user_id);
      return {
        ...p,
        author_name: profile?.full_name ?? null,
        author_avatar: profile?.avatar_url ?? null,
        is_liked: likedSet.has(p.id),
        comments: [],
        comments_loaded: false,
      };
    });
  }, [user]);

  // Carregar posts
  const loadPosts = useCallback(async (reset = true) => {
    if (!user) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const from = reset ? 0 : posts.length;
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filterType !== "all") {
      query = query.eq("type", filterType);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar o feed. Tente novamente.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const enriched = await enrichWithProfiles(data ?? []);
    if (reset) {
      setPosts(enriched);
    } else {
      setPosts((prev) => [...prev, ...enriched]);
    }
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [user, filterType, posts.length, enrichWithProfiles]);

  useEffect(() => {
    loadPosts(true);
  }, [user, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: novos posts
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("feed_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const enriched = await enrichWithProfiles([payload.new]);
        setPosts((prev) => [enriched[0], ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, enrichWithProfiles]);

  // Publicar um novo post
  const handlePublish = async (data: {
    type: PostType;
    content: string;
    essay_id?: string;
    essay_score?: number;
    essay_topic?: string;
    achievement_title?: string;
    achievement_icon?: string;
  }) => {
    if (!user) return;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      ...data,
    });
    if (error) {
      toast.error("Não foi possível publicar. Tente novamente.");
    } else {
      toast.success("Publicado com sucesso! 🎉");
    }
  };

  // Curtir / descurtir
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
  };

  // Abrir/fechar comentários
  const handleToggleComments = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.comments_loaded) {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_loaded: false } : p));
      return;
    }

    const { data: rawComments, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar comentários.");
      return;
    }

    const comments = rawComments ?? [];
    const userIds = [...new Set(comments.map((c: any) => c.user_id))];
    let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      profiles?.forEach((p: any) => profileMap.set(p.id, p));
    }

    const enrichedComments: FeedComment[] = comments.map((c: any) => {
      const prof = profileMap.get(c.user_id);
      return { ...c, author_name: prof?.full_name ?? null, author_avatar: prof?.avatar_url ?? null };
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: enrichedComments, comments_loaded: true } : p
      )
    );
  };

  // Adicionar comentário
  const handleAddComment = async (postId: string, content: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, content })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao comentar. Tente novamente.");
      return;
    }

    const newComment: FeedComment = {
      ...data,
      author_name: currentUserName,
      author_avatar: currentUserAvatar,
    };

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...(p.comments ?? []), newComment], comments_count: p.comments_count + 1, comments_loaded: true }
          : p
      )
    );
  };

  // Deletar comentário
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    await supabase.from("post_comments").delete().eq("id", commentId).eq("user_id", user.id);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments?.filter((c) => c.id !== commentId) ?? [], comments_count: Math.max(0, p.comments_count - 1) }
          : p
      )
    );
  };

  // Deletar post
  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Post excluído.");
  };

  const FILTERS: { key: PostType | "all"; label: string; Icon: React.ElementType }[] = [
    { key: "all", label: "Tudo", Icon: Sparkles },
    { key: "essay_share", label: "Redações", Icon: FileText },
    { key: "achievement", label: "Conquistas", Icon: Trophy },
    { key: "question", label: "Dúvidas", Icon: HelpCircle },
    { key: "text", label: "Textos", Icon: PenLine },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Feed da Turma</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compartilhe conquistas, redações e dúvidas com a comunidade de estudantes.</p>
      </div>

      {/* Caixa de criação */}
      <CreatePostBox
        onPublish={handlePublish}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        latestEssay={latestEssay}
      />

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterType(key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              filterType === key
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando o feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 py-16 text-center">
          <Sparkles className="mx-auto size-10 text-primary/30 mb-3" />
          <p className="font-bold text-foreground">Nenhuma publicação ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filterType === "all"
              ? "Seja o primeiro a compartilhar algo com a turma!"
              : `Nenhum post do tipo "${FILTERS.find(f => f.key === filterType)?.label}" ainda.`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
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
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => loadPosts(false)}
                disabled={loadingMore}
                className="rounded-xl px-6 font-semibold"
              >
                {loadingMore ? (
                  <><Loader2 className="size-4 animate-spin mr-2" /> Carregando...</>
                ) : (
                  <><ChevronDown className="size-4 mr-2" /> Carregar mais</>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
