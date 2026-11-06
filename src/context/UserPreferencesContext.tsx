import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, isLocalEnvironment, LOCAL_DEV_USER } from './AuthContext';
import { toast } from 'sonner';

export interface UserPreferences {
  targetScore: string;
  state?: string | undefined;
  college: string;
  course: string;
  age?: number | undefined;
  full_name?: string | undefined;
  avatar_url?: string | undefined;
  hasCompletedOnboarding: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  savePreferences: (prefs: Omit<UserPreferences, 'hasCompletedOnboarding' | 'avatar_url'>) => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setPreferences(null);
        setIsLoading(false);
        return;
      }

      // Para o usuário do dev local, carrega preferências prontas com onboarding já concluído
      if (isLocalEnvironment() && user.id === LOCAL_DEV_USER.id) {
        try {
          const stored = localStorage.getItem('local_dev_preferences');
          if (stored) {
            setPreferences(JSON.parse(stored));
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Erro ao ler preferências locais:', e);
        }

        const defaultDevPrefs: UserPreferences = {
          targetScore: '960',
          state: 'SP',
          college: 'USP',
          course: 'Medicina',
          age: 18,
          full_name: (user.user_metadata?.['full_name'] as string | undefined) || 'Davi (Dev Local)',
          avatar_url: '',
          hasCompletedOnboarding: true,
        };
        setPreferences(defaultDevPrefs);
        localStorage.setItem('local_dev_preferences', JSON.stringify(defaultDevPrefs));
        localStorage.setItem(`onboarding_${user.id}`, 'true');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        }

        const profileData = data as any;
        const localAvatar = typeof window !== 'undefined' ? localStorage.getItem(`user_avatar_${user.id}`) : null;
        if (profileData) {
          setPreferences({
            targetScore: profileData.target_score || '900',
            state: profileData.state || '',
            college: profileData.college || '',
            course: profileData.course || '',
            age: profileData.age || undefined,
            full_name: profileData.full_name || '',
            avatar_url: profileData.avatar_url || localAvatar || '',
            hasCompletedOnboarding: profileData.has_completed_onboarding || localStorage.getItem(`onboarding_${user.id}`) === 'true',
          });
        } else {
          // Fallback if no row exists yet
          setPreferences({
            targetScore: '900',
            state: '',
            college: '',
            course: '',
            full_name: (user.user_metadata?.['full_name'] as string | undefined) || '',
            avatar_url: (user.user_metadata?.['avatar_url'] as string | undefined) || localAvatar || '',
            hasCompletedOnboarding: localStorage.getItem(`onboarding_${user.id}`) === 'true',
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const savePreferences = async (prefs: Omit<UserPreferences, 'hasCompletedOnboarding' | 'avatar_url'>) => {
    if (!user) return;

    // Salva localmente para o dev local sem depender do banco remoto
    if (isLocalEnvironment() && user.id === LOCAL_DEV_USER.id) {
      const updatedPrefs: UserPreferences = {
        ...prefs,
        avatar_url: preferences?.avatar_url || '',
        hasCompletedOnboarding: true,
      };
      setPreferences(updatedPrefs);
      localStorage.setItem('local_dev_preferences', JSON.stringify(updatedPrefs));
      localStorage.setItem(`onboarding_${user.id}`, 'true');
      toast.success('Perfil atualizado com sucesso!');
      return;
    }

    try {
      const updates = {
        id: user.id,
        target_score: prefs.targetScore,
        state: prefs.state,
        college: prefs.college,
        course: prefs.course,
        age: prefs.age,
        full_name: prefs.full_name,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates as any);

      if (error) {
        console.error('Error saving profile to Supabase (falling back to local):', error);
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }

      // Save locally as a robust fallback
      localStorage.setItem(`onboarding_${user.id}`, 'true');

      setPreferences((prev) => ({
        ...prev,
        ...prefs,
        hasCompletedOnboarding: true,
        avatar_url: prev?.avatar_url || '',
      }));
      
    } catch (error: any) {
      console.error('Unexpected error in savePreferences:', error);
      toast.error(`Erro inesperado ao salvar perfil`);
    }
  };

  const updateAvatar = async (avatarUrl: string) => {
    if (!user) return;

    // Atualiza estado local de imediato
    setPreferences((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));

    try {
      if (avatarUrl) {
        localStorage.setItem(`user_avatar_${user.id}`, avatarUrl);
      } else {
        localStorage.removeItem(`user_avatar_${user.id}`);
      }
    } catch (e) {
      console.warn('Storage warning:', e);
    }

    if (isLocalEnvironment() && user.id === LOCAL_DEV_USER.id) {
      try {
        const stored = localStorage.getItem('local_dev_preferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.avatar_url = avatarUrl;
          localStorage.setItem('local_dev_preferences', JSON.stringify(parsed));
        }
      } catch {}
      toast.success(avatarUrl ? 'Foto de perfil atualizada!' : 'Foto de perfil removida!');
      return;
    }

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      } as any);

      if (error) {
        console.warn('Aviso ao sincronizar avatar com Supabase:', error);
      }

      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      }).catch(() => {});

      toast.success(avatarUrl ? 'Foto de perfil atualizada com sucesso!' : 'Foto de perfil removida!');
    } catch (err) {
      console.error('Falha ao atualizar foto:', err);
      toast.success(avatarUrl ? 'Foto de perfil atualizada!' : 'Foto removida!');
    }
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, savePreferences, updateAvatar, isLoading }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

