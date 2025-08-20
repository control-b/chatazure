defmodule TruckingPlatform.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      TruckingPlatformWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:trucking_platform, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: TruckingPlatform.PubSub},
      TruckingPlatformWeb.Presence,
      TruckingPlatformWeb.Endpoint,
      {TruckingPlatform.Storage.CosmosDB, []},
  {TruckingPlatform.Geofencing.State, []},
  {TruckingPlatform.RateLimit.RateLimitSupervisor, []}
    ]

    opts = [strategy: :one_for_one, name: TruckingPlatform.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    TruckingPlatformWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
