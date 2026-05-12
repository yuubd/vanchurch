-- Replace single role enum with a roles text array

-- 1. Drop policies and function that depend on user_role enum (must happen before DROP TYPE)
DROP POLICY IF EXISTS "admins can manage cells" ON cells;
DROP POLICY IF EXISTS "leaders and above can read requests" ON prayer_requests;
DROP POLICY IF EXISTS "cell leaders can manage their cell attendance" ON attendance_records;
DROP POLICY IF EXISTS "admins can manage all attendance" ON attendance_records;
DROP FUNCTION IF EXISTS current_user_role();

-- 2. Add roles array, migrate data, drop old column and type
ALTER TABLE users ADD COLUMN roles text[] NOT NULL DEFAULT ARRAY['member']::text[];
UPDATE users SET roles = ARRAY[role::text];
ALTER TABLE users DROP COLUMN role;
DROP TYPE user_role;

-- 3. New helper returning roles array
CREATE OR REPLACE FUNCTION current_user_roles()
RETURNS text[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT roles FROM users WHERE id = auth.uid()
$$;

-- 4. Update auto-create trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, roles)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    ARRAY['member']
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 5. Recreate RLS policies using new array helper
CREATE POLICY "admins can manage cells"
  ON cells FOR ALL
  USING ('admin' = ANY(current_user_roles()));

CREATE POLICY "leaders and above can read requests"
  ON prayer_requests FOR SELECT
  USING (
    'admin' = ANY(current_user_roles())
    OR 'pastor' = ANY(current_user_roles())
    OR ('cell_leader' = ANY(current_user_roles()) AND cell_id = current_user_cell_id())
  );

CREATE POLICY "cell leaders can manage their cell attendance"
  ON attendance_records FOR ALL
  USING ('cell_leader' = ANY(current_user_roles()) AND cell_id = current_user_cell_id());

CREATE POLICY "admins can manage all attendance"
  ON attendance_records FOR ALL
  USING ('admin' = ANY(current_user_roles()));
