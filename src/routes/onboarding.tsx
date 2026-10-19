import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { universityData } from '@/data/universities';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const [targetScore, setTargetScore] = useState('900');
  
  const { user } = useAuth(); // need to import useAuth
  const [fullName, setFullName] = useState((user?.user_metadata?.['full_name'] as string | undefined) || '');
  const [age, setAge] = useState<string>('');

  
  const [state, setState] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');

  const [customState, setCustomState] = useState('');
  const [customCollege, setCustomCollege] = useState('');
  const [customCourse, setCustomCourse] = useState('');

  const { savePreferences, preferences, isLoading: isPrefsLoading } = useUserPreferences();
  const navigate = useNavigate();

  // Redirect to home if they already finished onboarding
  if (user && !isPrefsLoading && preferences?.hasCompletedOnboarding) {
    navigate({ to: '/' });
  }

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePreferences({
      targetScore,
      state: state === 'Outro' ? customState : state,
      college: college === 'Outro' ? customCollege : college,
      course: course === 'Outro' ? customCourse : course,
      full_name: fullName,
      age: age ? parseInt(age, 10) : undefined,
    });
    // Redirect to home/dashboard
    navigate({ to: '/' });
  };

  const availableStates = Object.keys(universityData);
  const availableColleges = state && state !== 'Outro' ? Object.keys(universityData[state] || {}) : [];
  const availableCourses = state && state !== 'Outro' && college && college !== 'Outro' ? (universityData[state]?.[college] || []) : [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Boas-vindas ao Escreva+!</CardTitle>
          <CardDescription className="text-center text-lg">
            Para personalizarmos sua experiência, conte-nos um pouco sobre seus objetivos.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleFinish}>
          <CardContent className="space-y-6 mt-4">
            
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base font-semibold">
                Como você quer ser chamado?
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="text-base font-semibold">
                Qual a sua idade?
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="Ex: 17"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetScore" className="text-base font-semibold">
                Qual a sua meta de nota na redação?
              </Label>
              <Input
                id="targetScore"
                type="number"
                placeholder="Ex: 900, 960, 1000"
                required
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Vamos focar seus treinos para alcançar este objetivo.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-base font-semibold">
                De qual Estado é a faculdade?
              </Label>
              <Select value={state} onValueChange={(val) => { setState(val); setCollege(''); setCourse(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Estado" />
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
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="college" className="text-base font-semibold">
                Em qual faculdade você deseja entrar?
              </Label>
              <Select value={college} onValueChange={(val) => { setCollege(val); setCourse(''); }} disabled={!state}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faculdade" />
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
                  placeholder="Digite o nome da faculdade..." 
                  value={customCollege} 
                  onChange={(e) => setCustomCollege(e.target.value)} 
                  required 
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="course" className="text-base font-semibold">
                Qual curso você quer cursar?
              </Label>
              <Select value={course} onValueChange={setCourse} disabled={!college}>
                <SelectTrigger>
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
                  className="mt-2"
                />
              )}
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6 mt-2">
              Começar minha jornada!
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
