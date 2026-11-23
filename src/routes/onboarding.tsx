import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { universityData } from '@/data/universities';
import { BrandMark } from '@/components/BrandMark';
import { ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/onboarding')({
  head: () => ({
    meta: [{ title: 'Configurar Perfil — Aprova Red' }],
  }),
  component: OnboardingPage,
});

const SCORE_PRESETS = ['800', '880', '920', '960', '1000'];

function OnboardingPage() {
  const [targetScore, setTargetScore] = useState('920');

  const { user } = useAuth();
  const [fullName, setFullName] = useState((user?.user_metadata?.['full_name'] as string | undefined) || '');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');

  const [state, setState] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');

  const [customState, setCustomState] = useState('');
  const [customCollege, setCustomCollege] = useState('');
  const [customCourse, setCustomCourse] = useState('');

  const { savePreferences, preferences, isLoading: isPrefsLoading } = useUserPreferences();
  const navigate = useNavigate();

  useEffect(() => {
    if (preferences?.gender && !gender) {
      setGender(preferences.gender);
    }
  }, [preferences, gender]);

  useEffect(() => {
    if (user && !isPrefsLoading && preferences?.hasCompletedOnboarding) {
      navigate({ to: '/' });
    }
  }, [user, isPrefsLoading, preferences, navigate]);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePreferences({
      targetScore,
      state: state === 'Outro' ? customState : state,
      college: college === 'Outro' ? customCollege : college,
      course: course === 'Outro' ? customCourse : course,
      full_name: fullName,
      age: age ? parseInt(age, 10) : undefined,
      gender: gender || undefined,
    });
    navigate({ to: '/' });
  };

  const availableStates = Object.keys(universityData);
  const availableColleges = state && state !== 'Outro' ? Object.keys(universityData[state] || {}) : [];
  const availableCourses =
    state && state !== 'Outro' && college && college !== 'Outro'
      ? universityData[state]?.[college] || []
      : [];

  return (
    <div className="min-h-screen bg-background editorial-grid-light px-4 py-8 sm:py-12">
      <div className="fixed inset-x-0 top-0 h-1 bg-primary" />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Topo da marca */}
        <div className="flex items-center justify-between">
          <BrandMark size="md" subtitle="Configuração Inicial" />
          <span className="font-mono-num rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            Passo 1 de 1
          </span>
        </div>

        {/* Cartão Editorial */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {/* Cabeçalho escuro de alto contraste */}
          <div className="relative bg-[#171412] px-6 py-7 sm:px-8 text-[#faf6ef] border-b border-border">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#C82838]" />
            <p className="font-mono-num text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f25c69]">
              Boas-vindas ao Aprova Red
            </p>
            <h1 className="font-display mt-1.5 text-2xl sm:text-3xl font-semibold leading-tight">
              Vamos calibrar seu plano de redação
            </h1>
            <p className="mt-2 text-sm text-white/68 max-w-lg">
              Com base no seu curso e meta de nota, ajustamos o nível de rigor da correção e os temas prioritários.
            </p>
          </div>

          <form onSubmit={handleFinish} className="p-6 sm:p-8 space-y-8">
            {/* Bloco 01: Sobre você */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
                <span className="font-mono-num text-xs font-bold text-primary">01</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Sobre você
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Como você quer ser chamado?
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 rounded-xl bg-background/60"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="age" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Idade
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Ex: 17"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="h-11 rounded-xl bg-background/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Gênero
                    </Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender" className="h-11 rounded-xl bg-background/60">
                        <SelectValue placeholder="Selecione" />
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
              </div>
            </div>

            {/* Bloco 02: Objetivo no Vestibular */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
                <span className="font-mono-num text-xs font-bold text-primary">02</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Seu objetivo no ENEM
                </h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetScore" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Meta de nota na redação
                </Label>
                <div className="flex flex-wrap gap-2 pb-1">
                  {SCORE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetScore(preset)}
                      className={`font-mono-num rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all ${
                        targetScore === preset
                          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {preset} pts
                    </button>
                  ))}
                </div>
                <Input
                  id="targetScore"
                  type="number"
                  placeholder="Ex: 900, 960, 1000"
                  required
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  className="h-11 rounded-xl bg-background/60 font-mono-num"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado da universidade
                  </Label>
                  <Select
                    value={state}
                    onValueChange={(val) => {
                      setState(val);
                      setCollege('');
                      setCourse('');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background/60">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {state === 'Outro' && (
                    <Input
                      placeholder="Digite o estado..."
                      value={customState}
                      onChange={(e) => setCustomState(e.target.value)}
                      required
                      className="mt-2 h-10 rounded-xl"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="college" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Universidade desejada
                  </Label>
                  <Select
                    value={college}
                    onValueChange={(val) => {
                      setCollege(val);
                      setCourse('');
                    }}
                    disabled={!state}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background/60">
                      <SelectValue placeholder="Selecione a instituição" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColleges.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                      <SelectItem value="Outro">Outro / Digitar manualmente</SelectItem>
                    </SelectContent>
                  </Select>
                  {college === 'Outro' && (
                    <Input
                      placeholder="Digite o nome da universidade..."
                      value={customCollege}
                      onChange={(e) => setCustomCollege(e.target.value)}
                      required
                      className="mt-2 h-10 rounded-xl"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="course" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Curso pretendido
                </Label>
                <Select value={course} onValueChange={setCourse} disabled={!college}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/60">
                    <SelectValue placeholder="Selecione o curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="Outro">Outro / Digitar manualmente</SelectItem>
                  </SelectContent>
                </Select>
                {course === 'Outro' && (
                  <Input
                    placeholder="Digite o nome do curso..."
                    value={customCourse}
                    onChange={(e) => setCustomCourse(e.target.value)}
                    required
                    className="mt-2 h-10 rounded-xl"
                  />
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold gap-2">
                Abrir meu caderno no Aprova Red
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
