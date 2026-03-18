-- Add configurable valid activity types for challenge submissions
ALTER TABLE public.challenge_settings
ADD COLUMN IF NOT EXISTS activity_types TEXT[];

UPDATE public.challenge_settings
SET activity_types = ARRAY['Ride', 'Trailwork']
WHERE activity_types IS NULL OR array_length(activity_types, 1) IS NULL;

ALTER TABLE public.challenge_settings
ALTER COLUMN activity_types SET DEFAULT ARRAY['Ride', 'Trailwork'];

ALTER TABLE public.challenge_settings
ALTER COLUMN activity_types SET NOT NULL;
