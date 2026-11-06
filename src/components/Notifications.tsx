import { useState } from "react";
import { 
  Bell, 
  UserPlus, 
  FileText, 
  MessageCircle, 
  CheckCheck, 
  Sparkles, 
  ArrowRight, 
  Trash2, 
  Check, 
  Clock, 
  Award,
  BellOff,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications, AppNotification, NotificationType } from "@/context/NotificationsContext";

interface NotificationsProps {
  goTo: (section: any) => void;
  onStartChat?: (profile: any) => void;
  onOpenEssay?: (essay: any) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `há ${diffDays} dias`;
    
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function Notifications({ goTo, onStartChat, onOpenEssay }: NotificationsProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification 
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<"all" | NotificationType>("all");

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === "all") return true;
    return notif.type === activeFilter;
  });

  const countByType = {
    all: notifications.length,
    follower: notifications.filter((n) => n.type === "follower").length,
    essay: notifications.filter((n) => n.type === "essay").length,
    message: notifications.filter((n) => n.type === "message").length,
  };

  const handleActionClick = (notif: AppNotification) => {
    markAsRead(notif.id);

    if (notif.type === "follower") {
      goTo("perfil");
    } else if (notif.type === "essay") {
      if (notif.metadata?.fullEssay && onOpenEssay) {
        onOpenEssay({
          title: notif.metadata.themeTopic || `Tema ${notif.metadata.themeDay}`,
          author: "Sua Redação",
          text: [notif.metadata.essayText || ""],
        });
      } else {
        goTo("laboratorio");
      }
    } else if (notif.type === "message") {
      if (notif.actorId && onStartChat) {
        onStartChat({
          id: notif.actorId,
          full_name: notif.actorName || "Estudante",
          avatar_url: notif.avatarUrl || null,
        });
      } else {
        goTo("mensagens");
      }
    } else {
      goTo("dashboard");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Bell className="size-4" />
            Central de Avisos
          </div>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus novos seguidores, correções de redação e interações.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="flex items-center gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/10"
          >
            <CheckCheck className="size-4" />
            Marcar todas como lidas ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
          className="rounded-full gap-2"
        >
          <Filter className="size-3.5" />
          Todas
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {countByType.all}
          </Badge>
        </Button>

        <Button
          variant={activeFilter === "follower" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("follower")}
          className="rounded-full gap-2"
        >
          <UserPlus className="size-3.5" />
          Seguidores
          {countByType.follower > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {countByType.follower}
            </Badge>
          )}
        </Button>

        <Button
          variant={activeFilter === "essay" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("essay")}
          className="rounded-full gap-2"
        >
          <FileText className="size-3.5" />
          Redações
          {countByType.essay > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {countByType.essay}
            </Badge>
          )}
        </Button>

        <Button
          variant={activeFilter === "message" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("message")}
          className="rounded-full gap-2"
        >
          <MessageCircle className="size-3.5" />
          Mensagens
          {countByType.message > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {countByType.message}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
          <div className="grid size-16 place-items-center rounded-full bg-accent text-muted-foreground">
            <BellOff className="size-8 opacity-60" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Nenhuma notificação por aqui</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {activeFilter === "all"
              ? "Quando alguém começar a te seguir ou sua redação for corrigida, aparecerá tudo aqui!"
              : "Não há notificações deste tipo no momento."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.isRead;

            return (
              <div
                key={notif.id}
                className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 ${
                  isUnread
                    ? "border-primary/40 bg-primary/5 shadow-sm hover:border-primary"
                    : "border-border bg-card hover:border-border/80 hover:bg-accent/40"
                }`}
              >
                {/* Left side: Icon + Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Icon / Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    {notif.type === "follower" && (
                      <div className="relative">
                        <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary font-bold overflow-hidden">
                          {notif.avatarUrl ? (
                            <img src={notif.avatarUrl} alt={notif.actorName || "Seguidor"} className="h-full w-full object-cover" />
                          ) : (
                            notif.actorName?.[0]?.toUpperCase() || "S"
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] ring-2 ring-background">
                          <UserPlus className="size-3" />
                        </span>
                      </div>
                    )}

                    {notif.type === "essay" && (
                      <div className="grid size-11 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Award className="size-5" />
                      </div>
                    )}

                    {notif.type === "message" && (
                      <div className="relative">
                        <div className="grid size-11 place-items-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold overflow-hidden">
                          {notif.avatarUrl ? (
                            <img src={notif.avatarUrl} alt={notif.actorName || "Chat"} className="h-full w-full object-cover" />
                          ) : (
                            notif.actorName?.[0]?.toUpperCase() || "M"
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-purple-600 text-white text-[10px] ring-2 ring-background">
                          <MessageCircle className="size-3" />
                        </span>
                      </div>
                    )}

                    {notif.type === "milestone" && (
                      <div className="grid size-11 place-items-center rounded-full bg-amber-500/10 text-amber-600">
                        <Sparkles className="size-5" />
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground">
                        {notif.title}
                      </h2>
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground">
                          Nova
                        </span>
                      )}
                      {notif.metadata?.essayScore !== undefined && (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          Nota {notif.metadata.essayScore}
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground leading-snug break-words">
                      {notif.description}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/80">
                      <Clock className="size-3" />
                      <span>{formatRelativeTime(notif.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleActionClick(notif)}
                    className="rounded-lg gap-1.5 font-semibold text-xs"
                  >
                    {notif.type === "follower" && "Ver Perfil"}
                    {notif.type === "essay" && "Ver Feedback"}
                    {notif.type === "message" && "Responder"}
                    {notif.type === "milestone" && "Explorar"}
                    <ArrowRight className="size-3.5" />
                  </Button>

                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(notif.id)}
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Marcar como lida"
                    >
                      <Check className="size-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => clearNotification(notif.id)}
                    className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remover notificação"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

