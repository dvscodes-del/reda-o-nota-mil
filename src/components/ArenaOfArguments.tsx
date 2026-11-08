import { useState, useMemo } from 'react';
import {
  Swords,
  Flame,
  Award,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  BookOpen,
  Send,
  Plus,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Scale,
  Shield,
  HelpCircle,
  Share2,
  Zap,
  ArrowRight,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useArena } from '@/context/ArenaContext';
import { ArenaArgument, ArenaTopic, ArgumentSide } from '@/data/arena-data';

interface ArenaOfArgumentsProps {
  goTo: (section: any) => void;
  onStartChat?: (profile: any) => void;
}

export function ArenaOfArguments({ goTo, onStartChat }: ArenaOfArgumentsProps) {
  const {
    topics,
    selectedTopic,
    selectedTopicId,
    setSelectedTopicId,
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
  } = useArena();

  // Estados locais
  const [filterSide, setFilterSide] = useState<'all' | 'pro' | 'against'>('all');
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [expandedArgId, setExpandedArgId] = useState<string | null>(null);

  // Formulário de novo argumento
  const [newArgSide, setNewArgSide] = useState<ArgumentSide>('pro');
  const [newArgTitle, setNewArgTitle] = useState('');
  const [newArgContent, setNewArgContent] = useState('');
  const [newArgRepType, setNewArgRepType] = useState('Filosofia / Teoria Social');
  const [newArgRepDetail, setNewArgRepDetail] = useState('');

  // Formulário de réplica
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replySideMap, setReplySideMap] = useState<Record<string, ArgumentSide>>({});

  // Formulário de novo tópico
  const [newStatement, setNewStatement] = useState('');
  const [newCategory, setNewCategory] = useState<ArenaTopic['category']>('Tecnologia');
  const [newDescription, setNewDescription] = useState('');

  // Cálculos do termômetro de opinião
  const totalVotes = useMemo(() => {
    if (!selectedTopic) return { pro: 0, against: 0, total: 0, proPercent: 50, againstPercent: 50 };
    const pro = proArguments.reduce((sum, a) => sum + a.votes, 0) + (selectedTopic.totalVotesPro || 0);
    const against = againstArguments.reduce((sum, a) => sum + a.votes, 0) + (selectedTopic.totalVotesAgainst || 0);
    const total = pro + against || 1;
    const proPercent = Math.round((pro / total) * 100);
    const againstPercent = 100 - proPercent;
    return { pro, against, total, proPercent, againstPercent };
  }, [selectedTopic, proArguments, againstArguments]);

  const handleSubmitArgument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArgTitle.trim() || !newArgContent.trim()) return;

    addArgument({
      side: newArgSide,
      title: newArgTitle,
      content: newArgContent,
      ...(newArgRepDetail.trim() ? { repertoireType: newArgRepType, repertoireDetail: newArgRepDetail.trim() } : {}),
    });

    setNewArgTitle('');
    setNewArgContent('');
    setNewArgRepDetail('');
  };

  const handleSendReply = (argId: string) => {
    const text = replyTextMap[argId]?.trim();
    if (!text) return;
    const side = replySideMap[argId] || (newArgSide === 'pro' ? 'pro' : 'against');

    addReply(argId, text, side);
    setReplyTextMap((prev) => ({ ...prev, [argId]: '' }));
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatement.trim() || !newDescription.trim()) return;

    addTopic({
      statement: newStatement,
      category: newCategory,
      description: newDescription,
    });

    setNewStatement('');
    setNewDescription('');
    setIsNewTopicModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header Principal da Arena */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-accent/20 to-primary/5 p-6 shadow-sm md:p-10">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Swords className="size-3.5" />
              Arena de Argumentos
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
              Duelo de Ideias & Dialética
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
              Receba uma afirmação instigante, defenda seu ponto de vista com repertório legítimo, enfrente os argumentos dos colegas e ganhe pontuação por persuasão.
            </p>
          </div>

          {/* Card de Estatísticas do Usuário na Arena */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Flame className="size-6 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-muted-foreground">Seu Nível de Debate</span>
                <strong className="block text-base font-extrabold text-foreground">{userArenaStats.rankTitle}</strong>
                <span className="text-xs font-semibold text-primary">{userArenaStats.xp} XP acumulados</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div className="text-center sm:text-left">
                <span className="text-xs text-muted-foreground">Argumentos</span>
                <strong className="block text-lg font-black text-foreground">{userArenaStats.argumentsCreated}</strong>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs text-muted-foreground">Apoios Recebidos</span>
                <strong className="block text-lg font-black text-success">+{userArenaStats.votesReceived}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Afirmações / Debates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Scale className="size-4 text-primary" />
            Escolha uma Afirmação para Debater
          </div>
          <Button
            size="sm"
            onClick={() => setIsNewTopicModalOpen(true)}
            className="rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" />
            Propor Nova Afirmação
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {topics.map((t) => {
            const isSelected = t.id === selectedTopicId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTopicId(t.id)}
                className={`flex w-72 shrink-0 flex-col justify-between rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div>
                  <Badge variant="secondary" className="mb-2 text-[10px] font-bold">
                    {t.category}
                  </Badge>
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                    {t.statement}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground border-t border-border/60 pt-2">
                  <span className="text-success">A Favor: {t.totalVotesPro}</span>
                  <span className="text-destructive">Contra: {t.totalVotesAgainst}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Placar do Duelo Atual */}
      {selectedTopic && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-primary">
              <Sparkles className="size-3.5" /> Duelo em Destaque · Categoria: {selectedTopic.category}
            </span>
            <span className="text-xs text-muted-foreground">
              Proposto por <strong>{selectedTopic.creatorName}</strong>
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-black leading-tight text-foreground md:text-3xl">
              “{selectedTopic.statement}”
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {selectedTopic.context}
            </p>
          </div>

          {/* Termômetro de Votação da Comunidade */}
          <div className="mt-6 rounded-2xl border border-border bg-accent/30 p-5">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <div className="flex items-center gap-1.5 text-success">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span>A FAVOR ({totalVotes.proPercent}%)</span>
                <span className="text-muted-foreground font-normal">· {totalVotes.pro} apoios</span>
              </div>
              <div className="flex items-center gap-1.5 text-destructive">
                <span className="text-muted-foreground font-normal">{totalVotes.against} apoios ·</span>
                <span>CONTRA ({totalVotes.againstPercent}%)</span>
                <span className="size-2 rounded-full bg-destructive animate-pulse" />
              </div>
            </div>

            <div className="relative h-4 w-full overflow-hidden rounded-full bg-destructive/30">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700 ease-out"
                style={{ width: `${totalVotes.proPercent}%` }}
              />
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Total de <strong>{totalVotes.pro + totalVotes.against}</strong> votos e avaliações registrados pela comunidade.
            </p>
          </div>

          {/* Destaque dos Melhores Argumentos da Comunidade (Se existirem) */}
          {(highlightedPro || highlightedAgainst) && (
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-600 dark:text-amber-400 mb-4">
                <Award className="size-4" /> Melhores Argumentos Eleitos pela Comunidade
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {highlightedPro && (
                  <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        🏆 Melhor Defesa A Favor
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {highlightedPro.votes} votos
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm">{highlightedPro.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {highlightedPro.content}
                    </p>
                    {highlightedPro.repertoireDetail && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        <BookOpen className="size-3.5" />
                        <span className="truncate">{highlightedPro.repertoireDetail}</span>
                      </div>
                    )}
                  </div>
                )}

                {highlightedAgainst && (
                  <div className="rounded-2xl border-2 border-rose-500/30 bg-rose-500/5 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                        🏆 Melhor Defesa Contra
                      </span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {highlightedAgainst.votes} votos
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm">{highlightedAgainst.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {highlightedAgainst.content}
                    </p>
                    {highlightedAgainst.repertoireDetail && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                        <BookOpen className="size-3.5" />
                        <span className="truncate">{highlightedAgainst.repertoireDetail}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulário: Publicar Argumento na Arena */}
      <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-primary">
          <Zap className="size-4" />
          Entre no Debate: Defenda seu Ponto de Vista
        </div>
        <h2 className="mt-1 text-xl font-black text-foreground md:text-2xl">
          Construa sua tese para este tema
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Estruture seu argumento com raciocínio lógico e cite repertórios para ganhar mais votos e pontuação.
        </p>

        <form onSubmit={handleSubmitArgument} className="mt-6 space-y-4">
          {/* Seletor de Lado */}
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">
              Escolha sua posição nesta afirmação:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewArgSide('pro')}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 font-bold transition-all ${
                  newArgSide === 'pro'
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'border-border bg-card text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
                }`}
              >
                <CheckCircle2 className="size-4" />
                Defender: A FAVOR
              </button>

              <button
                type="button"
                onClick={() => setNewArgSide('against')}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 font-bold transition-all ${
                  newArgSide === 'against'
                    ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'border-border bg-card text-muted-foreground hover:border-rose-500/40 hover:text-foreground'
                }`}
              >
                <Shield className="size-4" />
                Defender: CONTRA
              </button>
            </div>
          </div>

          {/* Título da Tese */}
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
              Título ou Tese Central do seu Argumento:
            </label>
            <input
              type="text"
              required
              placeholder="Ex: A atrofia do esforço cognitivo e a ilusão de domínio..."
              value={newArgTitle}
              onChange={(e) => setNewArgTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Corpo do Argumento */}
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
              Desenvolvimento e Justificativa (Causas, Efeitos e Raciocínio):
            </label>
            <textarea
              required
              rows={4}
              placeholder="Desenvolva seu ponto de vista explicando por que essa afirmação se sustenta ou falha..."
              value={newArgContent}
              onChange={(e) => setNewArgContent(e.target.value)}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Repertório Legitimado Opcional */}
          <div className="rounded-2xl border border-border bg-accent/20 p-4">
            <span className="block text-xs font-bold uppercase text-primary mb-2 flex items-center gap-1.5">
              <Lightbulb className="size-3.5" /> Adicionar Repertório Legitimado (+ Pontos e Destaque)
            </span>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <select
                  value={newArgRepType}
                  onChange={(e) => setNewArgRepType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option>Filosofia / Teoria Social</option>
                  <option>Legislação / CF/88</option>
                  <option>Dado Estatístico / Pesquisa</option>
                  <option>Fato Histórico</option>
                  <option>Literatura / Cinema</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Ex: Zygmunt Bauman, 'Modernidade Líquida' ou Art. 205 da CF/88"
                  value={newArgRepDetail}
                  onChange={(e) => setNewArgRepDetail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" className="rounded-xl px-6 font-bold shadow-sm gap-2">
              <Send className="size-4" />
              Publicar Argumento (+50 XP)
            </Button>
          </div>
        </form>
      </div>

      {/* Filtros e Mural dos Argumentos */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <h2 className="text-xl font-black text-foreground">Duelos em Campo</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterSide === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSide('all')}
              className="rounded-full text-xs"
            >
              Todos ({proArguments.length + againstArguments.length})
            </Button>
            <Button
              variant={filterSide === 'pro' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSide('pro')}
              className="rounded-full text-xs gap-1.5 text-emerald-600 dark:text-emerald-400"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              Apenas A Favor ({proArguments.length})
            </Button>
            <Button
              variant={filterSide === 'against' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSide('against')}
              className="rounded-full text-xs gap-1.5 text-rose-600 dark:text-rose-400"
            >
              <span className="size-2 rounded-full bg-rose-500" />
              Apenas Contra ({againstArguments.length})
            </Button>
          </div>
        </div>

        {/* Colunas do Duelo */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LADO A FAVOR */}
          {(filterSide === 'all' || filterSide === 'pro') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Trincheira: A Favor
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {proArguments.length} teses
                </span>
              </div>

              {proArguments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  Ainda não há argumentos a favor cadastrados. Seja o primeiro a defender!
                </div>
              ) : (
                proArguments.map((arg) => (
                  <ArgumentCard
                    key={arg.id}
                    arg={arg}
                    isVoted={userVotes.has(arg.id)}
                    isRepVoted={userRepertoireVotes.has(arg.id)}
                    onVote={() => voteArgument(arg.id)}
                    onVoteRep={() => voteRepertoire(arg.id)}
                    {...(onStartChat ? { onStartChat } : {})}
                    isExpanded={expandedArgId === arg.id}
                    onToggleExpand={() => setExpandedArgId((prev) => (prev === arg.id ? null : arg.id))}
                    replyText={replyTextMap[arg.id] || ''}
                    onReplyTextChange={(val) => setReplyTextMap((prev) => ({ ...prev, [arg.id]: val }))}
                    onSendReply={() => handleSendReply(arg.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* LADO CONTRA */}
          {(filterSide === 'all' || filterSide === 'against') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-black uppercase text-rose-700 dark:text-rose-300">
                  <Shield className="size-4 text-rose-500" />
                  Trincheira: Contra
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  {againstArguments.length} teses
                </span>
              </div>

              {againstArguments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  Ainda não há argumentos contra cadastrados. Seja o primeiro a contra-argumentar!
                </div>
              ) : (
                againstArguments.map((arg) => (
                  <ArgumentCard
                    key={arg.id}
                    arg={arg}
                    isVoted={userVotes.has(arg.id)}
                    isRepVoted={userRepertoireVotes.has(arg.id)}
                    onVote={() => voteArgument(arg.id)}
                    onVoteRep={() => voteRepertoire(arg.id)}
                    {...(onStartChat ? { onStartChat } : {})}
                    isExpanded={expandedArgId === arg.id}
                    onToggleExpand={() => setExpandedArgId((prev) => (prev === arg.id ? null : arg.id))}
                    replyText={replyTextMap[arg.id] || ''}
                    onReplyTextChange={(val) => setReplyTextMap((prev) => ({ ...prev, [arg.id]: val }))}
                    onSendReply={() => handleSendReply(arg.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Propor Nova Afirmação */}
      <Dialog open={isNewTopicModalOpen} onOpenChange={setIsNewTopicModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary mb-1">
              <Swords className="size-4" /> Proposta de Debate
            </div>
            <DialogTitle className="text-xl">Propor uma Nova Afirmação</DialogTitle>
            <DialogDescription>
              Crie uma afirmação reflexiva sobre temas sociais, tecnológicos ou do ENEM para abrir a discussão entre os estudantes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTopic} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                Afirmação (em formato de pergunta ou tese):
              </label>
              <input
                type="text"
                required
                placeholder="Ex: O uso de câmeras corporais em policiais reduz a violência urbana?"
                value={newStatement}
                onChange={(e) => setNewStatement(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                Área / Categoria:
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="Tecnologia">Tecnologia</option>
                <option value="Educação">Educação</option>
                <option value="Sociedade">Sociedade</option>
                <option value="Filosofia">Filosofia</option>
                <option value="Direito">Direito</option>
                <option value="Cultura">Cultura</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                Contextualização do Tema:
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explique o contexto e por que este tema divide opiniões..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsNewTopicModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl font-bold gap-1.5">
                <Plus className="size-4" />
                Lançar na Arena (+100 XP)
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente Individual de Card de Argumento
function ArgumentCard({
  arg,
  isVoted,
  isRepVoted,
  onVote,
  onVoteRep,
  onStartChat,
  isExpanded,
  onToggleExpand,
  replyText,
  onReplyTextChange,
  onSendReply,
}: {
  arg: ArenaArgument;
  isVoted: boolean;
  isRepVoted: boolean;
  onVote: () => void;
  onVoteRep: () => void;
  onStartChat?: (profile: any) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  replyText: string;
  onReplyTextChange: (val: string) => void;
  onSendReply: () => void;
}) {
  const isPro = arg.side === 'pro';

  return (
    <div
      className={`rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${
        isPro ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-rose-500/20 hover:border-rose-500/40'
      }`}
    >
      {/* Topo: Autor & Badge do Lado */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-full bg-accent font-bold text-xs text-accent-foreground overflow-hidden">
            {arg.authorAvatar ? (
              <img src={arg.authorAvatar} alt={arg.authorName} className="h-full w-full object-cover" />
            ) : (
              arg.authorName[0]?.toUpperCase() || 'E'
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => onStartChat && onStartChat({ id: arg.authorId, full_name: arg.authorName, avatar_url: arg.authorAvatar })}
              className="text-xs font-bold text-foreground hover:text-primary transition-colors hover:underline text-left"
            >
              {arg.authorName}
            </button>
            <span className="block text-[10px] text-muted-foreground">
              {new Date(arg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-[10px] font-bold ${
            isPro
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {isPro ? 'A Favor' : 'Contra'}
        </Badge>
      </div>

      {/* Conteúdo */}
      <h3 className="text-sm font-bold text-foreground leading-snug">{arg.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
        {arg.content}
      </p>

      {/* Repertório Legitimado Destacado */}
      {arg.repertoireDetail && (
        <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-border bg-accent/40 p-2.5">
          <BookOpen className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase text-primary">
              {arg.repertoireType || 'Repertório Legitimado'}
            </span>
            <p className="text-xs font-semibold text-foreground truncate">{arg.repertoireDetail}</p>
          </div>
          <button
            type="button"
            onClick={onVoteRep}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
              isRepVoted
                ? 'bg-amber-500 text-white shadow-xs'
                : 'border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="Reconhecer repertório de ouro"
          >
            <Lightbulb className="size-3" />
            <span>{arg.repertoireVotes}</span>
          </button>
        </div>
      )}

      {/* Barra de Ações: Votar e Réplicas */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-2">
          {/* Voto de Convincente */}
          <Button
            size="sm"
            variant={isVoted ? 'default' : 'outline'}
            onClick={onVote}
            className={`h-8 rounded-xl px-2.5 text-xs font-bold gap-1.5 transition-all ${
              isVoted ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ThumbsUp className={`size-3.5 ${isVoted ? 'fill-current' : ''}`} />
            <span>Convincente</span>
            <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px]">
              {arg.votes}
            </Badge>
          </Button>

          {/* Botão de Respostas / Réplicas */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleExpand}
            className="h-8 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <MessageSquare className="size-3.5" />
            <span>Rebater ({arg.replies.length})</span>
            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {/* Caixa de Respostas / Réplicas Expandível */}
      {isExpanded && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-accent/20 p-3.5">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">
            Réplicas e Contra-argumentos:
          </div>

          {arg.replies.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Ninguém rebateu esse argumento ainda. Dê a sua opinião!
            </p>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {arg.replies.map((rep) => (
                <div key={rep.id} className="rounded-xl border border-border bg-card p-2.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="font-bold text-foreground">{rep.authorName}</span>
                    <span>{new Date(rep.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{rep.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Campo para responder */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Escreva sua réplica ou contra-argumento..."
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSendReply();
                }
              }}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <Button size="sm" onClick={onSendReply} className="rounded-xl text-xs h-8 px-3">
              Rebater
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

