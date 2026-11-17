# --- build stage ---
FROM golang:1.23-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath -ldflags="-s -w -buildid=" \
    -o /out/server ./cmd/server \
    && CGO_ENABLED=0 GOOS=linux go build \
       -trimpath -ldflags="-s -w -buildid=" \
       -o /out/bootstrap ./cmd/bootstrap

# --- runtime stage ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata curl \
    && addgroup -S app -g 10001 \
    && adduser  -S app -G app -u 10001 -h /app -s /sbin/nologin
WORKDIR /app
COPY --from=build /out/server    /app/server
COPY --from=build /out/bootstrap /app/bootstrap
# docs served at /docs
COPY ./docs/openapi.yaml /app/docs/openapi.yaml
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/app/server"]
