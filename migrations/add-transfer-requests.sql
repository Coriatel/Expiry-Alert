BEGIN;

CREATE TABLE IF NOT EXISTS public.ea_transfer_requests (
  id            SERIAL PRIMARY KEY,
  from_team     INTEGER NOT NULL,
  to_team       INTEGER NOT NULL,
  message_text  TEXT,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_by    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by    INTEGER,
  decided_at    TIMESTAMPTZ,
  CONSTRAINT ea_transfer_requests_status_chk
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_ea_transfer_requests_to_team_status
  ON public.ea_transfer_requests(to_team, status);

CREATE INDEX IF NOT EXISTS idx_ea_transfer_requests_from_team
  ON public.ea_transfer_requests(from_team);

COMMIT;
