-- Migration: add period_start to goals table if it does not exist
-- period_start: stores the beginning of the active goal tracking timeframe (e.g. week start or month start)

alter table goals
  add column if not exists period_start timestamptz;
