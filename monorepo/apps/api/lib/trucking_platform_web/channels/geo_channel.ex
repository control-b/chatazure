defmodule TruckingPlatformWeb.GeoChannel do
  use TruckingPlatformWeb, :channel
  @moduledoc """
  Receives device-triggered geofence ENTER/EXIT events via Phoenix channels.
  Topic: "geo:*" where * is org_id.
  Use `event` push with payload {userId, tripId, geofenceId, lat, lon, ts, event, accuracy, speed}.
  """

  alias TruckingPlatform.Geofencing

  @impl true
  def join("geo:" <> org_id, _payload, socket) do
    if socket.assigns.org_id == org_id do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Handle GPS location updates
  @impl true
  def handle_in("event", payload, socket) do
    # Device ENTER/EXIT geo event
    # Expected payload keys: userId, tripId, geofenceId, lat, lon, ts, event, accuracy, speed
    payload =
      payload
      |> Map.put_new("userId", socket.assigns.user_id)
      |> Map.put_new("orgId", socket.assigns.org_id)

    case Geofencing.process_event(payload) do
      {:ok, _} -> {:reply, :ok, socket}
      {:error, reason} -> {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle geofence status requests
  @impl true
  def handle_in("get_status", _payload, socket) do
  {:reply, {:ok, %{ok: true}}, socket}
  end
end
