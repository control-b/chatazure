defmodule TruckingPlatformWeb.GeoEventController do
  use TruckingPlatformWeb, :controller
  alias TruckingPlatform.Storage.GeoEvent

  def index(conn, %{"tripId" => trip_id}) do
    case GeoEvent.list_by_trip(trip_id) do
      {:ok, events} -> json(conn, events)
      {:error, reason} -> send_resp(conn, 500, Jason.encode!(%{error: inspect(reason)}))
    end
  end
end
