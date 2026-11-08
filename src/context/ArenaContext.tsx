import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useUserPreferences } from './UserPreferencesContext';
import { useNotifications } from './NotificationsContext';
import { toast } from 'sonner';
import {
  ArenaTopic,
  ArenaArgument,
  ArenaReply,
  ArgumentSide,
  initialArenaTopics,
  initialArenaArguments,
} from '@/data/arena-data';

export interface UserArenaStats {
  xp: number;
  argumentsCreated: number;
  repliesCreated: number;
  votesReceived: number;
  repertoireBadges: number;
  rankTitle: string;
}

export interface ArenaContextType {
  topics: ArenaTopic[];
  selectedTopicId: string;
  selectedTopic: ArenaTopic | undefined;
  setSelectedTopicId: (id: string) => void;
  argumentsList: ArenaArgument[];
  proArguments: ArenaArgument[];
  againstArguments: ArenaArgument[];
  highlightedPro: ArenaArgument | undefined;
  highlightedAgainst: ArenaArgument | undefined;
  userVotes: Set<string>;
  userRepertoireVotes: Set<string>;
  addTopic: (data: { statement: string; category: ArenaTopic['category']; description: string; context?: string }) => void;
  addArgument: (data: { side: ArgumentSide; title: string; content: string; repertoireType?: string; repertoireDetail?: string }) => void;
  addReply: (argumentId: string, content: string, side?: ArgumentSide | 'neutral') => void;
  voteArgument: (argumentId: string) => void;
  voteRepertoire: (argumentId: string) => void;
  userArenaStats: UserArenaStats;
}

const ArenaContext = createContext<ArenaContextType | undefined>(undefined);

const STORAGE_KEY_TOPICS = 'arena_topics_v1';
const STORAGE_KEY_ARGS = 'arena_arguments_v1';
const STORAGE_KEY_VOTES = 'arena_user_votes_v1';
const STORAGE_KEY_REP_VOTES = 'arena_user_rep_votes_v1';

