package handlers

import (
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/models"
)

type AdminPropertyHandler struct {
	DB *pgxpool.Pool
}

type propertyInput struct {
	Slug            string   `json:"slug"`
	Title           string   `json:"title" binding:"required,min=3,max=200"`
	Description     string   `json:"description"`
	ListingType     string   `json:"listing_type" binding:"required,oneof=sale rent"`
	PropertyType    string   `json:"property_type" binding:"required"`
	Status          string   `json:"status" binding:"required"`
	SalePrice       *int64   `json:"sale_price"`
	MonthlyRent     *int64   `json:"monthly_rent"`
	Address         string   `json:"address" binding:"required"`
	UnitNumber      *string  `json:"unit_number"`
	City            string   `json:"city" binding:"required"`
	State           string   `json:"state" binding:"required"`
	ZipCode         string   `json:"zip_code" binding:"required"`
	Neighborhood    *string  `json:"neighborhood"`
	Country         string   `json:"country"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	Bedrooms        int      `json:"bedrooms"`
	Bathrooms       float32  `json:"bathrooms"`
	HalfBathrooms   int      `json:"half_bathrooms"`
	SquareFeet      *int     `json:"square_feet"`
	LotSize         *int     `json:"lot_size"`
	YearBuilt       *int     `json:"year_built"`
	GarageSpaces    int      `json:"garage_spaces"`
	Featured        bool     `json:"featured"`
	Publish         bool     `json:"publish"`
	ImageURLs       []string `json:"image_urls"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "property"
	}
	return s
}

func (h *AdminPropertyHandler) List(c *gin.Context) {
	q := c.Request.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	size, _ := strconv.Atoi(q.Get("page_size"))
	if size < 1 || size > 100 {
		size = 20
	}
	where := "WHERE deleted_at IS NULL"
	args := []any{}
	if s := q.Get("status"); s != "" {
		args = append(args, s)
		where += " AND status = $" + strconv.Itoa(len(args))
	}
	if s := q.Get("q"); s != "" {
		args = append(args, "%"+strings.ToLower(s)+"%")
		where += " AND (LOWER(title) LIKE $" + strconv.Itoa(len(args)) +
			" OR LOWER(address) LIKE $" + strconv.Itoa(len(args)) + ")"
	}
	ctx := c.Request.Context()
	var total int
	if err := h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM properties "+where, args...).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	args = append(args, size, (page-1)*size)
	query := propertySelect + " " + where +
		" ORDER BY updated_at DESC LIMIT $" + strconv.Itoa(len(args)-1) +
		" OFFSET $" + strconv.Itoa(len(args))
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
	ph := &PropertyHandler{DB: h.DB}
	imgs, _ := ph.loadImages(ctx, ids)
	for _, p := range list {
		if v, ok := imgs[p.ID]; ok {
			p.Images = v
		}
	}
	c.JSON(200, gin.H{
		"data": list, "total": total, "page": page, "page_size": size,
		"total_pages": (total + size - 1) / size,
	})
}

func (h *AdminPropertyHandler) Get(c *gin.Context) {
	id := c.Param("id")
	row := h.DB.QueryRow(c.Request.Context(),
		propertySelect+" WHERE id = $1 AND deleted_at IS NULL", id)
	p, err := scanProperty(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	ph := &PropertyHandler{DB: h.DB}
	imgs, _ := ph.loadImages(c.Request.Context(), []string{p.ID})
	if v, ok := imgs[p.ID]; ok {
		p.Images = v
	}
	c.JSON(200, p)
}

func (h *AdminPropertyHandler) Create(c *gin.Context) {
	var in propertyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if in.Country == "" {
		in.Country = "USA"
	}
	slug := in.Slug
	if slug == "" {
		slug = slugify(in.Title) + "-" + strconv.FormatInt(time.Now().Unix(), 36)
	} else {
		slug = slugify(slug)
	}
	uid, _ := c.Get("uid")
	userID, _ := uid.(string)

	ctx := c.Request.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": "tx failed"})
		return
	}
	defer tx.Rollback(ctx)

	var publishedAt any
	if in.Publish {
		publishedAt = time.Now()
	}

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO properties
		 (slug,title,description,listing_type,property_type,status,
		  sale_price,monthly_rent,address,unit_number,city,state,zip_code,
		  neighborhood,country,latitude,longitude,
		  bedrooms,bathrooms,half_bathrooms,square_feet,lot_size,year_built,
		  garage_spaces,featured,published_at,created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
		  $18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
		 RETURNING id`,
		slug, in.Title, in.Description, in.ListingType, in.PropertyType, in.Status,
		in.SalePrice, in.MonthlyRent, in.Address, in.UnitNumber, in.City, in.State, in.ZipCode,
		in.Neighborhood, in.Country, in.Latitude, in.Longitude,
		in.Bedrooms, in.Bathrooms, in.HalfBathrooms, in.SquareFeet, in.LotSize, in.YearBuilt,
		in.GarageSpaces, in.Featured, publishedAt, nilIfEmpty(userID)).Scan(&id)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	for i, u := range in.ImageURLs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO property_images (property_id, url, is_primary, position)
			 VALUES ($1,$2,$3,$4)`,
			id, u, i == 0, i); err != nil {
			c.JSON(400, gin.H{"error": "image insert: " + err.Error()})
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		c.JSON(500, gin.H{"error": "commit failed"})
		return
	}
	audit(h.DB, userID, "create", "property", id, c.ClientIP())
	c.JSON(201, gin.H{"id": id, "slug": slug})
}

