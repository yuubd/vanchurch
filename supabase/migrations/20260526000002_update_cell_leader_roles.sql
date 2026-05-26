-- 장진희 and 김예닮 → cell_leader only
UPDATE public.users SET roles = ARRAY['cell_leader'] WHERE phone IN ('+11000000005', '+11000000007');
