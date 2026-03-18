-- Add role support to profiles for admin access control
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'user';

ALTER TABLE public.profiles
ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END;
$$;
