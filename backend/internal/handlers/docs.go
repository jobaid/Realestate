package handlers

import (
	"os"

	"github.com/gin-gonic/gin"
)

type DocsHandler struct {
	SpecPath string // absolute path to openapi.yaml
}

const swaggerUIHTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Azim Realty API — Docs</title>
  <meta name="robots" content="noindex,nofollow" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>body{margin:0}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`

func (h *DocsHandler) UI(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("X-Robots-Tag", "noindex,nofollow")
	_, _ = c.Writer.WriteString(swaggerUIHTML)
}

func (h *DocsHandler) Spec(c *gin.Context) {
	b, err := os.ReadFile(h.SpecPath)
	if err != nil {
		c.JSON(500, gin.H{"error": "spec unavailable"})
		return
	}
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(200, "application/yaml; charset=utf-8", b)
}
