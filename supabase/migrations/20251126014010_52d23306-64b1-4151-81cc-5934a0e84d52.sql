-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    title TEXT,
    company TEXT,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    cv_url TEXT,
    avatar_url TEXT,
    bio TEXT,
    target_roles TEXT[],
    target_locations TEXT[],
    target_industries TEXT[],
    salary_expectation TEXT,
    availability TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create job_applications table
CREATE TABLE public.job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    position_title TEXT NOT NULL,
    job_url TEXT,
    application_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'applied',
    notes TEXT,
    salary_range TEXT,
    location TEXT,
    contact_person TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Job applications policies
CREATE POLICY "Users can view own applications"
    ON public.job_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
    ON public.job_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
    ON public.job_applications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
    ON public.job_applications FOR DELETE
    USING (auth.uid() = user_id);

-- Create recruiters table
CREATE TABLE public.recruiters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    specialization TEXT[],
    notes TEXT,
    last_contact_date DATE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

-- Recruiters policies
CREATE POLICY "Users can view own recruiters"
    ON public.recruiters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recruiters"
    ON public.recruiters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recruiters"
    ON public.recruiters FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recruiters"
    ON public.recruiters FOR DELETE
    USING (auth.uid() = user_id);

-- Create opportunities table
CREATE TABLE public.opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    position_title TEXT NOT NULL,
    job_description TEXT,
    job_url TEXT,
    salary_range TEXT,
    location TEXT,
    remote_option BOOLEAN DEFAULT false,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    source TEXT,
    posted_date DATE,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Opportunities policies
CREATE POLICY "Users can view own opportunities"
    ON public.opportunities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opportunities"
    ON public.opportunities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunities"
    ON public.opportunities FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunities"
    ON public.opportunities FOR DELETE
    USING (auth.uid() = user_id);

-- Create communications table
CREATE TABLE public.communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    company_name TEXT,
    subject TEXT,
    message_content TEXT,
    direction TEXT CHECK (direction IN ('sent', 'received')),
    communication_type TEXT DEFAULT 'email',
    related_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
    communication_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Communications policies
CREATE POLICY "Users can view own communications"
    ON public.communications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communications"
    ON public.communications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communications"
    ON public.communications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own communications"
    ON public.communications FOR DELETE
    USING (auth.uid() = user_id);

-- Create company_dossiers table
CREATE TABLE public.company_dossiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    market_cap TEXT,
    headquarters TEXT,
    executive_summary TEXT,
    key_challenges TEXT[],
    strategic_opportunities TEXT[],
    culture_analysis TEXT,
    interview_questions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_dossiers ENABLE ROW LEVEL SECURITY;

-- Company dossiers policies
CREATE POLICY "Users can view own dossiers"
    ON public.company_dossiers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dossiers"
    ON public.company_dossiers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dossiers"
    ON public.company_dossiers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dossiers"
    ON public.company_dossiers FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruiters_updated_at
  BEFORE UPDATE ON public.recruiters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_dossiers_updated_at
  BEFORE UPDATE ON public.company_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false);

-- Storage policies for CV uploads
CREATE POLICY "Users can upload own CV"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cv-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own CV"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cv-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own CV"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cv-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own CV"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cv-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );