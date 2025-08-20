defmodule TruckingPlatform.Cache do
  @moduledoc """
  Multi-level caching strategy for 20M+ DAU scale:
  L1: ETS (local process cache) - microsecond access
  L2: Redis (distributed cache) - 1-5ms access  
  L3: Cosmos DB (persistent storage) - 10-50ms access
  """
  
  use GenServer
  require Logger
  
  @cache_table :trucking_cache
  @default_ttl :timer.minutes(15)
  @redis_ttl 3600 # 1 hour in seconds
  
  # Client API
  
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end
  
  def get(key, fetch_fn \\ nil, opts \\ []) do
    GenServer.call(__MODULE__, {:get, key, fetch_fn, opts})
  end
  
  def put(key, value, opts \\ []) do
    GenServer.call(__MODULE__, {:put, key, value, opts})
  end
  
  def delete(key) do
    GenServer.call(__MODULE__, {:delete, key})
  end
  
  def get_room(room_id) do
    get("room:#{room_id}", fn ->
      TruckingPlatform.Storage.Room.get(room_id)
    end, ttl: :timer.minutes(30))
  end
  
  def get_user(user_id) do
    get("user:#{user_id}", fn ->
      TruckingPlatform.Storage.User.get(user_id)
    end, ttl: :timer.minutes(10))
  end
  
  def get_messages(room_id, limit \\ 50) do
    get("messages:#{room_id}:#{limit}", fn ->
      TruckingPlatform.Storage.Message.list_by_room(room_id, limit: limit)
    end, ttl: :timer.minutes(5))
  end
  
  def invalidate_room(room_id) do
    delete("room:#{room_id}")
    delete("messages:#{room_id}:50")
    delete("messages:#{room_id}:100")
  end
  
  # Server implementation
  
  @impl true
  def init(_opts) do
    # Create ETS table for L1 cache
    :ets.new(@cache_table, [:named_table, :public, :set, {:read_concurrency, true}])
    
    # Try to get Redis config from environment
    redis_host = Application.get_env(:trucking_platform, :redis_host)
    redis_password = Application.get_env(:trucking_platform, :redis_password)
    
    if redis_host do
      # Setup Redis connection
      config = [
        host: redis_host,
        port: 6380,
        ssl: true,
        password: redis_password
      ]
      
      case Redix.start_link(config) do
        {:ok, pid} ->
          Logger.info("Redis cache pool started")
          {:ok, %{redis: pid}}
        {:error, reason} ->
          Logger.warning("Redis cache unavailable: #{inspect(reason)}, using ETS only")
          {:ok, %{redis: nil}}
      end
    else
      Logger.info("Redis not configured, using ETS cache only")
      {:ok, %{redis: nil}}
    end
  end
  
  @impl true
  def handle_call({:get, key, fetch_fn, opts}, _from, state) do
    ttl = Keyword.get(opts, :ttl, @default_ttl)
    
    case get_from_l1(key) do
      {:ok, value} ->
        {:reply, {:ok, value}, state}
      
      :miss ->
        case get_from_l2(key, state.redis) do
          {:ok, value} ->
            # Cache in L1 for next time
            put_in_l1(key, value, ttl)
            {:reply, {:ok, value}, state}
          
          :miss ->
            case fetch_from_source(fetch_fn) do
              {:ok, value} ->
                # Cache in both L1 and L2
                put_in_l1(key, value, ttl)
                put_in_l2(key, value, state.redis)
                {:reply, {:ok, value}, state}
              
              error ->
                {:reply, error, state}
            end
        end
    end
  end
  
  @impl true
  def handle_call({:put, key, value, opts}, _from, state) do
    ttl = Keyword.get(opts, :ttl, @default_ttl)
    
    put_in_l1(key, value, ttl)
    put_in_l2(key, value, state.redis)
    
    {:reply, :ok, state}
  end
  
  @impl true
  def handle_call({:delete, key}, _from, state) do
    delete_from_l1(key)
    delete_from_l2(key, state.redis)
    
    {:reply, :ok, state}
  end
  
  # Private functions
  
  defp get_from_l1(key) do
    case :ets.lookup(@cache_table, key) do
      [{^key, value, expires_at}] ->
        if System.monotonic_time(:millisecond) < expires_at do
          {:ok, value}
        else
          :ets.delete(@cache_table, key)
          :miss
        end
      
      [] ->
        :miss
    end
  end
  
  defp put_in_l1(key, value, ttl) do
    expires_at = System.monotonic_time(:millisecond) + ttl
    :ets.insert(@cache_table, {key, value, expires_at})
  end
  
  defp delete_from_l1(key) do
    :ets.delete(@cache_table, key)
  end
  
  defp get_from_l2(key, nil), do: :miss
  defp get_from_l2(key, redis) do
    case Redix.command(redis, ["GET", key]) do
      {:ok, nil} -> :miss
      {:ok, data} ->
        case Jason.decode(data) do
          {:ok, value} -> {:ok, value}
          {:error, _} -> :miss
        end
      {:error, _} -> :miss
    end
  end
  
  defp put_in_l2(key, value, nil), do: :ok
  defp put_in_l2(key, value, redis) do
    case Jason.encode(value) do
      {:ok, data} ->
        Redix.command(redis, ["SETEX", key, @redis_ttl, data])
        :ok
      {:error, _} -> :ok
    end
  end
  
  defp delete_from_l2(key, nil), do: :ok
  defp delete_from_l2(key, redis) do
    Redix.command(redis, ["DEL", key])
    :ok
  end
  
  defp fetch_from_source(nil), do: {:error, :no_fetch_function}
  defp fetch_from_source(fetch_fn) when is_function(fetch_fn, 0) do
    try do
      fetch_fn.()
    rescue
      e -> {:error, e}
    end
  end
end
