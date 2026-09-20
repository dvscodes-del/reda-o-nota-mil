import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface UserPreferences {
  targetScore: string;
  state?: string;
  college: string;
  course: string;
  age?: number;
  full_name?: string;
  avatar_url?: string;
  hasCompletedOnboarding: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  savePreferences: (prefs: Omit<UserPreferences, 'hasCompletedOnboarding' | 'avatar_url'>) => Promise<void>;
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

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        }

        if (data) {
          setPreferences({
            targetScore: data.target_score || '900',
            state: data.state || '',
            college: data.college || '',
            course: data.course || '',
            age: data.age || undefined,
            full_name: data.full_name || '',
            avatar_url: data.avatar_url || '',
            hasCompletedOnboarding: data.has_completed_onboarding || false,
          });
        } else {
          setPreferences(null);
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

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      setPreferences((prev) => ({
        ...prev,
        ...prefs,
        hasCompletedOnboarding: true,
        avatar_url: prev?.avatar_url || '',
      }));
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(`Erro ao salvar perfil: ${error.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, savePreferences, isLoading }}>
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