export const ArenaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { sendCustomDeviceNotification } = useNotifications();

  // Tópicos
  const [topics, setTopics] = useState<ArenaTopic[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOPICS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar tópicos da arena:', e);
    }
    return initialArenaTopics;
  });

  const [selectedTopicId, setSelectedTopicId] = useState<string>('topic-1');

  // Argumentos
  const [argumentsList, setArgumentsList] = useState<ArenaArgument[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ARGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar argumentos da arena:', e);
    }
    return initialArenaArguments;
  });

  // Votos do usuário logado
  const [userVotes, setUserVotes] = useState<Set<string>>(() => {
    try {
      const key = `${STORAGE_KEY_VOTES}_${user?.id || 'anon'}`;
      const stored = localStorage.getItem(key);
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {
      console.warn(e);
    }
    return new Set();
  });

  // Votos de repertório do usuário logado
  const [userRepertoireVotes, setUserRepertoireVotes] = useState<Set<string>>(() => {
    try {
      const key = `${STORAGE_KEY_REP_VOTES}_${user?.id || 'anon'}`;
      const stored = localStorage.getItem(key);
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {
      console.warn(e);
    }
    return new Set();
  });

  // Sincroniza persistência de tópicos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(topics));
    } catch (e) {
      console.warn(e);
    }
  }, [topics]);

  // Sincroniza persistência de argumentos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ARGS, JSON.stringify(argumentsList));
    } catch (e) {
      console.warn(e);
    }
  }, [argumentsList]);

  // Sincroniza votos do usuário
  useEffect(() => {
    try {
      const key = `${STORAGE_KEY_VOTES}_${user?.id || 'anon'}`;
      localStorage.setItem(key, JSON.stringify(Array.from(userVotes)));
    } catch (e) {
      console.warn(e);
    }
  }, [userVotes, user]);

  // Sincroniza votos de repertório
  useEffect(() => {
    try {
      const key = `${STORAGE_KEY_REP_VOTES}_${user?.id || 'anon'}`;
      localStorage.setItem(key, JSON.stringify(Array.from(userRepertoireVotes)));
    } catch (e) {
      console.warn(e);
    }
  }, [userRepertoireVotes, user]);

  const selectedTopic = useMemo(() => {
    return topics.find((t) => t.id === selectedTopicId) || topics[0];
  }, [topics, selectedTopicId]);

  // Filtra argumentos para o tópico ativo
  const topicArguments = useMemo(() => {
    return argumentsList.filter((a) => a.topicId === selectedTopicId);
  }, [argumentsList, selectedTopicId]);

  const proArguments = useMemo(() => {
    return topicArguments
      .filter((a) => a.side === 'pro')
      .sort((a, b) => b.votes - a.votes);
  }, [topicArguments]);

  const againstArguments = useMemo(() => {
    return topicArguments
      .filter((a) => a.side === 'against')
      .sort((a, b) => b.votes - a.votes);
  }, [topicArguments]);

  // Destaques (Mais votados de cada lado)
  const highlightedPro = useMemo(() => proArguments[0], [proArguments]);
  const highlightedAgainst = useMemo(() => againstArguments[0], [againstArguments]);

  // Estatísticas do usuário na arena
  const userArenaStats: UserArenaStats = useMemo(() => {
    const myId = user?.id || 'anon';
    const myArgs = argumentsList.filter((a) => a.authorId === myId);
    let myRepliesCount = 0;
    argumentsList.forEach((a) => {
      myRepliesCount += a.replies.filter((r) => r.authorId === myId).length;
    });

    const votesReceived = myArgs.reduce((sum, a) => sum + a.votes, 0);
    const repVotes = myArgs.reduce((sum, a) => sum + a.repertoireVotes, 0);

    // Cálculo de XP da Arena: 50 por argumento + 25 por réplica + 10 por voto recebido + 15 por repertório
    const xp = myArgs.length * 50 + myRepliesCount * 25 + votesReceived * 10 + repVotes * 15;

    let rankTitle = 'Iniciante do Debate';
    if (xp >= 500) rankTitle = 'Mestre da Dialética';
    else if (xp >= 300) rankTitle = 'Orador Estratégico';
    else if (xp >= 150) rankTitle = 'Defensor Argumentativo';
    else if (xp >= 50) rankTitle = 'Debatedor Ativo';

    return {
      xp,
      argumentsCreated: myArgs.length,
      repliesCreated: myRepliesCount,
      votesReceived,
      repertoireBadges: repVotes,
      rankTitle,
    };
  }, [argumentsList, user]);

  // Propor novo tópico
  const addTopic = useCallback(
    (data: { statement: string; category: ArenaTopic['category']; description: string; context?: string }) => {
      const newTopic: ArenaTopic = {
        id: `topic-${Date.now()}`,
        statement: data.statement.trim(),
        category: data.category,
        description: data.description.trim(),
        context: data.context?.trim() || data.description.trim(),
        creatorName: preferences?.full_name || user?.email?.split('@')[0] || 'Estudante',
        createdAt: new Date().toISOString(),
        totalVotesPro: 0,
        totalVotesAgainst: 0,
      };

      setTopics((prev) => [newTopic, ...prev]);
      setSelectedTopicId(newTopic.id);
      toast.success('🎉 Novo debate criado na Arena!', {
        description: '+100 XP por inaugurar um tema de discussão.',
      });
    },
    [preferences, user]
  );

  // Adicionar novo argumento
  const addArgument = useCallback(
    (data: { side: ArgumentSide; title: string; content: string; repertoireType?: string; repertoireDetail?: string }) => {
      if (!selectedTopicId) return;

      const newArg: ArenaArgument = {
        id: `arg-${Date.now()}`,
        topicId: selectedTopicId,
        authorId: user?.id || `user-local-${Date.now()}`,
        authorName: preferences?.full_name || user?.email?.split('@')[0] || 'Estudante',
        authorAvatar: preferences?.avatar_url || null,
        side: data.side,
        title: data.title.trim(),
        content: data.content.trim(),
        votes: 1, // começa com o próprio voto
        repertoireVotes: data.repertoireType ? 1 : 0,
        replies: [],
        createdAt: new Date().toISOString(),
        ...(data.repertoireType?.trim() ? { repertoireType: data.repertoireType.trim() } : {}),
        ...(data.repertoireDetail?.trim() ? { repertoireDetail: data.repertoireDetail.trim() } : {}),
      };

      setArgumentsList((prev) => [newArg, ...prev]);

      // Atualiza contagem no tópico
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id === selectedTopicId) {
            return {
              ...t,
              totalVotesPro: data.side === 'pro' ? t.totalVotesPro + 1 : t.totalVotesPro,
              totalVotesAgainst: data.side === 'against' ? t.totalVotesAgainst + 1 : t.totalVotesAgainst,
            };
          }
          return t;
        })
      );

      // Marca o próprio voto
      setUserVotes((prev) => new Set(prev).add(newArg.id));

      toast.success('🛡️ Argumento defendido na Arena!', {
        description: `Você defendeu o lado ${data.side === 'pro' ? 'A Favor' : 'Contra'} e ganhou +50 XP!`,
      });

      sendCustomDeviceNotification({
        title: '🛡️ Seu argumento foi publicado!',
        body: `Você publicou um argumento na Arena: "${data.title}". A comunidade começará a votar!`,
        url: '/?section=arena',
      });
    },
    [selectedTopicId, user, preferences, sendCustomDeviceNotification]
  );

  // Responder a um argumento de outro estudante
  const addReply = useCallback(
    (argumentId: string, content: string, side: ArgumentSide | 'neutral' = 'neutral') => {
      const newReply: ArenaReply = {
        id: `rep-${Date.now()}`,
        argumentId,
        topicId: selectedTopicId,
        authorId: user?.id || `user-local-${Date.now()}`,
        authorName: preferences?.full_name || user?.email?.split('@')[0] || 'Estudante',
        authorAvatar: preferences?.avatar_url || null,
        side,
        content: content.trim(),
        votes: 0,
        createdAt: new Date().toISOString(),
      };

      setArgumentsList((prev) =>
        prev.map((arg) => {
          if (arg.id === argumentId) {
            return {
              ...arg,
              replies: [...arg.replies, newReply],
            };
          }
          return arg;
        })
      );

      toast.success('💬 Réplica publicada!', {
        description: 'Você rebateu com sucesso e ganhou +25 XP de debate.',
      });
    },
    [selectedTopicId, user, preferences]
  );

  // Votar em argumento convincente
  const voteArgument = useCallback(
    (argumentId: string) => {
      const isVoted = userVotes.has(argumentId);

      setUserVotes((prev) => {
        const next = new Set(prev);
        if (isVoted) {
          next.delete(argumentId);
        } else {
          next.add(argumentId);
        }
        return next;
      });

      setArgumentsList((prev) =>
        prev.map((arg) => {
          if (arg.id === argumentId) {
            const delta = isVoted ? -1 : 1;
            return { ...arg, votes: Math.max(0, arg.votes + delta) };
          }
          return arg;
        })
      );

      // Atualiza o placar geral do tópico
      const targetArg = argumentsList.find((a) => a.id === argumentId);
      if (targetArg) {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id === targetArg.topicId) {
              const delta = isVoted ? -1 : 1;
              return {
                ...t,
                totalVotesPro: targetArg.side === 'pro' ? Math.max(0, t.totalVotesPro + delta) : t.totalVotesPro,
                totalVotesAgainst: targetArg.side === 'against' ? Math.max(0, t.totalVotesAgainst + delta) : t.totalVotesAgainst,
              };
            }
            return t;
          })
        );
      }

      if (!isVoted) {
        toast.success('👍 Voto registrado como Argumento Convincente!', {
          description: 'O autor recebeu +10 XP pelo ponto convincente.',
        });
      }
    },
    [userVotes, argumentsList]
  );

  // Votar em repertório de ouro
  const voteRepertoire = useCallback(
    (argumentId: string) => {
      const isVoted = userRepertoireVotes.has(argumentId);

      setUserRepertoireVotes((prev) => {
        const next = new Set(prev);
        if (isVoted) {
          next.delete(argumentId);
        } else {
          next.add(argumentId);
        }
        return next;
      });

      setArgumentsList((prev) =>
        prev.map((arg) => {
          if (arg.id === argumentId) {
            const delta = isVoted ? -1 : 1;
            return { ...arg, repertoireVotes: Math.max(0, arg.repertoireVotes + delta) };
          }
          return arg;
        })
      );

      if (!isVoted) {
        toast.success('💡 Repertório de Ouro reconhecido!', {
          description: 'Apoio dado ao uso produtivo e legitimado da citação.',
        });
      }
    },
    [userRepertoireVotes]
  );

  return (
    <ArenaContext.Provider
      value={{
        topics,
        selectedTopicId,
        selectedTopic,
        setSelectedTopicId,
        argumentsList: topicArguments,
        proArguments,
        againstArguments,
        highlightedPro,
        highlightedAgainst,
        userVotes,
        userRepertoireVotes,
        addTopic,
        addArgument,
        addReply,
        voteArgument,
        voteRepertoire,
        userArenaStats,
      }}
    >
      {children}
    </ArenaContext.Provider>
  );
};

export const useArena = () => {
  const context = useContext(ArenaContext);
  if (!context) {
    throw new Error('useArena deve ser usado dentro de um ArenaProvider');
  }
  return context;
};

