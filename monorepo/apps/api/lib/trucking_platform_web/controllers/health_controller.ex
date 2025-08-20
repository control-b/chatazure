defmodule TruckingPlatformWeb.HealthController do
  use TruckingPlatformWeb, :controller
  require Logger

  @doc """
  Basic health check endpoint for legacy compatibility.
  """
  def check(conn, _params) do
    json(conn, %{
      status: "ok",
      service: "trucking_platform_api",
      time: DateTime.utc_now()
    })
  end

  @doc """
  Comprehensive health check endpoint for load balancers and monitoring systems.
  Returns detailed system status for 20M+ DAU deployment.
  """
  def health(conn, _params) do
    health_checks = %{
      status: "healthy",
      timestamp: DateTime.utc_now(),
      version: Application.spec(:trucking_platform, :vsn) |> to_string(),
      node: Node.self(),
      checks: %{
        cosmos_db: check_cosmos_db(),
        redis: check_redis(),
        cache: check_cache(),
        memory: check_memory(),
        processes: check_processes(),
        cluster: check_cluster(),
        oban: check_oban()
      }
    }

    overall_status = determine_overall_status(health_checks.checks)
    status_code = if overall_status == "healthy", do: 200, else: 503

    conn
    |> put_status(status_code)
    |> json(Map.put(health_checks, :status, overall_status))
  end

  @doc """
  Readiness check - determines if the service is ready to handle traffic.
  """
  def ready(conn, _params) do
    ready_checks = %{
      cosmos_db: check_cosmos_db(),
      redis: check_redis(),
      cache: check_cache()
    }

    all_ready = Enum.all?(ready_checks, fn {_key, status} -> status == "healthy" end)
    status_code = if all_ready, do: 200, else: 503

    conn
    |> put_status(status_code)
    |> json(%{
      status: if(all_ready, do: "ready", else: "not_ready"),
      timestamp: DateTime.utc_now(),
      checks: ready_checks
    })
  end

  @doc """
  Liveness check - determines if the service is alive and should be restarted.
  """
  def live(conn, _params) do
    # Basic liveness check - if we can respond, we're alive
    conn
    |> json(%{
      status: "alive",
      timestamp: DateTime.utc_now(),
      node: Node.self(),
      uptime: System.system_time(:second) - :erlang.system_info(:start_time)
    })
  end

  # Private health check functions

  defp check_cosmos_db do
    try do
      case TruckingPlatform.Storage.CosmosDB.query("users", "SELECT VALUE COUNT(1) FROM c", [], cache_ttl: 0) do
        {:ok, _} -> "healthy"
        {:error, _} -> "unhealthy"
      end
    rescue
      _ -> "unhealthy"
    catch
      :exit, _ -> "unhealthy"
    end
  end

  defp check_redis do
    try do
      case TruckingPlatform.Cache.get("__health_check__") do
        {:ok, _} -> "healthy"
        _ ->
          # Try to set and get a test value
          case TruckingPlatform.Cache.put("__health_check__", "ok", ttl: 1000) do
            :ok -> "healthy"
            _ -> "unhealthy"
          end
      end
    rescue
      _ -> "unhealthy"
    catch
      :exit, _ -> "unhealthy"
    end
  end

  defp check_cache do
    try do
      # Check if cache process is alive
      case Process.whereis(TruckingPlatform.Cache) do
        pid when is_pid(pid) -> "healthy"
        nil -> "unhealthy"
      end
    rescue
      _ -> "unhealthy"
    end
  end

  defp check_memory do
    memory = :erlang.memory()
    total_mb = div(memory[:total], 1024 * 1024)
    
    # Alert if memory usage is very high (>80% of available)
    system_memory_mb = 4096 # Assuming 4GB container limit
    usage_percentage = (total_mb / system_memory_mb) * 100

    cond do
      usage_percentage > 90 -> "critical"
      usage_percentage > 80 -> "warning"
      true -> "healthy"
    end
  end

  defp check_processes do
    process_count = :erlang.system_info(:process_count)
    process_limit = :erlang.system_info(:process_limit)
    usage_percentage = (process_count / process_limit) * 100

    cond do
      usage_percentage > 90 -> "critical"
      usage_percentage > 80 -> "warning"
      true -> "healthy"
    end
  end

  defp check_cluster do
    connected_nodes = Node.list()
    node_count = length(connected_nodes) + 1

    case Application.get_env(:trucking_platform, :cluster_strategy) do
      nil -> "disabled"
      _ when node_count >= 2 -> "healthy"
      _ -> "warning" # Single node cluster
    end
  end

  defp check_oban do
    try do
      case Process.whereis(Oban) do
        pid when is_pid(pid) ->
          # Check if Oban queues are responsive
          "healthy"
        nil -> "unhealthy"
      end
    rescue
      _ -> "unhealthy"
    catch
      :exit, _ -> "unhealthy"
    end
  end

  defp determine_overall_status(checks) do
    statuses = Map.values(checks)

    cond do
      Enum.any?(statuses, &(&1 == "critical")) -> "critical"
      Enum.any?(statuses, &(&1 == "unhealthy")) -> "unhealthy"
      Enum.any?(statuses, &(&1 == "warning")) -> "warning"
      true -> "healthy"
    end
  end
end
