import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Search, Award, MapPin, Calendar, Target, UserPlus, 
  MessageCircle, Medal, BrainCircuit, BookOpen, Flame, 
  FileText, ArrowRight, CheckCircle2, Camera, Trash2, Loader2,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type ExtendedProfile = Profile & {
  email?: string | null;
  course: string | null;
  college: string | null;
  age: number | null;
  gender?: string | null;
  state: string | null;
};

export function StudentProfile({ 
  onOpen, 
  goTo,
  onStartChat,
  targetProfile,
  onBackToMyProfile,
}: { 
  onOpen: (essay: any) => void;
  goTo: (section: string) => void;
  onStartChat: (profile: any) => void;
  targetProfile?: any | null;
  onBackToMyProfile?: () => void;
}) {
  const { preferences, updateAvatar } = useUserPreferences();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [viewingProfile, setViewingProfile] = useState<ExtendedProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega meu próprio perfil
  const loadMyProfile = useCallback(async () => {
    if (!user) return;
    setViewingProfile({
      id: user.id,
      name: preferences?.full_name || (user.user_metadata?.['name'] as string | undefined) || user.email?.split('@')[0] || "Estudante",
      avatar_url: preferences?.avatar_url || (user.user_metadata?.['avatar_url'] as string | undefined) || null,
      email: user.email || null,
      course: preferences?.course || "Curso Desejado",
      college: preferences?.college || "Universidade",
      age: preferences?.age || null,
      gender: preferences?.gender || (user.user_metadata?.['gender'] as string | undefined) || null,
      state: preferences?.state || "SP"
    });
    
    try {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
      setFollowersCount(count || 0);
    } catch {
      // ignore
    }
  }, [user, preferences]);

  // Carrega perfil de outro estudante
  const loadTargetStudent = useCallback(async (target: any) => {
    if (!target) return;
    if (user && target.id === user.id) {
      loadMyProfile();
      return;
    }

    setViewingProfile({
      id: target.id,
      name: target.name || target.full_name || "Estudante",
      avatar_url: target.avatar || target.avatar_url || null,
      email: target.email || null,
      course: target.course || "Não informado",
      college: target.college || "Não informado",
      age: target.age || null,
      gender: target.gender || null,
      state: target.state || "Não informado"
    });

    try {
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", target.id)
        .maybeSingle();

      if (dbProfile) {
        setViewingProfile({
          id: dbProfile.id,
          name: dbProfile.full_name || target.name || "Estudante",
          avatar_url: dbProfile.avatar_url || target.avatar || null,
          email: null,
          course: dbProfile.course || "Vestibulando",
          college: dbProfile.college || "Universidade",
          age: dbProfile.age || null,
          gender: null,
          state: dbProfile.state || "SP"
        });
      }

      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', target.id);
      setFollowersCount(count || 0);

      if (user) {
        const { data: followRel } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', target.id)
          .maybeSingle();
        setIsFollowing(!!followRel);
      }
    } catch {
      // ignore
    }
  }, [user, loadMyProfile]);

  useEffect(() => {
    if (targetProfile) {
      loadTargetStudent(targetProfile);
    } else {
      loadMyProfile();
    }
  }, [targetProfile, loadTargetStudent, loadMyProfile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem (JPEG, PNG ou WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
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
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          updateAvatar(dataUrl);
          setViewingProfile(prev => prev ? { ...prev, avatar_url: dataUrl } : null);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        toast.error('Não foi possível processar a imagem selecionada.');
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    updateAvatar('');
    setViewingProfile(prev => prev ? { ...prev, avatar_url: null } : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Função para buscar alunos no banco
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name:full_name, avatar_url, course, college, age, state')
      .ilike('full_name', `%${searchQuery}%`)
      .limit(5);
      
    if (error) console.error("Search error:", error);
    if (data) setSearchResults(data);
  };

  // Busca inteligente em tempo real com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carrega o perfil selecionado da busca
  const loadProfile = async (profile: any) => {
    setViewingProfile({
      ...profile,
      course: profile.course || "Não informado",
      college: profile.college || "Não informado",
      age: profile.age || null,
      state: profile.state || "Não informado"
    });
    setSearchResults([]);
    setSearchQuery("");
    
    // Busca número de seguidores
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id);
    setFollowersCount(count || 0);

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
      setFollowersCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: viewingProfile.id
        });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  // Redações recentes (nenhuma ainda)
  const recentEssays: any[] = [];

  if (!viewingProfile) return null;

  const isOwnProfile = user?.id === viewingProfile.id;
  const name = viewingProfile.name || "Estudante";

  return (
    <>
      {!isOwnProfile && (
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBackToMyProfile ? onBackToMyProfile() : goTo("perfil")}
            className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Voltar ao meu perfil</span>
          </Button>
          <span className="text-xs text-muted-foreground font-medium">Visualizando perfil da comunidade</span>
        </div>
      )}

      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-2 shadow-sm">
          <div className="flex flex-1 items-center gap-2 px-2 sm:px-3 text-muted-foreground min-w-0">
            <Search className="size-4 sm:size-5 shrink-0" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar estudantes por nome..." 
              className="w-full bg-transparent p-1.5 sm:p-2 text-sm text-foreground outline-none placeholder:text-muted-foreground min-w-0" 
            />
          </div>
          <Button onClick={handleSearch} className="rounded-lg shrink-0 px-3 sm:px-4">Buscar</Button>
        </div>
        
        {/* Dropdown de resultados */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto z-20">
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
          {/* Avatar com ação de troca de foto */}
          <div className="relative group shrink-0">
            <div 
              onClick={() => isOwnProfile && !isUploading && fileInputRef.current?.click()}
              className={`relative grid size-32 place-items-center rounded-full bg-background text-primary text-4xl font-black border-4 border-primary-foreground/20 shadow-lg overflow-hidden transition-all ${
                isOwnProfile ? 'cursor-pointer hover:ring-4 hover:ring-primary-foreground/40' : ''
              }`}
              title={isOwnProfile ? "Clique para mudar a foto de perfil" : undefined}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center gap-1 text-primary">
                  <Loader2 className="size-8 animate-spin" />
                  <span className="text-[10px] font-bold">Salvando...</span>
                </div>
              ) : viewingProfile.avatar_url ? (
                <img src={viewingProfile.avatar_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                name.substring(0, 2).toUpperCase()
              )}

              {/* Overlay suave ao passar o mouse */}
              {isOwnProfile && !isUploading && (
                <div className="absolute inset-0 bg-black/45 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="size-6 mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Alterar</span>
                </div>
              )}
            </div>

            {/* Botão de câmera flutuante */}
            {isOwnProfile && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 size-9 rounded-full bg-background text-primary shadow-md hover:bg-accent border-2 border-primary-foreground/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  title="Mudar foto de perfil"
                  aria-label="Mudar foto de perfil"
                  disabled={isUploading}
                >
                  <Camera className="size-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h2 className="text-3xl font-bold md:text-4xl capitalize">{name}</h2>
              {isOwnProfile && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="size-3.5" />
                    {viewingProfile.avatar_url ? "Mudar foto" : "Adicionar foto"}
                  </button>
                  {viewingProfile.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploading}
                      className="text-xs text-primary-foreground/70 hover:text-white underline flex items-center gap-1 transition-colors"
                      title="Remover foto de perfil"
                    >
                      <Trash2 className="size-3" /> Remover
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-primary-foreground/80 font-medium">
              <span className="flex items-center gap-1"><MapPin className="size-4" /> {viewingProfile.state}, Brasil</span>
              {viewingProfile.age && <span className="flex items-center gap-1"><Calendar className="size-4" /> {viewingProfile.age} anos</span>}
              {viewingProfile.gender && <span className="flex items-center gap-1 bg-primary-foreground/15 px-2.5 py-0.5 rounded-full text-xs font-semibold">{viewingProfile.gender}</span>}
              <span className="flex items-center gap-1"><Target className="size-4" /> Foco: {viewingProfile.course} ({viewingProfile.college})</span>
              <span className="flex items-center gap-1 bg-primary-foreground/20 px-3 py-1 rounded-full"><UserPlus className="size-4" /> {followersCount} seguidores</span>
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
                <Button size="sm" variant="outline" onClick={() => onStartChat(viewingProfile)} className="rounded-full border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"><MessageCircle className="mr-2 size-4" /> Mensagem</Button>
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
        <div className="bg-muted/50 rounded-xl p-8 border border-dashed border-border text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Award className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-semibold text-lg">Em breve!</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            Nenhuma conquista desbloqueada ainda. Continue praticando para ganhar emblemas!
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="size-5 text-primary" /> Portfólio de Redações</h3>
        {recentEssays.length > 0 ? (
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
        ) : (
          <div className="bg-muted/50 rounded-xl p-8 border border-dashed border-border text-center flex flex-col items-center justify-center">
            <p className="text-muted-foreground text-sm">Nenhuma redação publicada ainda.</p>
          </div>
        )}
      </div>
    </>
  );
}
