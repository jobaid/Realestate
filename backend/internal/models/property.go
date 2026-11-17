package models

import "time"

type Property struct {
	ID            string     `json:"id"`
	Slug          string     `json:"slug"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	ListingType   string     `json:"listing_type"` // sale|rent
	PropertyType  string     `json:"property_type"`
	Status        string     `json:"status"` // draft|available|pending|sold|rented|off_market
	SalePrice     *int64     `json:"sale_price,omitempty"`
	MonthlyRent   *int64     `json:"monthly_rent,omitempty"`
	Address       string     `json:"address"`
	UnitNumber    *string    `json:"unit_number,omitempty"`
	City          string     `json:"city"`
	State         string     `json:"state"`
	ZipCode       string     `json:"zip_code"`
	Neighborhood  *string    `json:"neighborhood,omitempty"`
	Country       string     `json:"country"`
	Latitude      *float64   `json:"latitude,omitempty"`
	Longitude     *float64   `json:"longitude,omitempty"`
	Bedrooms      int        `json:"bedrooms"`
	Bathrooms     float32    `json:"bathrooms"`
	HalfBathrooms int        `json:"half_bathrooms"`
	SquareFeet    *int       `json:"square_feet,omitempty"`
	LotSize       *int       `json:"lot_size,omitempty"`
	YearBuilt     *int       `json:"year_built,omitempty"`
	GarageSpaces  int        `json:"garage_spaces"`
	Featured      bool       `json:"featured"`
	SoldDate      *time.Time `json:"sold_date,omitempty"`
	SoldPrice     *int64     `json:"sold_price,omitempty"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Images        []Image    `json:"images"`
}

type Image struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	IsPrimary bool   `json:"is_primary"`
	Position  int    `json:"position"`
}
