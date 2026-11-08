import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Heart, MessageCircle, Share2, Trophy, Flame, Star, FileText,
  HelpCircle, Send, MoreHorizontal, Trash2, X, ChevronDown,
  Loader2, Sparkles, BookOpen, PenLine, Target, Zap, Search,
  Laugh, ThumbsUp, Lightbulb, UserPlus, TrendingUp, Hash,
  Globe, Lock, Users, ChevronRight, Bookmark, Bell, Award,
  Medal, Eye, Repeat2, Check, RotateCw, GraduationCap, MapPin,
  Image as ImageIcon, Video, Paperclip, Play, ExternalLink, Maximize2, Link as LinkIcon,
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
  video_url?: string | null;
  media_type?: "image" | "video" | "document" | null;
  document_url?: string | null;
  document_title?: string | null;
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
  college?: string | null;
  state?: string | null;
  avatar: string | null;
  isFollowing: boolean;
  followsYou: boolean;
  mutualFollows: {
    name: string;
    avatar: string | null;
  }[];
  connectionReason: string;
  affinityScore: number;
  badge?: {
    label: string;
    type: "follows_you" | "mutual" | "top_essay" | "course" | "college" | "state";
  };
  highestEssayScore?: number;
}

// ─────────────────────────────────────────────
// Stack de Mini Avatares (Amigos em Comum Estilo Instagram)
// ─────────────────────────────────────────────
function MutualAvatarStack({ mutuals }: { mutuals: { name: string; avatar: string | null }[] }) {
  if (!mutuals || mutuals.length === 0) return null;
  const shown = mutuals.slice(0, 2);
  return (
    <div className="flex -space-x-1 shrink-0 items-center mr-0.5">
      {shown.map((m, idx) => (
        <div
          key={idx}
          className="size-3.5 rounded-full overflow-hidden border border-background bg-primary/20 text-[7px] font-bold text-primary grid place-items-center ring-1 ring-border shrink-0"
          title={m.name}
        >
          {m.avatar ? (
            <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
          ) : (
            (m.name[0] || "?").toUpperCase()
          )}
        </div>
      ))}
    </div>
  );
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

function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  } catch {
    return null;
  }
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
// Stories Bar (Categorias de Publicação)
// ─────────────────────────────────────────────
function StoriesBar({ currentUserName, currentUserAvatar, onWritePost, onSelectTheme }: {
  currentUserName: string | null;
  currentUserAvatar: string | null;
  onWritePost: () => void;
  onSelectTheme: (tag: string) => void;
}) {
  const themes = [
    { label: "Redações", emoji: "📝", color: "from-primary to-purple-600", tag: "Redação" },
    { label: "Conquistas", emoji: "🏆", color: "from-amber-400 to-orange-500", tag: "Conquista" },
    { label: "Repertório", emoji: "📚", color: "from-emerald-400 to-teal-600", tag: "Repertório" },
    { label: "Dúvidas", emoji: "💡", color: "from-sky-400 to-blue-600", tag: "Dúvida" },
    { label: "Dicas C5", emoji: "🎯", color: "from-red-400 to-pink-600", tag: "C5" },
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

      {/* Categorias rápidas */}
      {themes.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onSelectTheme(t.tag)}
          className="flex shrink-0 flex-col items-center gap-2 group cursor-pointer"
          title={`Filtrar por #${t.tag}`}
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
// Modal de Criação de Post Estilo LinkedIn
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
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [activeMedia, setActiveMedia] = useState<"none" | "image" | "video" | "document">("none");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementIcon, setAchievementIcon] = useState("🏆");
  const [publishing, setPublishing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ICONS = ["🏆", "🔥", "⭐", "🎯", "⚡", "📚", "🏅", "✨", "💪", "🎓"];

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (JPEG, PNG ou WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImageUrl(canvas.toDataURL("image/jpeg", 0.85));
          setActiveMedia("image");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!content.trim() && !imageUrl && !videoUrl && !documentTitle) {
      toast.error("Escreva algo ou anexe uma foto/vídeo antes de publicar!");
      return;
    }
    if (postType === "achievement" && !achievementTitle.trim()) {
      toast.error("Escreva o nome da conquista!");
      return;
    }

    setPublishing(true);
    await onPublish({
      type: postType,
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      media_type: activeMedia !== "none" ? activeMedia : (imageUrl ? "image" : videoUrl ? "video" : null),
      document_title: documentTitle.trim() || null,
      document_url: documentUrl.trim() || null,
      ...(postType === "essay_share" && latestEssay ? { essay_id: latestEssay.id, essay_score: latestEssay.score, essay_topic: latestEssay.theme_topic } : {}),
      ...(postType === "achievement" ? { achievement_title: achievementTitle.trim(), achievement_icon: achievementIcon } : {}),
    });

    setContent("");
    setImageUrl("");
    setVideoUrl("");
    setDocumentTitle("");
    setDocumentUrl("");
    setActiveMedia("none");
    setAchievementTitle("");
    setPostType("text");
    onClose();
    setPublishing(false);
  };

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  if (!open) return null;

  const ytEmbed = getYouTubeEmbedUrl(videoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-in fade-in-0 duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={currentUserName} url={currentUserAvatar} size={10} ring />
            <div>
              <p className="font-bold text-sm leading-tight">{currentUserName ?? "Estudante"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Globe className="size-2.5" /> Público no Feed
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {/* Preview redação real */}
          {postType === "essay_share" && latestEssay && (() => {
            const grade = getScoreGrade(latestEssay.score);
            return (
              <div className={`rounded-xl bg-gradient-to-r ${grade.color} p-0.5 shadow-sm`}>
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

          {/* Conquista */}
          {postType === "achievement" && (
            <div className="space-y-2.5 p-3 rounded-xl border border-amber-500/25 bg-amber-500/5">
              <input
                type="text"
                value={achievementTitle}
                onChange={(e) => setAchievementTitle(e.target.value)}
                placeholder="Nome da conquista (ex: Bati minha meta de 900+ pontos!)"
                className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map((icon) => (
                  <button key={icon} type="button" onClick={() => setAchievementIcon(icon)}
                    className={`text-xl rounded-lg border p-1.5 transition-all cursor-pointer ${achievementIcon === icon ? "border-primary bg-primary/10 scale-110 shadow-xs" : "border-border/40 hover:border-primary/30"}`}
                  >{icon}</button>
                ))}
              </div>
            </div>
          )}

          {/* Área de Texto Principal */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder={
              postType === "text" ? "No que você está pensando? Compartilhe dicas, ideias ou fotos..."
              : postType === "essay_share" ? "Conte como foi escrever essa redação! Quais repertórios você usou?"
              : postType === "achievement" ? "Descreva sua conquista! Como foi sua evolução de estudos?"
              : "Qual a sua dúvida sobre redação? Descreva a competência ou parágrafo!"
            }
            className="w-full resize-none bg-transparent text-sm md:text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
          />

          {/* Anexo de Imagem Ativo */}
          {activeMedia === "image" && (
            <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="size-4 text-blue-500" /> Foto anexada
                </span>
                <button
                  type="button"
                  onClick={() => { setImageUrl(""); setActiveMedia("none"); }}
                  className="text-muted-foreground hover:text-destructive text-xs flex items-center gap-1"
                >
                  <X className="size-3.5" /> Remover
                </button>
              </div>

              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border/60 max-h-56">
                  <img src={imageUrl} alt="Prévia" className="w-full h-full object-cover max-h-56" />
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Cole o link da imagem (ou envie do seu dispositivo)..."
                    className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      📁 Escolher foto do seu computador
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anexo de Vídeo Ativo (YouTube / Shorts / Vimeo / MP4) */}
          {activeMedia === "video" && (
            <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Video className="size-4 text-emerald-500" /> Vídeo anexado
                </span>
                <button
                  type="button"
                  onClick={() => { setVideoUrl(""); setActiveMedia("none"); }}
                  className="text-muted-foreground hover:text-destructive text-xs flex items-center gap-1"
                >
                  <X className="size-3.5" /> Remover
                </button>
              </div>

              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Cole o link do YouTube, Shorts, Vimeo ou link MP4..."
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {ytEmbed && (
                <div className="rounded-xl overflow-hidden aspect-video border border-border/60 bg-black">
                  <iframe src={ytEmbed} title="Prévia do vídeo" className="w-full h-full border-0" />
                </div>
              )}
            </div>
          )}

          {/* Anexo de Documento / PDF Ativo */}
          {activeMedia === "document" && (
            <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-amber-500" /> Material / PDF de Estudo
                </span>
                <button
                  type="button"
                  onClick={() => { setDocumentTitle(""); setDocumentUrl(""); setActiveMedia("none"); }}
                  className="text-muted-foreground hover:text-destructive text-xs flex items-center gap-1"
                >
                  <X className="size-3.5" /> Remover
                </button>
              </div>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Título do material (ex: 50 Repertórios Coringas - Filosofia.pdf)"
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="Link do material (Google Drive, Notion, PDF online)..."
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFile}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />
        </div>

        {/* Rodapé Estilo LinkedIn: Barra de Ferramentas + Botão Publicar */}
        <div className="px-5 py-3 border-t border-border/60 bg-muted/10 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            {/* Ícones de Mídia estilo LinkedIn */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (activeMedia === "image") {
                    setActiveMedia("none");
                  } else {
                    setActiveMedia("image");
                    if (!imageUrl) fileInputRef.current?.click();
                  }
                }}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                  activeMedia === "image" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                title="Adicionar Foto"
              >
                <ImageIcon className="size-4 text-blue-500" />
                <span className="hidden sm:inline">Foto</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMedia(activeMedia === "video" ? "none" : "video")}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                  activeMedia === "video" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                title="Adicionar Vídeo ou YouTube"
              >
                <Video className="size-4 text-emerald-500" />
                <span className="hidden sm:inline">Vídeo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMedia(activeMedia === "document" ? "none" : "document")}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                  activeMedia === "document" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                title="Adicionar Material / PDF"
              >
                <FileText className="size-4 text-amber-500" />
                <span className="hidden sm:inline">Material</span>
              </button>

              {latestEssay && (
                <button
                  type="button"
                  onClick={() => setPostType(postType === "essay_share" ? "text" : "essay_share")}
                  className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                    postType === "essay_share" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                  title="Compartilhar Redação Corrigida"
                >
                  <FileText className="size-4 text-primary" />
                  <span className="hidden sm:inline">Redação</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPostType(postType === "achievement" ? "text" : "achievement")}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                  postType === "achievement" ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                title="Conquista"
              >
                <Trophy className="size-4 text-amber-500" />
                <span className="hidden sm:inline">Conquista</span>
              </button>
            </div>

            {/* Contador + Publicar */}
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${content.length > 580 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                {content.length}/600
              </span>
              <button
                type="button"
                onClick={handlePublish}
                disabled={(!content.trim() && !imageUrl && !videoUrl && !documentTitle) || content.length > 600 || publishing}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
                Publicar
              </button>
            </div>
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
  onViewImage,
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
  onViewImage?: (url: string) => void;
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
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Redação Corrigida</p>
              <p className="mt-1 text-sm font-semibold text-foreground leading-snug line-clamp-2">{post.essay_topic ?? "Tema da Redação"}</p>
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

      {/* ── Mídia Anexada (Estilo LinkedIn: Fotos, Vídeos, Documentos) ── */}
      {post.image_url && (
        <div
          className="mx-5 mb-4 rounded-2xl overflow-hidden border border-border/60 bg-muted/20 relative group cursor-pointer max-h-[460px]"
          onClick={() => onViewImage ? onViewImage(post.image_url!) : window.open(post.image_url!, "_blank")}
        >
          <img
            src={post.image_url}
            alt="Imagem da publicação"
            className="w-full h-full object-cover max-h-[460px] group-hover:scale-[1.01] transition-transform duration-300"
          />
          <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            <Maximize2 className="size-3" /> Ampliar foto
          </div>
        </div>
      )}

      {post.video_url && (() => {
        const embed = getYouTubeEmbedUrl(post.video_url);
        if (embed) {
          return (
            <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-border/60 bg-black aspect-video shadow-xs">
              <iframe
                src={embed}
                title="Vídeo da publicação"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-border/60 bg-black shadow-xs">
            <video
              src={post.video_url}
              controls
              className="w-full max-h-[460px] object-contain bg-black"
              preload="metadata"
            />
          </div>
        );
      })()}

      {post.document_title && (
        <div className="mx-5 mb-4 rounded-2xl border border-border/70 bg-muted/20 p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">{post.document_title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Material de Estudo • Documento</p>
            </div>
          </div>
          {post.document_url && (
            <a
              href={post.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-colors"
            >
              <span>Acessar</span>
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {/* ── Métricas Sociais Reais ── */}
      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between px-5 pb-2 text-xs text-muted-foreground">
          {post.likes_count > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-none">👍</span>
              <span>{post.likes_count} {post.likes_count === 1 ? "curtida" : "curtidas"}</span>
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

      {/* ── Barra de Ações ── */}
      <div className="flex border-t border-border/50 mx-3 py-1">
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
// Carrossel de Sugestões no Feed (Estilo Instagram)
// ─────────────────────────────────────────────
function FeedSuggestionsCarousel({
  students,
  onToggleFollow,
  onDismiss,
  goTo,
  onOpenProfile,
}: {
  students: SuggestedStudent[];
  onToggleFollow: (id: string, currentStatus: boolean) => void;
  onDismiss: (id: string) => void;
  goTo?: (section: any) => void;
  onOpenProfile?: (profile: any) => void;
}) {
  const visible = students.filter((s) => !s.isFollowing);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xs shadow-xs p-4 my-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm leading-none">Sugestões de colegas para você</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Estudantes com metas e conexões em comum</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
        {visible.map((student) => (
          <div
            key={student.id}
            className="w-48 shrink-0 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all p-3 flex flex-col items-center text-center relative group"
          >
            <button
              type="button"
              onClick={() => onDismiss(student.id)}
              className="absolute top-2 right-2 text-muted-foreground/50 hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors cursor-pointer"
              title="Dispensar sugestão"
            >
              <X className="size-3.5" />
            </button>

            <div
              className="relative my-1 cursor-pointer"
              onClick={() => onOpenProfile ? onOpenProfile(student) : (goTo && goTo("perfil"))}
            >
              <Avatar
                name={student.name}
                url={student.avatar}
                size={14}
                ring={student.followsYou || (student.highestEssayScore ?? 0) >= 900}
              />
              {student.highestEssayScore && student.highestEssayScore >= 900 && (
                <div
                  className="absolute -bottom-1 -right-1 size-5 rounded-full bg-amber-500 text-white grid place-items-center shadow-xs"
                  title={`Nota ${student.highestEssayScore} no Laboratório`}
                >
                  <Trophy className="size-3" />
                </div>
              )}
            </div>

            <p
              className="mt-1.5 text-sm font-bold text-foreground truncate w-full hover:text-primary transition-colors cursor-pointer"
              onClick={() => onOpenProfile ? onOpenProfile(student) : (goTo && goTo("perfil"))}
            >
              {student.name}
            </p>

            <p className="text-[11px] text-muted-foreground truncate w-full mb-1">
              {student.course}
            </p>

            <div className="h-9 flex items-center justify-center w-full px-1 mb-2">
              {student.followsYou ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <UserPlus className="size-3" /> Segue você
                </span>
              ) : student.mutualFollows.length > 0 ? (
                <div className="flex items-center gap-1 text-[11px] text-primary font-medium leading-tight text-center truncate">
                  <MutualAvatarStack mutuals={student.mutualFollows} />
                  <span className="truncate">{student.connectionReason}</span>
                </div>
              ) : student.badge ? (
                <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                  {student.connectionReason}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Estudante no Escreva+</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onToggleFollow(student.id, student.isFollowing)}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                student.followsYou
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              <UserPlus className="size-3.5" />
              {student.followsYou ? "Seguir de volta" : "Seguir"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sidebar Direita: Tendências + Sugestões Instagram
// ─────────────────────────────────────────────
function RightSidebar({
  trendingTags,
  onHashtagClick,
  suggestedStudents,
  onToggleFollow,
  onRefreshSuggestions,
  refreshing,
  goTo,
  onOpenProfile,
}: {
  trendingTags: string[];
  onHashtagClick: (tag: string) => void;
  suggestedStudents: SuggestedStudent[];
  onToggleFollow: (id: string, currentStatus: boolean) => void;
  onRefreshSuggestions?: () => void;
  refreshing?: boolean;
  goTo?: (section: any) => void;
  onOpenProfile?: (profile: any) => void;
}) {
  return (
    <div className="space-y-4 sticky top-20">
      {/* Assuntos em Alta */}
      {trendingTags.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-bold text-sm">Assuntos em alta</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trendingTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onHashtagClick(tag)}
                className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
              >
                <Hash className="size-3" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões para Você (Grafo Social & IA de Afinidade) */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <h3 className="font-bold text-sm">Sugestões para você</h3>
          </div>
          {onRefreshSuggestions && (
            <button
              type="button"
              onClick={onRefreshSuggestions}
              disabled={refreshing}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
              title="Atualizar sugestões"
            >
              <RotateCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            </button>
          )}
        </div>

        <ul className="space-y-3.5">
          {suggestedStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center">
              <Users className="size-5 text-muted-foreground mx-auto mb-1.5 opacity-60" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nenhum outro estudante cadastrado ainda. Convide colegas para trocar experiências!
              </p>
            </div>
          ) : (
            suggestedStudents.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <div
                  className="relative cursor-pointer shrink-0"
                  onClick={() => onOpenProfile ? onOpenProfile(s) : (goTo && goTo("perfil"))}
                >
                  <Avatar
                    name={s.name}
                    url={s.avatar}
                    size={10}
                    ring={s.followsYou || (s.highestEssayScore ?? 0) >= 900}
                  />
                  {s.highestEssayScore && s.highestEssayScore >= 900 && (
                    <div
                      className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-amber-500 text-white grid place-items-center shadow-xs"
                      title={`Nota ${s.highestEssayScore} no Laboratório`}
                    >
                      <Trophy className="size-2" />
                    </div>
                  )}
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onOpenProfile ? onOpenProfile(s) : (goTo && goTo("perfil"))}
                >
                  <p className="text-sm font-bold truncate leading-tight hover:text-primary transition-colors">
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{s.course}</p>
                  {s.followsYou ? (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-primary font-semibold truncate">
                      <UserPlus className="size-3 shrink-0" />
                      <span>Segue você</span>
                    </div>
                  ) : s.connectionReason ? (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                      {s.mutualFollows && s.mutualFollows.length > 0 ? (
                        <div className="flex items-center gap-1 text-primary font-medium truncate">
                          <MutualAvatarStack mutuals={s.mutualFollows} />
                          <span className="truncate">{s.connectionReason}</span>
                        </div>
                      ) : (
                        <span className="truncate text-muted-foreground/80">{s.connectionReason}</span>
                      )}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFollow(s.id, s.isFollowing)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    s.isFollowing
                      ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive group"
                      : s.followsYou
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                      : "border border-primary/40 text-primary hover:bg-primary/10"
                  }`}
                >
                  {s.isFollowing ? (
                    <>
                      <Check className="size-3 group-hover:hidden" />
                      <X className="size-3 hidden group-hover:inline" />
                      <span className="group-hover:hidden">Seguindo</span>
                      <span className="hidden group-hover:inline">Deixar</span>
                    </>
                  ) : s.followsYou ? (
                    <><UserPlus className="size-3" /> Seguir de volta</>
                  ) : (
                    <><UserPlus className="size-3" /> Seguir</>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
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
  onOpenProfile,
}: {
  goTo?: (section: any) => void;
  onOpenEssay?: (essay: any) => void;
  onStartChat?: (profile: any) => void;
  onOpenProfile?: (profile: any) => void;
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
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());
  const [viewingImageModal, setViewingImageModal] = useState<string | null>(null);

  const currentUserName = preferences?.full_name ?? user?.email?.split("@")[0] ?? "Estudante";
  const currentUserAvatar = preferences?.avatar_url ?? null;

  // Última redação concluída real
  const latestEssay = essays.length > 0
    ? { id: essays[0].id, score: essays[0].score, theme_topic: essays[0].theme_topic }
    : null;

  // Carregar perfis com IA de Afinidade Multidimensional (estilo Instagram & LinkedIn)
  const loadSuggestedProfiles = useCallback(async (isManual = false) => {
    if (!user) return;
    if (isManual) setRefreshingSuggestions(true);
    try {
      // 1. Quem o usuário atual segue
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const myFollowingIds = (myFollows || []).map((f: any) => f.following_id);
      const followingSet = new Set(myFollowingIds);

      // 2. Quem segue o usuário atual ("Segue você" / Conexão recíproca prioritária)
      const { data: myFollowers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      const myFollowersIds = (myFollowers || []).map((f: any) => f.follower_id);
      const followersSet = new Set(myFollowersIds);

      // 3. Buscar nomes e avatares das pessoas que você segue (amigos em comum)
      const followingProfilesMap = new Map<string, { name: string; avatar: string | null }>();
      if (myFollowingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", myFollowingIds);

        followingProfiles?.forEach((p: any) => {
          followingProfilesMap.set(p.id, {
            name: p.full_name?.split(" ")[0] || "Estudante",
            avatar: p.avatar_url,
          });
        });
      }

      // 4. Detecção de 2º Grau: quem as pessoas que você segue estão seguindo!
      const mutualsMap = new Map<string, Array<{ name: string; avatar: string | null }>>();
      if (myFollowingIds.length > 0) {
        const { data: networkFollows } = await supabase
          .from("follows")
          .select("follower_id, following_id")
          .in("follower_id", myFollowingIds)
          .neq("following_id", user.id);

        (networkFollows || []).forEach((rel: any) => {
          const friendInfo = followingProfilesMap.get(rel.follower_id);
          if (friendInfo) {
            const list = mutualsMap.get(rel.following_id) || [];
            if (!list.some((m) => m.name === friendInfo.name)) {
              list.push(friendInfo);
            }
            mutualsMap.set(rel.following_id, list);
          }
        });
      }

      // 5. Notas reais de redações do laboratório para destacar quem tem 800+ ou 900+
      const topScoreMap = new Map<string, number>();
      try {
        const { data: topEssays } = await supabase
          .from("essays")
          .select("user_id, score")
          .gte("score", 800)
          .order("score", { ascending: false })
          .limit(40);

        (topEssays || []).forEach((e: any) => {
          if (!topScoreMap.has(e.user_id) || (e.score && e.score > (topScoreMap.get(e.user_id) || 0))) {
            topScoreMap.set(e.user_id, e.score);
          }
        });
      } catch {
        // ignore
      }

      // 6. Atividade recente na comunidade
      const recentPostersSet = new Set<string>();
      try {
        const { data: recentPosts } = await supabase
          .from("posts")
          .select("user_id")
          .order("created_at", { ascending: false })
          .limit(30);

        (recentPosts || []).forEach((p: any) => recentPostersSet.add(p.user_id));
      } catch {
        // ignore
      }

      // 7. Buscar estudantes reais
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, course, college, state, target_score")
        .neq("id", user.id)
        .limit(40);

      if (profiles && profiles.length > 0) {
        const userCourse = preferences?.course?.trim().toLowerCase();
        const userCollege = preferences?.college?.trim().toLowerCase();
        const userState = preferences?.state?.trim().toLowerCase();

        const candidateList: SuggestedStudent[] = profiles.map((p: any) => {
          const isFollowing = followingSet.has(p.id);
          const followsYou = followersSet.has(p.id);
          const mutuals = mutualsMap.get(p.id) || [];
          const highestScore = topScoreMap.get(p.id);
          const isRecentPoster = recentPostersSet.has(p.id);

          let affinityScore = 0;
          let connectionReason = "Estudante no Escreva+";
          let badge: SuggestedStudent["badge"] = undefined;

          // Sinal 1: Segue você ("Follows you" - prioridade máxima estilo Instagram)
          if (followsYou) {
            affinityScore += 140;
            connectionReason = "Segue você";
            badge = { label: "Segue você", type: "follows_you" };
          }

          // Sinal 2: Grafo Social de 2º Grau (Amigos em comum)
          if (mutuals.length > 0) {
            affinityScore += 60 + mutuals.length * 35;
            if (mutuals.length === 1) {
              connectionReason = `Seguido por ${mutuals[0].name}`;
            } else if (mutuals.length === 2) {
              connectionReason = `Seguido por ${mutuals[0].name} e ${mutuals[1].name}`;
            } else {
              connectionReason = `Seguido por ${mutuals[0].name} e mais ${mutuals.length - 1}`;
            }
            if (!badge || badge.type !== "follows_you") {
              badge = { label: `${mutuals.length} em comum`, type: "mutual" };
            }
          }

          // Sinal 3: Similaridade Acadêmica (Curso / Universidade / Estado)
          const pCourse = p.course?.toLowerCase();
          const pCollege = p.college?.toLowerCase();
          const pState = p.state?.toLowerCase();

          if (userCourse && pCourse && (pCourse.includes(userCourse) || userCourse.includes(pCourse))) {
            affinityScore += 45;
            if (!badge) {
              connectionReason = `Mesmo foco: ${p.course}`;
              badge = { label: p.course, type: "course" };
            }
          } else if (userCollege && pCollege && (pCollege.includes(userCollege) || userCollege.includes(pCollege))) {
            affinityScore += 35;
            if (!badge) {
              connectionReason = `Mesma meta: ${p.college}`;
              badge = { label: p.college, type: "college" };
            }
          } else if (userState && pState && pState === userState) {
            affinityScore += 20;
            if (!badge) {
              connectionReason = `Estudante de ${p.state.toUpperCase()}`;
              badge = { label: p.state.toUpperCase(), type: "state" };
            }
          }

          // Sinal 4: Destaque de Nota Real no Laboratório
          if (highestScore && highestScore >= 900) {
            affinityScore += 30;
            if (!badge || badge.type === "state") {
              badge = { label: `Nota ${highestScore}`, type: "top_essay" };
              if (!followsYou && mutuals.length === 0) {
                connectionReason = `Destaque: Nota ${highestScore} no laboratório`;
              }
            }
          } else if (highestScore && highestScore >= 800) {
            affinityScore += 15;
          }

          // Sinal 5: Membro ativo na comunidade
          if (isRecentPoster) {
            affinityScore += 15;
          }

          // Penalidade para quem já é seguido (priorizar novos perfis)
          if (isFollowing) {
            affinityScore -= 1000;
          }

          return {
            id: p.id,
            name: p.full_name || "Estudante",
            course: [p.course, p.college].filter(Boolean).join(" • ") || "Vestibulando",
            college: p.college,
            state: p.state,
            avatar: p.avatar_url,
            isFollowing,
            followsYou,
            mutualFollows: mutuals,
            connectionReason,
            affinityScore,
            badge,
            highestEssayScore: highestScore,
          };
        });

        // Ordenar por afinidade decrescente
        candidateList.sort((a, b) => b.affinityScore - a.affinityScore);

        setSuggestedStudents(candidateList.slice(0, 10));
      } else {
        setSuggestedStudents([]);
      }
    } catch {
      setSuggestedStudents([]);
    } finally {
      if (isManual) setRefreshingSuggestions(false);
    }
  }, [user, preferences]);

  // Carregar posts reais do Supabase
  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: rawPosts, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
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

  // Realtime
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

  // Extrair hashtags reais a partir das postagens existentes
  const trendingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    dbPosts.forEach((post) => {
      const matches = post.content.match(/#(\w+)/g);
      if (matches) {
        matches.forEach((m) => tagsSet.add(m.slice(1)));
      }
    });
    if (tagsSet.size === 0) {
      return ["Redação", "Conquistas", "Repertório", "ENEM", "Dúvidas"];
    }
    return Array.from(tagsSet).slice(0, 6);
  }, [dbPosts]);

  // Filtrar posts
  const filteredPosts = useMemo(() => {
    return dbPosts.filter((p) => {
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
  }, [dbPosts, filterType, searchQuery]);

  // Publicar post no Supabase
  const handlePublish = async (data: any) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("posts")
        .insert({ user_id: user.id, ...data });

      if (error) {
        toast.error("Não foi possível publicar no banco de dados.");
      } else {
        toast.success("Publicado com sucesso no feed! 🎉");
        loadPosts();
      }
    } catch {
      toast.error("Erro ao conectar com o banco de dados.");
    }
  };

  // Curtir post
  const handleLike = async (postId: string, isLiked: boolean, reaction?: Reaction) => {
    if (!user) return;

    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
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
    const post = dbPosts.find((p) => p.id === postId);
    if (!post) return;

    if (post.show_comments) {
      setDbPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, show_comments: false } : p)));
      return;
    }

    if (!post.comments_loaded) {
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
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: user.id, content })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao enviar comentário.");
        return;
      }

      const newComment: FeedComment = {
        id: data.id,
        post_id: postId,
        user_id: user.id,
        content,
        created_at: data.created_at,
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
    } catch {
      toast.error("Não foi possível comentar.");
    }
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
        toast.success("Seguindo estudante!");
      }
    } catch {
      toast.success(currentStatus ? "Deixou de seguir" : "Seguindo estudante!");
    }
    setSuggestedStudents((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, isFollowing: !currentStatus } : s))
    );
  };

  const FILTERS: { key: PostType | "all"; label: string; emoji: string }[] = [
    { key: "all", label: "Tudo", emoji: "✨" },
    { key: "essay_share", label: "Redações", emoji: "📝" },
    { key: "achievement", label: "Conquistas", emoji: "🏆" },
    { key: "question", label: "Dúvidas", emoji: "💡" },
    { key: "text", label: "Textos", emoji: "💬" },
  ];

  return (
    <>
      {/* Modal para criar publicação */}
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
          {/* Stories / Categorias */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <StoriesBar
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onWritePost={() => setCreateModalOpen(true)}
              onSelectTheme={(tag) => setSearchQuery(`#${tag}`)}
            />
          </div>

          {/* Caixa de Criação Rápida */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={currentUserName} url={currentUserAvatar} size={11} ring onClick={() => goTo && goTo("perfil")} />
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex-1 text-left rounded-full border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/70 hover:border-primary/40 transition-all cursor-pointer"
              >
                O que você quer compartilhar, {currentUserName?.split(" ")[0]}?
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

          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por assunto ou estudante..."
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

          {/* Filtro Ativo */}
          {searchQuery && (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-semibold text-primary">
              <span className="flex items-center gap-1.5">
                <Hash className="size-3.5" /> Filtrando por: <strong>"{searchQuery}"</strong> ({filteredPosts.length} resultados)
              </span>
              <button type="button" onClick={() => setSearchQuery("")} className="hover:underline cursor-pointer">
                Limpar filtro
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

          {/* Lista de Posts 100% Reais */}
          {loading ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-border/60 bg-card py-12 px-4 text-center shadow-sm">
                <div className="mx-auto size-14 rounded-full bg-muted/50 grid place-items-center mb-3">
                  <PenLine className="size-6 text-primary/50" />
                </div>
                <p className="font-bold text-base text-foreground">Nenhuma publicação ainda</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                  {searchQuery
                    ? `Nenhuma publicação encontrada para "${searchQuery}".`
                    : "Seja o primeiro a compartilhar uma redação, conquista ou pensamento com a turma!"}
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setCreateModalOpen(true); }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                >
                  <PenLine className="size-4" /> Criar primeira publicação
                </button>
              </div>

              {/* Sugestões de Estudantes quando o Feed está vazio */}
              {suggestedStudents.filter((s) => !s.isFollowing && !dismissedSuggestionIds.has(s.id)).length > 0 && (
                <FeedSuggestionsCarousel
                  students={suggestedStudents.filter((s) => !dismissedSuggestionIds.has(s.id))}
                  onToggleFollow={handleToggleFollow}
                  onDismiss={(id) => setDismissedSuggestionIds((prev) => new Set([...prev, id]))}
                  goTo={goTo}
                  onOpenProfile={onOpenProfile}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post, index) => (
                <div key={post.id} className="space-y-4">
                  <PostCard
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
                    onOpenProfile={() =>
                      onOpenProfile
                        ? onOpenProfile({
                            id: post.user_id,
                            name: post.author_name,
                            avatar: post.author_avatar,
                            course: post.author_course,
                            college: post.author_college,
                          })
                        : goTo && goTo("perfil")
                    }
                    onViewImage={(url) => setViewingImageModal(url)}
                  />

                  {/* Sugestões no Feed estilo Instagram (inserido organicamente após o 2º post) */}
                  {index === 1 && suggestedStudents.filter((s) => !s.isFollowing && !dismissedSuggestionIds.has(s.id)).length > 0 && (
                    <FeedSuggestionsCarousel
                      students={suggestedStudents.filter((s) => !dismissedSuggestionIds.has(s.id))}
                      onToggleFollow={handleToggleFollow}
                      onDismiss={(id) => setDismissedSuggestionIds((prev) => new Set([...prev, id]))}
                      goTo={goTo}
                      onOpenProfile={onOpenProfile}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Sidebar Direita (Sem dados falsos) ─── */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <RightSidebar
            trendingTags={trendingTags}
            onHashtagClick={(tag) => setSearchQuery(`#${tag}`)}
            suggestedStudents={suggestedStudents}
            onToggleFollow={handleToggleFollow}
            onRefreshSuggestions={() => loadSuggestedProfiles(true)}
            refreshing={refreshingSuggestions}
            goTo={goTo}
            onOpenProfile={onOpenProfile}
          />
        </div>
      </div>

      {/* Lightbox / Modal de Imagem Ampliada */}
      {viewingImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => setViewingImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingImageModal(null)}
              className="absolute top-3 right-3 size-9 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black transition-colors z-10 cursor-pointer"
              title="Fechar"
            >
              <X className="size-5" />
            </button>
            <img
              src={viewingImageModal}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
