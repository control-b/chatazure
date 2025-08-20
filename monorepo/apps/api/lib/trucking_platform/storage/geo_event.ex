defmodule TruckingPlatform.Storage.GeoEvent do
  @moduledoc """
  Cosmos DB persistence for geofencing events (container: GeoEvents).
  Applies idempotency keying and optional batch writes.
  """
  alias TruckingPlatform.Storage.CosmosDB
  require Logger

  @collection "GeoEvents"

  def create(%{} = event) do
    # Idempotency key to dedup hot paths
    id = Map.get(event, :id) || Map.get(event, "id") ||
      TruckingPlatform.Geofencing.Validator.idempotency_key(%{
        userId: event[:userId] || event["userId"],
        tripId: event[:tripId] || event["tripId"],
        geofenceId: event[:geofenceId] || event["geofenceId"],
        event: event[:eventType] || event["eventType"],
        ts: event[:ts] || event["ts"]
      })

    doc =
      event
      |> Map.put(:id, id)
      |> Map.put(:serverReceivedAt, DateTime.utc_now() |> DateTime.to_iso8601())

    case CosmosDB.create_document(@collection, doc) do
      {:ok, saved} -> {:ok, saved}
      {:error, %{"code" => code}} when code in ["Conflict", 409] ->
        # Idempotent duplicate
        {:ok, :duplicate}
      other -> other
    end
  end

  def list_by_trip(trip_id) do
    sql = "SELECT * FROM c WHERE c.tripId = @trip ORDER BY c.ts DESC"
    CosmosDB.query(@collection, sql, trip: trip_id)
  end
end
