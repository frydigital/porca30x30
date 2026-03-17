-- Add admin helper and RLS policies for admin read access
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
CREATE POLICY "Admins can view all activities" ON public.activities
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all daily activities" ON public.daily_activities;
CREATE POLICY "Admins can view all daily activities" ON public.daily_activities
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all streaks" ON public.streaks;
CREATE POLICY "Admins can view all streaks" ON public.streaks
  FOR SELECT USING (public.is_admin());
