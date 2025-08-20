defmodule TruckingPlatform.Geofencing do
  @moduledoc """
  Orchestrates geofencing validation and downstream effects for device-triggered events.
  """

  alias TruckingPlatform.{Geofencing.Validator, Geofencing.State}
  alias TruckingPlatform.Storage.{Geofence, GeoEvent}
  alias TruckingPlatformWeb.Endpoint

  require Logger

  def process_event(%{"geofenceId" => id} = ev) do
  process_event(Map.new(ev, fn {k,v} -> {String.to_atom(k), v} end))
  end
  def process_event(%{geofenceId: geofence_id, tripId: trip_id} = event) do
    with {:ok, geofence} <- fetch_geofence(geofence_id, event[:orgId] || event["orgId"]),
         {:ok, :validated} <- Validator.validate_event(event, geofence) do
      persist_and_broadcast(event, geofence)
    else
      {:error, reason} ->
        Logger.warn("geofence event rejected: #{inspect(reason)} #{inspect(event)}")
        {:error, reason}
    end
  end

  defp fetch_geofence(geofence_id, org_id) do
    case Geofence.get(geofence_id, org_id) do
      {:ok, gf} -> {:ok, gf}
      other -> other
    end
  end

  defp persist_and_broadcast(event, _geofence) do
    doc = %{
      userId: event[:userId],
      tripId: event[:tripId],
      geofenceId: event[:geofenceId],
      ts: event[:ts],
      eventType: event[:event] in ["enter", :enter] && "enter" || "exit",
      lat: event[:lat],
      lon: event[:lon],
      accuracy: event[:accuracy],
      speed: event[:speed]
    }

    case GeoEvent.create(doc) do
      {:ok, _saved} ->
        Endpoint.broadcast!("room:#{event[:tripId]}:geo", "geo_event", %{
          userId: doc.userId,
          tripId: doc.tripId,
          geofenceId: doc.geofenceId,
          eventType: doc.eventType,
          ts: doc.ts
        })
        maybe_publish_webhook(doc)
        {:ok, :broadcasted}
      {:error, reason} -> {:error, reason}
    end
  end

  defp maybe_publish_webhook(doc) do
    case Application.get_env(:trucking_platform, :geofence_webhook_urls, []) do
      [] -> :ok
      urls when is_list(urls) ->
        Enum.each(urls, fn url ->
          Task.start(fn -> HTTPoison.post(url, Jason.encode!(doc), [{"content-type", "application/json"}]) end)
        end)
    end
  end
end
defmodule TruckingPlatform.Geofencing do
  @moduledoc """
  Geofencing logic for tracking driver locations and facility enter/exit events.
  Uses polygon-based geofencing with hysteresis and debouncing.
  """

  alias TruckingPlatform.Storage.{GeoEvent, Geofence}

  @hysteresis_buffer 50 # meters
  @debounce_time 10_000 # 10 seconds in milliseconds

  def process_location(location_data) do
    %{
      user_id: user_id,
      org_id: org_id,
      lat: lat,
      lon: lon,
      timestamp: timestamp
    } = location_data

    point = %Geo.Point{coordinates: {lon, lat}}

    # Get all geofences for the organization
    case Geofence.list_by_org(org_id) do
      {:ok, geofences} ->
        events = 
          geofences
          |> Enum.flat_map(&check_geofence_events(&1, user_id, point, timestamp))
          |> filter_debounced_events(user_id)

        {:ok, events}
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  def get_user_status(user_id, org_id) do
    # Get the latest location status for a user
    case GeoEvent.get_latest_by_user(user_id, org_id) do
      {:ok, nil} ->
        %{status: "unknown", last_event: nil}
      
      {:ok, event} ->
        %{
          status: if(event.event_type == "enter", do: "inside", else: "outside"),
          geofence_id: event.geofence_id,
          last_event: event,
          timestamp: event.timestamp
        }
      
      {:error, _} ->
        %{status: "error", last_event: nil}
    end
  end

  # Private functions

  defp check_geofence_events(geofence, user_id, point, timestamp) do
    polygon = parse_polygon(geofence.coordinates)
    
    # Check if point is inside the geofence
    inside? = point_in_polygon?(point, polygon)
    
    # Get the last event for this user and geofence
    last_event = get_last_event(user_id, geofence.id)
    
    case {inside?, last_event} do
      {true, nil} ->
        # First time entering
        [create_event(geofence.id, user_id, geofence.org_id, "enter", point, timestamp)]
      
      {true, %{event_type: "exit"}} ->
        # Re-entering after exit
        [create_event(geofence.id, user_id, geofence.org_id, "enter", point, timestamp)]
      
      {false, %{event_type: "enter"}} ->
        # Exiting after being inside
        [create_event(geofence.id, user_id, geofence.org_id, "exit", point, timestamp)]
      
      _ ->
        # No state change
        []
    end
  end

  defp point_in_polygon?(point, polygon) do
    # Use the Topo library for point-in-polygon calculation
    case Topo.contains?(polygon, point) do
      true -> true
      false -> false
      _ -> false
    end
  end

  defp parse_polygon(coordinates) when is_list(coordinates) do
    # Convert coordinate list to Geo.Polygon
    # Assuming coordinates are in [lng, lat] format
    ring = 
      coordinates
      |> Enum.map(fn [lng, lat] -> {lng, lat} end)

    %Geo.Polygon{coordinates: [ring]}
  end

  defp parse_polygon(_), do: %Geo.Polygon{coordinates: [[]]}

  defp get_last_event(user_id, geofence_id) do
    case GeoEvent.get_latest_by_user_and_geofence(user_id, geofence_id) do
      {:ok, event} -> event
      _ -> nil
    end
  end

  defp create_event(geofence_id, user_id, org_id, event_type, point, timestamp) do
    %{
      id: UUID.uuid4(),
      geofence_id: geofence_id,
      user_id: user_id,
      org_id: org_id,
      event_type: event_type,
      location: %{
        lat: elem(point.coordinates, 1),
        lon: elem(point.coordinates, 0)
      },
      timestamp: timestamp,
      metadata: %{}
    }
  end

  defp filter_debounced_events(events, user_id) do
    # Filter out events that are too close in time (debouncing)
    last_event_time = get_last_event_time(user_id)
    current_time = System.system_time(:millisecond)
    
    if is_nil(last_event_time) or (current_time - last_event_time) > @debounce_time do
      # Update the last event time
      update_last_event_time(user_id, current_time)
      events
    else
      # Skip events due to debouncing
      []
    end
  end

  defp get_last_event_time(user_id) do
    # In a real implementation, this would be stored in a cache (Redis, ETS, etc.)
    # For now, we'll use a simple process dictionary
    Process.get({:last_geo_event, user_id})
  end

  defp update_last_event_time(user_id, timestamp) do
    Process.put({:last_geo_event, user_id}, timestamp)
  end
end
