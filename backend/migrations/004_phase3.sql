-- Phase 3: inquiries (public contact form → admin inbox).
CREATE TABLE IF NOT EXISTS inquiries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID REFERENCES properties(id) ON DELETE SET NULL,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT,
    message      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','in_progress','responded','archived','spam')),
    source       TEXT NOT NULL DEFAULT 'property'
                 CHECK (source IN ('property','contact')),
    admin_notes  TEXT,
    assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    ip_addr      TEXT,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_property ON inquiries(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(LOWER(email));

CREATE TRIGGER trg_inquiries_updated BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
