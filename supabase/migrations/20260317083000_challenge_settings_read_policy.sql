-- Allow all authenticated users to read challenge settings while keeping admin-only updates
DROP POLICY IF EXISTS "Admins can view challenge settings" ON public.challenge_settings;

DROP POLICY IF EXISTS "Authenticated users can view challenge settings" ON public.challenge_settings;
CREATE POLICY "Authenticated users can view challenge settings" ON public.challenge_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
