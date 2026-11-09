import { useEffect, useState, useRef } from "react";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  Bell,
  Search,
  Sparkles,
  Smile,
  GraduationCap,
  Paperclip,
  MoreVertical,
  Flame,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getChatLastReadTime, setChatLastReadTime, markChatMessagesAsRead } from "@/lib/messages";
import { toast } from "sonner";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

// Emojis voltados para redação, apoio e estudo
const STUDY_EMOJIS = ["✍️", "💡", "🎯", "🔥", "👏", "📚", "✨", "💯", "😀", "🙌", "❤️", "🚀"];

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Hoje";
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    }
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  } catch {
    return "Hoje";
  }
}

export function Messages({ initialUser, onClearInitial }: { initialUser?: any, onClearInitial?: () => void }) {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<Profile | null>(null);
  const activeChatRef = useRef<Profile | null>(null);
  activeChatRef.current = activeChat;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const prevMessagesCountRef = useRef(0);

  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  // Carrega histórico, contatos, mensagens não lidas e presença
  useEffect(() => {
    if (!user) return;
    
    const fetchContactsAndUnread = async () => {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
        
      if (!messages || messages.length === 0) {
        setContacts([]);
        setUnreadCounts({});
        setLastMessages({});
        return;
      }
      
      const contactIds = new Set<string>();
      const unreadMap: Record<string, number> = {};
      const lastMsgMap: Record<string, Message> = {};
      const latestSentByUser: Record<string, number> = {};

      messages.forEach((msg: Message) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        contactIds.add(otherId);

        if (msg.sender_id === user.id) {
          const sentTime = new Date(msg.created_at).getTime();
          if (!latestSentByUser[otherId] || sentTime > latestSentByUser[otherId]) {
            latestSentByUser[otherId] = sentTime;
          }
        }

        if (!lastMsgMap[otherId]) {
          lastMsgMap[otherId] = msg;
        }
      });

      messages.forEach((msg: Message) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        if (msg.sender_id === otherId && msg.receiver_id === user.id) {
          const msgTime = new Date(msg.created_at).getTime();
          const localReadTime = getChatLastReadTime(user.id, otherId);
          const lastSentTime = latestSentByUser[otherId] || 0;
          const cutoff = Math.max(localReadTime, lastSentTime);

          const isEffectivelyRead = msg.is_read || (cutoff > 0 && msgTime <= cutoff);
          const isChatOpen = activeChatRef.current?.id === otherId;

          if (!isEffectivelyRead && !isChatOpen) {
            unreadMap[otherId] = (unreadMap[otherId] || 0) + 1;
          }
        }
      });

      setUnreadCounts(unreadMap);
      setLastMessages(lastMsgMap);

      const uniqueIds = Array.from(contactIds);
      if (uniqueIds.length === 0) {
        setContacts([]);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', uniqueIds);
        
      if (data) {
        const sorted = (data as Profile[]).sort((a, b) => {
          const msgA = lastMsgMap[a.id];
          const msgB = lastMsgMap[b.id];
          const timeA = msgA?.created_at ? new Date(msgA.created_at).getTime() : 0;
          const timeB = msgB?.created_at ? new Date(msgB.created_at).getTime() : 0;
          return timeB - timeA;
        });
        setContacts(sorted);
      }
    };
    
    fetchContactsAndUnread();

    const globalMsgChannel = supabase
      .channel(`user-realtime-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          
          if (newMsg.receiver_id === user.id) {
            const senderId = newMsg.sender_id;
            setLastMessages(prev => ({ ...prev, [senderId]: newMsg }));

            if (activeChatRef.current?.id === senderId) {
              setChatHistory(prev => [...prev, newMsg]);
              markChatMessagesAsRead(user.id, senderId);
            } else {
              setUnreadCounts(prev => ({
                ...prev,
                [senderId]: (prev[senderId] || 0) + 1
              }));
            }

            setContacts(prev => {
              if (!prev.find(c => c.id === senderId)) {
                supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', senderId)
                  .single()
                  .then(({ data }) => {
                    if (data) {
                      setContacts(curr => [data as Profile, ...curr]);
                    }
                  });
              }
              return prev;
            });
          } else if (newMsg.sender_id === user.id) {
            setLastMessages(prev => ({ ...prev, [newMsg.receiver_id]: newMsg }));
            if (activeChatRef.current?.id === newMsg.receiver_id) {
              setChatHistory(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (activeChatRef.current && (
            (updatedMsg.sender_id === user.id && updatedMsg.receiver_id === activeChatRef.current.id) ||
            (updatedMsg.sender_id === activeChatRef.current.id && updatedMsg.receiver_id === user.id)
          )) {
            setChatHistory(prev => 
              prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
            );
          }
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: user.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(globalMsgChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Se houver um initialUser (veio de outra tela)
  useEffect(() => {
    if (initialUser && user) {
      const formattedUser: Profile = {
        id: initialUser.id,
        full_name: initialUser.name || initialUser.full_name || "Estudante",
        avatar_url: initialUser.avatar_url,
      };
      
      openChat(formattedUser);
      
      setContacts(prev => {
        if (!prev.find(c => c.id === formattedUser.id)) {
          return [formattedUser, ...prev];
        }
        return prev;
      });

      if (onClearInitial) onClearInitial();
    }
  }, [initialUser, user, onClearInitial]);

  // Busca de novos usuários
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .ilike('full_name', `%${searchQuery}%`)
          .neq('id', user.id)
          .limit(10);
        if (data) setSearchResults(data as any);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Carrega mensagens do chat ativo
  useEffect(() => {
    if (!user || !activeChat) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (data) setChatHistory(data);
    };

    fetchMessages();
    markChatMessagesAsRead(user.id, activeChat.id);

    const readCheckInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
        markChatMessagesAsRead(user.id, activeChat.id);
      }
    }, 4000);

    return () => {
      clearInterval(readCheckInterval);
    };
  }, [user, activeChat]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessagesCountRef.current = 0;
  }, [activeChat?.id]);

  useEffect(() => {
    if (chatHistory.length === 0) return;

    if (isInitialLoadRef.current) {
      scrollToBottom('auto');
      const t1 = setTimeout(() => scrollToBottom('auto'), 50);
      const t2 = setTimeout(() => {
        scrollToBottom('auto');
        isInitialLoadRef.current = false;
      }, 150);
      prevMessagesCountRef.current = chatHistory.length;
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (chatHistory.length > prevMessagesCountRef.current) {
      scrollToBottom('smooth');
      prevMessagesCountRef.current = chatHistory.length;
    }
  }, [chatHistory]);

  const openChat = async (contact: Profile) => {
    setActiveChat(contact);
    setSearchQuery("");
    setShowEmojiPicker(false);
    
    setUnreadCounts(prev => ({
      ...prev,
      [contact.id]: 0
    }));

    if (user) {
      await markChatMessagesAsRead(user.id, contact.id);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !activeChat) return;
    const msgText = message.trim();
    setMessage('');
    setShowEmojiPicker(false);
    
    setTimeout(() => scrollToBottom('smooth'), 40);

    setUnreadCounts(prev => ({
      ...prev,
      [activeChat.id]: 0
    }));
    markChatMessagesAsRead(user.id, activeChat.id);

    const { data } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: msgText,
      is_read: false
    }).select().single();
    
    if (data) {
      setLastMessages(prev => ({ ...prev, [activeChat.id]: data }));
    }

    if (!contacts.find(c => c.id === activeChat.id)) {
      setContacts(prev => [activeChat, ...prev]);
    }
  };

  const getAvatar = (p: Profile, size = "size-11 sm:size-12") => {
    if (p.avatar_url) {
      return (
        <img
          src={p.avatar_url}
          alt={p.full_name || ""}
          className={`${size} object-cover rounded-full ring-1 ring-border`}
        />
      );
    }
    return (
      <div className={`${size} rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 grid place-items-center font-bold text-sm select-none`}>
        {p.full_name ? p.full_name.substring(0, 2).toUpperCase() : "ES"}
      </div>
    );
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const displayList = searchQuery.trim().length > 0 ? searchResults : contacts;
  const onlineContacts = contacts.filter(c => onlineUsers.has(c.id));
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100vh-10rem)] w-full overflow-hidden rounded-none md:rounded-2xl border-0 md:border border-border bg-card shadow-sm relative font-sans">
      
      {/* ─────────────────────────────────────────────────────────── */}
      {/* ABA ESQUERDA: LISTA DE CONVERSAS (NAVEGAÇÃO FLUIDA MOBILE)  */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className={`w-full md:w-[360px] lg:w-[400px] md:border-r border-border flex-col bg-card shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Topo personalizado com a identidade da plataforma */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/15 text-primary grid place-items-center shadow-xs">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-foreground">Chat da Turma</h1>
                <span className="text-[10px] font-extrabold uppercase bg-primary/15 text-primary px-1.5 py-0.5 rounded-md">
                  ENEM
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Troque ideias e repertórios</p>
            </div>
          </div>

          {totalUnread > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-xs animate-pulse">
              <Bell className="size-3" />
              {totalUnread}
            </span>
          )}
        </div>

        {/* Campo de Busca Rápida */}
        <div className="p-3 bg-card border-b border-border/60">
          <div className="flex items-center gap-2 bg-accent/50 rounded-xl px-3 py-2 border border-border/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar colega para conversar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Trilha de Colegas Online (Estilo navegação de stories/presença rápida) */}
        {onlineContacts.length > 0 && !searchQuery && (
          <div className="py-2.5 px-3 border-b border-border/60 bg-muted/20 overflow-x-auto scrollbar-none flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0 mr-1">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online:
            </div>
            {onlineContacts.map(contact => (
              <button
                key={`online-${contact.id}`}
                onClick={() => openChat(contact)}
                className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
                title={`Conversar com ${contact.full_name || 'Estudante'}`}
              >
                <div className="relative p-0.5 rounded-full ring-2 ring-emerald-500 ring-offset-2 ring-offset-card group-hover:scale-105 transition-transform">
                  {getAvatar(contact, "size-10")}
                  <span className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-card rounded-full"></span>
                </div>
                <span className="text-[11px] font-medium text-foreground max-w-[56px] truncate">
                  {contact.full_name?.split(' ')[0] || "Colega"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Lista de Conversas com Modelo de Navegação Direto */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {displayList.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-3 mt-8">
              <div className="size-14 rounded-2xl bg-accent grid place-items-center text-primary text-xl">
                {searchQuery ? <Search className="size-6" /> : <MessageCircle className="size-6" />}
              </div>
              <p className="font-semibold text-base text-foreground">
                {searchQuery ? "Nenhum estudante encontrado" : "Nenhuma conversa ativa"}
              </p>
              <p className="text-xs max-w-xs text-muted-foreground">
                {searchQuery
                  ? "Verifique o nome digitado para encontrar seus colegas de redação."
                  : "Toque em um colega online acima ou busque pelo nome para começar a trocar repertórios e tirar dúvidas!"}
              </p>
            </div>
          ) : (
            displayList.map(contact => {
              const unreadCount = unreadCounts[contact.id] || 0;
              const hasUnread = unreadCount > 0;
              const lastMsg = lastMessages[contact.id];
              const isOnline = onlineUsers.has(contact.id);
              const isSelected = activeChat?.id === contact.id;

              return (
                <div
                  key={contact.id}
                  onClick={() => openChat(contact)}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-accent/80 border-l-4 border-l-primary'
                      : 'hover:bg-accent/40 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Foto de Perfil com status Online */}
                  <div className="relative shrink-0">
                    {getAvatar(contact, "size-12")}
                    {isOnline && (
                      <span className="absolute bottom-0.5 right-0.5 size-3.5 bg-emerald-500 border-2 border-card rounded-full shadow-xs"></span>
                    )}
                  </div>

                  {/* Informações da conversa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                        {contact.full_name || "Estudante"}
                      </span>

                      {lastMsg && (
                        <span className={`text-[11px] shrink-0 ${hasUnread ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {formatTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate flex items-center gap-1 leading-snug ${hasUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {lastMsg ? (
                          <>
                            {lastMsg.sender_id === user?.id && (
                              <span className="shrink-0 inline-flex items-center">
                                {lastMsg.is_read ? (
                                  <CheckCheck className="size-3.5 text-primary stroke-[2.5]" />
                                ) : (
                                  <Check className="size-3.5 text-muted-foreground stroke-[2]" />
                                )}
                              </span>
                            )}
                            <span className="truncate">{lastMsg.content}</span>
                          </>
                        ) : (
                          <span className="italic opacity-70">Toque para conversar</span>
                        )}
                      </p>

                      {hasUnread && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ABA DIREITA: TELA DE CONVERSA COM MODELO DE NAVEGAÇÃO FLUIDA*/}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex-col h-full bg-accent/20 dark:bg-background/80 relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Padrão de fundo discreto e elegante */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: `20px 20px`
          }}
        />

        {activeChat ? (
          <>
            {/* Topo da Conversa: Navegação fluida com botão voltar no mobile */}
            <div className="px-3 sm:px-5 py-3 bg-card border-b border-border flex items-center justify-between z-10 shadow-xs select-none">
              
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden size-9 -ml-1 text-muted-foreground rounded-full hover:bg-accent"
                  onClick={() => setActiveChat(null)}
                  title="Voltar para a lista"
                >
                  <ArrowLeft className="size-5" />
                </Button>

                <div className="relative shrink-0">
                  {getAvatar(activeChat, "size-10")}
                  {onlineUsers.has(activeChat.id) && (
                    <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 border-2 border-card rounded-full"></span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="font-bold text-sm sm:text-base leading-tight text-foreground block truncate max-w-[170px] sm:max-w-[300px]">
                    {activeChat.full_name || "Estudante"}
                  </span>
                  {onlineUsers.has(activeChat.id) ? (
                    <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 leading-none mt-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span>
                      online agora
                    </span>
                  ) : (
                    <span className="text-[11px] sm:text-xs text-muted-foreground block leading-none mt-0.5">
                      offline recentemente
                    </span>
                  )}
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.info(`Meta de estudos compartilhada com ${activeChat.full_name || 'Estudante'}!`)}
                  className="hidden sm:inline-flex items-center gap-1 text-xs rounded-lg text-primary hover:text-primary hover:bg-primary/10 h-8 px-2.5"
                >
                  <Sparkles className="size-3.5" />
                  <span>Dicas 900+</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toast.info("Opções da conversa")}
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </div>
            </div>

            {/* Histórico de Mensagens com Balões da Nossa Identidade */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-2.5 z-10"
            >
              {/* Notificação amigável de comunidade de estudos */}
              <div className="mx-auto max-w-sm text-center my-1 select-none">
                <span className="inline-flex items-center gap-1.5 bg-card/90 border border-border text-muted-foreground text-[11px] px-3 py-1 rounded-full shadow-2xs font-medium">
                  <GraduationCap className="size-3.5 text-primary" />
                  Comunidade de Redação ENEM • Troca colaborativa
                </span>
              </div>

              {chatHistory.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-2">
                    <Sparkles className="size-6" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Inicie essa conversa!</p>
                  <p className="text-xs max-w-xs mt-1">Troque argumentos, referências de repertório e debata os temas da semana para alcançar os 900+ pontos.</p>
                </div>
              )}

              {chatHistory.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const prevMsg = chatHistory[idx - 1];
                const showDate = !prevMsg || formatDateLabel(prevMsg.created_at) !== formatDateLabel(msg.created_at);

                return (
                  <div key={msg.id} className="flex flex-col">
                    {/* Chip de Data Flutuante */}
                    {showDate && (
                      <div className="flex justify-center my-2 select-none">
                        <span className="bg-card/90 border border-border/80 text-muted-foreground text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                          {formatDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {/* Balão com a identidade de cores da plataforma */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 shadow-2xs text-[14.5px] leading-relaxed break-words relative ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-xs'
                            : 'bg-card text-foreground border border-border/80 rounded-2xl rounded-tl-xs'
                        }`}
                      >
                        <span>{msg.content}</span>

                        {/* Horário e confirmação de leitura alinhados à direita */}
                        <span className={`float-right ml-3 mt-1.5 inline-flex items-center gap-1 select-none text-[11px] align-bottom ${
                          isMe ? 'text-primary-foreground/75' : 'text-muted-foreground'
                        }`}>
                          <span>{formatTime(msg.created_at)}</span>
                          {isMe && (
                            msg.is_read ? (
                              <CheckCheck
                                className="size-3.5 text-primary-foreground stroke-[2.5]"
                                title="Mensagem visualizada"
                              />
                            ) : (
                              <Check
                                className="size-3.5 text-primary-foreground/70 stroke-[2]"
                                title="Mensagem enviada"
                              />
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-0 w-0 shrink-0" />
            </div>

            {/* Barra de Reações / Emojis de Estudo */}
            {showEmojiPicker && (
              <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-2 overflow-x-auto z-10 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1">Reações:</span>
                {STUDY_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setMessage(prev => prev + emoji)}
                    className="text-xl p-1.5 rounded-lg hover:bg-accent transition-transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Barra de Envio estilo App de Mensagens (Mobile Amigável) */}
            <div className="p-2.5 sm:p-3 bg-card border-t border-border z-10">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                
                {/* Pílula de Digitação */}
                <div className="flex-1 bg-accent/40 rounded-full px-3.5 py-2 flex items-center gap-2 border border-border/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Adicionar emoji"
                  >
                    <Smile className="size-5" />
                  </button>

                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escreva sua mensagem..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && message.trim()) {
                        sendMessage();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => toast.info("Envio de arquivos em breve!")}
                    className="text-muted-foreground hover:text-foreground -rotate-45 transition-colors shrink-0 hidden sm:block"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="size-4" />
                  </button>
                </div>

                {/* Botão de Envio com a cor Principal da Marca */}
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="size-10 sm:size-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:hover:bg-primary flex items-center justify-center shadow-md shrink-0 active:scale-95 transition-all"
                  title="Enviar mensagem"
                >
                  <Send className="size-4 sm:size-5 ml-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Estado Vazio Personalizado da Plataforma no Desktop */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 select-none">
            <div className="size-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-5 shadow-xs">
              <GraduationCap className="size-12" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Chat da Turma Nota Mil</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
              Troque argumentos com outros estudantes, debata estratégias de redação e compartilhe referências socioculturais para a nota 1000.
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-card px-3 py-1.5 rounded-full border border-border">
              <Sparkles className="size-3.5 text-primary" />
              <span>Conexão em tempo real entre vestibulandos</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
