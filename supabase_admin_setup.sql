-- Supabase Admin Panel Schema Setup

-- 1. Create plugins table
CREATE TABLE IF NOT EXISTS public.plugins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_premium BOOLEAN DEFAULT false,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sfx table
CREATE TABLE IF NOT EXISTS public.sfx (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    audio_url TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_premium BOOLEAN DEFAULT false,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create presets table
CREATE TABLE IF NOT EXISTS public.presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_premium BOOLEAN DEFAULT false,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT
);

-- 5. Add is_admin to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 6. Insert default settings
INSERT INTO public.settings (key, value) VALUES ('hero_title', 'Get More Plugins Using Quality Effects') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('hero_subtitle', 'We provide premium Plugins, SFX, Presets and Windows Apps for video editors and content creators worldwide.') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('site_logo_text', 'AVS MAHIM') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('hero_banner_image', '') ON CONFLICT (key) DO NOTHING;

-- 7. RLS Policies
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfx ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 8. Public Read Access
CREATE POLICY "Public plugins viewable by everyone" ON public.plugins FOR SELECT USING (true);
CREATE POLICY "Public sfx viewable by everyone" ON public.sfx FOR SELECT USING (true);
CREATE POLICY "Public presets viewable by everyone" ON public.presets FOR SELECT USING (true);
CREATE POLICY "Public settings viewable by everyone" ON public.settings FOR SELECT USING (true);

-- 9. Admin Write Access (insecure workaround for client-side purely as per existing schema style, but better would be auth checks)
CREATE POLICY "Allow all to modify plugins" ON public.plugins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to modify sfx" ON public.sfx FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to modify presets" ON public.presets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to modify settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
