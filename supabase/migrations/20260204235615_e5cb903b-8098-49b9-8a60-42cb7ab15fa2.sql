-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.auth_audit_log;

-- Create a new policy that allows any authenticated or unauthenticated user to insert
-- This is needed because during logout, auth.uid() becomes null before the log is written
CREATE POLICY "Allow audit log inserts" 
ON public.auth_audit_log 
FOR INSERT 
WITH CHECK (true);

-- The SELECT policies remain in place to restrict who can read the logs