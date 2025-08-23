defmodule TruckingPlatform.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    enable_oban = Application.get_env(:trucking_platform, :enable_oban, false)

    base_children = [
      TruckingPlatformWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:trucking_platform, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: TruckingPlatform.PubSub},
      TruckingPlatformWeb.Presence,
      # High-scale components
      {TruckingPlatform.Cache, []},
      # Original components
      TruckingPlatformWeb.Endpoint,
      {TruckingPlatform.Geofencing.State, []},
      {TruckingPlatform.RateLimit.RateLimitSupervisor, []}
    ]

    oban_children = if enable_oban do
      [{Oban, Application.fetch_env!(:trucking_platform, Oban)}]
    else
      []
    end

    production_children = [
      {TruckingPlatform.Cluster, []},
      {DynamicSupervisor, strategy: :one_for_one, name: TruckingPlatform.DynamicSupervisor},
      # Background job processing (enabled only when :enable_oban is true)
      # Oban requires a Repo. In local dev we default it off to avoid crashes.
      # To enable, set config :trucking_platform, :enable_oban, true and configure Oban.
    ] ++ oban_children ++ [
      # Database with connection pooling
      {TruckingPlatform.Storage.CosmosDB, []}
    ]

    test_children = [
      # Stub database for tests
      {TruckingPlatform.Storage.CosmosDB, []}
    ]

    children = case Application.get_env(:trucking_platform, :env) do
      :test -> base_children ++ test_children
      _ -> base_children ++ production_children
    end

    opts = [strategy: :one_for_one, name: TruckingPlatform.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    TruckingPlatformWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
