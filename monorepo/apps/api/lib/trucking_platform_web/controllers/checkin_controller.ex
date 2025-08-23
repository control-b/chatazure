defmodule TruckingPlatformWeb.CheckInController do
  use TruckingPlatformWeb, :controller
  alias TruckingPlatform.Storage.CheckIn
  alias TruckingPlatform.Geofencing
  alias TruckingPlatformWeb.Endpoint

  def create(conn, params) do
    with {:ok, attrs} <- validate(params),
         {:ok, checkin} <- CheckIn.create(attrs) do
      # Broadcast to trip room and dispatcher
      broadcast_checkin(checkin)
      
      # Process geofence event if location provided
      if attrs["location"], do: process_geofence_event(attrs)
      
      # Send push notification to relevant parties
      send_checkin_notification(checkin)
      
      json(conn, mask_phone(checkin))
    else
      {:error, reason} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(400, Jason.encode!(%{error: inspect(reason)}))
    end
  end

  def index(conn, %{"tripId" => trip_id}) do
    case CheckIn.list_by_trip(trip_id) do
      {:ok, checkins} -> json(conn, Enum.map(checkins, &mask_phone/1))
      {:error, reason} -> send_resp(conn, 500, Jason.encode!(%{error: inspect(reason)}))
    end
  end

  # Mobile-specific endpoint for auto check-ins
  def mobile_checkin(conn, params) do
    with {:ok, attrs} <- validate_mobile_checkin(params),
         {:ok, checkin} <- CheckIn.create(attrs) do
      # Enhanced mobile features
      broadcast_checkin(checkin)
      process_geofence_event(attrs)
      send_checkin_notification(checkin)
      maybe_trigger_document_workflow(checkin)
      
      json(conn, %{
        success: true,
        checkin: mask_phone(checkin),
        next_action: determine_next_action(checkin)
      })
    else
      {:error, reason} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(400, Jason.encode!(%{error: inspect(reason)}))
    end
  end

  # Get check-in status for mobile dashboard
  def status(conn, %{"tripId" => trip_id, "userId" => user_id}) do
    case CheckIn.get_trip_status(trip_id, user_id) do
      {:ok, status} -> json(conn, status)
      {:error, reason} -> send_resp(conn, 500, Jason.encode!(%{error: inspect(reason)}))
    end
  end

  defp validate(params) do
    # Required: orgId, tripId, driverId, driverName, phone, poNumber, vehicle, facility
    required = ~w(orgId tripId driverId driverName phone poNumber vehicle facility)a
    missing = Enum.filter(required, fn key ->
      !(Map.has_key?(params, key) or Map.has_key?(params, Atom.to_string(key)))
    end)
    if missing != [], do: {:error, {:missing, missing}}, else: normalize(params)
  end

  defp validate_mobile_checkin(params) do
    # Enhanced validation for mobile check-ins
    required = ~w(orgId tripId driverId type location)a
    missing = Enum.filter(required, fn key ->
      !(Map.has_key?(params, key) or Map.has_key?(params, Atom.to_string(key)))
    end)
    
    case missing do
      [] ->
        with {:ok, normalized} <- normalize_mobile(params),
             {:ok, location} <- validate_location(normalized["location"]),
             {:ok, checkin_type} <- validate_checkin_type(normalized["type"]) do
          {:ok, Map.merge(normalized, %{"location" => location, "type" => checkin_type})}
        else
          error -> error
        end
      _ ->
        {:error, {:missing, missing}}
    end
  end

  defp validate_location(%{"lat" => lat, "lng" => lng, "accuracy" => accuracy}) 
    when is_number(lat) and is_number(lng) and is_number(accuracy) do
    if abs(lat) <= 90 and abs(lng) <= 180 and accuracy > 0 do
      {:ok, %{"lat" => lat, "lng" => lng, "accuracy" => accuracy}}
    else
      {:error, :invalid_location}
    end
  end

  defp validate_location(_), do: {:error, :invalid_location}

  defp validate_checkin_type(type) when type in ["pickup", "delivery"], do: {:ok, type}
  defp validate_checkin_type(_), do: {:error, :invalid_checkin_type}

  defp normalize(params) do
    # allow string or atom keys
    phone = normalize_phone(params["phone"] || params[:phone])
    if phone == nil, do: {:error, :invalid_phone}, else:
      {:ok,
        params
        |> stringify_keys()
        |> Map.put("phone", phone)
      }
  end

  defp normalize_mobile(params) do
    {:ok, stringify_keys(params)}
  end

  defp normalize_phone(phone) do
    # E.164 normalization (simple)
    phone = to_string(phone)
    case Regex.run(~r/^\+\d{10,15}$/, phone) do
      nil -> nil
      _ -> phone
    end
  end

  defp mask_phone(checkin) do
    phone = checkin["phone"] || checkin[:phone]
    masked = if phone, do: String.replace(phone, ~r/(\+\d{2})(\d{3})(\d{3})(\d+)/, "\\1-\\2-***-\\4"), else: nil
    Map.put(checkin, "phone", masked)
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {k, v} ->
      key = if is_atom(k), do: Atom.to_string(k), else: k
      {key, (if is_map(v), do: stringify_keys(v), else: v)}
    end)
  end

  # Mobile-specific helper functions
  defp broadcast_checkin(checkin) do
    trip_id = checkin["tripId"] || checkin[:tripId]
    org_id = checkin["orgId"] || checkin[:orgId]
    
    # Broadcast to trip room
    Endpoint.broadcast!("trip:#{trip_id}", "checkin_created", %{
      checkin: mask_phone(checkin),
      timestamp: DateTime.utc_now()
    })
    
    # Broadcast to dispatcher room
    Endpoint.broadcast!("org:#{org_id}:dispatch", "driver_checkin", %{
      trip_id: trip_id,
      driver_id: checkin["driverId"],
      type: checkin["type"],
      location: checkin["location"],
      timestamp: DateTime.utc_now()
    })
  end

  defp process_geofence_event(attrs) do
    geofence_event = %{
      userId: attrs["driverId"],
      tripId: attrs["tripId"],
      orgId: attrs["orgId"],
      lat: attrs["location"]["lat"],
      lon: attrs["location"]["lng"],
      accuracy: attrs["location"]["accuracy"],
      event: "enter",
      ts: DateTime.utc_now(),
      method: attrs["method"] || "manual"
    }
    
    Task.start(fn ->
      Geofencing.process_event(geofence_event)
    end)
  end

  defp send_checkin_notification(checkin) do
    # Send push notification to relevant parties
    notification_data = %{
      title: "Check-in Complete",
      body: "Driver #{checkin["driverName"]} checked in for #{checkin["type"]}",
      type: "checkin",
      trip_id: checkin["tripId"],
      driver_id: checkin["driverId"],
      data: %{
        checkin_id: checkin["id"],
        trip_id: checkin["tripId"],
        type: checkin["type"]
      }
    }
    
    # Send to dispatchers and relevant stakeholders
    Task.start(fn ->
      TruckingPlatform.Notifications.send_push_notification(
        checkin["orgId"],
        ["dispatcher", "admin"],
        notification_data
      )
    end)
  end

  defp maybe_trigger_document_workflow(checkin) do
    # Trigger document signing workflow if needed
    if checkin["type"] == "delivery" do
      Task.start(fn ->
        TruckingPlatform.Documents.trigger_delivery_documents(checkin["tripId"])
      end)
    end
  end

  defp determine_next_action(checkin) do
    case checkin["type"] do
      "pickup" -> %{
        action: "navigate_to_delivery",
        message: "Navigate to delivery location"
      }
      "delivery" -> %{
        action: "complete_documents",
        message: "Complete delivery documents"
      }
      _ -> %{
        action: "continue",
        message: "Check-in complete"
      }
    end
  end
end
