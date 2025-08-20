import Config

# esbuild config shared across environments
config :esbuild,
  version: "0.17.11",
  default: [
    args:
      ~w(js/app.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# tailwind config shared across environments
config :tailwind,
  version: "3.3.0",
  default: [
    args: ~w(
      --config=tailwind.config.js
      --input=css/app.css
      --output=../priv/static/assets/app.css
    ),
    cd: Path.expand("../assets", __DIR__)
  ]

# Configure your database
config :trucking_platform,
  cosmos_endpoint: System.get_env("COSMOS_ENDPOINT"),
  cosmos_key: System.get_env("COSMOS_KEY"),
  azure_storage_account: System.get_env("AZURE_STORAGE_ACCOUNT"),
  azure_storage_key: System.get_env("AZURE_STORAGE_KEY"),
  azure_tenant_id: System.get_env("AZURE_TENANT_ID"),
  azure_client_id: System.get_env("AZURE_CLIENT_ID"),
  azure_policy_name: System.get_env("AZURE_POLICY_NAME", "B2C_1_signupsignin"),
  jwt_secret: System.get_env("JWT_SECRET", "your-secret-key")

# Configures the endpoint
config :trucking_platform, TruckingPlatformWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [
    formats: [html: TruckingPlatformWeb.ErrorHTML, json: TruckingPlatformWeb.ErrorJSON],
    layout: {TruckingPlatformWeb.Layouts, :root}
  ],
  pubsub_server: TruckingPlatform.PubSub,
  live_view: [signing_salt: "trucking_platform"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :trucking_platform, TruckingPlatform.Mailer, adapter: Swoosh.Adapters.Local

# Configure esbuild (the version is required)
# esbuild and tailwind are only needed in dev; their config lives in dev.exs

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# OpenTelemetry configuration
config :opentelemetry,
  span_processor: :batch,
  traces_exporter: :otlp

config :opentelemetry_exporter,
  otlp_protocol: :grpc,
  otlp_endpoint: System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")

# Rate limiting configuration
config :hammer,
  backend: {Hammer.Backend.ETS, [expiry_ms: 60_000 * 60 * 4, cleanup_interval_ms: 60_000 * 10]}

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
