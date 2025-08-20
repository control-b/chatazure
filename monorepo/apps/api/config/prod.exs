import Config

# For production, don't forget to configure the url host
# to something meaningful, Phoenix uses this information
# when generating URLs.

config :trucking_platform, TruckingPlatformWeb.Endpoint,
  url: [host: System.get_env("PHX_HOST") || "example.com", port: 80],
  cache_static_manifest: "priv/static/cache_manifest.json"

# Configures Swoosh API Client
config :swoosh, api_client: Swoosh.ApiClient.Finch, finch_name: TruckingPlatform.Finch

# Disable Swoosh Local Memory Storage
config :swoosh, local: false

# Do not print debug messages in production
config :logger, level: :info

# Production optimizations for 20M+ DAU
config :trucking_platform, TruckingPlatformWeb.Endpoint,
  # Increase connection limits for massive concurrent users
  http: [
    port: String.to_integer(System.get_env("PORT") || "4000"),
    protocol_options: [
      max_connections: 100_000,
      max_keepalive: 1_000_000,
      request_timeout: 60_000,
      idle_timeout: 300_000
    ]
  ],
  server: true,
  check_origin: false,
  # WebSocket transport optimizations
  socket: "/socket",
  websocket: [
    timeout: 300_000,
    max_frame_size: 1_048_576, # 1MB
    compress: true,
    check_origin: false
  ],
  # Enable long polling as fallback
  longpoll: [
    window_ms: 10_000,
    pubsub_timeout_ms: 2_000
  ],
  # Static file optimizations
  static_url: [host: System.get_env("CDN_HOST"), port: 443, scheme: "https"],
  gzip: true

# Phoenix PubSub optimizations for clustering
config :trucking_platform, TruckingPlatform.PubSub,
  adapter: Phoenix.PubSub.Redis,
  redis_host: System.get_env("REDIS_HOST"),
  redis_port: String.to_integer(System.get_env("REDIS_PORT") || "6379"),
  redis_password: System.get_env("REDIS_PASSWORD"),
  pool_size: 20,
  node_name: System.get_env("NODE_NAME") || "trucking@127.0.0.1"

# High-scale Oban configuration for background jobs
config :trucking_platform, Oban,
  engine: Oban.Engines.Basic,
  queues: [
    default: 20,
    webhooks: 50,
    notifications: 30,
    broadcasts: 100,
    cleanup: 10,
    exports: 5,
    metrics: 5
  ],
  plugins: [
    {Oban.Plugins.Pruner, max_age: 86_400}, # Prune completed jobs after 24 hours
    {Oban.Plugins.Cron, 
     crontab: [
       {"*/5 * * * *", TruckingPlatform.Jobs, args: %{type: "metrics_aggregation"}},
       {"0 2 * * *", TruckingPlatform.Jobs, args: %{type: "daily_cleanup"}},
       {"*/30 * * * *", TruckingPlatform.Jobs, args: %{type: "room_cleanup"}},
       {"0 */6 * * *", TruckingPlatform.Jobs, args: %{type: "cache_warmup"}}
     ]},
    {Oban.Plugins.Gossip, interval: 5_000}
  ],
  dispatch_cooldown: 100, # 100ms between dispatches for better throughput
  stage_interval: 1_000    # Check for new jobs every second

# Rate limiting backend
config :hammer,
  backend: {Hammer.Backend.Redis, 
    [
      expiry_ms: 60_000 * 60 * 4,
      redis_url: System.get_env("REDIS_URL") || "redis://localhost:6379/1"
    ]}

# OpenTelemetry configuration for observability
config :opentelemetry,
  span_processor: :batch,
  traces_exporter: {:otlp, %{
    endpoint: System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT"),
    headers: [{"api-key", System.get_env("APPLICATIONINSIGHTS_CONNECTION_STRING")}]
  }}

# Cluster configuration
config :libcluster,
  topologies: [
    trucking_cluster: [
      strategy: Cluster.Strategy.Kubernetes,
      config: [
        mode: :dns,
        kubernetes_node_basename: System.get_env("KUBERNETES_NODE_BASENAME", "trucking-api"),
        kubernetes_selector: System.get_env("KUBERNETES_SELECTOR", "app=trucking-api"),
        kubernetes_namespace: System.get_env("KUBERNETES_NAMESPACE", "default"),
        polling_interval: 5_000
      ]
    ]
  ]

# EVM optimizations for high throughput
config :elixir, :ansi_enabled, false

# Logger configuration for production
config :logger,
  level: :info,
  backends: [:console],
  console: [
    format: "$time [$level] $metadata$message\n",
    metadata: [
      :request_id, :user_id, :org_id, :room_id, :node, :pid, 
      :file, :line, :function, :application, :module
    ]
  ],
  compile_time_purge_matching: [
    [level_lower_than: :info]
  ]

# Memory and garbage collection optimizations
config :trucking_platform, :vm_args, [
  # Increase ETS limits for caching
  "+zdbbl", "32768",
  # Optimize schedulers for high concurrency
  "+spp", "true",
  "+sbwt", "very_short",
  "+swt", "very_low",
  # Memory optimization
  "+hms", "2048",
  "+hmbs", "2048",
  # Process limits
  "+P", "2097152", # 2M processes
  "+Q", "1048576"  # 1M ports
]

# Runtime configuration will be loaded from environment variables
