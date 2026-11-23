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
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <BrandMark size="md" subtitle={null} />
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
            Configuração rápida
          </span>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="mb-7 space-y-1.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-foreground">
              Personalize seus estudos
            </h1>
            <p className="text-sm text-muted-foreground">
              Conte um pouco sobre você e qual curso você quer alcançar no ENEM.
            </p>
          </div>

          <form onSubmit={handleFinish} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Como você quer ser chamado?
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 rounded-xl bg-secondary/40 focus:bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="text-sm font-medium">
                    Idade
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Ex: 17"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-11 rounded-xl bg-secondary/40 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-sm font-medium">
                    Gênero
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender" className="h-11 rounded-xl bg-secondary/40 focus:bg-white">
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

            <div className="border-t border-border pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetScore" className="text-sm font-medium">
                  Qual a sua meta de nota na redação?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SCORE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetScore(preset)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all tabular-nums ${
                        targetScore === preset
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
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
                  className="h-11 rounded-xl bg-secondary/40 focus:bg-white tabular-nums"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-sm font-medium">
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
                    <SelectTrigger className="h-11 rounded-xl bg-secondary/40 focus:bg-white">
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
                  <Label htmlFor="college" className="text-sm font-medium">
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
                    <SelectTrigger className="h-11 rounded-xl bg-secondary/40 focus:bg-white">
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
                <Label htmlFor="course" className="text-sm font-medium">
                  Curso pretendido
                </Label>
                <Select value={course} onValueChange={setCourse} disabled={!college}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/40 focus:bg-white">
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

            <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold gap-2 shadow-sm shadow-primary/20">
              Começar no Aprova Red
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
