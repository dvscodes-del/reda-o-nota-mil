import { createFileRoute } from '@tanstack/react-router';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, BookOpen, MapPin, Target, Calendar } from 'lucide-react';

export const Route = createFileRoute('/perfil')({
  component: ProfilePage,
});

function ProfilePage() {
  const { preferences } = useUserPreferences();
  const { user } = useAuth();

  if (!preferences || !user) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <p className="text-gray-500">Carregando perfil...</p>
      </div>
    );
  }

  // Use the name from preferences, or fallback to auth metadata, or email
  const fullName = preferences.full_name || user.user_metadata?.full_name || 'Estudante';
  const initial = fullName.charAt(0).toUpperCase();
  const avatarUrl = preferences.avatar_url || user.user_metadata?.avatar_url;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      
      {/* Header / Banner Card */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 w-full"></div>
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-lg">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="text-3xl bg-blue-100 text-blue-700">{initial}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 pb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{fullName}</h1>
              <p className="text-gray-500 font-medium">{user.email}</p>
            </div>
            <div className="flex gap-2 pb-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-sm py-1">
                <Target className="w-4 h-4 mr-1" />
                Meta: {preferences.targetScore}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info Column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sobre Mim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preferences.age && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase">Idade</p>
                    <p className="font-medium">{preferences.age} anos</p>
                  </div>
                </div>
              )}
              
              {preferences.state && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase">Estado</p>
                    <p className="font-medium">{preferences.state}</p>
                  </div>
                </div>
              )}

              {preferences.college && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase">Faculdade dos Sonhos</p>
                    <p className="font-medium">{preferences.college}</p>
                  </div>
                </div>
              )}
              
              {preferences.course && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase">Curso</p>
                    <p className="font-medium">{preferences.course}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Badges / Stats Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Minhas Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-xl p-8 border border-dashed border-gray-200 text-center flex flex-col items-center justify-center h-48">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-gray-700 font-semibold text-lg">Em breve!</h3>
                <p className="text-gray-500 text-sm max-w-sm mt-1">
                  Suas notas de redação se transformarán em emblemas aqui. Envie sua primeira redação para começar a colecionar!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
