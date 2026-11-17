-- Sample seed data. Replace with real listings before launch.
INSERT INTO properties (slug, title, description, listing_type, property_type, status,
  sale_price, monthly_rent, address, city, state, zip_code, neighborhood,
  bedrooms, bathrooms, square_feet, year_built, garage_spaces, featured, published_at)
VALUES
('modern-colonial-brookline-1', 'Modern Colonial in Brookline',
 'Beautifully renovated 4-bedroom colonial with open floor plan, chefs kitchen, and landscaped backyard.',
 'sale','house','available', 1250000, NULL, '42 Elm Street', 'Brookline','MA','02445','Washington Square',
 4, 3.5, 2850, 2004, 2, TRUE, NOW()),

('seaside-condo-boston-1','Seaside Condo with Harbor Views',
 'Luxury 2BR/2BA condo overlooking Boston Harbor. Floor-to-ceiling windows, concierge, gym.',
 'sale','condo','available', 895000, NULL, '100 Atlantic Ave Unit 8B','Boston','MA','02110','Waterfront',
 2, 2.0, 1420, 2018, 1, TRUE, NOW()),

('family-townhouse-cambridge-1','Cambridge Family Townhouse',
 '3-story townhouse near Harvard Square. Hardwood floors, private patio.',
 'sale','townhouse','available', 1495000, NULL, '15 Garden Street','Cambridge','MA','02138','Harvard Square',
 3, 2.5, 2100, 1998, 1, FALSE, NOW()),

('starter-home-quincy-1','Quincy Starter Home',
 'Cozy 2BR starter home on a quiet street. Updated kitchen and bath.',
 'sale','house','available', 475000, NULL, '88 Oak Lane','Quincy','MA','02170',NULL,
 2, 1.0, 1100, 1962, 1, FALSE, NOW()),

('luxury-penthouse-boston-1','Back Bay Penthouse',
 'Top-floor penthouse with 360 views, private roof deck, two parking spots.',
 'sale','condo','available', 3250000, NULL, '200 Commonwealth Ave PH','Boston','MA','02116','Back Bay',
 3, 3.5, 2600, 2020, 2, TRUE, NOW()),

('rental-apt-allston-1','Bright 1BR in Allston',
 'Sunny one-bedroom with in-unit laundry, close to the Green Line.',
 'rent','apartment','available', NULL, 2400, '55 Harvard Ave Apt 3','Allston','MA','02134',NULL,
 1, 1.0, 650, 2010, 0, FALSE, NOW()),

('rental-house-newton-1','Newton 3BR Rental',
 'Spacious single-family rental, fenced yard, pet friendly.',
 'rent','house','available', NULL, 4200, '12 Maple Drive','Newton','MA','02460','Newton Centre',
 3, 2.0, 1850, 1985, 2, TRUE, NOW()),

('rental-condo-somerville-1','Somerville Modern 2BR',
 'Renovated 2BR with roof deck. Near Davis Square.',
 'rent','condo','available', NULL, 3100, '7 Highland Ave Unit 2','Somerville','MA','02143','Davis Square',
 2, 2.0, 1050, 2015, 1, FALSE, NOW()),

('sold-victorian-brookline-1','Historic Victorian (Sold)',
 'Fully restored Victorian with original woodwork.',
 'sale','house','sold', 1850000, NULL, '77 Beacon Street','Brookline','MA','02446',NULL,
 5, 3.5, 3400, 1898, 2, FALSE, NOW() - INTERVAL '30 days'),

('sold-condo-boston-1','Beacon Hill Condo (Sold)',
 'Charming 2BR on the flat of Beacon Hill.',
 'sale','condo','sold', 1150000, NULL, '20 Mount Vernon St','Boston','MA','02108','Beacon Hill',
 2, 2.0, 1180, 1920, 0, FALSE, NOW() - INTERVAL '60 days');

UPDATE properties SET sold_date = NOW() - INTERVAL '30 days', sold_price = 1875000 WHERE slug = 'sold-victorian-brookline-1';
UPDATE properties SET sold_date = NOW() - INTERVAL '60 days', sold_price = 1125000 WHERE slug = 'sold-condo-boston-1';

-- Placeholder images via Unsplash (swap for uploads later).
INSERT INTO property_images (property_id, url, is_primary, position)
SELECT id, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', TRUE, 0 FROM properties WHERE slug='modern-colonial-brookline-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200', FALSE, 1 FROM properties WHERE slug='modern-colonial-brookline-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200', TRUE, 0 FROM properties WHERE slug='seaside-condo-boston-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200', TRUE, 0 FROM properties WHERE slug='family-townhouse-cambridge-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200', TRUE, 0 FROM properties WHERE slug='starter-home-quincy-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200', TRUE, 0 FROM properties WHERE slug='luxury-penthouse-boston-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200', TRUE, 0 FROM properties WHERE slug='rental-apt-allston-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200', TRUE, 0 FROM properties WHERE slug='rental-house-newton-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200', TRUE, 0 FROM properties WHERE slug='rental-condo-somerville-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200', TRUE, 0 FROM properties WHERE slug='sold-victorian-brookline-1'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200', TRUE, 0 FROM properties WHERE slug='sold-condo-boston-1';
