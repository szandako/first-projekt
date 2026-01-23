-- Futtasd ezt a Supabase SQL Editor-ben, hogy megnézzük van-e profile

-- 1. Nézd meg az auth.users táblát (léteznek-e userek?)
SELECT id, email, created_at FROM auth.users;

-- 2. Nézd meg a profiles táblát (van-e minden userhez profile?)
SELECT * FROM profiles;

-- 3. Ha hiányzik a profile, akkor ezt futtasd le (cseréld ki a user_id-t és email-t):
-- INSERT INTO profiles (id, email, full_name)
-- SELECT id, email, raw_user_meta_data->>'full_name'
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM profiles);
