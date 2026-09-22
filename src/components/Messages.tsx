import { useEffect, useState } from "react";
import { MessageCircle, Send, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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

export function Messages({ initialUser, onClearInitial }: { initialUser?: any, onClearInitial?: () => void }) {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchContacts = async () => {
      // Busca histórico de mensagens do usuário logado
      const { data: messages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        
      if (!messages || messages.length === 0) {
        setContacts([]);
        return;
      }
      
      // Extrai os IDs únicos das pessoas com quem conversou
      const contactIds = new Set<string>();
      messages.forEach(msg => {
        if (msg.sender_id === user.id) contactIds.add(msg.receiver_id);
        if (msg.receiver_id === user.id) contactIds.add(msg.sender_id);
      });

      const uniqueIds = Array.from(contactIds);
      if (uniqueIds.length === 0) {
        setContacts([]);
        return;
      }

      // Busca os perfis desses IDs
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', uniqueIds);
        
      if (data) setContacts(data as any);
    };
    
    fetchContacts();

    // Set up presence for online/offline status
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
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Se houver um initialUser (veio de outra tela), configura ele como chat ativo
  useEffect(() => {
    if (initialUser && user) {
      const formattedUser: Profile = {
        id: initialUser.id,
        full_name: initialUser.name || initialUser.full_name || "Estudante",
        avatar_url: initialUser.avatar_url,
      };
      
      setActiveChat(formattedUser);
      
      // Adiciona na lista temporariamente para aparecer na sidebar (se ainda não estiver lá)
      setContacts(prev => {
        if (!prev.find(c => c.id === formattedUser.id)) {
          return [formattedUser, ...prev];
        }
        return prev;
      });

      if (onClearInitial) onClearInitial();
    }
  }, [initialUser, user, onClearInitial]);

  // Busca de novos usuários para conversar
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

    // Marca as mensagens recebidas como lidas
    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', activeChat.id)
        .eq('is_read', false);
    };
    markAsRead();

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === activeChat.id) ||
            (newMsg.sender_id === activeChat.id && newMsg.receiver_id === user.id)
          ) {
            setChatHistory(prev => [...prev, newMsg]);
            
            // Se recebeu uma mensagem enquanto o chat está aberto, já marca como lida
            if (newMsg.receiver_id === user.id) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then(); // silent update
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setChatHistory(prev => 
            prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeChat]);

  const sendMessage = async () => {
    if (!message.trim() || !user || !activeChat) return;
    const msgText = message.trim();
    setMessage('');
    
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: msgText,
      is_read: false
    });
    
    // Se for uma nova conversa, adiciona aos contatos
    if (!contacts.find(c => c.id === activeChat.id)) {
      setContacts(prev => [activeChat, ...prev]);
    }
  };

  const getAvatar = (p: Profile) => {
    if (p.avatar_url) return <img src={p.avatar_url} alt={p.full_name || ""} className="w-full h-full object-cover rounded-full" />;
    return <span className="text-sm">{p.full_name ? p.full_name.substring(0, 2).toUpperCase() : "US"}</span>;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayList = searchQuery.trim().length > 0 ? searchResults : contacts;

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Sidebar */}
      <div className={`w-full md:w-1/3 md:border-r border-border flex-col bg-background/50 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-border bg-card/80 backdrop-blur-sm">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><MessageCircle className="size-6 text-primary" /> Mensagens</h2>
          <input 
            type="text" 
            placeholder="Pesquisar ou iniciar nova conversa..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayList.length === 0 ? (
            <div className="p-5 text-center text-sm text-muted-foreground flex flex-col items-center gap-2 mt-10">
              <span className="text-2xl">{searchQuery ? "🔍" : "💬"}</span>
              {searchQuery ? "Nenhum estudante encontrado." : "Você ainda não tem conversas ativas."}
            </div>
          ) : (
            displayList.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => {
                  setActiveChat(contact);
                  setSearchQuery(""); // Limpa a busca ao selecionar
                }}
                className={`flex items-center gap-4 p-5 cursor-pointer transition-colors border-b border-border hover:bg-accent ${activeChat?.id === contact.id ? 'bg-accent md:border-l-4 border-l-primary' : 'md:border-l-4 border-l-transparent'}`}
              >
                <div className="relative grid size-12 place-items-center rounded-full bg-primary/10 text-primary font-bold shadow-sm shrink-0">
                  {getAvatar(contact)}
                  {onlineUsers.has(contact.id) && (
                    <div className="absolute bottom-0 right-0 size-3.5 bg-success border-2 border-background rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold truncate block">{contact.full_name || "Estudante"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Window */}
      <div className={`flex-1 flex-col bg-accent/20 relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="md:hidden shrink-0 -ml-2 text-muted-foreground" onClick={() => setActiveChat(null)}>
                <ArrowLeft className="size-5" />
              </Button>
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold shadow-sm">
                {getAvatar(activeChat)}
              </div>
              <div>
                <span className="font-bold block leading-tight">{activeChat.full_name || "Estudante"}</span>
                {onlineUsers.has(activeChat.id) ? (
                  <span className="text-xs text-success flex items-center gap-1"><div className="size-1.5 rounded-full bg-success"></div> Online agora</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Offline</span>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {chatHistory.length === 0 && (
                <div className="flex-1 grid place-items-center opacity-50">
                  <p>Mande um "Oi!" para iniciar a conversa.</p>
                </div>
              )}
              {chatHistory.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-2 ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[11px] font-medium ${msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {msg.sender_id === user?.id && (
                        <span className="text-primary-foreground/90 ml-1">
                          {msg.is_read ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5 opacity-60" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-card border-t border-border shadow-sm">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..." 
                  className="flex-1 rounded-full border-2 border-border/50 bg-background px-5 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && message.trim()) {
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage} size="icon" className="rounded-full size-12 shrink-0 shadow-md">
                  <Send className="size-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
            <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
              <MessageCircle className="size-12 text-primary/40" />
            </div>
            <h3 className="text-2xl font-bold text-muted-foreground">Suas mensagens</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">Selecione uma conversa ao lado para começar a enviar dicas e trocar ideias sobre a redação.</p>
          </div>
        )}
      </div>
    </div>
  );
}
