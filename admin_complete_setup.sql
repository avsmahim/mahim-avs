-- =============================================
-- COMPLETE ADMIN PANEL — Additional Tables & Settings
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Create apps table (if not exists)
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public apps viewable by everyone" ON public.apps FOR SELECT USING (true);
CREATE POLICY "Allow all to modify apps" ON public.apps FOR ALL USING (true) WITH CHECK (true);

-- 2. Create posts table (if not exists, with all fields)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    content TEXT,
    image_url TEXT,
    labels TEXT,
    status TEXT DEFAULT 'draft',
    permalink TEXT,
    location TEXT,
    search_desc TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow all to modify posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- 3. Insert all new default settings
INSERT INTO public.settings (key, value) VALUES
  ('nav_logo_text',      'AVS MAHIM'),
  ('nav_logo_color',     '#ffd700'),
  ('nav_signup_text',    'SIGN UP'),
  ('nav_signup_color',   '#ffd700'),
  ('hero_title',         'Get More Plugins Using Quality Effects'),
  ('hero_subtitle',      'We provide premium Plugins, SFX, Presets and Windows Apps for video editors and content creators worldwide.'),
  ('hero_btn_text',      'GET FREE RESOURCES NOW — IT''S FREE!'),
  ('hero_btn_link',      '#resources'),
  ('hero_bg_image',      ''),
  ('hero_bg_video',      ''),
  ('profile_name',       'AVS Mahim'),
  ('profile_image',      ''),
  ('profile_bio1',       'AVS Mahim is a Bangladeshi Creator and Developer.'),
  ('profile_bio2',       'He is the Founder of AVS Control - a professional'),
  ('profile_bio3',       'platform for Plugins, SFX, Presets and Windows Apps.'),
  ('profile_bio4',       'He creates content for video editors and creators.'),
  ('profile_link1_text', 'More at AVS Control'),
  ('profile_link1_url',  '#'),
  ('profile_link2_text', 'Contact info'),
  ('profile_link2_url',  '#'),
  ('profile_visible',    'true'),
  ('footer_desc',        'Premium Plugins, SFX, Presets and Apps for creators.'),
  ('footer_copyright',   '© 2025 AVS Control. All rights reserved.'),
  ('footer_yt',          ''),
  ('footer_ig',          ''),
  ('footer_fb',          ''),
  ('footer_tw',          ''),
  ('footer_tt',          ''),
  ('footer_dc',          ''),
  ('color_primary',      '#ffd700'),
  ('color_bg',           '#030609'),
  ('color_text',         '#ffffff'),
  ('color_shadow',       '#b8860b'),
  ('site_title',         'AVS Control - Premium Plugins, SFX & Presets'),
  ('site_tagline',       'Premiere Pro & After Effects Resources'),
  ('site_meta_desc',     'We provide premium Plugins, SFX, Presets and Windows Apps for video editors.'),
  ('site_favicon',       ''),
  ('maintenance_mode',   'false')
ON CONFLICT (key) DO NOTHING;

-- 4. Ensure settings table has RLS and right policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
-- Drop and recreate to avoid duplicate policy errors
DROP POLICY IF EXISTS "Public settings viewable by everyone" ON public.settings;
DROP POLICY IF EXISTS "Allow all to modify settings" ON public.settings;
CREATE POLICY "Public settings viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow all to modify settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
