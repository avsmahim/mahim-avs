-- Supabase Schema for Download Marketplace

-- 1. Create items table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('plugins', 'sfx', 'presets', 'apps')),
    type TEXT NOT NULL CHECK (type IN ('free', 'premium')),
    price NUMERIC(10, 2) DEFAULT 0.00,
    file_url TEXT,
    thumbnail_url TEXT,
    download_count INTEGER DEFAULT 0,
    version TEXT, -- explicitly for apps if needed
    size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- 3. Create posts table (Blog/News)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    thumbnail_url TEXT,
    category TEXT DEFAULT 'news',
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Items: Anyone can read, all can write (INSECURE ADMIN WORKAROUND)
CREATE POLICY "Public items are viewable by everyone." ON public.items FOR SELECT USING (true);
CREATE POLICY "Allow all to modify items" ON public.items FOR ALL USING (true) WITH CHECK (true);

-- Posts: Anyone can read published posts (for frontend), all can write (INSECURE ADMIN WORKAROUND)
CREATE POLICY "Public posts are viewable by everyone." ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow all to modify posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- Purchases: Users can only see/insert their own purchases
CREATE POLICY "Users can view their own purchases." ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases." ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

