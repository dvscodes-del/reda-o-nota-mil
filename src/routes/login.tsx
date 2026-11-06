import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, isLocalEnvironment } from '@/context/AuthContext';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle2, Mail, ArrowRight, RotateCcw, Eye, EyeOff } from 'lucide-react';

export const Route = createFileRoute('/login')({
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const { user, mockSignIn, isLoading: isAuthLoading } = useAuth();
  const { preferences, isLoading: isPrefsLoading } = useUserPreferences();
  const navigate = useNavigate();

  // If already logged in, redirect based on preferences
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
          },
        },
      });

      if (error) {
        toast.error(formatSupabaseAuthError(error.message));
      } else if (data?.session) {
        toast.success('Conta criada com sucesso! Entrando...');
      } else if (data?.user) {
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="space-y-1 text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight">Escreva+</CardTitle>
          <CardDescription>
            {createdEmail
              ? 'Confirmação de e-mail necessária'
              : 'Entre na sua conta ou cadastre-se para personalizar seus estudos.'}
          </CardDescription>
        </CardHeader>

        {createdEmail ? (
          <CardContent className="space-y-5 text-center py-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Mail className="size-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Verifique seu e-mail</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enviamos um link de confirmação para:
                <br />
                <strong className="text-foreground">{createdEmail}</strong>
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Clique no link do e-mail (verifique também a pasta de <strong>Spam</strong>) para ativar sua conta e entrar.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleResendConfirmation}
                disabled={isLoading}
              >
                <RotateCcw className="size-4" />
                Reenviar e-mail de confirmação
              </Button>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setCreatedEmail(null);
                  setActiveTab('login');
                }}
              >
                Ir para login <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'login' | 'signup')}
            className="w-full"
          >
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg text-sm font-semibold">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-sm font-semibold">
                  Criar conta
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: ENTRAR */}
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium leading-none">
                      E-mail
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-medium leading-none">
                      Senha
                    </label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        aria-label={showLoginPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-3 pt-2">
                  <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar na conta'}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Ainda não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('signup')}
                      className="font-semibold text-primary hover:underline"
                    >
                      Cadastre-se grátis
                    </button>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>

            {/* TAB: CRIAR CONTA */}
            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-3.5 pt-4">
                  <div className="space-y-1.5">
                    <label htmlFor="signup-name" className="text-sm font-medium leading-none">
                      Nome completo
                    </label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Como deseja ser chamado?"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="signup-email" className="text-sm font-medium leading-none">
                      E-mail
                    </label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="signup-password" className="text-sm font-medium leading-none">
                      Criar Senha
                    </label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Mínimo de 6 caracteres"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        aria-label={showSignupPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="signup-confirm-password" className="text-sm font-medium leading-none">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        placeholder="Repita sua senha"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        aria-label={showSignupConfirmPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showSignupConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-3 pt-2">
                  <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar minha conta'}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Já possui cadastro?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="font-semibold text-primary hover:underline"
                    >
                      Fazer login
                    </button>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>

            {/* SEPARADOR E LOGIN SOCIAL */}
            <div className="px-6 pb-6">
              <div className="relative w-full py-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border hover:bg-accent flex items-center justify-center gap-2.5 h-11 font-medium"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </Button>

                {isLocalEnvironment() && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 font-medium flex items-center justify-center gap-2 h-11"
                    onClick={handleMockLogin}
                  >
                    <span>💻</span> Entrar como Dev Local (Automático)
                  </Button>
                )}
              </div>
            </div>
          </Tabs>
        )}
      </Card>
    </div>
  );
}
