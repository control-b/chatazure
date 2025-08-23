defmodule TruckingPlatformWeb.MobileApiController do
  use TruckingPlatformWeb, :controller
  alias TruckingPlatform.{Storage, Geofencing}
  alias TruckingPlatform.Storage.{Trip, User, Geofence}
  alias TruckingPlatformWeb.Endpoint

  # Mobile dashboard data
  def dashboard(conn, %{"userId" => user_id, "orgId" => org_id}) do
    with {:ok, user} <- User.get(user_id, org_id),
         {:ok, dashboard_data} <- get_dashboard_data(user_id, org_id) do
      json(conn, dashboard_data)
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get active trip for driver
  def active_trip(conn, %{"userId" => user_id, "orgId" => org_id}) do
    case Trip.get_active_by_driver(user_id, org_id) do
      {:ok, nil} ->
        json(conn, %{active_trip: nil})
      
      {:ok, trip} ->
        # Enhance trip data with geofences and check-in status
        enhanced_trip = enhance_trip_data(trip, user_id)
        json(conn, %{active_trip: enhanced_trip})
      
      {:error, reason} ->
        conn
        |> put_status(500)
        |> json(%{error: inspect(reason)})
    end
  end

  # Create trip with mobile-optimized data
  def create_trip(conn, params) do
    with {:ok, attrs} <- validate_trip_creation(params),
         {:ok, trip} <- Trip.create(attrs) do
      
      # Create geofences for pickup and delivery locations
      create_trip_geofences(trip)
      
      # Broadcast trip creation
      broadcast_trip_created(trip)
      
      # Send notification to driver
      send_trip_assignment_notification(trip)
      
      json(conn, %{
        success: true,
        trip: trip,
        geofences_created: true
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Update driver location
  def update_location(conn, params) do
    with {:ok, attrs} <- validate_location_update(params),
         {:ok, events} <- Geofencing.process_location(attrs) do
      
      # Broadcast location update
      broadcast_location_update(attrs, events)
      
      # Check for proximity notifications
      check_proximity_notifications(attrs, events)
      
      json(conn, %{
        success: true,
        events: events,
        geofence_events: length(events)
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get geofences for driver's active trips
  def trip_geofences(conn, %{"userId" => user_id, "orgId" => org_id}) do
    case Trip.get_active_by_driver(user_id, org_id) do
      {:ok, nil} ->
        json(conn, %{geofences: []})
      
      {:ok, trip} ->
        case Geofence.list_by_trip(trip.id) do
          {:ok, geofences} ->
            json(conn, %{
              geofences: Enum.map(geofences, &format_geofence_for_mobile/1)
            })
          
          {:error, reason} ->
            conn
            |> put_status(500)
            |> json(%{error: inspect(reason)})
        end
      
      {:error, reason} ->
        conn
        |> put_status(500)
        |> json(%{error: inspect(reason)})
    end
  end

  # Manual geofence check-in
  def manual_geofence_checkin(conn, params) do
    with {:ok, attrs} <- validate_manual_checkin(params),
         {:ok, result} <- process_manual_checkin(attrs) do
      
      json(conn, %{
        success: true,
        checkin_recorded: true,
        geofence_event: result.geofence_event,
        next_action: determine_next_action(result)
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get notifications for mobile
  def notifications(conn, %{"userId" => user_id, "orgId" => org_id} = params) do
    limit = String.to_integer(params["limit"] || "20")
    offset = String.to_integer(params["offset"] || "0")
    
    case Storage.Notification.list_for_user(user_id, org_id, limit: limit, offset: offset) do
      {:ok, notifications} ->
        json(conn, %{
          notifications: Enum.map(notifications, &format_notification_for_mobile/1),
          has_more: length(notifications) == limit
        })
      
      {:error, reason} ->
        conn
        |> put_status(500)
        |> json(%{error: inspect(reason)})
    end
  end

  # Mark notifications as read
  def mark_notifications_read(conn, %{"notification_ids" => ids, "userId" => user_id}) do
    case Storage.Notification.mark_read(ids, user_id) do
      {:ok, _} ->
        json(conn, %{success: true})
      
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Register device for push notifications
  def register_device(conn, params) do
    with {:ok, attrs} <- validate_device_registration(params),
         {:ok, device} <- Storage.Device.register(attrs) do
      
      json(conn, %{
        success: true,
        device_id: device.id,
        push_enabled: true
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Private helper functions

  defp get_dashboard_data(user_id, org_id) do
    with {:ok, stats} <- get_user_stats(user_id, org_id),
         {:ok, recent_notifications} <- get_recent_notifications(user_id, org_id),
         {:ok, location_status} <- get_location_status(user_id, org_id) do
      {:ok, %{
        stats: stats,
        notifications: recent_notifications,
        location_status: location_status,
        timestamp: DateTime.utc_now()
      }}
    end
  end

  defp get_user_stats(user_id, org_id) do
    today = Date.utc_today()
    
    stats = %{
      today_trips: Trip.count_by_driver_and_date(user_id, today),
      completed_trips: Trip.count_completed_by_driver_and_date(user_id, today),
      pending_documents: Storage.Document.count_pending_by_user(user_id),
      unread_messages: Storage.Message.count_unread_by_user(user_id, org_id)
    }
    
    {:ok, stats}
  end

  defp get_recent_notifications(user_id, org_id) do
    case Storage.Notification.list_for_user(user_id, org_id, limit: 5) do
      {:ok, notifications} ->
        {:ok, Enum.map(notifications, &format_notification_for_mobile/1)}
      error ->
        error
    end
  end

  defp get_location_status(user_id, org_id) do
    status = %{
      permission_granted: true, # This would be tracked in the app
      geofence_monitoring: Geofencing.get_user_status(user_id, org_id),
      last_update: DateTime.utc_now()
    }
    
    {:ok, status}
  end

  defp enhance_trip_data(trip, user_id) do
    # Add geofences, check-in status, and next actions
    geofences = case Geofence.list_by_trip(trip.id) do
      {:ok, gfs} -> Enum.map(gfs, &format_geofence_for_mobile/1)
      _ -> []
    end
    
    checkins = case Storage.CheckIn.list_by_trip(trip.id) do
      {:ok, cis} -> cis
      _ -> []
    end
    
    next_checkin_type = determine_next_checkin_type(checkins)
    
    Map.merge(trip, %{
      geofences: geofences,
      checkins: checkins,
      next_checkin_type: next_checkin_type,
      status: calculate_trip_status(checkins)
    })
  end

  defp determine_next_checkin_type(checkins) do
    has_pickup = Enum.any?(checkins, &(&1["type"] == "pickup"))
    has_delivery = Enum.any?(checkins, &(&1["type"] == "delivery"))
    
    cond do
      !has_pickup -> "pickup"
      !has_delivery -> "delivery"
      true -> nil
    end
  end

  defp calculate_trip_status(checkins) do
    has_pickup = Enum.any?(checkins, &(&1["type"] == "pickup"))
    has_delivery = Enum.any?(checkins, &(&1["type"] == "delivery"))
    
    cond do
      has_delivery -> "delivered"
      has_pickup -> "en_route_delivery"
      true -> "created"
    end
  end

  defp validate_trip_creation(params) do
    required = ~w(orgId driverId pickupLocation deliveryLocation poNumber)
    case validate_required_fields(params, required) do
      {:ok, _} -> {:ok, stringify_keys(params)}
      error -> error
    end
  end

  defp validate_location_update(params) do
    required = ~w(user_id org_id lat lon timestamp)
    case validate_required_fields(params, required) do
      {:ok, _} ->
        with {:ok, lat} <- parse_float(params["lat"]),
             {:ok, lon} <- parse_float(params["lon"]),
             {:ok, timestamp} <- parse_timestamp(params["timestamp"]) do
          {:ok, %{
            user_id: params["user_id"],
            org_id: params["org_id"],
            lat: lat,
            lon: lon,
            timestamp: timestamp,
            accuracy: parse_float(params["accuracy"]) |> elem(1) || 10.0
          }}
        end
      error -> error
    end
  end

  defp validate_manual_checkin(params) do
    required = ~w(user_id org_id trip_id type lat lon)
    case validate_required_fields(params, required) do
      {:ok, _} -> {:ok, stringify_keys(params)}
      error -> error
    end
  end

  defp validate_device_registration(params) do
    required = ~w(user_id org_id platform device_token)
    case validate_required_fields(params, required) do
      {:ok, _} -> {:ok, stringify_keys(params)}
      error -> error
    end
  end

  defp validate_required_fields(params, required) do
    missing = Enum.filter(required, fn field ->
      !Map.has_key?(params, field) && !Map.has_key?(params, String.to_atom(field))
    end)
    
    if missing == [], do: {:ok, params}, else: {:error, {:missing_fields, missing}}
  end

  defp parse_float(nil), do: {:error, :invalid_number}
  defp parse_float(value) when is_number(value), do: {:ok, value}
  defp parse_float(value) when is_binary(value) do
    case Float.parse(value) do
      {num, _} -> {:ok, num}
      :error -> {:error, :invalid_number}
    end
  end

  defp parse_timestamp(timestamp) when is_binary(timestamp) do
    case DateTime.from_iso8601(timestamp) do
      {:ok, dt, _} -> {:ok, dt}
      _ -> {:error, :invalid_timestamp}
    end
  end

  defp create_trip_geofences(trip) do
    # Create geofences for pickup and delivery locations
    pickup_geofence = %{
      id: UUID.uuid4(),
      trip_id: trip.id,
      org_id: trip.org_id,
      name: "#{trip.po_number} Pickup",
      type: "pickup",
      lat: trip.pickup_location["lat"],
      lng: trip.pickup_location["lng"],
      radius: 150, # 150 meters
      coordinates: generate_circle_polygon(trip.pickup_location["lat"], trip.pickup_location["lng"], 150)
    }
    
    delivery_geofence = %{
      id: UUID.uuid4(),
      trip_id: trip.id,
      org_id: trip.org_id,
      name: "#{trip.po_number} Delivery",
      type: "delivery",
      lat: trip.delivery_location["lat"],
      lng: trip.delivery_location["lng"],
      radius: 150,
      coordinates: generate_circle_polygon(trip.delivery_location["lat"], trip.delivery_location["lng"], 150)
    }
    
    Task.start(fn ->
      Geofence.create(pickup_geofence)
      Geofence.create(delivery_geofence)
    end)
  end

  defp generate_circle_polygon(lat, lng, radius_meters) do
    # Generate a circular polygon approximation
    earth_radius = 6371000 # Earth radius in meters
    
    angular_radius = radius_meters / earth_radius
    lat_rad = lat * :math.pi() / 180
    lng_rad = lng * :math.pi() / 180
    
    # Generate 20 points around the circle
    0..19
    |> Enum.map(fn i ->
      angle = i * 2 * :math.pi() / 20
      
      point_lat = :math.asin(
        :math.sin(lat_rad) * :math.cos(angular_radius) +
        :math.cos(lat_rad) * :math.sin(angular_radius) * :math.cos(angle)
      )
      
      point_lng = lng_rad + :math.atan2(
        :math.sin(angle) * :math.sin(angular_radius) * :math.cos(lat_rad),
        :math.cos(angular_radius) - :math.sin(lat_rad) * :math.sin(point_lat)
      )
      
      [point_lng * 180 / :math.pi(), point_lat * 180 / :math.pi()]
    end)
  end

  defp format_geofence_for_mobile(geofence) do
    %{
      id: geofence.id,
      name: geofence.name,
      type: geofence.type,
      lat: geofence.lat,
      lng: geofence.lng,
      radius: geofence.radius || 150,
      trip_id: geofence.trip_id
    }
  end

  defp format_notification_for_mobile(notification) do
    %{
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      timestamp: notification.inserted_at,
      read: notification.read,
      urgent: notification.urgent || false,
      data: notification.data || %{}
    }
  end

  defp broadcast_trip_created(trip) do
    Endpoint.broadcast!("org:#{trip.org_id}:dispatch", "trip_created", %{
      trip: trip,
      timestamp: DateTime.utc_now()
    })
    
    Endpoint.broadcast!("user:#{trip.driver_id}", "trip_assigned", %{
      trip: trip,
      timestamp: DateTime.utc_now()
    })
  end

  defp send_trip_assignment_notification(trip) do
    notification_data = %{
      title: "New Trip Assignment",
      body: "Trip #{trip.po_number} has been assigned to you",
      type: "trip_assignment",
      trip_id: trip.id,
      data: %{
        trip_id: trip.id,
        po_number: trip.po_number,
        pickup_time: trip.estimated_pickup
      }
    }
    
    Task.start(fn ->
      TruckingPlatform.Notifications.send_push_notification(
        trip.org_id,
        [trip.driver_id],
        notification_data
      )
    end)
  end

  defp broadcast_location_update(location_data, events) do
    Endpoint.broadcast!("org:#{location_data.org_id}:tracking", "location_update", %{
      user_id: location_data.user_id,
      lat: location_data.lat,
      lon: location_data.lon,
      timestamp: location_data.timestamp,
      events: events
    })
  end

  defp check_proximity_notifications(location_data, events) do
    # Send notifications when driver approaches geofences
    Enum.each(events, fn event ->
      if event.event_type == "enter" do
        send_proximity_notification(location_data, event)
      end
    end)
  end

  defp send_proximity_notification(location_data, event) do
    notification_data = %{
      title: "Driver Arrival",
      body: "Driver has arrived at #{event.geofence_id}",
      type: "driver_arrival",
      data: %{
        user_id: location_data.user_id,
        geofence_id: event.geofence_id,
        trip_id: event.trip_id
      }
    }
    
    Task.start(fn ->
      TruckingPlatform.Notifications.send_push_notification(
        location_data.org_id,
        ["dispatcher", "admin"],
        notification_data
      )
    end)
  end

  defp process_manual_checkin(attrs) do
    # Process manual check-in and create geofence event
    checkin_data = %{
      orgId: attrs["org_id"],
      tripId: attrs["trip_id"],
      driverId: attrs["user_id"],
      type: attrs["type"],
      location: %{
        lat: String.to_float(attrs["lat"]),
        lng: String.to_float(attrs["lon"]),
        accuracy: 10.0
      },
      method: "manual",
      timestamp: DateTime.utc_now(),
      notes: attrs["notes"]
    }
    
    # Create check-in record
    with {:ok, checkin} <- Storage.CheckIn.create(checkin_data) do
      # Create geofence event
      geofence_event = %{
        userId: attrs["user_id"],
        tripId: attrs["trip_id"],
        orgId: attrs["org_id"],
        lat: String.to_float(attrs["lat"]),
        lon: String.to_float(attrs["lon"]),
        event: "enter",
        ts: DateTime.utc_now(),
        method: "manual"
      }
      
      {:ok, geofence_result} = Geofencing.process_event(geofence_event)
      
      {:ok, %{
        checkin: checkin,
        geofence_event: geofence_result
      }}
    end
  end

  defp determine_next_action(%{checkin: checkin}) do
    case checkin["type"] do
      "pickup" -> %{
        action: "navigate_to_delivery",
        message: "Navigate to delivery location",
        next_step: "delivery"
      }
      "delivery" -> %{
        action: "complete_documents",
        message: "Complete delivery documents",
        next_step: "documents"
      }
      _ -> %{
        action: "continue",
        message: "Continue with trip",
        next_step: nil
      }
    end
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {k, v} ->
      key = if is_atom(k), do: Atom.to_string(k), else: k
      {key, (if is_map(v), do: stringify_keys(v), else: v)}
    end)
  end
end
