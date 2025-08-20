defmodule TruckingPlatform.Storage.Geofence do
  @moduledoc """
  Cosmos DB persistence for geofences (container: Geofences)
  Fields (example): %{id, orgId, name, polygon, center, radius, activeFrom, activeTo}
  """
  alias TruckingPlatform.Storage.CosmosDB

  @collection "Geofences"

  def get(id, org_id) do
    CosmosDB.get_document(@collection, id, org_id)
  end

  def list_active(org_id, now_iso) do
    sql = """
    SELECT * FROM c WHERE c.orgId = @org
      AND (IS_NULL(c.activeFrom) OR c.activeFrom <= @now)
      AND (IS_NULL(c.activeTo) OR c.activeTo >= @now)
    """
    CosmosDB.query(@collection, sql, org: org_id, now: now_iso)
  end
end
