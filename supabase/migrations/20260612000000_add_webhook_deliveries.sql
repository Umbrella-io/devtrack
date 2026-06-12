-- Track processed GitHub webhook delivery IDs to prevent duplicate goal
-- increments when GitHub retries or replays a delivery.
-- Each delivery ID is a UUID supplied by GitHub in the x-github-delivery
-- header; recording it here makes idempotency durable across serverless
-- restarts, unlike the previous in-memory Map approach.

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id TEXT        PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enables efficient pruning of entries older than the retention window.
CREATE INDEX IF NOT EXISTS webhook_deliveries_created_at_idx
  ON webhook_deliveries (created_at);

-- Atomically increments a goal's current progress without exceeding target.
-- Returns the updated current value, or NULL when the goal was already at
-- target or the goal ID does not exist.
-- SECURITY DEFINER so the function runs as the table owner regardless of the
-- calling role (anon vs service-role), consistent with other RPC helpers.
CREATE OR REPLACE FUNCTION increment_goal_progress(
  p_goal_id  TEXT,
  p_increment INT,
  p_now      TIMESTAMPTZ DEFAULT NOW()
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE goals
     SET current        = LEAST(current + p_increment, target),
         last_synced_at = p_now,
         updated_at     = p_now
   WHERE id         = p_goal_id
     AND current    < target
  RETURNING current;
$$;
