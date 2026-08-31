-- ============================================================
-- BuyOh Marketplace: Clean Supabase Profiles & Storage Setup
-- Copy and run this script in your Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New Query -> Paste & Run)
-- ============================================================

-- 1. Ensure public.profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY
);

-- 2. Add all required columns safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Lagos, Nigeria';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS saved_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS my_listings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followed_sellers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop any restrictive NOT NULL constraints on existing name/full_name columns
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 3. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all user profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Automatically create a profile row for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name TEXT;
  user_avatar TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  user_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_whatsapp := COALESCE(NEW.raw_user_meta_data->>'whatsapp', user_phone, '');

  INSERT INTO public.profiles (id, email, name, full_name, phone, whatsapp, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    display_name,
    display_name,
    user_phone,
    user_whatsapp,
    user_avatar
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), public.profiles.whatsapp),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill profiles for existing users
INSERT INTO public.profiles (id, email, name, full_name, phone, whatsapp, avatar_url)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'whatsapp', raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
  whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), public.profiles.whatsapp),
  name = COALESCE(EXCLUDED.name, public.profiles.name),
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

-- 6. Setup the Public Storage Bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: Allow everyone to read avatars, and authenticated users to upload/update
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update their own avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 7. Secure RPC Function allowing authenticated users to delete their own account
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NOT NULL THEN
    -- Delete user profile row
    DELETE FROM public.profiles WHERE id = current_user_id;
    -- Delete user auth account
    DELETE FROM auth.users WHERE id = current_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

