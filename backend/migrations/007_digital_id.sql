-- Phase 7.1: Digital ID (vCard) fields seeded into site_settings.
UPDATE site_settings SET data = data || jsonb_build_object(
    'did_enabled',      COALESCE(data->>'did_enabled', 'true'),
    'did_first_name',   COALESCE(data->>'did_first_name', ''),
    'did_last_name',    COALESCE(data->>'did_last_name', ''),
    'did_title',        COALESCE(data->>'did_title', data->>'about_title'),
    'did_organization', COALESCE(data->>'did_organization', data->>'company_name'),
    'did_phone',        COALESCE(data->>'did_phone', data->>'phone'),
    'did_email',        COALESCE(data->>'did_email', data->>'email'),
    'did_website',      COALESCE(data->>'did_website', ''),
    'did_address',      COALESCE(data->>'did_address', data->>'address'),
    'did_note',         COALESCE(data->>'did_note', 'Scan this card to save my contact details.'),
    'did_photo_url',    COALESCE(data->>'did_photo_url', data->>'about_photo_url'),
    'did_linkedin',     COALESCE(data->>'did_linkedin', ''),
    'did_facebook',     COALESCE(data->>'did_facebook', data->>'facebook_url'),
    'did_instagram',    COALESCE(data->>'did_instagram', data->>'instagram_url')
) WHERE id = 1;
