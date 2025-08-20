import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.

# Start the phoenix server if environment variable is set
if System.get_env("PHX_SERVER") do
  config :trucking_platform, TruckingPlatformWeb.Endpoint, server: true
end

# Runtime configuration for massive scale deployment
if config_env() == :prod do
  # Cosmos DB configuration
  cosmos_endpoint = System.get_env("COSMOS_ENDPOINT") || 
    raise "Environment variable COSMOS_ENDPOINT is missing"
  cosmos_key = System.get_env("COSMOS_KEY") ||
    raise "Environment variable COSMOS_KEY is missing"

  config :trucking_platform,
    cosmos_endpoint: cosmos_endpoint,
    cosmos_key: cosmos_key,
    cosmos_connection_pool_size: String.to_integer(System.get_env("COSMOS_POOL_SIZE") || "50"),
    cosmos_connection_pool_overflow: String.to_integer(System.get_env("COSMOS_POOL_OVERFLOW") || "100")

  # Azure Storage configuration
  storage_account = System.get_env("AZURE_STORAGE_ACCOUNT") ||
    raise "Environment variable AZURE_STORAGE_ACCOUNT is missing"
  storage_key = System.get_env("AZURE_STORAGE_KEY") ||
    raise "Environment variable AZURE_STORAGE_KEY is missing"

  config :trucking_platform,
    azure_storage_account: storage_account,
    azure_storage_key: storage_key

  # Azure AD B2C configuration
  azure_tenant_id = System.get_env("AZURE_TENANT_ID") ||
    raise "Environment variable AZURE_TENANT_ID is missing"
  azure_client_id = System.get_env("AZURE_CLIENT_ID") ||
    raise "Environment variable AZURE_CLIENT_ID is missing"

  config :trucking_platform,
    azure_tenant_id: azure_tenant_id,
    azure_client_id: azure_client_id,
    azure_policy_name: System.get_env("AZURE_POLICY_NAME", "B2C_1_signupsignin")

  # JWT and security configuration
  jwt_secret = System.get_env("JWT_SECRET") ||
    raise "Environment variable JWT_SECRET is missing"
  secret_key_base = System.get_env("SECRET_KEY_BASE") ||
    raise "Environment variable SECRET_KEY_BASE is missing"

  config :trucking_platform,
    jwt_secret: jwt_secret

  # Redis configuration for caching and PubSub
  redis_host = System.get_env("REDIS_HOST") ||
    raise "Environment variable REDIS_HOST is missing"
  redis_port = String.to_integer(System.get_env("REDIS_PORT") || "6380")
  redis_password = System.get_env("REDIS_PASSWORD")
  redis_ssl = System.get_env("REDIS_SSL") == "true"

  # Phoenix endpoint configuration
  host = System.get_env("PHX_HOST") || "localhost"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :trucking_platform, TruckingPlatformWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0},
      port: port,
      protocol_options: [
        max_connections: 100_000,
        max_keepalive: 1_000_000,
        request_timeout: 60_000,
        idle_timeout: 300_000
      ]
    ],
    secret_key_base: secret_key_base

  # Clustering configuration
  cluster_strategy = System.get_env("CLUSTER_STRATEGY", "kubernetes")
  
  case cluster_strategy do
    "kubernetes" ->
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
    
    "gossip" ->
      config :libcluster,
        topologies: [
          trucking_cluster: [
            strategy: Cluster.Strategy.Gossip,
            config: [
              port: String.to_integer(System.get_env("CLUSTER_PORT", "45892")),
              if_addr: System.get_env("CLUSTER_IP", "0.0.0.0"),
              multicast_addr: System.get_env("CLUSTER_MULTICAST", "230.1.1.251"),
              multicast_ttl: 1,
              secret: System.get_env("CLUSTER_SECRET", "trucking_cluster_secret")
            ]
          ]
        ]
    
    _ ->
      # No clustering
      config :libcluster, topologies: []
  end

  # PubSub configuration with Redis for clustering
  config :trucking_platform, TruckingPlatform.PubSub,
    adapter: Phoenix.PubSub.Redis,
    redis_host: redis_host,
    redis_port: redis_port,
    redis_password: redis_password,
    redis_ssl: redis_ssl,
    pool_size: 20,
    node_name: System.get_env("NODE_NAME") || "trucking@#{host}"

  # Oban configuration with Redis
  redis_url = if redis_ssl do
    "rediss://#{redis_password}@#{redis_host}:#{redis_port}/2"
  else
    "redis://#{redis_password}@#{redis_host}:#{redis_port}/2"
  end

  config :trucking_platform, Oban,
    engine: Oban.Engines.Basic,
    repo: nil, # No Ecto, using Redis
    plugins: [
      {Oban.Plugins.Pruner, max_age: 86_400},
      {Oban.Plugins.Cron, 
       crontab: [
         {"*/5 * * * *", TruckingPlatform.Jobs, args: %{type: "metrics_aggregation"}},
         {"0 2 * * *", TruckingPlatform.Jobs, args: %{type: "daily_cleanup"}},
         {"*/30 * * * *", TruckingPlatform.Jobs, args: %{type: "room_cleanup"}},
         {"0 */6 * * *", TruckingPlatform.Jobs, args: %{type: "cache_warmup"}}
       ]},
      {Oban.Plugins.Gossip, interval: 5_000}
    ],
    queues: [
      default: String.to_integer(System.get_env("OBAN_QUEUE_DEFAULT") || "20"),
      webhooks: String.to_integer(System.get_env("OBAN_QUEUE_WEBHOOKS") || "50"),
      notifications: String.to_integer(System.get_env("OBAN_QUEUE_NOTIFICATIONS") || "30"),
      broadcasts: String.to_integer(System.get_env("OBAN_QUEUE_BROADCASTS") || "100"),
      cleanup: String.to_integer(System.get_env("OBAN_QUEUE_CLEANUP") || "10"),
      exports: String.to_integer(System.get_env("OBAN_QUEUE_EXPORTS") || "5"),
      metrics: String.to_integer(System.get_env("OBAN_QUEUE_METRICS") || "5")
    ]

  # OpenTelemetry configuration
  otel_endpoint = System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT")
  app_insights_key = System.get_env("APPLICATIONINSIGHTS_CONNECTION_STRING")
  
  if otel_endpoint do
    config :opentelemetry,
      span_processor: :batch,
      traces_exporter: {:otlp, %{
        endpoint: otel_endpoint,
        headers: if(app_insights_key, do: [{"api-key", app_insights_key}], else: [])
      }}
  end

  # Rate limiting with Redis
  config :hammer,
    backend: {Hammer.Backend.Redis, 
      [
        expiry_ms: 60_000 * 60 * 4,
        redis_url: "#{redis_url}/1",
        pool_size: 10,
        pool_max_overflow: 20
      ]}

  # Configure log level
  log_level = String.to_existing_atom(System.get_env("LOG_LEVEL") || "info")
  config :logger, level: log_level

  # Performance monitoring
  config :trucking_platform,
    enable_metrics: System.get_env("ENABLE_METRICS") == "true",
    metrics_interval: String.to_integer(System.get_env("METRICS_INTERVAL") || "5000"),
    health_check_interval: String.to_integer(System.get_env("HEALTH_CHECK_INTERVAL") || "30000")
end
