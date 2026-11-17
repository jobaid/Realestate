export const money = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const priceFor = (p: { listing_type: string; sale_price?: number | null; monthly_rent?: number | null; sold_price?: number | null; status: string }) => {
  if (p.status === 'sold') return money(p.sold_price ?? p.sale_price);
  if (p.listing_type === 'rent') return `${money(p.monthly_rent)}/mo`;
  return money(p.sale_price);
};

export const sqft = (n?: number | null) =>
  n == null ? '—' : `${new Intl.NumberFormat('en-US').format(n)} sqft`;
