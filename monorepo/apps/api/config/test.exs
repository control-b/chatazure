import Config

config :trucking_platform, TruckingPlatformWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: String.duplicate("a", 64),
  server: false

# Reduce logger noise in tests
config :logger, level: :warning

# Use local defaults for external deps in tests
# Set environment for conditional application startup
config :trucking_platform,
  env: :test,
  redis_host: nil,
  redis_password: nil,
  # CosmosDB config for tests
  use_cosmos_stub: true,
  cosmos_endpoint: "https://localhost:8081",
  cosmos_primary_key: "test-key",
  cosmos_database: "trucking-test"

# Disable Oban in test mode
config :trucking_platform, Oban, testing: :inline

# Disable OTLP exporter in tests
config :opentelemetry, traces_exporter: :none
