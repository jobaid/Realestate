-- Phase 4: company/site settings (single-row JSON blob).
CREATE TABLE IF NOT EXISTS site_settings (
    id         INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO site_settings (id, data) VALUES (1, jsonb_build_object(
    'company_name', 'NUR Realty',
    'tagline', 'Find the home that fits your life.',
    'phone', '(617) 555-0123',
    'email', 'hello@azimrealty.local',
    'address', '1 Beacon Street, Boston, MA 02108',
    'facebook_url', '',
    'instagram_url', '',
    'twitter_url', ''
)) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
