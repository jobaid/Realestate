-- Phase 7: About editor + SMTP + email broadcast.
-- site_settings gains About, SMTP, and admin-notification keys
-- (no schema change — those are JSONB entries). Seed defaults:
UPDATE site_settings SET data = data || jsonb_build_object(
    'about_name',        COALESCE(data->>'about_name',  'Your Name'),
    'about_title',       COALESCE(data->>'about_title', 'Realtor & Founder'),
    'about_photo_url',   COALESCE(data->>'about_photo_url', ''),
    'about_bio',         COALESCE(data->>'about_bio',
        'Introduce yourself here. Share your experience, approach, and what makes you the right partner for your clients.'),
    'notify_email',      COALESCE(data->>'notify_email', data->>'email'),
    'smtp_host',         COALESCE(data->>'smtp_host', ''),
    'smtp_port',         COALESCE(data->>'smtp_port', '587'),
    'smtp_user',         COALESCE(data->>'smtp_user', ''),
    'smtp_password',     COALESCE(data->>'smtp_password', ''),
    'smtp_from_name',    COALESCE(data->>'smtp_from_name', 'NUR Realty'),
    'smtp_from_address', COALESCE(data->>'smtp_from_address', ''),
    'smtp_use_tls',      COALESCE(data->>'smtp_use_tls', 'true')
) WHERE id = 1;

CREATE TABLE IF NOT EXISTS email_contacts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL DEFAULT '',
    tags         TEXT NOT NULL DEFAULT '',
    source       TEXT NOT NULL DEFAULT 'manual',
    unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON email_contacts(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_contacts_subscribed ON email_contacts(unsubscribed);
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON email_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS email_campaigns (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject       TEXT NOT NULL,
    body_html     TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sending','sent','failed')),
    sent_count    INT NOT NULL DEFAULT 0,
    failed_count  INT NOT NULL DEFAULT 0,
    total_targets INT NOT NULL DEFAULT 0,
    sent_at       TIMESTAMPTZ,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error    TEXT
);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON email_campaigns(created_at DESC);
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
