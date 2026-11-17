import type { Property } from '../types';

// Build schema.org JSON-LD for a single property page.
// Uses RealEstateListing + nested Residence/Apartment.
export function buildPropertyJsonLd(p: Property, canonicalUrl: string) {
  const isRental = p.listing_type === 'rent';
  const price = isRental ? p.monthly_rent : p.sale_price;
  const image = p.images.map((i) => i.url);
  const placeType =
    p.property_type === 'apartment' || p.property_type === 'condo'
      ? 'Apartment'
      : p.property_type === 'house' || p.property_type === 'townhouse'
      ? 'SingleFamilyResidence'
      : 'Residence';

  const listing: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: p.description || undefined,
    url: canonicalUrl,
    image: image.length > 0 ? image : undefined,
    datePosted: p.published_at ?? p.created_at,
    dateModified: p.updated_at,
    about: {
      '@type': placeType,
      numberOfRooms: p.bedrooms || undefined,
      numberOfBathroomsTotal: p.bathrooms || undefined,
      floorSize: p.square_feet
        ? { '@type': 'QuantitativeValue', value: p.square_feet, unitCode: 'FTK' }
        : undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: p.unit_number ? `${p.address}, ${p.unit_number}` : p.address,
        addressLocality: p.city,
        addressRegion: p.state,
        postalCode: p.zip_code,
        addressCountry: p.country || 'US',
      },
      geo:
        p.latitude != null && p.longitude != null
          ? { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude }
          : undefined,
    },
  };
  if (price != null) {
    listing.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
      availability:
        p.status === 'available'
          ? 'https://schema.org/InStock'
          : p.status === 'pending'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/OutOfStock',
      ...(isRental ? { unitText: 'MON' } : {}),
    };
  }
  return listing;
}
