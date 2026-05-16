-- Create persistent cache for GitHub metrics
CREATE TABLE IF NOT EXISTS github_metrics_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  ttl_expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_metrics_cache_ttl ON github_metrics_cache(ttl_expires_at);
