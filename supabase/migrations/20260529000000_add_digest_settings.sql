ALTER TABLE users ADD digest_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD digest_email TEXT;
ALTER TABLE users ADD digest_unsubscribe_token TEXT UNIQUE;

CREATE INDEX idx_users_digest_enabled
  ON users (digest_enabled);