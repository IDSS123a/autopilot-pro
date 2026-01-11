-- Add page_views table to track user interests and activity
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own page views
CREATE POLICY "Users can insert own page views"
ON public.page_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own page views
CREATE POLICY "Users can view own page views"
ON public.page_views
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all page views
CREATE POLICY "Admins can view all page views"
ON public.page_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add user_sessions table to track session duration
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  pages_visited INTEGER DEFAULT 1,
  user_agent TEXT,
  UNIQUE(session_id)
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at DESC);