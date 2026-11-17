export interface PropertyImage {
  id: string;
  url: string;
  is_primary: boolean;
  position: number;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'rent';
  property_type: string;
  status: string;
  sale_price?: number | null;
  monthly_rent?: number | null;
  address: string;
  unit_number?: string | null;
  city: string;
  state: string;
  zip_code: string;
  neighborhood?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms: number;
  bathrooms: number;
  half_bathrooms: number;
  square_feet?: number | null;
  lot_size?: number | null;
  year_built?: number | null;
  garage_spaces: number;
  featured: boolean;
  sold_date?: string | null;
  sold_price?: number | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  images: PropertyImage[];
}

export interface PropertyListResponse {
  data: Property[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
