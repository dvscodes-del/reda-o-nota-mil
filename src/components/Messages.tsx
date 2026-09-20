import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export function Messages() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchContacts = async () => {
      // Para simplificar a busca de contatos, carregamos todos os outros perfis
      // O ideal seria carregar apenas followers/following no futuro
      const { data } = await supabase.from('profiles').select('id, name, avatar_url').neq('id', user.id);
      if (data) setContacts(data);
    };
    
    fetchContacts();
  }, [user]);

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
          }
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
      content: msgText
    });
  };

  const getAvatar = (p: Profile) => {
    if (p.avatar_url) return <img src={p.avatar_url} alt={p.name || ""} className="w-full h-full object-cover rounded-full" />;
    return <span className="text-sm">{p.name ? p.name.substring(0, 2).toUpperCase() : "US"}</span>;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-border flex flex-col bg-background/50">
        <div className="p-5 border-b border-border bg-card/80 backdrop-blur-sm">
          <h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="size-6 text-primary" /> Mensagens</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map(contact => (
            <div 
              key={contact.id} 
              onClick={() => setActiveChat(contact)}
              className={`flex items-center gap-4 p-5 cursor-pointer transition-colors border-b border-border hover:bg-accent ${activeChat?.id === contact.id ? 'bg-accent border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary font-bold shadow-sm">
                {getAvatar(contact)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold truncate">{contact.name || "Estudante"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-accent/20 relative">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 shadow-sm z-10">
              <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary font-bold shadow-sm">
                {getAvatar(activeChat)}
              </div>
              <div>
                <span className="font-bold block leading-tight">{activeChat.name || "Estudante"}</span>
                <span className="text-xs text-success flex items-center gap-1"><div className="size-1.5 rounded-full bg-success"></div> Online agora</span>
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
                  <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                    <span className={`text-[11px] font-medium block mt-2 ${msg.sender_id === user?.id ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>{formatTime(msg.created_at)}</span>
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
