package routes

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/config"
	"realestate/internal/email"
	"realestate/internal/handlers"
	"realestate/internal/middleware"
)

func New(pool *pgxpool.Pool, cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())
	_ = r.SetTrustedProxies(nil)

	r.Use(gzip.Gzip(gzip.DefaultCompression,
		gzip.WithExcludedPaths([]string{"/uploads/"})))

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.Use(middleware.SecurityHeaders(cfg.HSTS))

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.Static("/uploads", cfg.UploadDir)

	sender := &email.Sender{DB: pool}

	ph := &handlers.PropertyHandler{DB: pool}
	ah := &handlers.AuthHandler{DB: pool, Cfg: cfg}
	aph := &handlers.AdminPropertyHandler{DB: pool}
	uh := &handlers.UploadHandler{Cfg: cfg}
	ih := &handlers.InquiryHandler{DB: pool, Sender: sender}
	dh := &handlers.DashboardHandler{DB: pool}
	usrs := &handlers.UserHandler{DB: pool}
	sh := &handlers.SettingsHandler{DB: pool}
	seo := &handlers.SEOHandler{DB: pool, Cfg: cfg}
	audit := &handlers.AuditHandler{DB: pool}
	docs := &handlers.DocsHandler{SpecPath: cfg.DocsPath}
	contacts := &handlers.ContactsHandler{DB: pool}
	campaigns := &handlers.CampaignsHandler{DB: pool, Sender: sender}
	did := &handlers.DigitalIDHandler{DB: pool}

	r.GET("/robots.txt", seo.Robots)
	r.GET("/sitemap.xml", seo.Sitemap)
	r.GET("/docs", docs.UI)
	r.GET("/docs/openapi.yaml", docs.Spec)

	contentRoles := []string{"super_admin", "admin", "listing_manager"}
	managerRoles := []string{"super_admin", "admin"}
	ownerRoles := []string{"super_admin"}
	writeLimit := middleware.IPRateLimit(60, time.Minute)

	v1 := r.Group("/api/v1")
	{
		pub := v1.Group("")
		pub.Use(middleware.PublicCache(60))
		pub.GET("/properties", ph.List)
		pub.GET("/properties/featured", ph.Featured)
		pub.GET("/properties/recent", ph.Recent)
		pub.GET("/properties/sold", ph.Sold)
		pub.GET("/properties/:slug", ph.GetBySlug)

		cached300 := v1.Group("")
		cached300.Use(middleware.PublicCache(300))
		cached300.GET("/settings", sh.Public)
		cached300.GET("/digital-id", did.Info)
		cached300.GET("/digital-id.qr", did.QR)
		v1.GET("/digital-id.vcf", did.Download)

		v1.POST("/inquiries",
			middleware.IPRateLimit(5, 10*time.Minute), ih.Create)

		auth := v1.Group("/auth")
		auth.POST("/login", middleware.IPRateLimit(10, 10*time.Minute), ah.Login)
		auth.POST("/refresh", middleware.IPRateLimit(30, 10*time.Minute), ah.Refresh)
		auth.POST("/logout", ah.Logout)

		authed := v1.Group("")
		authed.Use(middleware.RequireAuth(cfg.JWTSecret))
		authed.GET("/auth/me", ah.Me)
		authed.POST("/auth/me/password", writeLimit, usrs.ChangeOwnPassword)

		content := authed.Group("")
		content.Use(middleware.RequireRole(contentRoles...))
		content.GET("/admin/properties", aph.List)
		content.POST("/admin/properties", writeLimit, aph.Create)
		content.GET("/admin/properties/:id", aph.Get)
		content.PUT("/admin/properties/:id", writeLimit, aph.Update)
		content.DELETE("/admin/properties/:id", writeLimit, aph.Delete)
		content.POST("/admin/properties/:id/publish", writeLimit, aph.Publish)
		content.POST("/admin/properties/:id/unpublish", writeLimit, aph.Unpublish)
		content.POST("/admin/uploads/image", writeLimit, uh.Image)

		manager := authed.Group("")
		manager.Use(middleware.RequireRole(managerRoles...))
		manager.GET("/admin/stats", dh.Stats)
		manager.GET("/admin/stats/inquiries-daily", dh.InquiriesDaily)
		manager.GET("/admin/stats/recent-activity", dh.RecentActivity)
		manager.GET("/admin/inquiries", ih.AdminList)
		manager.GET("/admin/inquiries/:id", ih.AdminGet)
		manager.PATCH("/admin/inquiries/:id", writeLimit, ih.AdminUpdate)
		manager.DELETE("/admin/inquiries/:id", writeLimit, ih.AdminDelete)
		manager.GET("/admin/settings", sh.AdminGet)
		manager.PUT("/admin/settings", writeLimit, sh.AdminUpdate)
		manager.POST("/admin/settings/smtp-test", writeLimit, campaigns.TestSMTP)

		// Email contacts & campaigns (admin + super_admin)
		manager.GET("/admin/contacts", contacts.List)
		manager.POST("/admin/contacts", writeLimit, contacts.Create)
		manager.POST("/admin/contacts/import", writeLimit, contacts.BulkImport)
		manager.PATCH("/admin/contacts/:id", writeLimit, contacts.Update)
		manager.DELETE("/admin/contacts/:id", writeLimit, contacts.Delete)

		manager.GET("/admin/campaigns", campaigns.List)
		manager.POST("/admin/campaigns", writeLimit, campaigns.Create)
		manager.GET("/admin/campaigns/:id", campaigns.Get)
		manager.PUT("/admin/campaigns/:id", writeLimit, campaigns.Update)
		manager.DELETE("/admin/campaigns/:id", writeLimit, campaigns.Delete)
		manager.POST("/admin/campaigns/:id/send", writeLimit, campaigns.Send)

		owner := authed.Group("")
		owner.Use(middleware.RequireRole(ownerRoles...))
		owner.GET("/admin/users", usrs.List)
		owner.POST("/admin/users", writeLimit, usrs.Create)
		owner.PATCH("/admin/users/:id", writeLimit, usrs.Update)
		owner.DELETE("/admin/users/:id", writeLimit, usrs.Delete)
		owner.GET("/admin/audit", audit.List)
	}

	return r
}
