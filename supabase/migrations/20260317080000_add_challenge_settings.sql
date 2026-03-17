-- Add singleton challenge settings with admin-managed date range
CREATE TABLE IF NOT EXISTS public.challenge_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (start_date <= end_date)
);

INSERT INTO public.challenge_settings (id, start_date, end_date)
VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '29 day')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.challenge_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_challenge_settings_updated_at ON public.challenge_settings;
CREATE TRIGGER update_challenge_settings_updated_at BEFORE UPDATE ON public.challenge_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Admins can view challenge settings" ON public.challenge_settings;
CREATE POLICY "Admins can view challenge settings" ON public.challenge_settings
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update challenge settings" ON public.challenge_settings;
CREATE POLICY "Admins can update challenge settings" ON public.challenge_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
