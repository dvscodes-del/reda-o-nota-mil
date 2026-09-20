import { useState, useEffect } from "react";
import { 
  Search, Award, MapPin, Calendar, Target, UserPlus, 
  MessageCircle, Medal, BrainCircuit, BookOpen, Flame, 
  FileText, ArrowRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

// Extending standard profile type for the view
type ExtendedProfile = Profile & {
  course: string;
  college: string;
  age: number;
  state: string;
};

export function StudentProfile({ 
  onOpen, 
  goTo 
}: { 
  onOpen: (essay: any) => void;
  goTo: (section: string) => void;
}) {
  const { preferences } = useUserPreferences();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [viewingProfile, setViewingProfile] = useState<ExtendedProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  // Inicializa o perfil visualizado como o próprio usuário se nada estiver selecionado
  useEffect(() => {
    if (user && !viewingProfile) {
      setViewingProfile({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || "Estudante",
        avatar_url: user.user_metadata?.avatar_url || null,
        email: user.email || null,
        course: preferences?.course || "Curso Desejado",
        college: preferences?.college || "Universidade",
        age: 17,
        state: "SP"
      });
    }
  }, [user, preferences, viewingProfile]);

  // Função para buscar alunos no banco
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .ilike('name', `%${searchQuery}%`)
      .limit(5);
      
    if (error) console.error("Search error:", error);
    if (data) setSearchResults(data);
  };

  // Carrega o perfil selecionado da busca
  const loadProfile = async (profile: Profile) => {
    setViewingProfile({
      ...profile,
      // Como não temos esses dados no public.profiles ainda, mockamos
      course: "Medicina",
      college: "USP",
      age: 18,
      state: "RJ"
    });
    setSearchResults([]);
    setSearchQuery("");
    
    // Verifica se já sigo esse usuário
    if (user && profile.id !== user.id) {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profile.id)
        .maybeSingle();
      
      setIsFollowing(!!data);
    }
  };

  const toggleFollow = async () => {
    if (!user || !viewingProfile || viewingProfile.id === user.id) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', viewingProfile.id);
      setIsFollowing(false);
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: viewingProfile.id
        });
      setIsFollowing(true);
    }
  };

  // Redações recentes mockadas (ideal seria carregar do banco de dados)
  const recentEssays = [
    {
      title: "Desafios do envelhecimento populacional",
      author: `${viewingProfile?.name} · 920 pontos`,
      intro: "No filme 'Up - Altas Aventuras', a solidão da terceira idade é retratada de forma sensível...",
      text: ["No filme 'Up - Altas Aventuras'..."],
      date: "Há 2 dias",
      score: 920
    }
  ];

  if (!viewingProfile) return null;

  const isOwnProfile = user?.id === viewingProfile.id;
  const name = viewingProfile.name || "Estudante";

  return (
    <>
      <div className="mb-8 relative z-50">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-2 shadow-sm">
          <div className="flex flex-1 items-center gap-2 px-3 text-muted-foreground">
            <Search className="size-5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar estudantes por nome..." 
              className="w-full bg-transparent p-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" 
            />
          </div>
          <Button onClick={handleSearch} className="rounded-lg">Buscar</Button>
        </div>
        
        {/* Dropdown de resultados */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto z-50">
            {searchResults.map(p => (
              <div 
                key={p.id} 
                onClick={() => loadProfile(p)}
                className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary font-bold">
                    {p.name ? p.name.substring(0,2).toUpperCase() : "US"}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm">{p.name || "Estudante"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative mb-10 overflow-hidden rounded-2xl bg-primary p-6 md:p-10 text-primary-foreground shadow-sm">
        <div className="absolute right-0 top-0 opacity-20"><Award className="size-64 -translate-y-10 translate-x-10" /></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-end">
          <div className="grid size-32 place-items-center rounded-full bg-background text-primary text-4xl font-black border-4 border-primary-foreground/20 shadow-lg overflow-hidden">
            {viewingProfile.avatar_url ? (
              <img src={viewingProfile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold md:text-4xl capitalize">{name}</h2>
            <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-primary-foreground/80 font-medium">
              <span className="flex items-center gap-1"><MapPin className="size-4" /> {viewingProfile.state}, Brasil</span>
              <span className="flex items-center gap-1"><Calendar className="size-4" /> {viewingProfile.age} anos</span>
              <span className="flex items-center gap-1"><Target className="size-4" /> Foco: {viewingProfile.course} ({viewingProfile.college})</span>
            </div>
            
            {!isOwnProfile && (
              <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Button 
                  size="sm" 
                  variant={isFollowing ? "outline" : "secondary"}
                  onClick={toggleFollow}
                  className={`rounded-full ${isFollowing ? 'border-primary-foreground/30 bg-transparent text-primary-foreground' : 'bg-background text-primary hover:bg-background/90'}`}
                >
                  {isFollowing ? <CheckCircle2 className="mr-2 size-4" /> : <UserPlus className="mr-2 size-4" />} 
                  {isFollowing ? "Seguindo" : "Seguir"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => goTo("mensagens")} className="rounded-full border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"><MessageCircle className="mr-2 size-4" /> Mensagem</Button>
              </div>
            )}
          </div>
          <div className="mt-4 md:mt-0 px-5 py-3 rounded-xl bg-background text-foreground text-center shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Média Atual</p>
            <p className="text-3xl font-black text-primary">900</p>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Medal className="size-5 text-primary" /> Conquistas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full mb-3"><Award className="size-8" /></div>
            <h4 className="font-bold text-sm">Redação Ouro</h4>
            <p className="text-xs text-muted-foreground mt-1">Atingiu 900+ pontos em 3 redações seguidas.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full mb-3"><BrainCircuit className="size-8" /></div>
            <h4 className="font-bold text-sm">Argumentador Nato</h4>
            <p className="text-xs text-muted-foreground mt-1">Tirou nota máxima na Competência 3.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="size-5 text-primary" /> Portfólio de Redações</h3>
        <div className="grid gap-5 md:grid-cols-2">
          {recentEssays.map((essay) => (
            <article key={essay.title} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">{essay.date}</span>
                <span className="text-xl font-black text-primary">{essay.score} pts</span>
              </div>
              <h4 className="text-lg font-bold leading-snug group-hover:text-primary mb-2">{essay.title}</h4>
              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground mb-6">{essay.intro}</p>
              <Button onClick={() => onOpen(essay)} variant="secondary" className="w-full rounded-xl">
                Ler redação completa <ArrowRight className="ml-2 size-4" />
              </Button>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
