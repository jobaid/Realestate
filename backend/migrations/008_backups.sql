-- Phase 7.2: backup registry + scheduler settings.
CREATE TABLE IF NOT EXISTS backups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename    TEXT NOT NULL UNIQUE,
    size_bytes  BIGINT NOT NULL DEFAULT 0,
    kind        TEXT NOT NULL DEFAULT 'manual'
                CHECK (kind IN ('manual','auto','pre_restore')),
    status      TEXT NOT NULL DEFAULT 'ready'
                CHECK (status IN ('running','ready','failed')),
    error       TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at DESC);

-- Scheduler settings seeded into site_settings (no schema change).
UPDATE site_settings SET data = data || jsonb_build_object(
    'backup_schedule',       COALESCE(data->>'backup_schedule', 'off'),       -- off | daily | weekly
    'backup_retention_days', COALESCE(data->>'backup_retention_days', '30')
) WHERE id = 1;
