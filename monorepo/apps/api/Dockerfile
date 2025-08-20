# Multi-stage Dockerfile optimized for production scale (20M+ DAU)
FROM elixir:1.15-alpine AS deps

# Install build dependencies and system packages for performance
RUN apk add --no-cache \
    build-base \
    git \
    npm \
    nodejs \
    openssl-dev \
    ca-certificates \
    curl \
    bash

# Set up working directory
WORKDIR /app

# Install hex and rebar with optimizations
RUN mix local.hex --force && \
    mix local.rebar --force

# Set build environment for production
ENV MIX_ENV=prod
ENV ERL_FLAGS="+JPperf true"

# Copy dependency files first for better layer caching
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV

# Dependencies compilation stage
FROM deps AS compile_deps

# Create config directory and copy minimal config for deps compilation
RUN mkdir config
COPY config/config.exs config/

# Compile dependencies with optimizations
RUN mix deps.compile

# Application compilation stage
FROM compile_deps AS compile_app

# Copy all config files
COPY config/ config/

# Copy application source code
COPY lib lib
COPY priv priv

# Compile the application with production optimizations
RUN mix compile

# Release build stage
FROM compile_app AS release

# Copy runtime configuration
COPY config/runtime.exs config/

# Build the release with production optimizations
RUN mix release --overwrite

# Runtime stage - minimal Alpine for optimal performance
FROM alpine:3.18 AS runtime

# Install runtime dependencies with minimal packages
RUN apk add --no-cache \
    openssl \
    ncurses-libs \
    libgcc \
    libstdc++ \
    ca-certificates \
    curl \
    bash \
    htop \
    procps

# Create app user with specific UID/GID for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set up working directory
WORKDIR /app

# Copy release from build stage with proper ownership
COPY --from=release --chown=appuser:appgroup /app/_build/prod/rel/trucking_platform ./

# Create required directories
RUN mkdir -p /app/tmp /app/log && \
    chown -R appuser:appgroup /app

# Switch to app user for security
USER appuser

# Expose port
EXPOSE 4000

# Set production environment variables for performance
ENV PORT=4000 \
    MIX_ENV=prod \
    PHX_SERVER=true \
    ERL_MAX_PORTS=65536 \
    ERL_MAX_ETS_TABLES=32768 \
    BEAM_POLL=true \
    ERL_FLAGS="+JPperf true +K true +A 64 +SDio 64" \
    ELIXIR_ERL_OPTIONS="+JPperf true"

# Comprehensive health check for load balancer integration
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Start the application with optimized BEAM settings
CMD ["./bin/trucking_platform", "start"]
