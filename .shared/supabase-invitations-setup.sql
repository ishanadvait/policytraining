-- =====================================================
-- Admin Invitation System - Database Setup
-- =====================================================
-- Run this script in Supabase Dashboard > SQL Editor
-- After running, set gautam.advait@ishantechnologies.com as admin
-- in Authentication > Users > Edit User > User Metadata:
-- {"is_admin": true}
-- =====================================================

-- Create invitations tracking table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone TEXT,
  invited_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  n8n_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

-- Enable Row Level Security
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view invitations
CREATE POLICY "Admins can view invitations" ON invitations
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- RLS Policy: Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- RLS Policy: Only admins can update invitations
CREATE POLICY "Admins can update invitations" ON invitations
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Auto-mark invitation as accepted when user confirms email
CREATE OR REPLACE FUNCTION mark_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_confirmed
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION mark_invitation_accepted();

-- =====================================================
-- Setup Complete!
-- =====================================================
-- Next Steps:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Find user: gautam.advait@ishantechnologies.com
-- 3. Click Edit > User Metadata
-- 4. Add: {"is_admin": true}
-- 5. Save
-- =====================================================
