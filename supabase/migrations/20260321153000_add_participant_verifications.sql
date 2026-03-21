-- Admin-only participant verification status for waiver tracking
CREATE TABLE IF NOT EXISTS public.participant_verifications (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  verified BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.participant_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view participant verifications" ON public.participant_verifications;
CREATE POLICY "Admins can view participant verifications" ON public.participant_verifications
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert participant verifications" ON public.participant_verifications;
CREATE POLICY "Admins can insert participant verifications" ON public.participant_verifications
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update participant verifications" ON public.participant_verifications;
CREATE POLICY "Admins can update participant verifications" ON public.participant_verifications
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_participant_verifications_updated_at ON public.participant_verifications;
CREATE TRIGGER update_participant_verifications_updated_at
  BEFORE UPDATE ON public.participant_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
