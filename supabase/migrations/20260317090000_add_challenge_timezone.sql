-- Add timezone support to challenge settings for timezone-aware date handling
ALTER TABLE public.challenge_settings
ADD COLUMN IF NOT EXISTS timezone TEXT;

UPDATE public.challenge_settings
SET timezone = 'UTC'
WHERE timezone IS NULL OR timezone = '';

ALTER TABLE public.challenge_settings
ALTER COLUMN timezone SET DEFAULT 'UTC';

ALTER TABLE public.challenge_settings
ALTER COLUMN timezone SET NOT NULL;
