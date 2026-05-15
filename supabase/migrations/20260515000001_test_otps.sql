-- Stores OTPs intercepted by the SMS hook for automated testing.
-- Only used while Twilio is not configured. Safe to drop in production.
CREATE TABLE IF NOT EXISTS test_otps (
  phone text PRIMARY KEY,
  otp   text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_otps ENABLE ROW LEVEL SECURITY;

-- Anon clients can read OTPs that are less than 2 minutes old (they expire anyway).
CREATE POLICY "anon read recent test otps" ON test_otps
  FOR SELECT TO anon
  USING (created_at > now() - interval '10 minutes');

GRANT SELECT ON test_otps TO anon;
GRANT SELECT, INSERT, UPDATE ON test_otps TO service_role;
