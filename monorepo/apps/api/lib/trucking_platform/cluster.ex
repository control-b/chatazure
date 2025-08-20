defmodule TruckingPlatform.Cluster do
  @moduledoc """
  Phoenix cluster configuration for horizontal scaling.
  Handles node discovery, PubSub clustering, and presence synchronization.
  """
  
  use GenServer
  require Logger
  
  @cluster_strategy Application.compile_env(:trucking_platform, :cluster_strategy, :gossip)
  
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end
  
  def get_cluster_info do
    GenServer.call(__MODULE__, :cluster_info)
  end
  
  def get_node_stats do
    %{
      node: Node.self(),
      connected_nodes: Node.list(),
      total_nodes: length(Node.list()) + 1,
      memory_usage: :erlang.memory(),
      process_count: :erlang.system_info(:process_count),
      scheduler_utilization: :scheduler.utilization(1)
    }
  end
  
  @impl true
  def init(_opts) do
    # Configure clustering based on environment
    cluster_config = get_cluster_config()
    
    # Start cluster supervisor if in production
    if cluster_config[:enabled] do
      start_cluster(cluster_config)
    end
    
    {:ok, %{config: cluster_config}}
  end
  
  @impl true
  def handle_call(:cluster_info, _from, state) do
    info = %{
      strategy: @cluster_strategy,
      config: state.config,
      stats: get_node_stats()
    }
    {:reply, info, state}
  end
  
  defp get_cluster_config do
    case System.get_env("CLUSTER_STRATEGY") do
      "kubernetes" ->
        [
          enabled: true,
          strategy: Cluster.Strategy.Kubernetes,
          config: [
            mode: :dns,
            kubernetes_node_basename: System.get_env("KUBERNETES_NODE_BASENAME", "trucking-platform"),
            kubernetes_selector: System.get_env("KUBERNETES_SELECTOR", "app=trucking-platform"),
            kubernetes_namespace: System.get_env("KUBERNETES_NAMESPACE", "default"),
            polling_interval: 10_000
          ]
        ]
      
      "gossip" ->
        [
          enabled: true,
          strategy: Cluster.Strategy.Gossip,
          config: [
            port: String.to_integer(System.get_env("CLUSTER_PORT", "45892")),
            if_addr: System.get_env("CLUSTER_IP", "0.0.0.0"),
            multicast_addr: System.get_env("CLUSTER_MULTICAST", "230.1.1.251"),
            multicast_ttl: 1,
            secret: System.get_env("CLUSTER_SECRET", "trucking_cluster_secret")
          ]
        ]
      
      "epmd" ->
        [
          enabled: true,
          strategy: Cluster.Strategy.Epmd,
          config: [
            hosts: parse_cluster_hosts()
          ]
        ]
      
      _ ->
        [enabled: false]
    end
  end
  
  defp parse_cluster_hosts do
    System.get_env("CLUSTER_HOSTS", "")
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(&String.to_atom/1)
  end
  
  defp start_cluster(config) do
    cluster_supervisor_spec = {
      Cluster.Supervisor,
      [
        [
          {config[:strategy], config[:config]}
        ],
        [strategy: :one_for_one]
      ]
    }
    
    case DynamicSupervisor.start_child(TruckingPlatform.DynamicSupervisor, cluster_supervisor_spec) do
      {:ok, _pid} ->
        Logger.info("Cluster supervisor started with strategy: #{config[:strategy]}")
        :ok
      
      {:error, reason} ->
        Logger.error("Failed to start cluster supervisor: #{inspect(reason)}")
        :error
    end
  end
end
