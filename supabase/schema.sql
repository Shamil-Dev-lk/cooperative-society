-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ELECTORAL DIVISIONS TABLE
CREATE TABLE IF NOT EXISTS public.electoral_divisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    society_name TEXT NOT NULL DEFAULT 'Cooperative Society',
    address TEXT DEFAULT '',
    telephone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    theme_color TEXT DEFAULT '#CC0000',
    resend_api_key TEXT DEFAULT '',
    twilio_sid TEXT DEFAULT '',
    twilio_auth_token TEXT DEFAULT '',
    twilio_from_number TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    joined_date DATE,
    nic TEXT,
    share_amount NUMERIC(14, 2) DEFAULT 0,
    electoral_division_id UUID REFERENCES public.electoral_divisions(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER CREATION QUEUE
CREATE TABLE IF NOT EXISTS public.user_creation_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED DEFAULT SETTINGS
INSERT INTO public.settings (society_name) VALUES ('Cooperative Society') ON CONFLICT DO NOTHING;

-- SEED 23 ELECTORAL DIVISIONS
INSERT INTO public.electoral_divisions (division_name) VALUES
    ('Colombo'),('Gampaha'),('Kalutara'),('Kandy'),('Matale'),('Nuwara Eliya'),
    ('Galle'),('Matara'),('Hambantota'),('Jaffna'),('Vanni'),('Batticaloa'),
    ('Digamadulla'),('Trincomalee'),('Kurunegala'),('Puttalam'),('Anuradhapura'),
    ('Polonnaruwa'),('Badulla'),('Moneragala'),('Ratnapura'),('Kegalle'),('Ampara')
ON CONFLICT DO NOTHING;

-- SEED DEFAULT CATEGORIES
INSERT INTO public.categories (category_name) VALUES
    ('Regular Member'),('Senior Member'),('Youth Member'),('Executive Member'),('Life Member')
ON CONFLICT DO NOTHING;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electoral_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_creation_queue ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
        'OPERATOR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP EXISTING POLICIES TO PREVENT "ALREADY EXISTS" ERRORS
DROP POLICY IF EXISTS "operator_select_members" ON public.members;
DROP POLICY IF EXISTS "operator_insert_members" ON public.members;
DROP POLICY IF EXISTS "operator_update_members" ON public.members;
DROP POLICY IF EXISTS "admin_all_members" ON public.members;

DROP POLICY IF EXISTS "authenticated_select_divisions" ON public.electoral_divisions;
DROP POLICY IF EXISTS "authenticated_select_categories" ON public.categories;
DROP POLICY IF EXISTS "authenticated_select_settings" ON public.settings;
DROP POLICY IF EXISTS "admin_insert_user_creation_queue" ON public.user_creation_queue;

-- CREATE POLICIES
CREATE POLICY "operator_select_members" ON public.members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "operator_insert_members" ON public.members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "operator_update_members" ON public.members FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_members" ON public.members FOR ALL USING (public.get_user_role() = 'ADMIN');

CREATE POLICY "authenticated_select_divisions" ON public.electoral_divisions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_select_categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_select_settings" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_insert_user_creation_queue" ON public.user_creation_queue FOR INSERT WITH CHECK (true);

-- USER MANAGEMENT RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (id UUID, email TEXT, role TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY SELECT u.id, u.email::text, COALESCE(u.raw_user_meta_data->>'role', 'OPERATOR')::text AS role, u.created_at, u.last_sign_in_at FROM auth.users u ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)), updated_at = NOW() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = NOW() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;
