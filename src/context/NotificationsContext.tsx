import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useEssays } from './EssaysContext';
import { toast } from 'sonner';

export type NotificationType = 'follower' | 'essay' | 'message' | 'milestone';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string; // ISO format
  isRead: boolean;
  avatarUrl?: string | null | undefined;
  actorName?: string | null | undefined;
  actorId?: string | null | undefined;
  metadata?: {
    essayScore?: number | undefined;
    themeDay?: number | undefined;
    themeTopic?: string | undefined;
    essayText?: string | undefined;
    messageContent?: string | undefined;
    senderId?: string | undefined;
    fullEssay?: any | undefined;
  } | undefined;
}

export interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { essays } = useEssays();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega IDs já lidos do localStorage
  const getReadIds = useCallback((): Set<string> => {
    if (!user) return new Set();
    try {
      const stored = localStorage.getItem(`read_notifications_${user.id}`);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Erro ao carregar notificações lidas:', e);
    }
    return new Set();
  }, [user]);

  const saveReadIds = useCallback((ids: Set<string>) => {
    if (!user) return;
    try {
      localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Erro ao salvar notificações lidas:', e);
    }
  }, [user]);

  // Carrega e agrega todas as notificações (Seguidores, Redações, Mensagens)
  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const readIds = getReadIds();
      const items: AppNotification[] = [];

      // 1. Notificações de Redações Corrigidas
      // Pega das essays já carregadas no contexto ou busca diretamente
      essays.forEach((essay) => {
        const notifId = `essay_${essay.id}`;
        items.push({
          id: notifId,
          type: 'essay',
          title: 'Redação corrigida!',
          description: `Seu texto para o tema do Dia ${essay.theme_day} ("${essay.theme_topic}") foi corrigido com nota ${essay.score}/1000.`,
          timestamp: essay.created_at,
          isRead: readIds.has(notifId),
          metadata: {
            essayScore: essay.score,
            themeDay: essay.theme_day,
            themeTopic: essay.theme_topic,
            essayText: essay.essay_text,
            fullEssay: essay,
          },
        });
      });

      // 2. Notificações de Novos Seguidores
      try {
        const { data: followsData, error: followsError } = await supabase
          .from('follows')
          .select('id, follower_id, created_at')
          .eq('following_id', user.id)
          .order('created_at', { ascending: false });

        if (!followsError && Array.isArray(followsData) && followsData.length > 0) {
          const followerIds = followsData.map((f: any) => f.follower_id);
          
          // Busca os nomes e avatares dos seguidores
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', followerIds);

          const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
          if (profilesData) {
            profilesData.forEach((p: any) => profileMap.set(p.id, p));
          }

          followsData.forEach((f: any) => {
            const notifId = `follow_${f.id}`;
            const profile = profileMap.get(f.follower_id);
            const name = profile?.full_name || 'Um estudante';

            items.push({
              id: notifId,
              type: 'follower',
              title: 'Novo seguidor!',
              description: `${name} começou a seguir o seu perfil no Escreva+.`,
              timestamp: f.created_at,
              isRead: readIds.has(notifId),
              actorName: name,
              actorId: f.follower_id,
              avatarUrl: profile?.avatar_url ?? null,
            });
          });
        }
      } catch (err) {
        console.warn('Erro ao buscar seguidores:', err);
      }

      // 3. Notificações de Mensagens Não Lidas Recebidas
      try {
        const { data: unreadMsgs, error: msgsError } = await supabase
          .from('messages')
          .select('id, sender_id, content, created_at, is_read')
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });

        if (!msgsError && Array.isArray(unreadMsgs) && unreadMsgs.length > 0) {
          const senderIds = Array.from(new Set(unreadMsgs.map((m: any) => m.sender_id)));
          
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);

          const senderMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
          if (senderProfiles) {
            senderProfiles.forEach((p: any) => senderMap.set(p.id, p));
          }

          unreadMsgs.forEach((m: any) => {
            const notifId = `msg_${m.id}`;
            const sender = senderMap.get(m.sender_id);
            const name = sender?.full_name || 'Alguém';
            const preview = m.content.length > 60 ? `${m.content.slice(0, 60)}...` : m.content;

            items.push({
              id: notifId,
              type: 'message',
              title: `Mensagem de ${name}`,
              description: `"${preview}"`,
              timestamp: m.created_at,
              isRead: readIds.has(notifId),
              actorName: name,
              actorId: m.sender_id,
              avatarUrl: sender?.avatar_url ?? null,
              metadata: {
                messageContent: m.content,
                senderId: m.sender_id,
              },
            });
          });
        }
      } catch (err) {
        console.warn('Erro ao buscar mensagens para notificações:', err);
      }

      // 4. Notificação de Boas-vindas (se for usuário novo sem notificações ou como primeira)
      const welcomeId = `welcome_${user.id}`;
      items.push({
        id: welcomeId,
        type: 'milestone',
        title: 'Boas-vindas ao Escreva+!',
        description: 'Sua jornada rumo à nota mil no ENEM começa aqui. Escreva sua primeira redação no Laboratório!',
        timestamp: user.created_at || new Date().toISOString(),
        isRead: readIds.has(welcomeId),
      });

      // Ordena por data decrescente
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(items);
    } finally {
      setIsLoading(false);
    }
  }, [user, essays, getReadIds]);

  // Carrega ao montar ou mudar usuário/redações
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Listener Realtime do Supabase para novos seguidores e mensagens
  useEffect(() => {
    if (!user) return;

    // Canal para ouvir novos follows
    const followsChannel = supabase
      .channel(`realtime-follows-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const newFollow = payload.new;
          if (newFollow) {
            // Busca dados do seguidor
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', newFollow.follower_id)
              .maybeSingle();

            const name = profile?.full_name || 'Um novo estudante';
            toast.info(`🎉 ${name} começou a seguir você!`, {
              description: 'Toque na aba Notificações para interagir.',
            });

            // Atualiza lista
            refreshNotifications();
          }
        }
      )
      .subscribe();

    // Canal para ouvir novas mensagens
    const messagesChannel = supabase
      .channel(`realtime-messages-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          if (newMsg) {
            refreshNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, refreshNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
  }, [getReadIds, saveReadIds]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const readIds = getReadIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);
    toast.success('Todas as notificações foram marcadas como lidas.');
  }, [notifications, getReadIds, saveReadIds]);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
  }, [getReadIds, saveReadIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        clearNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider');
  }
  return context;
};
