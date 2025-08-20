import Config

config :trucking_platform, TruckingPlatformWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: String.duplicate("a", 64),
  server: false

# Reduce logger noise in tests
config :logger, level: :warning

# Use local defaults for external deps in tests
config :trucking_platform,
  cosmos_endpoint: System.get_env("COSMOS_ENDPOINT", "http://localhost:8081"),
  cosmos_key: System.get_env("COSMOS_KEY", "local-key"),
  jwt_secret: "test-secret",
  use_cosmos_stub: true

# Disable OTLP exporter in tests
config :opentelemetry, traces_exporter: :none
