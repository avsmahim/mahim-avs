-- ═══ SUPABASE SETUP FOR ADMIN PANEL ═══

-- 1. Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Delete old settings if any to avoid confusion with the new structure
-- INSERT INTO public.site_settings (key, value) VALUES 
-- ('site_title', 'AVS MAHIM - Premium Resources'),
-- ('site_tagline', 'High-quality effects and plugins'),
-- ('site_meta_desc', 'Join AVS MAHIM for the best video editing resources.'),
-- ('nav_logo_text', 'AVS MAHIM'),
-- ('hero_title', 'REVOLUTIONIZE YOUR WORKFLOW'),
-- ('hero_subtitle', 'Get immediate access to premium plugins and SFX.')
-- ON CONFLICT (key) DO NOTHING;

-- 2. Page Layout Table
CREATE TABLE IF NOT EXISTS public.page_layout (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name TEXT UNIQUE NOT NULL,
    position INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true
);

-- Initialize Page Layout
INSERT INTO public.page_layout (section_name, position, is_visible) VALUES
('Hero', 1, true),
('Profile', 2, true),
('Plugins', 3, true),
('SFX', 4, true),
('Presets', 5, true),
('Apps', 6, true),
('Footer', 7, true)
ON CONFLICT (section_name) DO NOTHING;

-- 3. Plugins Table
CREATE TABLE IF NOT EXISTS public.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    file_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. SFX Table
CREATE TABLE IF NOT EXISTS public.sfx (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    audio_url TEXT,
    image_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Presets Table
CREATE TABLE IF NOT EXISTS public.presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    file_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Apps Table
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Policies (Ensure RLS is off or permissive for admin for now)
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_layout DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfx DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
