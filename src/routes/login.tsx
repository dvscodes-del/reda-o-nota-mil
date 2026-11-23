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
import { Mail, ArrowRight, RotateCcw, Eye, EyeOff, CheckCircle2, TrendingUp, BookOpen, Users } from 'lucide-react';

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
    <div className="min-h-screen bg-white text-foreground grid lg:grid-cols-2">
      {/* ── LADO ESQUERDO: FORMULÁRIO ULTRA-LIMPO EM BRANCO PURO ── */}
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between">
          <BrandMark size="md" subtitle={null} />
          <div className="text-xs text-muted-foreground hidden sm:block">
            {activeTab === 'login' ? (
              <>
                Novo por aqui?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="font-semibold text-primary hover:underline"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-[390px] py-10">
          {createdEmail ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
                <Mail className="size-6" />
              </div>
              <div className="space-y-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  Confirme seu e-mail
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enviamos um link de ativação para{' '}
                  <strong className="text-foreground break-all">{createdEmail}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique sua caixa de entrada e também a pasta de spam para liberar seu acesso.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-2">
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
              <div className="space-y-1.5">
                <h1 className="font-heading text-[1.75rem] sm:text-[2rem] font-extrabold tracking-[-0.03em] text-foreground leading-tight">
                  {activeTab === 'login' ? 'Entrar na sua conta' : 'Comece grátis no Aprova Red'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'login'
                    ? 'Continue seus treinos, correções e metas para o ENEM.'
                    : 'Crie sua conta em poucos segundos e organize sua evolução.'}
                </p>
              </div>

              {/* Botão Google limpo em destaque no topo */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl border-border bg-white hover:bg-secondary/70 flex items-center justify-center gap-2.5 font-semibold text-foreground shadow-2xs"
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

              <div className="relative flex items-center">
                <span className="flex-1 border-t border-border" />
                <span className="px-3 text-xs text-muted-foreground">ou com seu e-mail</span>
                <span className="flex-1 border-t border-border" />
              </div>

              {/* Alternador minimalista */}
              <div className="grid grid-cols-2 rounded-xl bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'login'
                      ? 'bg-white text-foreground shadow-xs'
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
                      ? 'bg-white text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="block text-sm font-medium text-foreground">
                      E-mail
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-secondary/40 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
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
                        className="h-11 rounded-xl bg-secondary/40 focus:bg-white pr-10 transition-colors"
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
                    className="w-full h-11 rounded-xl font-semibold gap-2 shadow-sm shadow-primary/20"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                    {!isLoading && <ArrowRight className="size-4" />}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-name" className="block text-sm font-medium text-foreground">
                        Nome
                      </label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 rounded-xl bg-secondary/40 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="signup-gender" className="block text-sm font-medium text-foreground">
                        Gênero
                      </label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger id="signup-gender" className="h-10 rounded-xl bg-secondary/40 focus:bg-white">
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
                    <label htmlFor="signup-email" className="block text-sm font-medium text-foreground">
                      E-mail
                    </label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-xl bg-secondary/40 focus:bg-white"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-password" className="block text-sm font-medium text-foreground">
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
                          className="h-10 rounded-xl bg-secondary/40 focus:bg-white pr-9"
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
                      <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-foreground">
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
                          className="h-10 rounded-xl bg-secondary/40 focus:bg-white pr-9"
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
                    className="w-full h-11 rounded-xl font-semibold gap-2 shadow-sm shadow-primary/20 mt-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar conta gratuita'}
                    {!isLoading && <ArrowRight className="size-4" />}
                  </Button>
                </form>
              )}

              {isLocalEnvironment() && (
                <button
                  type="button"
                  onClick={handleMockLogin}
                  className="w-full text-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors pt-1"
                >
                  Entrar em modo de teste local
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Aprova Red</span>
          <span>Preparação completa para o ENEM</span>
        </footer>
      </section>

      {/* ── LADO DIREITO: VITRINE MODERNA EM VIOLETA + BRANCO (DESKTOP) ── */}
      <section className="hidden lg:flex p-4 bg-white">
        <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-10 xl:p-12 text-white">
          {/* Luzes suaves orgânicas */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full opacity-35 blur-3xl"
            style={{ background: 'radial-gradient(circle, #c4b5fd 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -left-20 size-80 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)' }}
          />

          {/* Topo */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white">
              <CheckCircle2 className="size-3.5" />
              Matriz oficial das 5 competências
            </span>
          </div>

          {/* Centro: Headline + Card real limpo de desempenho */}
          <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
            <div className="space-y-3">
              <h2 className="font-heading text-3xl xl:text-[2.45rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-white">
                Treine redação com clareza e acompanhe sua nota subir.
              </h2>
              <p className="text-[15px] leading-relaxed text-white/80">
                Escreva nos temas mais cotados, revise cada competência e troque ideias com outros vestibulandos em um só lugar.
              </p>
            </div>

            {/* Prévia real limpa da interface de evolução */}
            <div className="rounded-2xl bg-white text-foreground p-6 shadow-2xl shadow-black/20 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Última redação corrigida</p>
                  <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                    Educação e inclusão digital no Brasil
                  </p>
                </div>
                <div className="rounded-xl bg-accent px-3.5 py-2 text-right">
                  <span className="block font-heading text-2xl font-extrabold leading-none text-primary tabular-nums">
                    960
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">de 1000</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'C1 · Norma culta', score: 200 },
                  { label: 'C2 · Repertório e tema', score: 200 },
                  { label: 'C3 · Projeto de texto', score: 180 },
                  { label: 'C4 · Coesão textual', score: 180 },
                  { label: 'C5 · Intervenção', score: 200 },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground/85">{item.label}</span>
                      <span className="font-bold text-foreground tabular-nums">{item.score}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(item.score / 200) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rodapé com 3 pilares limpos */}
          <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15">
                <TrendingUp className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Evolução real</p>
                <p className="text-[11px] text-white/70 truncate">Notas salvas</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15">
                <BookOpen className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Repertório</p>
                <p className="text-[11px] text-white/70 truncate">14 temas guiados</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15">
                <Users className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Comunidade</p>
                <p className="text-[11px] text-white/70 truncate">Feed e chat</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