func (h *AdminPropertyHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var in propertyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	uid, _ := c.Get("uid")
	userID, _ := uid.(string)
	ctx := c.Request.Context()

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": "tx failed"})
		return
	}
	defer tx.Rollback(ctx)

	// Preserve published_at if already published; set/unset on toggle.
	var existingPublished *time.Time
	if err := tx.QueryRow(ctx,
		`SELECT published_at FROM properties WHERE id=$1 AND deleted_at IS NULL`, id).
		Scan(&existingPublished); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		c.JSON(500, gin.H{"error": "lookup failed"})
		return
	}
	var publishedAt any
	if in.Publish {
		if existingPublished != nil {
			publishedAt = *existingPublished
		} else {
			publishedAt = time.Now()
		}
	}

	_, err = tx.Exec(ctx, `
		UPDATE properties SET
		 title=$2, description=$3, listing_type=$4, property_type=$5, status=$6,
		 sale_price=$7, monthly_rent=$8, address=$9, unit_number=$10, city=$11,
		 state=$12, zip_code=$13, neighborhood=$14, country=$15, latitude=$16,
		 longitude=$17, bedrooms=$18, bathrooms=$19, half_bathrooms=$20,
		 square_feet=$21, lot_size=$22, year_built=$23, garage_spaces=$24,
		 featured=$25, published_at=$26
		 WHERE id=$1`,
		id, in.Title, in.Description, in.ListingType, in.PropertyType, in.Status,
		in.SalePrice, in.MonthlyRent, in.Address, in.UnitNumber, in.City, in.State,
		in.ZipCode, in.Neighborhood, in.Country, in.Latitude, in.Longitude,
		in.Bedrooms, in.Bathrooms, in.HalfBathrooms, in.SquareFeet, in.LotSize,
		in.YearBuilt, in.GarageSpaces, in.Featured, publishedAt)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if in.ImageURLs != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM property_images WHERE property_id=$1`, id); err != nil {
			c.JSON(500, gin.H{"error": "image reset failed"})
			return
		}
		for i, u := range in.ImageURLs {
			if _, err := tx.Exec(ctx,
				`INSERT INTO property_images (property_id,url,is_primary,position) VALUES ($1,$2,$3,$4)`,
				id, u, i == 0, i); err != nil {
				c.JSON(400, gin.H{"error": "image insert: " + err.Error()})
				return
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(500, gin.H{"error": "commit failed"})
		return
	}
	audit(h.DB, userID, "update", "property", id, c.ClientIP())
	c.JSON(200, gin.H{"id": id})
}

func (h *AdminPropertyHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	uid, _ := c.Get("uid")
	userID, _ := uid.(string)
	ct, err := h.DB.Exec(c.Request.Context(),
		`UPDATE properties SET deleted_at=NOW(), published_at=NULL WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "delete failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	audit(h.DB, userID, "delete", "property", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func (h *AdminPropertyHandler) Publish(c *gin.Context) {
	id := c.Param("id")
	uid, _ := c.Get("uid")
	userID, _ := uid.(string)
	_, err := h.DB.Exec(c.Request.Context(),
		`UPDATE properties SET published_at=COALESCE(published_at, NOW()) WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "publish failed"})
		return
	}
	audit(h.DB, userID, "publish", "property", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func (h *AdminPropertyHandler) Unpublish(c *gin.Context) {
	id := c.Param("id")
	uid, _ := c.Get("uid")
	userID, _ := uid.(string)
	_, err := h.DB.Exec(c.Request.Context(),
		`UPDATE properties SET published_at=NULL WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "unpublish failed"})
		return
	}
	audit(h.DB, userID, "unpublish", "property", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
