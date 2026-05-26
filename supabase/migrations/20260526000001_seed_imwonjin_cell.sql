-- Seed 임원진셀 with test accounts
-- 한기석 (pastor + cell_leader): 100-000-0000
-- 박찬주 (admin + member):        100-000-0001
-- 김하율 (admin + member):        100-000-0002
-- 정휘정, 김민, 장진희, 김동우, 김예닮, 차준영, 박희진 (member): 100-000-0003..0009

DO $$
DECLARE
  v_cell_id uuid;
  v_church_id uuid;
BEGIN
  -- Get church id (use first church found)
  SELECT id INTO v_church_id FROM churches LIMIT 1;

  -- Create cell
  INSERT INTO cells (id, name, church_id)
  VALUES (gen_random_uuid(), '임원진셀', v_church_id)
  RETURNING id INTO v_cell_id;

  -- Insert auth.users (phone confirmed so they can log in)
  INSERT INTO auth.users (id, phone, phone_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    ('a1000000-0000-0000-0000-000000000000', '+11000000000', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000001', '+11000000001', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000002', '+11000000002', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000003', '+11000000003', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000004', '+11000000004', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000005', '+11000000005', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000006', '+11000000006', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000007', '+11000000007', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000008', '+11000000008', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
    ('a1000000-0000-0000-0000-000000000009', '+11000000009', now(), 'authenticated', 'authenticated', '{"provider":"phone","providers":["phone"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert/update public.users with names, cell, church, roles
  INSERT INTO public.users (id, name, phone, cell_id, church_id, roles)
  VALUES
    ('a1000000-0000-0000-0000-000000000000', '한기석', '+11000000000', v_cell_id, v_church_id, ARRAY['pastor','cell_leader']),
    ('a1000000-0000-0000-0000-000000000001', '박찬주', '+11000000001', v_cell_id, v_church_id, ARRAY['admin','member']),
    ('a1000000-0000-0000-0000-000000000002', '김하율', '+11000000002', v_cell_id, v_church_id, ARRAY['admin','member']),
    ('a1000000-0000-0000-0000-000000000003', '정휘정', '+11000000003', v_cell_id, v_church_id, ARRAY['member']),
    ('a1000000-0000-0000-0000-000000000004', '김민',   '+11000000004', v_cell_id, v_church_id, ARRAY['member']),
    ('a1000000-0000-0000-0000-000000000005', '장진희', '+11000000005', v_cell_id, v_church_id, ARRAY['member']),
    ('a1000000-0000-0000-0000-000000000006', '김동우', '+11000000006', v_cell_id, v_church_id, ARRAY['member']),
    ('a1000000-0000-0000-0000-000000000007', '김예닮', '+11000000007', v_cell_id, v_church_id, ARRAY['member']),
    ('a1000000-0000-0000-0000-000000000008', '차준영', '+11000000008', v_cell_id, v_church_id, ARRAY['member']),
    ('a1000000-0000-0000-0000-000000000009', '박희진', '+11000000009', v_cell_id, v_church_id, ARRAY['member'])
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    cell_id = EXCLUDED.cell_id,
    church_id = EXCLUDED.church_id,
    roles = EXCLUDED.roles;

  -- Set 한기석 as the cell leader of 임원진셀
  UPDATE cells SET leader_id = 'a1000000-0000-0000-0000-000000000000' WHERE id = v_cell_id;
END;
$$;
