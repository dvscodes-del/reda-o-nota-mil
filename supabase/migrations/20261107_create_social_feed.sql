-- ============================================================
-- 1. Garante que a tabela de redações (essays) exista
-- ============================================================
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

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Usuários podem visualizar suas próprias redações') THEN
    CREATE POLICY "Usuários podem visualizar suas próprias redações" ON public.essays FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Usuários podem criar suas redações') THEN
    CREATE POLICY "Usuários podem criar suas redações" ON public.essays FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Usuários podem atualizar suas redações') THEN
    CREATE POLICY "Usuários podem atualizar suas redações" ON public.essays FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Usuários podem excluir suas redações') THEN
    CREATE POLICY "Usuários podem excluir suas redações" ON public.essays FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_essays_user_day ON public.essays(user_id, theme_day);

-- ============================================================
-- 2. Tabela de posts (Feed Social)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  -- type: 'text' | 'essay_share' | 'achievement' | 'question'
  content TEXT NOT NULL,
  image_url TEXT,
  -- Dados opcionais quando o tipo é 'essay_share' (sem chave estrangeira rígida para evitar conflitos)
  essay_id UUID,
  essay_score INT,
  essay_topic TEXT,
  -- Dados de conquista quando o tipo é 'achievement'
  achievement_title TEXT,
  achievement_icon TEXT,
  -- Métricas (cache denormalizado para performance)
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Tabela de curtidas em posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ============================================================
-- 4. Tabela de comentários em posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

-- RLS: posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Usuários autenticados podem ler todos os posts') THEN
    CREATE POLICY "Usuários autenticados podem ler todos os posts" ON public.posts FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Usuários podem criar seus próprios posts') THEN
    CREATE POLICY "Usuários podem criar seus próprios posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Usuários podem atualizar seus próprios posts') THEN
    CREATE POLICY "Usuários podem atualizar seus próprios posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Usuários podem deletar seus próprios posts') THEN
    CREATE POLICY "Usuários podem deletar seus próprios posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS: curtidas
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Usuários autenticados podem ver curtidas') THEN
    CREATE POLICY "Usuários autenticados podem ver curtidas" ON public.post_likes FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Usuários podem curtir posts') THEN
    CREATE POLICY "Usuários podem curtir posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Usuários podem descurtir posts') THEN
    CREATE POLICY "Usuários podem descurtir posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS: comentários
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Usuários autenticados podem ler comentários') THEN
    CREATE POLICY "Usuários autenticados podem ler comentários" ON public.post_comments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Usuários podem comentar em posts') THEN
    CREATE POLICY "Usuários podem comentar em posts" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Usuários podem deletar seus próprios comentários') THEN
    CREATE POLICY "Usuários podem deletar seus próprios comentários" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Triggers para contadores
CREATE OR REPLACE FUNCTION update_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_posts_updated_at ON public.posts;
CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_post_updated_at();

CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_likes_count ON public.post_likes;
CREATE TRIGGER trigger_sync_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_comments_count ON public.post_comments;
CREATE TRIGGER trigger_sync_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();
