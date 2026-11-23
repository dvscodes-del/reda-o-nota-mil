import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, isLocalEnvironment } from '@/context/AuthContext';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandMark } from '@/components/BrandMark';
import { toast } from 'sonner';
import { Mail, ArrowRight, RotateCcw, Eye, EyeOff, Check, Terminal } from 'lucide-react';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Entrar — Aprova Red' },
      { name: 'description', content: 'Acesse sua conta no Aprova Red para treinar redações no padrão ENEM.' },
    ],
  }),
  component: LoginPage,
});

function formatSupabaseAuthError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('anonymous sign-ins are disabled') || msg.includes('signup requires a valid password')) {
    return 'Por favor, preencha o e-mail e a senha para continuar.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'Este e-mail já está cadastrado. Faça login na sua conta existente.';
  }
  if (msg.includes('password should be at least 6 characters')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Confira os dados digitados.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e spam.';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return 'Insira um e-mail válido (ex: seuemail@gmail.com).';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.';
  }
  return errorMessage;
}

function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const { user, mockSignIn, isLoading: isAuthLoading } = useAuth();
  const { preferences, isLoading: isPrefsLoading } = useUserPreferences();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAuthLoading && !isPrefsLoading) {
      if (!preferences?.hasCompletedOnboarding) {
        navigate({ to: '/onboarding' });
      } else {
        navigate({ to: '/' });
      }
    }
  }, [user, isAuthLoading, isPrefsLoading, preferences, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Por favor, informe seu e-mail.');
      return;
    }
    if (!password) {
      toast.error('Por favor, informe sua senha.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        toast.error(formatSupabaseAuthError(error.message));
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (err: any) {
      toast.error(formatSupabaseAuthError(err?.message || 'Erro ao realizar login.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      toast.error('Por favor, digite seu e-mail.');
      return;
    }
    if (!password) {
      toast.error('Por favor, crie uma senha.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem. Confira a confirmação de senha.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
            gender: gender || undefined,
          },
        },
      });

      if (gender) {
        try {
          localStorage.setItem('temp_signup_gender', gender);
        } catch {}
      }

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') && isLocalEnvironment()) {
          mockSignIn({ email: cleanEmail, full_name: fullName.trim() });
          toast.success(`Cadastro e login local realizados com sucesso! Bem-vindo, ${fullName.trim() || cleanEmail}!`);
          return;
        }
        toast.error(formatSupabaseAuthError(error.message));
      } else if (data?.session) {
        toast.success('Conta criada com sucesso! Entrando...');
      } else if (data?.user) {
        if (isLocalEnvironment()) {
          mockSignIn({ email: cleanEmail, full_name: fullName.trim() });
          toast.success(`Conta criada! Entrando como ${fullName.trim() || cleanEmail}...`);
          return;
        }
        setCreatedEmail(cleanEmail);
        toast.success('Conta criada com sucesso!');
      }
    } catch (err: any) {
      toast.error(formatSupabaseAuthError(err?.message || 'Erro ao criar conta.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!createdEmail) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: createdEmail,
      });
      if (error) {
        toast.error(formatSupabaseAuthError(error.message));
      } else {
        toast.success('E-mail de confirmação reenviado com sucesso!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reenviar e-mail.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLogin = () => {
    mockSignIn();
    toast.success('Logado no modo de teste!');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(formatSupabaseAuthError(error.message));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[1.12fr_0.88fr]">
      {/* ── LADO ESQUERDO: PAINEL EDITORIAL DA MARCA (DESKTOP) ── */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#171412] text-[#faf6ef] p-10 xl:p-14 editorial-grid-dark border-r border-white/10">
        {/* Filete lateral carmim — referência direta à margem da folha de redação */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#C82838]" />

        {/* Iluminação editorial ultra-sutil no canto inferior */}
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 size-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #C82838 0%, transparent 70%)' }}
        />

        {/* Topo: Marca + selo de edição */}
        <div className="relative z-10 flex items-center justify-between">
          <BrandMark variant="light" size="md" subtitle="Estúdio de Redação ENEM" />
          <span className="font-mono-num rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/75">
            Padrão INEP · 5 Competências
          </span>
        </div>

        {/* Centro: Copy editorial + prévia tátil de folha corrigida */}
        <div className="relative z-10 my-auto py-8 max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="font-mono-num text-xs uppercase tracking-[0.18em] text-[#f25c69]">
              Treino, repertório e revisão
            </p>
            <h1 className="font-display text-4xl xl:text-[3.1rem] font-semibold leading-[1.08] tracking-[-0.02em] text-[#faf6ef]">
              Escreva com método.{' '}
              <span className="italic text-[#f25c69] block mt-1">
                Conquiste sua aprovação.
              </span>
            </h1>
            <p className="text-[15px] leading-relaxed text-white/68 max-w-md">
              Escreva na folha pautada oficial, receba anotações por parágrafo nas cinco competências e estude repertórios comentados para o seu curso.
            </p>
          </div>

          {/* Artefato tátil: folha de redação anotada */}
          <div className="relative rounded-2xl bg-[#faf6ef] text-[#1c1917] shadow-2xl shadow-black/40 border border-white/15 overflow-hidden">
            {/* Cabeçalho da folha */}
            <div className="flex items-center justify-between border-b border-[#e7dfd3] bg-[#f4eee4] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#C82838]" />
                <span className="font-mono-num text-[11px] font-semibold uppercase tracking-wider text-[#575049]">
                  Folha de Correção · Simulado 04
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-[#1a1715] px-2.5 py-1 text-[#faf6ef]">
                <span className="font-mono-num text-xs font-bold text-[#f25c69]">960</span>
                <span className="font-mono-num text-[10px] text-white/60">/1000</span>
              </div>
            </div>

            {/* Corpo pautado com margem vermelha e marcações reais */}
            <div className="relative pl-12 pr-5 py-4 text-[13px] leading-[1.95] text-[#292524]">
              {/* Margem vertical carmim */}
              <div className="absolute inset-y-0 left-9 w-px bg-[#C82838]/35" />

              <div className="space-y-1.5">
                <p className="relative">
                  <span className="font-mono-num absolute -left-9 top-0.5 text-[10px] text-[#a89f93] select-none">01</span>
                  Conforme a{' '}
                  <span className="rounded-xs bg-[#C82838]/12 px-1 py-0.5 font-semibold text-[#8f1824] border-b border-[#C82838]/50">
                    Constituição Federal de 1988
                  </span>
                  , a educação e a dignidade são direitos assegurados a todos.
                </p>
                <p className="relative">
                  <span className="font-mono-num absolute -left-9 top-0.5 text-[10px] text-[#a89f93] select-none">02</span>
                  Entretanto, a persistência de entraves estruturais ainda limita o acesso pleno e{' '}
                  <span className="rounded-xs bg-emerald-700/12 px-1 py-0.5 font-semibold text-emerald-900 border-b border-emerald-700/50">
                    aprofunda desigualdades regionais
                  </span>
                  .
                </p>
              </div>

              {/* Notas por competência */}
              <div className="mt-4 pt-3 border-t border-[#e7dfd3] grid grid-cols-5 gap-2">
                {[
                  { code: 'C1', val: 200 },
                  { code: 'C2', val: 200 },
                  { code: 'C3', val: 180 },
                  { code: 'C4', val: 180 },
                  { code: 'C5', val: 200 },
                ].map((c) => (
                  <div key={c.code} className="rounded-lg bg-[#f3ede2] px-2 py-1.5 text-center">
                    <span className="block font-mono-num text-[10px] font-semibold text-[#78716c]">
                      {c.code}
                    </span>
                    <span className="block font-mono-num text-xs font-bold text-[#1c1917]">
                      {c.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do painel editorial */}
        <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <div>
            <p className="font-mono-num text-sm font-bold text-[#faf6ef]">5 Critérios</p>
            <p className="mt-0.5 text-xs text-white/55">Grade fiel ao ENEM</p>
          </div>
          <div>
            <p className="font-mono-num text-sm font-bold text-[#faf6ef]">14 Temas</p>
            <p className="mt-0.5 text-xs text-white/55">Acervo comentado</p>
          </div>
          <div>
            <p className="font-mono-num text-sm font-bold text-[#faf6ef]">Turma Ativa</p>
            <p className="mt-0.5 text-xs text-white/55">Feed, enquetes e chat</p>
          </div>
        </div>
      </section>

      {/* ── LADO DIREITO: FORMULÁRIO DE ACESSO LIMPO ── */}
      <section className="relative flex flex-col justify-between px-5 py-8 sm:px-10 lg:px-12 xl:px-16 editorial-grid-light">
        {/* Filete superior no mobile */}
        <div className="fixed inset-x-0 top-0 h-1 bg-primary lg:hidden" />

        {/* Logo no mobile */}
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <BrandMark size="sm" subtitle="Redação ENEM" />
          </div>
          <span className="hidden lg:inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Ambiente de estudos ativo
          </span>
        </div>

        {/* Conteúdo central */}
        <div className="mx-auto my-auto w-full max-w-[410px] py-8">
          {createdEmail ? (
            <div className="rounded-2xl border border-border bg-card p-7 sm:p-8 shadow-xs space-y-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/12 text-success border border-success/20">
                <Mail className="size-6" />
              </div>
              <div className="space-y-2">
                <p className="font-mono-num text-[11px] font-semibold uppercase tracking-widest text-primary">
                  Último passo
                </p>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Confirme seu e-mail
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enviamos um link de ativação para{' '}
                  <strong className="text-foreground break-all">{createdEmail}</strong>.
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Abra sua caixa de entrada (ou a pasta de spam) e clique no link para liberar seu acesso.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                <Button
                  className="w-full h-11 rounded-xl font-semibold gap-2"
                  onClick={() => {
                    setCreatedEmail(null);
                    setActiveTab('login');
                  }}
                >
                  Ir para login <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl gap-2 text-xs"
                  onClick={handleResendConfirmation}
                  disabled={isLoading}
                >
                  <RotateCcw className="size-3.5" />
                  Reenviar e-mail de confirmação
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cabeçalho do formulário */}
              <div className="space-y-1.5">
                <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-foreground">
                  {activeTab === 'login' ? 'Entre no seu caderno' : 'Crie sua conta'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'login'
                    ? 'Retome seus temas, correções e metas no Aprova Red.'
                    : 'Comece gratuitamente a treinar redações no padrão ENEM.'}
                </p>
              </div>

              {/* Alternador limpo Entrar / Criar conta */}
              <div className="grid grid-cols-2 rounded-xl bg-secondary/90 p-1 border border-border/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'login'
                      ? 'bg-card text-foreground shadow-xs border border-border/70'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'signup'
                      ? 'bg-card text-foreground shadow-xs border border-border/70'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {/* Cartão do formulário */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
                {activeTab === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        E-mail
                      </label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-xl bg-background/60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Senha
                      </label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="Digite sua senha"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 rounded-xl bg-background/60 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          aria-label={showLoginPassword ? 'Ocultar senha' : 'Ver senha'}
                        >
                          {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-semibold gap-2 mt-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar no Aprova Red'}
                      {!isLoading && <ArrowRight className="size-4" />}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="signup-name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Nome completo
                        </label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Como te chamar"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-10 rounded-xl bg-background/60"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="signup-gender" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Gênero
                        </label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger id="signup-gender" className="h-10 rounded-xl bg-background/60">
                            <SelectValue placeholder="Opcional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Não-binário">Não-binário</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                            <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="signup-email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        E-mail
                      </label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 rounded-xl bg-background/60"
                      />
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="signup-password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Senha
                        </label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showSignupPassword ? 'text' : 'password'}
                            placeholder="Mín. 6 caracteres"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-10 rounded-xl bg-background/60 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                            aria-label={showSignupPassword ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="signup-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Confirmar
                        </label>
                        <div className="relative">
                          <Input
                            id="signup-confirm-password"
                            type={showSignupConfirmPassword ? 'text' : 'password'}
                            placeholder="Repita a senha"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-10 rounded-xl bg-background/60 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                            aria-label={showSignupConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showSignupConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-semibold gap-2 mt-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Criando conta...' : 'Criar conta gratuita'}
                      {!isLoading && <ArrowRight className="size-4" />}
                    </Button>
                  </form>
                )}

                {/* Divisor */}
                <div className="relative flex items-center py-0.5">
                  <span className="flex-1 border-t border-border" />
                  <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    ou
                  </span>
                  <span className="flex-1 border-t border-border" />
                </div>

                {/* Acesso Google + Dev local */}
                <div className="space-y-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl border-border bg-background/50 hover:bg-secondary/70 flex items-center justify-center gap-2.5 font-semibold"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg viewBox="0 0 24 24" className="size-4.5" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continuar com Google
                  </Button>

                  {isLocalEnvironment() && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-10 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 flex items-center justify-center gap-2"
                      onClick={handleMockLogin}
                    >
                      <Terminal className="size-3.5" />
                      Entrar em modo de teste local
                    </Button>
                  )}
                </div>
              </div>

              {/* Diferenciais compactos no mobile */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground lg:hidden">
                <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-primary" /> 5 Competências</span>
                <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-primary" /> Folha pautada</span>
                <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-primary" /> Repertório ENEM</span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé discreto */}
        <footer className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>Aprova Red</span>
          <span>Estúdio de redação para o ENEM</span>
        </footer>
      </section>
    </div>
  );
}
