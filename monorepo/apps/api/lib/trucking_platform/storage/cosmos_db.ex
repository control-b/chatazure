defmodule TruckingPlatform.Storage.CosmosDB do
  @moduledoc """
  Azure Cosmos DB client for the trucking platform.
  Optimized for 20M+ DAU with connection pooling, retries, and caching.
  """

  use GenServer
  require Logger

  @cosmos_endpoint Application.compile_env(:trucking_platform, :cosmos_endpoint)
  @cosmos_key Application.compile_env(:trucking_platform, :cosmos_key)
  @database_name "TruckingPlatform"
  
  # Connection pool configuration for massive scale
  @pool_size 50
  @max_overflow 100
  @timeout 30_000
  @recv_timeout 30_000
  @retry_attempts 3
  @retry_delay 100

  # Client API

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def query(collection, sql, parameters \\ [], opts \\ []) do
    cached_query(collection, sql, parameters, opts)
  end

  def create_document(collection, document, opts \\ []) do
    execute_with_retry(fn -> 
      GenServer.call(__MODULE__, {:create, collection, document}, @timeout)
    end, opts)
  end

  def get_document(collection, id, partition_key, opts \\ []) do
    cached_get(collection, id, partition_key, opts)
  end

  def update_document(collection, document, opts \\ []) do
    execute_with_retry(fn ->
      result = GenServer.call(__MODULE__, {:update, collection, document}, @timeout)
      # Invalidate cache
      id = Map.get(document, :id) || Map.get(document, "id")
      cache_key = "#{collection}:#{id}"
      TruckingPlatform.Cache.delete(cache_key)
      result
    end, opts)
  end

  def delete_document(collection, id, partition_key, opts \\ []) do
    execute_with_retry(fn ->
      result = GenServer.call(__MODULE__, {:delete, collection, id, partition_key}, @timeout)
      # Invalidate cache
      cache_key = "#{collection}:#{id}"
      TruckingPlatform.Cache.delete(cache_key)
      result
    end, opts)
  end
  
  def bulk_create(collection, documents, opts \\ []) do
    GenServer.call(__MODULE__, {:bulk_create, collection, documents}, @timeout * 3)
  end
  
  def count_documents(collection, filter \\ %{}, opts \\ []) do
    cached_count(collection, filter, opts)
  end

  # Server implementation

  @impl true
  def init(_opts) do
    # In test, use an in-memory store stub to avoid network calls
    if Application.get_env(:trucking_platform, :use_cosmos_stub, false) do
      ensure_stub_table()
      {:ok, %{stub?: true}}
    else
      # Initialize connection pool for high throughput
      pool_opts = [
        name: {:local, :cosmos_pool},
        worker_module: HTTPoison,
        size: @pool_size,
        max_overflow: @max_overflow,
        strategy: :lifo
      ]
      
      case :poolboy.start_link(pool_opts, []) do
        {:ok, pool} ->
          # Initialize HTTP client configuration
          headers = [
            {"Authorization", "type=master&ver=1.0&sig=#{cosmos_auth_token()}"},
            {"Content-Type", "application/json"},
            {"x-ms-version", "2020-07-15"},
            {"x-ms-documentdb-is-upsert", "true"},
            {"Connection", "keep-alive"},
            {"Keep-Alive", "timeout=300, max=1000"}
          ]

          state = %{
            endpoint: @cosmos_endpoint,
            headers: headers,
            database: @database_name,
            pool: pool
          }

          Logger.info("CosmosDB client initialized with connection pool (size: #{@pool_size}, overflow: #{@max_overflow})")
          {:ok, state}
          
        {:error, reason} ->
          Logger.error("Failed to start CosmosDB connection pool: #{inspect(reason)}")
          {:stop, reason}
      end
    end
  end

  @impl true
  def handle_call({:query, collection, _sql, parameters}, _from, %{stub?: true} = state) do
    # Return all docs in stub that match simple equality filters on parameters
    part = parameters |> Enum.into(%{})
    docs =
      :ets.lookup(:cosmos_stub, collection)
      |> Enum.map(fn {_k, doc} -> doc end)
      |> Enum.filter(fn doc ->
        Enum.all?(part, fn {k, v} -> Map.get(doc, to_string(k)) == v end)
      end)
    {:reply, {:ok, docs}, state}
  end
  def handle_call({:query, collection, sql, parameters}, _from, state) do
    url = "#{state.endpoint}/dbs/#{state.database}/colls/#{collection}/docs"
    
    query_body = %{
      query: sql,
      parameters: Enum.map(parameters, fn {name, value} ->
        %{name: "@#{name}", value: value}
      end)
    }

    headers = state.headers ++ [{"x-ms-documentdb-isquery", "true"}]

    case HTTPoison.post(url, Jason.encode!(query_body), headers) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        result = Jason.decode!(body)
        {:reply, {:ok, result["Documents"]}, state}
      
      {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
        error = Jason.decode!(body)
        Logger.error("CosmosDB query failed: #{status} - #{inspect(error)}")
        {:reply, {:error, error}, state}
      
      {:error, reason} ->
        Logger.error("CosmosDB query error: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  @impl true
  def handle_call({:create, collection, document}, _from, %{stub?: true} = state) do
    id = Map.get(document, :id) || Map.get(document, "id")
  doc_with_meta = Map.merge(document, %{
      _ts: System.system_time(:second),
      ttl: document[:ttl]
    })
  doc_store = stringify_keys(doc_with_meta)
  case :ets.lookup(:cosmos_stub, {collection, id}) do
      [] ->
    # store under collection and a per-collection bag for scans
    :ets.insert(:cosmos_stub, {collection, doc_store})
    :ets.insert(:cosmos_stub, {{collection, id}, doc_store})
    {:reply, {:ok, doc_store}, state}
      _ ->
        {:reply, {:error, %{"code" => "Conflict"}}, state}
    end
  end
  def handle_call({:create, collection, document}, _from, state) do
    url = "#{state.endpoint}/dbs/#{state.database}/colls/#{collection}/docs"
    
    # Add metadata
    doc_with_meta = Map.merge(document, %{
      _ts: System.system_time(:second),
      ttl: document[:ttl]
    })

    case HTTPoison.post(url, Jason.encode!(doc_with_meta), state.headers) do
      {:ok, %HTTPoison.Response{status_code: status, body: body}} when status in [200, 201] ->
        result = Jason.decode!(body)
        {:reply, {:ok, result}, state}
      
      {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
        error = Jason.decode!(body)
        Logger.error("CosmosDB create failed: #{status} - #{inspect(error)}")
        {:reply, {:error, error}, state}
      
      {:error, reason} ->
        Logger.error("CosmosDB create error: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  @impl true
  def handle_call({:get, collection, id, _partition_key}, _from, %{stub?: true} = state) do
    case :ets.lookup(:cosmos_stub, {collection, id}) do
      [{{^collection, ^id}, doc}] -> {:reply, {:ok, doc}, state}
      _ -> {:reply, {:error, :not_found}, state}
    end
  end
  def handle_call({:get, collection, id, partition_key}, _from, state) do
    url = "#{state.endpoint}/dbs/#{state.database}/colls/#{collection}/docs/#{id}"
    headers = state.headers ++ [{"x-ms-documentdb-partitionkey", "[\"#{partition_key}\"]"}]

    case HTTPoison.get(url, headers) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        result = Jason.decode!(body)
        {:reply, {:ok, result}, state}
      
      {:ok, %HTTPoison.Response{status_code: 404}} ->
        {:reply, {:error, :not_found}, state}
      
      {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
        error = Jason.decode!(body)
        Logger.error("CosmosDB get failed: #{status} - #{inspect(error)}")
        {:reply, {:error, error}, state}
      
      {:error, reason} ->
        Logger.error("CosmosDB get error: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  @impl true
  def handle_call({:bulk_create, collection, documents}, _from, %{stub?: true} = state) do
    results = Enum.map(documents, fn doc ->
      id = Map.get(doc, :id) || Map.get(doc, "id")
      doc_with_meta = Map.merge(doc, %{
        _ts: System.system_time(:second),
        ttl: doc[:ttl]
      })
      doc_store = stringify_keys(doc_with_meta)
      
      case :ets.lookup(:cosmos_stub, {collection, id}) do
        [] ->
          :ets.insert(:cosmos_stub, {collection, doc_store})
          :ets.insert(:cosmos_stub, {{collection, id}, doc_store})
          {:ok, doc_store}
        _ ->
          {:error, %{"code" => "Conflict"}}
      end
    end)
    
    {:reply, {:ok, results}, state}
  end
  
  def handle_call({:bulk_create, collection, documents}, _from, state) do
    # Bulk insert using CosmosDB stored procedure for better performance
    url = "#{state.endpoint}/dbs/#{state.database}/colls/#{collection}/sprocs/bulkInsert"
    
    bulk_body = %{
      documents: documents
    }
    
    worker = :poolboy.checkout(:cosmos_pool)
    
    try do
      case HTTPoison.post(url, Jason.encode!(bulk_body), state.headers, 
           timeout: @timeout, recv_timeout: @recv_timeout, hackney: [pool: worker]) do
        {:ok, %HTTPoison.Response{status_code: status, body: body}} when status in [200, 201] ->
          result = Jason.decode!(body)
          {:reply, {:ok, result}, state}
        
        {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
          error = Jason.decode!(body)
          Logger.error("CosmosDB bulk create failed: #{status} - #{inspect(error)}")
          {:reply, {:error, error}, state}
        
        {:error, reason} ->
          Logger.error("CosmosDB bulk create error: #{inspect(reason)}")
          {:reply, {:error, reason}, state}
      end
    after
      :poolboy.checkin(:cosmos_pool, worker)
    end
  end
  def handle_call({:update, collection, document}, _from, state) do
    url = "#{state.endpoint}/dbs/#{state.database}/colls/#{collection}/docs"
    # Fallback to create for upsert semantics in this simplified client
    case HTTPoison.post(url, Jason.encode!(document), state.headers) do
      {:ok, %HTTPoison.Response{status_code: status, body: body}} when status in [200, 201] ->
        result = Jason.decode!(body)
        {:reply, {:ok, result}, state}
      {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
        {:reply, {:error, Jason.decode!(body)}, state}
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  defp stringify_keys(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp stringify_keys(%NaiveDateTime{} = dt), do: NaiveDateTime.to_iso8601(dt)
  defp stringify_keys(value) when is_list(value), do: Enum.map(value, &stringify_keys/1)
  defp stringify_keys(value) when is_struct(value), do: value |> Map.from_struct() |> stringify_keys()
  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {k, v} ->
      key = if is_atom(k), do: Atom.to_string(k), else: k
      value = stringify_keys(v)
      {key, value}
    end)
  end
  defp stringify_keys(value), do: value

  @impl true
  def handle_call({:delete, collection, id, _partition_key}, _from, %{stub?: true} = state) do
    :ets.delete(:cosmos_stub, {collection, id})
    {:reply, :ok, state}
  end
  def handle_call({:delete, collection, id, partition_key}, _from, state) do
    url = "#{state.endpoint}/dbs/#{state.database}/colls/#{collection}/docs/#{id}"
    headers = state.headers ++ [{"x-ms-documentdb-partitionkey", "[\"#{partition_key}\"]"}]
    case HTTPoison.delete(url, headers) do
      {:ok, %HTTPoison.Response{status_code: status}} when status in [200, 204] -> {:reply, :ok, state}
      {:ok, %HTTPoison.Response{status_code: status, body: body}} -> {:reply, {:error, Jason.decode!(body)}, state}
      {:error, reason} -> {:reply, {:error, reason}, state}
    end
  end

  # Private functions

  defp cached_query(collection, sql, parameters, opts) do
    cache_key = "query:#{collection}:#{:crypto.hash(:md5, sql <> inspect(parameters)) |> Base.encode16()}"
    
    case TruckingPlatform.Cache.get(cache_key) do
      {:ok, result} ->
        {:ok, result}
      _ ->
        case execute_with_retry(fn -> 
          GenServer.call(__MODULE__, {:query, collection, sql, parameters}, @timeout)
        end, opts) do
          {:ok, result} = success ->
            ttl = Keyword.get(opts, :cache_ttl, :timer.minutes(5))
            TruckingPlatform.Cache.put(cache_key, result, ttl: ttl)
            success
          error ->
            error
        end
    end
  end
  
  defp cached_get(collection, id, partition_key, opts) do
    cache_key = "#{collection}:#{id}"
    
    case TruckingPlatform.Cache.get(cache_key) do
      {:ok, result} ->
        {:ok, result}
      _ ->
        case execute_with_retry(fn ->
          GenServer.call(__MODULE__, {:get, collection, id, partition_key}, @timeout)
        end, opts) do
          {:ok, result} = success ->
            ttl = Keyword.get(opts, :cache_ttl, :timer.minutes(10))
            TruckingPlatform.Cache.put(cache_key, result, ttl: ttl)
            success
          error ->
            error
        end
    end
  end
  
  defp cached_count(collection, filter, opts) do
    cache_key = "count:#{collection}:#{:crypto.hash(:md5, inspect(filter)) |> Base.encode16()}"
    
    case TruckingPlatform.Cache.get(cache_key) do
      {:ok, result} ->
        {:ok, result}
      _ ->
        sql = "SELECT VALUE COUNT(1) FROM c WHERE #{build_filter_clause(filter)}"
        case execute_with_retry(fn ->
          GenServer.call(__MODULE__, {:query, collection, sql, []}, @timeout)
        end, opts) do
          {:ok, [count]} ->
            ttl = Keyword.get(opts, :cache_ttl, :timer.minutes(2))
            TruckingPlatform.Cache.put(cache_key, count, ttl: ttl)
            {:ok, count}
          error ->
            error
        end
    end
  end
  
  defp execute_with_retry(fun, opts) do
    attempts = Keyword.get(opts, :retry_attempts, @retry_attempts)
    execute_with_retry(fun, attempts, @retry_delay)
  end
  
  defp execute_with_retry(fun, 0, _delay) do
    fun.()
  end
  
  defp execute_with_retry(fun, attempts, delay) do
    case fun.() do
      {:error, %{"code" => code}} when code in ["TooManyRequests", "ServiceUnavailable"] ->
        Logger.warn("CosmosDB throttled, retrying in #{delay}ms (#{attempts} attempts left)")
        :timer.sleep(delay)
        execute_with_retry(fun, attempts - 1, delay * 2) # Exponential backoff
        
      {:error, %HTTPoison.Error{reason: reason}} when reason in [:timeout, :connect_timeout] ->
        Logger.warn("CosmosDB timeout, retrying in #{delay}ms (#{attempts} attempts left)")
        :timer.sleep(delay)
        execute_with_retry(fun, attempts - 1, delay * 2)
        
      result ->
        result
    end
  end
  
  defp build_filter_clause(filter) when filter == %{}, do: "1=1"
  defp build_filter_clause(filter) do
    filter
    |> Enum.map(fn {key, value} -> "c.#{key} = '#{value}'" end)
    |> Enum.join(" AND ")
  end

  defp cosmos_auth_token do
    # Generate master key token for Cosmos DB
    # In dev/test with stub, we may not have a key set; guard against nil
    case @cosmos_key do
      nil -> ""
      key -> Base.encode64(key)
    end
  end

  defp ensure_stub_table do
    case :ets.info(:cosmos_stub) do
      :undefined -> :ets.new(:cosmos_stub, [:named_table, :public, :bag])
      _ -> :ok
    end
  end
end
