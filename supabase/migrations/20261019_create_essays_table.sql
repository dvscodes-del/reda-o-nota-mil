-- Tabela para armazenar as redações enviadas e corrigidas por cada aluno
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme_day INT NOT NULL,
  theme_topic TEXT NOT NULL,
  essay_text TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  competencies JSONB,
  strengths JSONB,
  improvements JSONB,
  annotations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ativar segurança em nível de linha (RLS)
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: o próprio usuário gerencia seus dados
CREATE POLICY "Usuários podem visualizar suas próprias redações"
  ON public.essays FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas redações"
  ON public.essays FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas redações"
  ON public.essays FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas redações"
  ON public.essays FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para agilizar a consulta de temas concluídos por aluno
CREATE INDEX IF NOT EXISTS idx_essays_user_day ON public.essays(user_id, theme_day);
