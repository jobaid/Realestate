package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/models"
)

type PropertyHandler struct {
	DB *pgxpool.Pool
}

const propertySelect = `
SELECT id, slug, title, description, listing_type, property_type, status,
       sale_price, monthly_rent, address, unit_number, city, state, zip_code,
       neighborhood, country, latitude, longitude, bedrooms, bathrooms,
       half_bathrooms, square_feet, lot_size, year_built, garage_spaces,
       featured, sold_date, sold_price, published_at, created_at, updated_at
FROM properties`

func scanProperty(row pgx.Row) (*models.Property, error) {
	var p models.Property
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.Description, &p.ListingType,
		&p.PropertyType, &p.Status, &p.SalePrice, &p.MonthlyRent, &p.Address,
		&p.UnitNumber, &p.City, &p.State, &p.ZipCode, &p.Neighborhood, &p.Country,
		&p.Latitude, &p.Longitude, &p.Bedrooms, &p.Bathrooms, &p.HalfBathrooms,
		&p.SquareFeet, &p.LotSize, &p.YearBuilt, &p.GarageSpaces, &p.Featured,
		&p.SoldDate, &p.SoldPrice, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.Images = []models.Image{}
	return &p, nil
}

func (h *PropertyHandler) loadImages(ctx context.Context, ids []string) (map[string][]models.Image, error) {
	out := map[string][]models.Image{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := h.DB.Query(ctx,
		`SELECT property_id, id, url, is_primary, position
		 FROM property_images WHERE property_id = ANY($1) ORDER BY position ASC`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var pid string
		var img models.Image
		if err := rows.Scan(&pid, &img.ID, &img.URL, &img.IsPrimary, &img.Position); err != nil {
			return nil, err
		}
		out[pid] = append(out[pid], img)
	}
	return out, rows.Err()
}

// GET /api/v1/properties?listing_type=&city=&zip_code=&min_price=&max_price=&bedrooms=&bathrooms=&page=&page_size=&sort=
func (h *PropertyHandler) List(c *gin.Context) {
	q := c.Request.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	size, _ := strconv.Atoi(q.Get("page_size"))
	if size < 1 || size > 50 {
		size = 12
	}

	where := "WHERE status IN ('available','pending') AND published_at IS NOT NULL AND deleted_at IS NULL"
	args := []any{}
	add := func(cond string, v any) {
		args = append(args, v)
		where += " AND " + cond + "$" + strconv.Itoa(len(args))
	}
	if v := q.Get("listing_type"); v != "" {
		add("listing_type = ", v)
	}
	if v := q.Get("property_type"); v != "" {
		add("property_type = ", v)
	}
	if v := q.Get("city"); v != "" {
		add("LOWER(city) = LOWER(", v)
		where += ")"
	}
	if v := q.Get("zip_code"); v != "" {
		add("zip_code = ", v)
	}
	if v := q.Get("state"); v != "" {
		add("LOWER(state) = LOWER(", v)
		where += ")"
	}
	if v := q.Get("min_price"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			add("COALESCE(sale_price, monthly_rent) >= ", n)
		}
	}
	if v := q.Get("max_price"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			add("COALESCE(sale_price, monthly_rent) <= ", n)
		}
	}
	if v := q.Get("bedrooms"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			add("bedrooms >= ", n)
		}
	}
	if v := q.Get("bathrooms"); v != "" {
		if n, err := strconv.ParseFloat(v, 32); err == nil {
			add("bathrooms >= ", n)
		}
	}

	orderBy := "ORDER BY featured DESC, published_at DESC"
	switch q.Get("sort") {
	case "price_asc":
		orderBy = "ORDER BY COALESCE(sale_price, monthly_rent) ASC"
	case "price_desc":
		orderBy = "ORDER BY COALESCE(sale_price, monthly_rent) DESC"
	case "newest":
		orderBy = "ORDER BY created_at DESC"
	}

	ctx := c.Request.Context()
	var total int
	if err := h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM properties "+where, args...).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}

	args = append(args, size, (page-1)*size)
	query := propertySelect + " " + where + " " + orderBy +
		" LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))

	rows, err := h.DB.Query(ctx, query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	list := []*models.Property{}
	ids := []string{}
	for rows.Next() {
		p, err := scanProperty(rows)
		if err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, p)
		ids = append(ids, p.ID)
	}
	imgs, _ := h.loadImages(ctx, ids)
	for _, p := range list {
		if v, ok := imgs[p.ID]; ok {
			p.Images = v
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       list,
		"total":      total,
		"page":       page,
		"page_size":  size,
		"total_pages": (total + size - 1) / size,
	})
}

// GET /api/v1/properties/:slug
func (h *PropertyHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	ctx := c.Request.Context()
	row := h.DB.QueryRow(ctx, propertySelect+
		" WHERE slug = $1 AND published_at IS NOT NULL AND deleted_at IS NULL", slug)
	p, err := scanProperty(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	imgs, _ := h.loadImages(ctx, []string{p.ID})
	if v, ok := imgs[p.ID]; ok {
		p.Images = v
	}
	c.JSON(200, p)
}

// GET /api/v1/properties/featured
func (h *PropertyHandler) Featured(c *gin.Context) {
	h.listSimple(c, "featured = TRUE AND status = 'available'", "published_at DESC", 6)
}

// GET /api/v1/properties/recent
func (h *PropertyHandler) Recent(c *gin.Context) {
	h.listSimple(c, "status = 'available'", "published_at DESC", 8)
}

// GET /api/v1/properties/sold
func (h *PropertyHandler) Sold(c *gin.Context) {
	h.listSimple(c, "status = 'sold'", "sold_date DESC NULLS LAST", 24)
}

func (h *PropertyHandler) listSimple(c *gin.Context, cond, orderBy string, limit int) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	rows, err := h.DB.Query(ctx, propertySelect+
		" WHERE "+cond+" AND published_at IS NOT NULL AND deleted_at IS NULL"+
		" ORDER BY "+orderBy+" LIMIT $1", limit)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	list := []*models.Property{}
	ids := []string{}
	for rows.Next() {
		p, err := scanProperty(rows)
		if err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, p)
		ids = append(ids, p.ID)
	}
	imgs, _ := h.loadImages(ctx, ids)
	for _, p := range list {
		if v, ok := imgs[p.ID]; ok {
			p.Images = v
		}
	}
	c.JSON(200, gin.H{"data": list})
}
