BEGIN;
ALTER TABLE public.reagents
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT;
CREATE INDEX IF NOT EXISTS idx_reagents_manufacturer ON public.reagents(manufacturer);
COMMIT;
