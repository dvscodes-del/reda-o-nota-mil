import { createFileRoute } from '@tanstack/react-router';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, BookOpen, MapPin, Target, Calendar } from 'lucide-react';

export const Route = createFileRoute('/perfil')({
  head: () => ({
    meta: [{ title: 'Perfil — Aprova Red' }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { preferences } = useUserPreferences();
  const { user } = useAuth();

  if (!preferences || !user) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  const fullName = preferences.full_name || (user.user_metadata?.['full_name'] as string | undefined) || 'Estudante';
  const initial = fullName.charAt(0).toUpperCase();
  const avatarUrl = preferences.avatar_url || (user.user_metadata?.['avatar_url'] as string | undefined);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6">
      <Card className="overflow-hidden border border-border shadow-xs rounded-3xl">
        <div className="h-32 bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] w-full" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-card shadow-md">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="font-heading text-3xl font-bold bg-accent text-primary">{initial}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 pb-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{fullName}</h1>
              <p className="text-muted-foreground text-sm font-medium">{user.email}</p>
            </div>
            <div className="flex gap-2 pb-2">
              <Badge variant="secondary" className="bg-accent text-primary border border-primary/15 tabular-nums text-xs py-1 px-3 rounded-full">
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Meta: {preferences.targetScore}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-none border-border rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base font-bold">Sobre Mim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preferences.age && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="bg-accent p-2 rounded-xl text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Idade</p>
                    <p className="text-sm font-semibold">{preferences.age} anos</p>
                  </div>
                </div>
              )}

              {preferences.state && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="bg-accent p-2 rounded-xl text-primary">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Estado</p>
                    <p className="text-sm font-semibold">{preferences.state}</p>
                  </div>
                </div>
              )}

              {preferences.college && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="bg-accent p-2 rounded-xl text-primary">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Universidade</p>
                    <p className="text-sm font-semibold">{preferences.college}</p>
                  </div>
                </div>
              )}

              {preferences.course && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="bg-accent p-2 rounded-xl text-primary">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Curso</p>
                    <p className="text-sm font-semibold">{preferences.course}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-none border-border h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="font-heading text-base font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Minhas Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary/50 rounded-2xl p-8 border border-dashed border-border text-center flex flex-col items-center justify-center h-48">
                <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-3">
                  <Trophy className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading text-foreground font-bold text-base">Em breve</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  Suas notas de redação se transformarão em marcos aqui. Envie sua primeira redação no Aprova Red para começar.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
