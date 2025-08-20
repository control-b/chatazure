# Dockerfile for Phoenix API
FROM elixir:1.15-alpine AS build

# Install build dependencies
RUN apk add --no-cache build-base git npm nodejs

# Set up working directory
WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Set build environment
ENV MIX_ENV=prod

# Copy mix files and install dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# Copy config files
COPY config/config.exs config/prod.exs config/
RUN mix deps.compile

# Copy source code
COPY lib lib
COPY priv priv

# Compile the release
RUN mix compile

# Copy release config
COPY config/runtime.exs config/
RUN mix release

# Runtime stage
FROM alpine:3.18 AS runtime

# Install runtime dependencies
RUN apk add --no-cache openssl ncurses-libs libgcc libstdc++

# Create app user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set up working directory
WORKDIR /app

# Copy release from build stage
COPY --from=build --chown=appuser:appgroup /app/_build/prod/rel/trucking_platform ./

# Switch to app user
USER appuser

# Expose port
EXPOSE 4000

# Set environment variables
ENV PORT=4000
ENV MIX_ENV=prod

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the application
CMD ["./bin/trucking_platform", "start"]
