-- Add deadline column
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- Update the check constraint on unit to include 'streak' and 'language'
-- Since it might have a constraint, we need to alter it. Wait, the original table did NOT have a constraint on unit.
-- We can just ensure there's no restrictive constraint, or if we want we can just add the column.
