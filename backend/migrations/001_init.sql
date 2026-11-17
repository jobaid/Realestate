-- Phase 1 schema. Phase 2+ will add users, inquiries, roles, audit_logs, etc.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    listing_type    TEXT NOT NULL CHECK (listing_type IN ('sale','rent')),
    property_type   TEXT NOT NULL CHECK (property_type IN ('house','apartment','condo','townhouse','commercial','land')),
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','available','pending','sold','rented','off_market')),
    sale_price      BIGINT,
    monthly_rent    BIGINT,
    security_deposit BIGINT,
    hoa_fees        BIGINT,
    address         TEXT NOT NULL,
    unit_number     TEXT,
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    zip_code        TEXT NOT NULL,
    neighborhood    TEXT,
    country         TEXT NOT NULL DEFAULT 'USA',
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    bedrooms        INT NOT NULL DEFAULT 0,
    bathrooms       NUMERIC(3,1) NOT NULL DEFAULT 0,
    half_bathrooms  INT NOT NULL DEFAULT 0,
    square_feet     INT,
    lot_size        INT,
    year_built      INT,
    garage_spaces   INT NOT NULL DEFAULT 0,
    parking         TEXT,
    stories         INT,
    available_date  DATE,
    sold_date       DATE,
    sold_price      BIGINT,
    featured        BOOLEAN NOT NULL DEFAULT FALSE,
    seo_title       TEXT,
    meta_description TEXT,
    mls_number      TEXT,
    virtual_tour_url TEXT,
    published_at    TIMESTAMPTZ,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_properties_status_published ON properties(status, published_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_listing_type ON properties(listing_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_city ON properties(LOWER(city));
CREATE INDEX idx_properties_zip ON properties(zip_code);
CREATE INDEX idx_properties_price ON properties(COALESCE(sale_price, monthly_rent));
CREATE INDEX idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX idx_properties_featured ON properties(featured) WHERE featured = TRUE;
CREATE INDEX idx_properties_address_trgm ON properties USING gin (address gin_trgm_ops);

CREATE TABLE property_images (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
    position     INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_images_property ON property_images(property_id, position);
CREATE UNIQUE INDEX uq_primary_per_property ON property_images(property_id) WHERE is_primary = TRUE;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
