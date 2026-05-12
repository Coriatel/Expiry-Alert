BEGIN;

ALTER TABLE public.ea_transfer_requests
  DROP CONSTRAINT IF EXISTS ea_transfer_requests_status_chk;

ALTER TABLE public.ea_transfer_requests
  ADD CONSTRAINT ea_transfer_requests_status_chk
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed'));

COMMIT;
