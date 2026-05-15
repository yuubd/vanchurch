-- Allow any authenticated user to view all churches (needed for find-community onboarding flow)
-- New users don't have a church_id yet so the old policy "id = current_user_church_id()" returns nothing
CREATE POLICY "authenticated can view all churches"
  ON churches FOR SELECT TO authenticated USING (true);

-- Church requests (users requesting to add their church to the platform)
CREATE TABLE church_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name text NOT NULL,
  pastor_name text NOT NULL,
  church_address text NOT NULL,
  requester_name text,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE church_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can insert church requests"
  ON church_requests FOR INSERT TO authenticated WITH CHECK (true);

GRANT INSERT ON church_requests TO authenticated;

-- Update trigger to capture phone number from auth.users on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, phone, roles)
  VALUES (NEW.id, '', COALESCE(NEW.phone, ''), ARRAY['member']::text[])
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
