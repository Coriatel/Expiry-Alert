BEGIN;
ALTER TABLE public.ea_reagent_catalog
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_ea_reagent_catalog_manufacturer
  ON public.ea_reagent_catalog(manufacturer);
COMMIT;
