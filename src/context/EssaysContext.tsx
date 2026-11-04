import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, isLocalEnvironment, LOCAL_DEV_USER } from './AuthContext';
import { toast } from 'sonner';

export interface CompletedEssay {
  id: string;
  user_id: string;
  theme_day: number;
  theme_topic: string;
  essay_text: string;
  score: number;
  competencies?: Array<{
    name: string;
    score: number;
    feedback: string;
  }> | undefined;
  strengths?: string[] | undefined;
  improvements?: string[] | undefined;
  annotations?: Array<{
    excerpt: string;
    suggestion: string;
    type: 'acerto' | 'erro';
  }> | undefined;
  created_at: string;
}

export interface EssaysContextType {
  essays: CompletedEssay[];
  isLoading: boolean;
  getEssayForTheme: (themeDay: number) => CompletedEssay | undefined;
  saveEssay: (data: {
    theme_day: number;
    theme_topic: string;
    essay_text: string;
    score: number;
    competencies?: any[];
    strengths?: string[];
    improvements?: string[];
    annotations?: any[];
  }) => Promise<CompletedEssay | null>;
  deleteEssay: (id: string) => Promise<void>;
  stats: {
    totalCompleted: number;
    averageScore: number;
    recentScores: number[];
    evolutionPercent: number;
  };
}

const EssaysContext = createContext<EssaysContextType | undefined>(undefined);

export const EssaysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [essays, setEssays] = useState<CompletedEssay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega as redações do banco de dados (com fallback no localStorage)
  useEffect(() => {
    if (!user) {
      setEssays([]);
      setIsLoading(false);
      return;
    }

    const loadEssays = async () => {
      setIsLoading(true);
      const storageKey = `user_essays_${user.id}`;
      let localData: CompletedEssay[] = [];

      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          localData = JSON.parse(cached);
          setEssays(localData);
        }
      } catch (err) {
        console.warn('Erro ao ler cache local de redações:', err);
      }

      // Se for usuário dev local e offline, mantém o cache local
      if (isLocalEnvironment() && user.id === LOCAL_DEV_USER.id) {
        setIsLoading(false);
        return;
      }

      // Tenta sincronizar com o banco de dados Supabase
      try {
        const { data, error } = await (supabase as any)
          .from('essays')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          // Normaliza os dados retornados do Supabase
          const formatted: CompletedEssay[] = data.map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            theme_day: item.theme_day,
            theme_topic: item.theme_topic,
            essay_text: item.essay_text,
            score: Number(item.score) || 0,
            competencies: item.competencies,
            strengths: item.strengths,
            improvements: item.improvements,
            annotations: item.annotations,
            created_at: item.created_at || new Date().toISOString(),
          }));

          setEssays(formatted);
          localStorage.setItem(storageKey, JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn('Supabase essays table offline ou não criada ainda. Usando persistência local segura.', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEssays();
  }, [user]);

  // Busca redação completada para um determinado dia da trilha
  const getEssayForTheme = (themeDay: number): CompletedEssay | undefined => {
    return essays.find((e) => e.theme_day === themeDay);
  };

  // Salva redação corrigida no banco de dados e localmente
  const saveEssay = async (data: {
    theme_day: number;
    theme_topic: string;
    essay_text: string;
    score: number;
    competencies?: any[];
    strengths?: string[];
    improvements?: string[];
    annotations?: any[];
  }): Promise<CompletedEssay | null> => {
    if (!user) {
      toast.error('Você precisa estar conectado para salvar a redação.');
      return null;
    }

    const storageKey = `user_essays_${user.id}`;
    const newEssay: CompletedEssay = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `essay_${Date.now()}`,
      user_id: user.id,
      theme_day: data.theme_day,
      theme_topic: data.theme_topic,
      essay_text: data.essay_text,
      score: Math.round(data.score),
      competencies: data.competencies,
      strengths: data.strengths,
      improvements: data.improvements,
      annotations: data.annotations,
      created_at: new Date().toISOString(),
    };

    // Atualiza estado local de imediato (substitui caso já tenha feito o mesmo dia antes)
    setEssays((prev) => {
      const filtered = prev.filter((e) => e.theme_day !== data.theme_day);
      const updated = [newEssay, ...filtered];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
      }
      return updated;
    });

    // Se não for dev local, sincroniza no Supabase
    if (!(isLocalEnvironment() && user.id === LOCAL_DEV_USER.id)) {
      try {
        const payload = {
          id: newEssay.id,
          user_id: user.id,
          theme_day: newEssay.theme_day,
          theme_topic: newEssay.theme_topic,
          essay_text: newEssay.essay_text,
          score: newEssay.score,
          competencies: newEssay.competencies,
          strengths: newEssay.strengths,
          improvements: newEssay.improvements,
          annotations: newEssay.annotations,
          created_at: newEssay.created_at,
          updated_at: new Date().toISOString(),
        };

        const { error } = await (supabase as any).from('essays').upsert(payload);
        if (error) {
          console.warn('Não foi possível gravar na tabela Supabase essays (usando cache local):', error);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar com Supabase:', err);
      }
    }

    toast.success(`Redação do dia ${data.theme_day} salva com nota ${newEssay.score}!`);
    return newEssay;
  };

  const deleteEssay = async (id: string) => {
    if (!user) return;
    const storageKey = `user_essays_${user.id}`;

    setEssays((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (!(isLocalEnvironment() && user.id === LOCAL_DEV_USER.id)) {
      try {
        await (supabase as any).from('essays').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar do Supabase:', err);
      }
    }
  };

  // Estatísticas calculadas em tempo real com base no banco
  const stats = useMemo(() => {
    const totalCompleted = essays.length;
    if (totalCompleted === 0) {
      return {
        totalCompleted: 0,
        averageScore: 0,
        recentScores: [0, 0, 0, 0, 0],
        evolutionPercent: 0,
      };
    }

    const sum = essays.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = Math.round(sum / totalCompleted);

    // Últimas 5 redações ordenadas do mais antigo ao mais recente para o gráfico
    const last5 = [...essays]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-5)
      .map((e) => e.score);

    // Completa com 0 até 5 elementos para o gráfico
    const recentScores: number[] = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      const idx = last5.length - 1 - i;
      const scoreIdx = 4 - i;
      if (idx >= 0 && last5[idx] !== undefined) {
        recentScores[scoreIdx] = last5[idx]!;
      }
    }

    // Calcula evolução entre a primeira e a última redação
    let evolutionPercent = 0;
    if (last5.length >= 2 && last5[0] && last5[0] > 0) {
      const first = last5[0];
      const last = last5[last5.length - 1] ?? first;
      evolutionPercent = Math.round(((last - first) / first) * 100);
    }

    return {
      totalCompleted,
      averageScore,
      recentScores,
      evolutionPercent,
    };
  }, [essays]);

  return (
    <EssaysContext.Provider
      value={{
        essays,
        isLoading,
        getEssayForTheme,
        saveEssay,
        deleteEssay,
        stats,
      }}
    >
      {children}
    </EssaysContext.Provider>
  );
};

export const useEssays = () => {
  const context = useContext(EssaysContext);
  if (!context) {
    throw new Error('useEssays must be used within an EssaysProvider');
  }
  return context;
};
