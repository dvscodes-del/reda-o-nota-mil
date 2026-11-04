import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  mockSignIn: () => void;
  isLocalDev: boolean;
}

/**
 * Identifica se a aplicação está rodando estritamente no ambiente local (localhost / 127.0.0.1).
 * Não afeta produção, deploys ou previews remotos do Lovable/Vercel.
 */
export const isLocalEnvironment = (): boolean => {
  if (typeof window === 'undefined') {
    return process.env['NODE_ENV'] === 'development';
  }
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0';
  return Boolean(import.meta.env.DEV && isLocalHost);
};

export const LOCAL_DEV_USER: User = {
  id: '00000000-0000-4000-a000-000000000001',
  app_metadata: { provider: 'email' },
  user_metadata: {
    full_name: 'Davi (Dev Local)',
    name: 'Davi (Dev Local)',
    avatar_url: '',
  },
  aud: 'authenticated',
  created_at: '2025-01-01T00:00:00.000Z',
  email: 'davi.dev@local.escreva',
  phone: '',
  role: 'authenticated',
  updated_at: '2025-01-01T00:00:00.000Z',
} as User;

export const LOCAL_DEV_SESSION: Session = {
  access_token: 'local-dev-mock-token',
  token_type: 'bearer',
  expires_in: 315360000,
  expires_at: Math.floor(Date.now() / 1000) + 315360000,
  refresh_token: 'local-dev-mock-refresh-token',
  user: LOCAL_DEV_USER,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLocal = isLocalEnvironment();

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // SÓ NO AMBIENTE LOCAL: entra automaticamente logado
      if (isLocal) {
        const isExplicitlyLoggedOut = typeof window !== 'undefined' && sessionStorage.getItem('local_dev_logged_out') === 'true';

        if (!isExplicitlyLoggedOut) {
          // Se houver uma sessão real do Supabase no ambiente local, aproveita ela; senão usa o mock dev
          try {
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession?.user && isMounted) {
              setSession(existingSession);
              setUser(existingSession.user);
              setIsLoading(false);
              return;
            }
          } catch {
            // Se falhar a checagem no Supabase, continua para o mock dev
          }

          if (isMounted) {
            setSession(LOCAL_DEV_SESSION);
            setUser(LOCAL_DEV_USER);
            setIsLoading(false);
          }
          return;
        }
      }

      // Fluxo padrão para produção ou caso o usuário tenha clicado em "Sair" localmente
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erro ao recuperar sessão:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Ouvinte para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        setIsLoading(false);
      } else if (isLocal) {
        const isExplicitlyLoggedOut = typeof window !== 'undefined' && sessionStorage.getItem('local_dev_logged_out') === 'true';
        if (!isExplicitlyLoggedOut) {
          setSession(LOCAL_DEV_SESSION);
          setUser(LOCAL_DEV_USER);
        } else {
          setSession(null);
          setUser(null);
        }
        setIsLoading(false);
      } else {
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isLocal]);

  const signOut = async () => {
    if (isLocal && typeof window !== 'undefined') {
      sessionStorage.setItem('local_dev_logged_out', 'true');
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setSession(null);
    setUser(null);
  };

  const mockSignIn = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('local_dev_logged_out');
    }
    setUser(LOCAL_DEV_USER);
    setSession(LOCAL_DEV_SESSION);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut, mockSignIn, isLocalDev: isLocal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

