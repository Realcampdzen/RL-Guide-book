-- Migration 012: Director Proposal type on council_initiatives (M14-CAMP-DIRECTOR-A)

ALTER TABLE council_initiatives ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'regular'
  CHECK (proposal_type IN ('regular', 'director_proposal'));
