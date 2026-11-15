import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useEssays } from './EssaysContext';
import { toast } from 'sonner';
import { getChatLastReadTime } from '@/lib/messages';
import {
  isDeviceNotificationSupported,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  registerNotificationServiceWorker,
  sendDeviceNotification,
  type DeviceNotificationPermission,
} from '@/lib/device-notifications';

export type NotificationType = 'follower' | 'essay' | 'message' | 'milestone' | 'like' | 'comment';

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
  addNotification: (notif: Omit<AppNotification, 'id' | 'isRead'>) => void;
  // Notificações no eletrônico (celular, tablet, desktop)
  devicePermission: DeviceNotificationPermission;
  isDeviceSupported: boolean;
  requestDevicePermission: () => Promise<DeviceNotificationPermission>;
  testDeviceNotification: () => Promise<boolean>;
  sendCustomDeviceNotification: (payload: { title: string; body: string; url?: string }) => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { essays } = useEssays();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [devicePermission, setDevicePermission] = useState<DeviceNotificationPermission>(() =>
    getDeviceNotificationPermission()
  );
  const isDeviceSupported = useMemo(() => isDeviceNotificationSupported(), []);

  // Registra o Service Worker assim que montar
  useEffect(() => {
    registerNotificationServiceWorker();
    setDevicePermission(getDeviceNotificationPermission());

    // Ouve mensagens enviadas pelo Service Worker (ex: clique na notificação)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICKED' && event.data?.url) {
          window.focus();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
    return undefined;
  }, []);

  // Solicita permissão no eletrônico do usuário
  const requestDevicePermission = useCallback(async (): Promise<DeviceNotificationPermission> => {
    const perm = await requestDeviceNotificationPermission();
    setDevicePermission(perm);
    if (perm === 'granted') {
      toast.success('Notificações no aparelho ativadas com sucesso!', {
        description: 'Você receberá mensagens, correções e novos seguidores no seu dispositivo.',
      });
      // Envia notificação de confirmação no eletrônico
      sendDeviceNotification({
        title: '🔔 Notificações Ativadas!',
        body: 'Você agora receberá avisos e mensagens do Escreva+ diretamente no seu eletrônico.',
        url: '/?section=notificacoes',
      });
    } else if (perm === 'denied') {
      toast.error('Permissão de notificações bloqueada no seu navegador.', {
        description: 'Clique no ícone de cadeado na barra de endereços para permitir notificações.',
      });
    }
    return perm;
  }, []);

  // Testar notificação no dispositivo
  const testDeviceNotification = useCallback(async (): Promise<boolean> => {
    if (devicePermission !== 'granted') {
      const perm = await requestDevicePermission();
      if (perm !== 'granted') return false;
    }

    const sent = await sendDeviceNotification({
      title: '✨ Teste do Escreva+',
      body: 'As notificações estão funcionando perfeitamente no seu dispositivo!',
      url: '/?section=notificacoes',
    });

    if (sent) {
      toast.success('Notificação de teste enviada para o seu dispositivo!');
    }
    return sent;
  }, [devicePermission, requestDevicePermission]);

  const sendCustomDeviceNotification = useCallback(
    async (payload: { title: string; body: string; url?: string }): Promise<boolean> => {
      return sendDeviceNotification({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
      });
    },
    []
  );

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
            const localReadTime = getChatLastReadTime(user.id, m.sender_id);
            if (localReadTime > 0 && new Date(m.created_at).getTime() <= localReadTime) {
              return;
            }

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

      // 4. Notificação de Boas-vindas
      const welcomeId = `welcome_${user.id}`;
      items.push({
        id: welcomeId,
        type: 'milestone',
        title: 'Boas-vindas ao Escreva+!',
        description: 'Sua jornada rumo à nota mil no ENEM começa aqui. Escreva sua primeira redação no Laboratório!',
        timestamp: user.created_at || new Date().toISOString(),
        isRead: readIds.has(welcomeId),
      });

      // 5. Notificações de Curtidas e Comentários nos Posts do Usuário (Supabase)
      try {
        const { data: userPosts } = await (supabase as any)
          .from('posts')
          .select('id, content')
          .eq('user_id', user.id);

        if (userPosts && userPosts.length > 0) {
          const userPostIds = userPosts.map((p: any) => p.id);
          const postContentMap = new Map<string, string>(
            userPosts.map((p: any) => [p.id, p.content || 'sua publicação'])
          );

          // Buscar curtidas de outros usuários
          const { data: likesData } = await (supabase as any)
            .from('post_likes')
            .select('id, post_id, user_id, created_at')
            .in('post_id', userPostIds)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

          // Buscar comentários de outros usuários
          const { data: commentsData } = await (supabase as any)
            .from('post_comments')
            .select('id, post_id, user_id, content, created_at')
            .in('post_id', userPostIds)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

          const actorIds = Array.from(
            new Set([
              ...(likesData || []).map((l: any) => l.user_id),
              ...(commentsData || []).map((c: any) => c.user_id),
            ])
          );

          let actorMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
          if (actorIds.length > 0) {
            const { data: actorProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', actorIds);
            if (actorProfiles) {
              actorProfiles.forEach((p: any) => actorMap.set(p.id, p));
            }
          }

          // Monta itens de curtida
          (likesData || []).forEach((like: any) => {
            const notifId = `like_${like.id}`;
            const actor = actorMap.get(like.user_id);
            const name = actor?.full_name || 'Um estudante';
            const postSnippet = postContentMap.get(like.post_id) || '';
            const preview = postSnippet.length > 40 ? `${postSnippet.slice(0, 40)}...` : postSnippet;

            items.push({
              id: notifId,
              type: 'like',
              title: `${name} curtiu sua publicação!`,
              description: preview ? `Na postagem: "${preview}"` : 'Curtiu sua publicação no Feed da Turma.',
              timestamp: like.created_at,
              isRead: readIds.has(notifId),
              actorName: name,
              actorId: like.user_id,
              avatarUrl: actor?.avatar_url ?? null,
              metadata: {
                postId: like.post_id,
                postSnippet,
              },
            });
          });

          // Monta itens de comentário
          (commentsData || []).forEach((com: any) => {
            const notifId = `comment_${com.id}`;
            const actor = actorMap.get(com.user_id);
            const name = actor?.full_name || 'Um estudante';
            const postSnippet = postContentMap.get(com.post_id) || '';
            const commentPreview = com.content?.length > 60 ? `${com.content.slice(0, 60)}...` : com.content;

            items.push({
              id: notifId,
              type: 'comment',
              title: `${name} comentou no seu post!`,
              description: `"${commentPreview}"`,
              timestamp: com.created_at,
              isRead: readIds.has(notifId),
              actorName: name,
              actorId: com.user_id,
              avatarUrl: actor?.avatar_url ?? null,
              metadata: {
                postId: com.post_id,
                postSnippet,
              },
            });
          });
        }
      } catch (feedErr) {
        console.warn('Erro ao carregar notificações do feed no Supabase:', feedErr);
      }

      // 6. Notificações da Comunidade e Feed (fallback local)
      try {
        const stored = localStorage.getItem(`custom_notifications_${user.id}`);
        if (stored) {
          const customList: AppNotification[] = JSON.parse(stored);
          customList.forEach((c) => {
            if (!items.some((it) => it.id === c.id)) {
              items.push({
                ...c,
                isRead: readIds.has(c.id),
              });
            }
          });
        }
      } catch (e) {
        console.warn('Erro ao carregar notificações locais do feed:', e);
      }

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

            // Envia para o eletrônico do usuário
            sendDeviceNotification({
              title: '🎉 Novo seguidor no Escreva+!',
              body: `${name} começou a seguir o seu perfil no Escreva+.`,
              tag: `follow_${newFollow.id}`,
              url: '/?section=perfil',
            });

            // Atualiza lista
            refreshNotifications();
          }
        }
      )
      .subscribe();

    // Canal para ouvir novas mensagens recebidas
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
            // Busca remetente
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', newMsg.sender_id)
              .maybeSingle();

            const senderName = senderProfile?.full_name || 'Estudante';
            const preview = newMsg.content?.length > 70 ? `${newMsg.content.slice(0, 70)}...` : newMsg.content;

            // Dispara notificação no eletrônico do usuário (desktop / celular)
            sendDeviceNotification({
              title: `💬 Mensagem de ${senderName}`,
              body: preview || 'Você recebeu uma nova mensagem no Escreva+.',
              tag: `msg_${newMsg.id}`,
              url: '/?section=mensagens',
            });

            refreshNotifications();
          }
        }
      )
      .subscribe();

    // Canal para ouvir novas curtidas e comentários nos posts
    const feedChannel = supabase
      .channel(`realtime-feed-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_likes',
        },
        async (payload: any) => {
          const newLike = payload.new;
          if (newLike && newLike.user_id !== user.id) {
            // Verifica se o post pertence ao usuário atual
            const { data: post } = await (supabase as any)
              .from('posts')
              .select('id, user_id, content')
              .eq('id', newLike.post_id)
              .maybeSingle();

            if (post && post.user_id === user.id) {
              const { data: actor } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newLike.user_id)
                .maybeSingle();

              const actorName = actor?.full_name || 'Um estudante';
              toast.info(`👍 ${actorName} curtiu seu post!`, {
                description: 'Toque para ver no Feed da Turma.',
              });

              sendDeviceNotification({
                title: '👍 Nova curtida no seu post!',
                body: `${actorName} curtiu sua publicação no Feed da Turma.`,
                tag: `like_${newLike.id}`,
                url: '/?section=feed',
              });

              refreshNotifications();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
        },
        async (payload: any) => {
          const newComment = payload.new;
          if (newComment && newComment.user_id !== user.id) {
            // Verifica se o post pertence ao usuário atual
            const { data: post } = await (supabase as any)
              .from('posts')
              .select('id, user_id, content')
              .eq('id', newComment.post_id)
              .maybeSingle();

            if (post && post.user_id === user.id) {
              const { data: actor } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newComment.user_id)
                .maybeSingle();

              const actorName = actor?.full_name || 'Um estudante';
              const snippet = newComment.content?.length > 50 ? `${newComment.content.slice(0, 50)}...` : newComment.content;
              toast.info(`💬 ${actorName} comentou no seu post!`, {
                description: `"${snippet}"`,
              });

              sendDeviceNotification({
                title: '💬 Novo comentário no seu post!',
                body: `${actorName}: "${snippet}"`,
                tag: `comment_${newComment.id}`,
                url: '/?section=feed',
              });

              refreshNotifications();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(feedChannel);
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

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'isRead'>) => {
    if (!user) return;
    const newId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullNotif: AppNotification = {
      ...notif,
      id: newId,
      isRead: false,
    };

    setNotifications((prev) => [fullNotif, ...prev]);

    try {
      const stored = localStorage.getItem(`custom_notifications_${user.id}`);
      const list: AppNotification[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(`custom_notifications_${user.id}`, JSON.stringify([fullNotif, ...list].slice(0, 50)));
    } catch (e) {
      console.warn("Erro ao salvar notificação local:", e);
    }

    sendDeviceNotification({
      title: fullNotif.title,
      body: fullNotif.description,
      tag: newId,
      url: fullNotif.type === 'like' || fullNotif.type === 'comment' ? '/?section=feed' : '/',
    });
  }, [user]);

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
        addNotification,
        devicePermission,
        isDeviceSupported,
        requestDevicePermission,
        testDeviceNotification,
        sendCustomDeviceNotification,
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
