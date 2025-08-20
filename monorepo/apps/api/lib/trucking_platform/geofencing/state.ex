defmodule TruckingPlatform.Geofencing.State do
  @moduledoc """
  Lightweight ETS-based store for last-known geofence temporal state per user/geofence.
  Keys: {user_id, geofence_id} => %{status: :inside | :outside, ts: integer_ms}
  """
  use GenServer

  @table __MODULE__

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get(user_id, geofence_id) do
    case :ets.lookup(@table, {user_id, geofence_id}) do
      [{{^user_id, ^geofence_id}, data}] -> data
      _ -> nil
    end
  end

  def put(user_id, geofence_id, data) do
    :ets.insert(@table, {{user_id, geofence_id}, data})
    :ok
  end

  @impl true
  def init(state) do
    :ets.new(@table, [:named_table, :public, :set, read_concurrency: true])
    {:ok, state}
  end
end
