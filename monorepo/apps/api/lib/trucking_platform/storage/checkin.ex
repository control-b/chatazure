defmodule TruckingPlatform.Storage.CheckIn do
  @moduledoc """
  Cosmos DB persistence for check-ins (container: CheckIns).
  Fields: id, orgId, tripId, driverId, driverName, phone, poNumber, vehicle, facility, status, createdAt
  """
  alias TruckingPlatform.Storage.CosmosDB

  @collection "CheckIns"

  def create(attrs) do
    id = attrs[:id] || UUID.uuid4()
    doc = Map.merge(attrs, %{id: id, createdAt: DateTime.utc_now() |> DateTime.to_iso8601()})
    CosmosDB.create_document(@collection, doc)
  end

  def list_by_trip(trip_id) do
    sql = "SELECT * FROM c WHERE c.tripId = @trip ORDER BY c.createdAt DESC"
    CosmosDB.query(@collection, sql, trip: trip_id)
  end
end
