import { useEffect, useState, useRef } from "react";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  Bell,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Camera,
  Mic,
  Search,
  Sparkles,
  User,
  Users
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

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "👏", "🔥", "🎯", "✍️", "📚", "✨", "🙌", "💯"];

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
          className={`${size} object-cover rounded-full`}
        />
      );
    }
    return (
      <div className={`${size} rounded-full bg-[#dfe5e7] dark:bg-[#374248] text-[#54656f] dark:text-[#aebac1] grid place-items-center font-bold text-sm select-none`}>
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

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100vh-10rem)] w-full overflow-hidden rounded-none md:rounded-2xl border-0 md:border border-border/80 bg-[#efeae2] dark:bg-[#0b141a] shadow-md relative font-sans">
      
      {/* ─────────────────────────────────────────────────────────── */}
      {/* ABA ESQUERDA: LISTA DE CONVERSAS (WHATSAPP ESTILO NATIVO)   */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className={`w-full md:w-[380px] lg:w-[420px] md:border-r border-border/60 flex-col bg-[#ffffff] dark:bg-[#111b21] shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Topo estilo WhatsApp no Mobile / Header de Conversas */}
        <div className="bg-[#008069] dark:bg-[#1f2c34] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-xs select-none">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-white/15 grid place-items-center">
              <MessageCircle className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none text-white">WhatsApp</h1>
              <span className="text-[11px] text-white/80 font-medium">Redação Nota Mil</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-white">
            <button
              onClick={() => toast.info("Câmera fotográfica em breve!")}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Câmera"
            >
              <Camera className="size-5" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("whatsapp-search-input");
                el?.focus();
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Pesquisar"
            >
              <Search className="size-5" />
            </button>
            <button
              onClick={() => toast.info("Configurações do chat")}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Mais opções"
            >
              <MoreVertical className="size-5" />
            </button>
          </div>
        </div>

        {/* Campo de Pesquisa estilo WhatsApp */}
        <div className="px-3 py-2 bg-[#ffffff] dark:bg-[#111b21] border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
            <Search className="size-4 text-[#54656f] dark:text-[#8696a0] shrink-0" />
            <input
              id="whatsapp-search-input"
              type="text"
              placeholder="Pesquisar ou começar uma nova conversa"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] outline-none"
            />
          </div>
        </div>

        {/* Stories / Colegas Online estilo Status do WhatsApp */}
        {onlineContacts.length > 0 && !searchQuery && (
          <div className="py-2.5 px-3 border-b border-black/5 dark:border-white/5 bg-[#ffffff] dark:bg-[#111b21] overflow-x-auto scrollbar-none flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#00a884] dark:text-[#25D366] uppercase tracking-wider shrink-0 mr-1">
              <span className="size-2 rounded-full bg-[#25D366] animate-pulse"></span>
              Online:
            </div>
            {onlineContacts.map(contact => (
              <button
                key={`online-${contact.id}`}
                onClick={() => openChat(contact)}
                className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
                title={`Conversar com ${contact.full_name || 'Estudante'}`}
              >
                <div className="relative p-0.5 rounded-full ring-2 ring-[#25D366] ring-offset-2 ring-offset-background group-hover:scale-105 transition-transform">
                  {getAvatar(contact, "size-10")}
                  <span className="absolute bottom-0 right-0 size-3 bg-[#25D366] border-2 border-white dark:border-[#111b21] rounded-full"></span>
                </div>
                <span className="text-[11px] font-medium text-[#111b21] dark:text-[#e9edef] max-w-[56px] truncate">
                  {contact.full_name?.split(' ')[0] || "Colega"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto bg-[#ffffff] dark:bg-[#111b21] divide-y divide-black/5 dark:divide-white/5">
          {displayList.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#54656f] dark:text-[#8696a0] flex flex-col items-center gap-3 mt-8">
              <div className="size-16 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] grid place-items-center text-2xl">
                {searchQuery ? "🔍" : "💬"}
              </div>
              <p className="font-semibold text-base text-[#111b21] dark:text-[#e9edef]">
                {searchQuery ? "Nenhum estudante encontrado" : "Nenhuma conversa ainda"}
              </p>
              <p className="text-xs max-w-xs text-[#54656f] dark:text-[#8696a0]">
                {searchQuery
                  ? "Verifique o nome digitado ou procure por outros colegas de turma."
                  : "Toque em um colega online acima ou procure pelo nome para trocar argumentos e dicas de redação!"}
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
                  className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                      : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                  }`}
                >
                  {/* Foto de Perfil com status Online */}
                  <div className="relative shrink-0">
                    {getAvatar(contact, "size-12")}
                    {isOnline && (
                      <span className="absolute bottom-0.5 right-0.5 size-3.5 bg-[#25D366] border-2 border-white dark:border-[#111b21] rounded-full shadow-xs"></span>
                    )}
                  </div>

                  {/* Informações da conversa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-[15px] truncate ${hasUnread ? 'font-bold text-[#111b21] dark:text-[#e9edef]' : 'font-medium text-[#111b21] dark:text-[#e9edef]'}`}>
                        {contact.full_name || "Estudante"}
                      </span>

                      {lastMsg && (
                        <span className={`text-[11px] shrink-0 ${hasUnread ? 'text-[#25D366] font-bold' : 'text-[#667781] dark:text-[#8696a0]'}`}>
                          {formatTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate flex items-center gap-1 leading-snug ${hasUnread ? 'font-semibold text-[#111b21] dark:text-[#e9edef]' : 'text-[#667781] dark:text-[#8696a0]'}`}>
                        {lastMsg ? (
                          <>
                            {lastMsg.sender_id === user?.id && (
                              <span className="shrink-0 inline-flex items-center">
                                {lastMsg.is_read ? (
                                  <CheckCheck className="size-3.5 text-[#53bdeb] stroke-[2.5]" />
                                ) : (
                                  <Check className="size-3.5 text-[#8696a0] stroke-[2]" />
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
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-[11px] font-bold text-white shadow-xs">
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
      {/* ABA DIREITA: JANELA DO CHAT (TELA DE CONVERSA DO WHATSAPP) */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Papel de parede sutil do WhatsApp (Doodles) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, #efeae2 1px)`,
            backgroundSize: `24px 24px`,
            backgroundPosition: `0 0, 12px 12px`
          }}
        />

        {activeChat ? (
          <>
            {/* Topo do Chat estilo WhatsApp */}
            <div className="px-2 sm:px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-black/5 dark:border-white/5 flex items-center justify-between z-10 shadow-xs select-none">
              
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden size-9 -ml-1 text-[#54656f] dark:text-[#aebac1] rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setActiveChat(null)}
                  title="Voltar"
                >
                  <ArrowLeft className="size-5" />
                </Button>

                <div className="relative shrink-0 cursor-pointer" onClick={() => toast.info(`Perfil de ${activeChat.full_name || 'Estudante'}`)}>
                  {getAvatar(activeChat, "size-9 sm:size-10")}
                  {onlineUsers.has(activeChat.id) && (
                    <span className="absolute bottom-0 right-0 size-2.5 bg-[#25D366] border-2 border-white dark:border-[#202c33] rounded-full"></span>
                  )}
                </div>

                <div className="min-w-0 cursor-pointer" onClick={() => toast.info(`Perfil de ${activeChat.full_name || 'Estudante'}`)}>
                  <span className="font-semibold text-sm sm:text-base leading-tight text-[#111b21] dark:text-[#e9edef] block truncate max-w-[150px] sm:max-w-[280px]">
                    {activeChat.full_name || "Estudante"}
                  </span>
                  {onlineUsers.has(activeChat.id) ? (
                    <span className="text-[11px] sm:text-xs text-[#00a884] dark:text-[#25D366] font-medium block leading-none">
                      online agora
                    </span>
                  ) : (
                    <span className="text-[11px] sm:text-xs text-[#667781] dark:text-[#8696a0] block leading-none">
                      visto recentemente
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de Ação estilo WhatsApp (Vídeo, Chamada, Menu) */}
              <div className="flex items-center gap-0.5 sm:gap-1 text-[#54656f] dark:text-[#aebac1]">
                <button
                  onClick={() => toast.info("Chamadas de vídeo em tempo real disponíveis em breve!")}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Chamada de vídeo"
                >
                  <Video className="size-4 sm:size-5" />
                </button>
                <button
                  onClick={() => toast.info("Chamadas de voz em tempo real disponíveis em breve!")}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Chamada de áudio"
                >
                  <Phone className="size-4 sm:size-5" />
                </button>
                <button
                  onClick={() => toast.info("Mais opções da conversa")}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Mais opções"
                >
                  <MoreVertical className="size-4 sm:size-5" />
                </button>
              </div>
            </div>

            {/* Lista de Mensagens no padrão de balões do WhatsApp */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-2 z-10"
            >
              {/* Aviso de criptografia/segurança amigável do WhatsApp */}
              <div className="mx-auto max-w-sm text-center my-2 select-none">
                <span className="inline-block bg-[#ffeecd] dark:bg-[#182229] text-[#54656f] dark:text-[#ffd279] text-[11px] px-3 py-1.5 rounded-lg shadow-2xs font-medium leading-relaxed border border-amber-200/50 dark:border-amber-900/30">
                  🔒 As mensagens são protegidas entre estudantes da plataforma Redação Nota Mil.
                </span>
              </div>

              {chatHistory.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#54656f] dark:text-[#8696a0]">
                  <div className="size-14 rounded-full bg-black/5 dark:bg-white/5 grid place-items-center mb-2">
                    <Sparkles className="size-6 text-[#00a884]" />
                  </div>
                  <p className="font-semibold text-sm text-[#111b21] dark:text-[#e9edef]">Comece uma conversa!</p>
                  <p className="text-xs max-w-xs mt-1">Diga um "Oi!" para tirar dúvidas de redação, trocar repertórios ou compartilhar temas.</p>
                </div>
              )}

              {chatHistory.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const prevMsg = chatHistory[idx - 1];
                const showDate = !prevMsg || formatDateLabel(prevMsg.created_at) !== formatDateLabel(msg.created_at);

                return (
                  <div key={msg.id} className="flex flex-col">
                    {/* Chip de Data flutuante no centro (Hoje, Ontem, etc.) */}
                    {showDate && (
                      <div className="flex justify-center my-2 select-none">
                        <span className="bg-[#ffffff]/90 dark:bg-[#182229]/90 backdrop-blur-xs text-[#54656f] dark:text-[#8696a0] text-[11px] font-semibold px-3 py-1 rounded-lg shadow-2xs uppercase tracking-wider">
                          {formatDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {/* Balão do WhatsApp */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-1.5 shadow-2xs text-[14.5px] leading-relaxed break-words relative ${
                          isMe
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-2xl rounded-tr-xs'
                            : 'bg-[#ffffff] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-2xl rounded-tl-xs'
                        }`}
                      >
                        <span>{msg.content}</span>

                        {/* Horário e confirmação de leitura no canto inferior direito */}
                        <span className="float-right ml-3 mt-1 inline-flex items-center gap-1 select-none text-[11px] text-[#667781] dark:text-[#8696a0] align-bottom">
                          <span>{formatTime(msg.created_at)}</span>
                          {isMe && (
                            msg.is_read ? (
                              <CheckCheck
                                className="size-3.5 text-[#53bdeb] stroke-[2.5]"
                                title="Mensagem lida"
                              />
                            ) : (
                              <Check
                                className="size-3.5 text-[#8696a0] stroke-[2]"
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

            {/* Barra de Reações / Emojis rápidos */}
            {showEmojiPicker && (
              <div className="px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-black/5 dark:border-white/5 flex items-center gap-2 overflow-x-auto z-10 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] shrink-0 mr-1">Emojis:</span>
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setMessage(prev => prev + emoji)}
                    className="text-xl p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Barra de Digitação no padrão WhatsApp Mobile */}
            <div className="p-2 sm:p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-black/5 dark:border-white/5 z-10">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                
                {/* Pílula de Input Branca */}
                <div className="flex-1 bg-[#ffffff] dark:bg-[#2a3942] rounded-full px-3 py-2 flex items-center gap-2 shadow-xs border border-transparent focus-within:border-emerald-500/30">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className="text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#d1d7db] transition-colors shrink-0"
                    title="Emojis"
                  >
                    <Smile className="size-5" />
                  </button>

                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mensagem"
                    className="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && message.trim()) {
                        sendMessage();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => toast.info("Envio de arquivos em breve!")}
                    className="text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#d1d7db] -rotate-45 transition-colors shrink-0 hidden sm:block"
                    title="Anexo"
                  >
                    <Paperclip className="size-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.info("Envio de fotos em breve!")}
                    className="text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#d1d7db] transition-colors shrink-0"
                    title="Câmera"
                  >
                    <Camera className="size-5" />
                  </button>
                </div>

                {/* Botão de Envio Circular Verde WhatsApp */}
                <button
                  onClick={() => {
                    if (message.trim()) {
                      sendMessage();
                    } else {
                      toast.info("Gravação de áudio em breve!");
                    }
                  }}
                  className="size-11 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-md shrink-0 active:scale-95 transition-all"
                  title={message.trim() ? "Enviar mensagem" : "Gravar áudio"}
                >
                  {message.trim() ? (
                    <Send className="size-5 ml-0.5" />
                  ) : (
                    <Mic className="size-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Estado Vazio estilo WhatsApp Web no Desktop */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 select-none">
            <div className="size-28 rounded-full bg-[#dfe5e7]/50 dark:bg-[#202c33] flex items-center justify-center mb-6 shadow-xs">
              <MessageCircle className="size-14 text-[#008069] dark:text-[#25D366]" />
            </div>
            <h3 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef]">WhatsApp Redação</h3>
            <p className="mt-2 text-sm text-[#667781] dark:text-[#8696a0] max-w-sm leading-relaxed">
              Envie e receba mensagens com seus colegas de turma para tirar dúvidas, debater temas do ENEM e compartilhar repertórios socioculturais.
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-xs text-[#8696a0] font-medium">
              <span>🔒 Protegido de ponta a ponta</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
