-- ============================================================
-- Cooperative Society Management System
-- Supabase PostgreSQL Schema + RLS Policies + Seed Data
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ELECTORAL DIVISIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.electoral_divisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_electoral_divisions_name ON public.electoral_divisions(division_name);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(category_name);

-- ============================================================
-- SETTINGS TABLE (singleton)
-- ============================================================

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

-- ============================================================
-- MEMBERS TABLE
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_members_member_no ON public.members(member_no);
CREATE INDEX IF NOT EXISTS idx_members_nic ON public.members(nic);
CREATE INDEX IF NOT EXISTS idx_members_joined_date ON public.members(joined_date);
CREATE INDEX IF NOT EXISTS idx_members_division ON public.members(electoral_division_id);
CREATE INDEX IF NOT EXISTS idx_members_category ON public.members(category_id);
CREATE INDEX IF NOT EXISTS idx_members_name_gin ON public.members USING gin(to_tsvector('simple', name));

-- Full text search index (uses built-in tsvector, no extension needed)
CREATE INDEX IF NOT EXISTS idx_members_search ON public.members
    USING gin(to_tsvector('simple', member_no || ' ' || name || ' ' || COALESCE(nic, '')));

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electoral_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- Helper function to get user role
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
        'OPERATOR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MEMBERS POLICIES
-- ============================================================

-- ADMIN: Full access
CREATE POLICY "admin_all_members" ON public.members
    FOR ALL
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

-- OPERATOR: Read + Insert + Update (no delete)
CREATE POLICY "operator_select_members" ON public.members
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "operator_insert_members" ON public.members
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "operator_update_members" ON public.members
    FOR UPDATE
    USING (public.get_user_role() IN ('ADMIN', 'OPERATOR'))
    WITH CHECK (public.get_user_role() IN ('ADMIN', 'OPERATOR'));

-- ============================================================
-- DIVISIONS POLICIES
-- ============================================================

CREATE POLICY "authenticated_select_divisions" ON public.electoral_divisions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_divisions" ON public.electoral_divisions
    FOR ALL
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

CREATE POLICY "operator_insert_divisions" ON public.electoral_divisions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "operator_update_divisions" ON public.electoral_divisions
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- CATEGORIES POLICIES
-- ============================================================

CREATE POLICY "authenticated_select_categories" ON public.categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_categories" ON public.categories
    FOR ALL
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

CREATE POLICY "operator_insert_categories" ON public.categories
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "operator_update_categories" ON public.categories
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SETTINGS POLICIES (Admin only)
-- ============================================================

CREATE POLICY "authenticated_select_settings" ON public.settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_settings" ON public.settings
    FOR ALL
    USING (public.get_user_role() = 'ADMIN')
    WITH CHECK (public.get_user_role() = 'ADMIN');

-- ============================================================
-- AUDIT LOG POLICIES
-- ============================================================

CREATE POLICY "admin_all_audit_logs" ON public.audit_logs
    FOR ALL USING (public.get_user_role() = 'ADMIN');

CREATE POLICY "authenticated_insert_audit" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SEED: 23 ELECTORAL DIVISIONS
-- ============================================================

INSERT INTO public.electoral_divisions (division_name) VALUES
    ('Colombo'),
    ('Gampaha'),
    ('Kalutara'),
    ('Kandy'),
    ('Matale'),
    ('Nuwara Eliya'),
    ('Galle'),
    ('Matara'),
    ('Hambantota'),
    ('Jaffna'),
    ('Vanni'),
    ('Batticaloa'),
    ('Digamadulla'),
    ('Trincomalee'),
    ('Kurunegala'),
    ('Puttalam'),
    ('Anuradhapura'),
    ('Polonnaruwa'),
    ('Badulla'),
    ('Moneragala'),
    ('Ratnapura'),
    ('Kegalle'),
    ('Ampara')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: DEFAULT CATEGORIES
-- ============================================================

INSERT INTO public.categories (category_name) VALUES
    ('Regular Member'),
    ('Senior Member'),
    ('Youth Member'),
    ('Executive Member'),
    ('Life Member')
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to members table
CREATE TRIGGER set_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Apply to settings table
CREATE TRIGGER set_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STORAGE BUCKET: settings (for logo)
-- Run in Supabase Dashboard > Storage or as separate admin call
-- ============================================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('settings', 'settings', true)
-- ON CONFLICT DO NOTHING;

-- CREATE POLICY "Public read settings bucket" ON storage.objects
--     FOR SELECT USING (bucket_id = 'settings');

-- CREATE POLICY "Admin upload settings bucket" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'settings' AND auth.role() = 'authenticated');

-- CREATE POLICY "Admin update settings bucket" ON storage.objects
--     FOR UPDATE USING (bucket_id = 'settings' AND auth.role() = 'authenticated');-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER CREATION QUEUE (FOR SECURE CLIENT-SIDE USER CREATION)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_creation_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_creation_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can request user creation
DROP POLICY IF EXISTS "admin_insert_user_creation_queue" ON public.user_creation_queue;
CREATE POLICY "admin_insert_user_creation_queue" ON public.user_creation_queue
    FOR INSERT
    WITH CHECK (public.get_user_role() = 'ADMIN');

-- Security definer trigger function to handle user creation
DROP FUNCTION IF EXISTS public.handle_user_creation() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_user_creation()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    encrypted_pw TEXT;
BEGIN
    -- Check if calling user is actually an ADMIN
    IF public.get_user_role() != 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can create new users.';
    END IF;

    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
        RAISE EXCEPTION 'A user with this email already exists.';
    END IF;

    -- Generate UUID
    new_user_id := gen_random_uuid();
    
    -- Hash password
    encrypted_pw := crypt(NEW.password, gen_salt('bf'));

    -- Insert into auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        role,
        aud,
        is_super_admin,
        phone,
        is_sso_user,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        NEW.email,
        encrypted_pw,
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('role', NEW.role, 'email_verified', true),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        false,
        NULL,    -- phone set to NULL to satisfy unique constraint
        false,   -- is_sso_user
        '',      -- confirmation_token (MUST NOT BE NULL)
        '',      -- email_change (MUST NOT BE NULL)
        '',      -- email_change_token_new (MUST NOT BE NULL)
        ''       -- recovery_token (MUST NOT BE NULL)
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object('sub', new_user_id, 'email', NEW.email),
        'email',
        new_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- Return NULL to prevent storing the row in the table (keeps passwords out of DB)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_user_creation
    BEFORE INSERT ON public.user_creation_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_creation();

-- ============================================================
-- USER MANAGEMENT ADMIN RPC FUNCTIONS
-- ============================================================

-- Function to list all system users
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::text,
        COALESCE(u.raw_user_meta_data->>'role', 'OPERATOR')::text AS role,
        u.created_at,
        u.last_sign_in_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a user's role
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
    IF public.get_user_role() != 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can update user roles.';
    END IF;

    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)),
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset a user's password
CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
    IF public.get_user_role() != 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can reset user passwords.';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a user
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF public.get_user_role() != 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can delete users.';
    END IF;

    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;


-- ============================================================
-- HOW TO CREATE ADMIN USER:
-- 
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a new user with email/password
-- 3. Go to SQL Editor and run:
--    UPDATE auth.users
--    SET raw_user_meta_data = '{"role": "ADMIN"}'
--    WHERE email = 'your-admin@email.com';
--
-- For OPERATOR users, use:
--    UPDATE auth.users
--    SET raw_user_meta_data = '{"role": "OPERATOR"}'
--    WHERE email = 'your-operator@email.com';
-- ============================================================
