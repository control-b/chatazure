defmodule TruckingPlatformWeb.MobileChannel do
  use TruckingPlatformWeb, :channel
  alias TruckingPlatform.{Geofencing, Storage}
  alias TruckingPlatform.Storage.{User, Trip}
  require Logger

  @impl true
  def join("mobile:user:" <> user_id, payload, socket) do
    if authorized?(socket, user_id) do
      socket = assign(socket, :user_id, user_id)
      socket = assign(socket, :org_id, payload["org_id"])
      
      # Send initial state
      send(self(), :after_join)
      
      {:ok, %{status: "connected", user_id: user_id}, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def join("mobile:trip:" <> trip_id, payload, socket) do
    user_id = socket.assigns[:user_id] || payload["user_id"]
    
    if authorized_for_trip?(socket, trip_id, user_id) do
      socket = assign(socket, :trip_id, trip_id)
      
      # Subscribe to trip updates
      TruckingPlatformWeb.Endpoint.subscribe("trip:#{trip_id}")
      TruckingPlatformWeb.Endpoint.subscribe("trip:#{trip_id}:geo")
      
      {:ok, %{status: "joined_trip", trip_id: trip_id}, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def join("mobile:org:" <> rest, payload, socket) do
    case String.split(rest, ":") do
      [org_id, "dispatch"] ->
        user_id = socket.assigns[:user_id] || payload["user_id"]
        
        if authorized_for_dispatch?(socket, org_id, user_id) do
          socket = assign(socket, :org_id, org_id)
          socket = assign(socket, :role, "dispatcher")
          
          # Subscribe to dispatch events
          TruckingPlatformWeb.Endpoint.subscribe("org:#{org_id}:dispatch")
          TruckingPlatformWeb.Endpoint.subscribe("org:#{org_id}:tracking")
          
          {:ok, %{status: "joined_dispatch", org_id: org_id}, socket}
        else
          {:error, %{reason: "unauthorized"}}
        end
        
      _ ->
        {:error, %{reason: "invalid_topic"}}
    end
  end

  # Handle location updates from mobile devices
  @impl true
  def handle_in("location_update", %{"lat" => lat, "lng" => lng} = payload, socket) do
    user_id = socket.assigns.user_id
    org_id = socket.assigns.org_id
    
    location_data = %{
      user_id: user_id,
      org_id: org_id,
      lat: lat,
      lon: lng,
      timestamp: DateTime.utc_now(),
      accuracy: payload["accuracy"] || 10.0,
      speed: payload["speed"],
      heading: payload["heading"]
    }
    
    # Process geofencing
    case Geofencing.process_location(location_data) do
      {:ok, events} ->
        # Broadcast location update to relevant channels
        broadcast_location_update(socket, location_data, events)
        
        # Handle geofence events
        handle_geofence_events(socket, events)
        
        {:reply, {:ok, %{events: events, processed: true}}, socket}
      
      {:error, reason} ->
        Logger.error("Failed to process location: #{inspect(reason)}")
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle manual check-in requests
  def handle_in("manual_checkin", payload, socket) do
    user_id = socket.assigns.user_id
    org_id = socket.assigns.org_id
    trip_id = socket.assigns.trip_id || payload["trip_id"]
    
    checkin_data = %{
      user_id: user_id,
      org_id: org_id,
      trip_id: trip_id,
      type: payload["type"],
      lat: payload["lat"],
      lng: payload["lng"],
      method: "manual",
      notes: payload["notes"],
      photos: payload["photos"]
    }
    
    case process_mobile_checkin(checkin_data) do
      {:ok, result} ->
        # Broadcast check-in to relevant parties
        broadcast_checkin(socket, result)
        
        {:reply, {:ok, result}, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle device status updates
  def handle_in("device_status", payload, socket) do
    user_id = socket.assigns.user_id
    
    status_data = %{
      user_id: user_id,
      battery_level: payload["battery_level"],
      network_type: payload["network_type"],
      gps_enabled: payload["gps_enabled"],
      app_version: payload["app_version"],
      last_seen: DateTime.utc_now()
    }
    
    # Update device status
    case Storage.Device.update_status(user_id, status_data) do
      {:ok, _} ->
        {:reply, {:ok, %{status: "updated"}}, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle emergency alerts
  def handle_in("emergency_alert", %{"type" => emergency_type} = payload, socket) do
    user_id = socket.assigns.user_id
    org_id = socket.assigns.org_id
    
    emergency_data = %{
      user_id: user_id,
      org_id: org_id,
      emergency_type: emergency_type,
      location: %{
        lat: payload["lat"],
        lng: payload["lng"],
        accuracy: payload["accuracy"]
      },
      message: payload["message"],
      timestamp: DateTime.utc_now()
    }
    
    # Handle emergency immediately
    case handle_emergency(emergency_data) do
      {:ok, emergency_id} ->
        # Broadcast emergency to dispatch
        broadcast_emergency(socket, emergency_data, emergency_id)
        
        # Send push notifications
        TruckingPlatform.Notifications.send_emergency_notification(
          org_id,
          user_id,
          emergency_type,
          emergency_data.location
        )
        
        {:reply, {:ok, %{emergency_id: emergency_id, status: "alert_sent"}}, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle heartbeat/keepalive
  def handle_in("heartbeat", _payload, socket) do
    {:reply, {:ok, %{timestamp: DateTime.utc_now()}}, socket}
  end

  # Handle trip status requests
  def handle_in("get_trip_status", %{"trip_id" => trip_id}, socket) do
    user_id = socket.assigns.user_id
    
    case Trip.get_status(trip_id, user_id) do
      {:ok, status} ->
        {:reply, {:ok, status}, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle document signing status
  def handle_in("document_signed", %{"document_id" => doc_id, "signature_data" => sig_data}, socket) do
    user_id = socket.assigns.user_id
    org_id = socket.assigns.org_id
    trip_id = socket.assigns.trip_id
    
    # Process document signature
    case process_document_signature(doc_id, user_id, sig_data) do
      {:ok, signature} ->
        # Broadcast to trip and dispatch channels
        broadcast_document_signed(socket, doc_id, signature)
        
        # Send notifications
        TruckingPlatform.Notifications.send_document_notification(
          org_id,
          doc_id,
          user_id,
          "signed"
        )
        
        {:reply, {:ok, %{signature_id: signature.id}}, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: inspect(reason)}}, socket}
    end
  end

  # Handle after join
  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    org_id = socket.assigns.org_id
    
    # Send initial state data
    case get_initial_mobile_state(user_id, org_id) do
      {:ok, state} ->
        push(socket, "initial_state", state)
      
      {:error, reason} ->
        Logger.error("Failed to get initial state: #{inspect(reason)}")
    end
    
    {:noreply, socket}
  end

  # Handle broadcast messages
  def handle_info(%{event: "trip_created", payload: payload}, socket) do
    push(socket, "trip_created", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "trip_assigned", payload: payload}, socket) do
    push(socket, "trip_assigned", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "geo_event", payload: payload}, socket) do
    push(socket, "geo_event", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "document_signed", payload: payload}, socket) do
    push(socket, "document_signed", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "emergency_alert", payload: payload}, socket) do
    push(socket, "emergency_alert", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "location_update", payload: payload}, socket) do
    push(socket, "location_update", payload)
    {:noreply, socket}
  end

  # Private helper functions

  defp authorized?(socket, user_id) do
    # Check if the current user is authorized to join this channel
    current_user = socket.assigns[:current_user]
    current_user && (current_user.id == user_id || current_user.role in ["admin", "dispatcher"])
  end

  defp authorized_for_trip?(socket, trip_id, user_id) do
    case Trip.get(trip_id) do
      {:ok, trip} ->
        current_user = socket.assigns[:current_user]
        trip.driver_id == user_id || 
        (current_user && current_user.role in ["admin", "dispatcher"])
      
      _ ->
        false
    end
  end

  defp authorized_for_dispatch?(socket, org_id, user_id) do
    case User.get(user_id, org_id) do
      {:ok, user} ->
        user.role in ["dispatcher", "admin"]
      
      _ ->
        false
    end
  end

  defp broadcast_location_update(socket, location_data, events) do
    org_id = socket.assigns.org_id
    
    # Broadcast to dispatch channel
    TruckingPlatformWeb.Endpoint.broadcast!(
      "org:#{org_id}:tracking",
      "location_update",
      %{
        user_id: location_data.user_id,
        lat: location_data.lat,
        lon: location_data.lon,
        timestamp: location_data.timestamp,
        events: events
      }
    )
    
    # Broadcast to trip channel if applicable
    if trip_id = socket.assigns[:trip_id] do
      TruckingPlatformWeb.Endpoint.broadcast!(
        "trip:#{trip_id}",
        "driver_location",
        %{
          lat: location_data.lat,
          lon: location_data.lon,
          timestamp: location_data.timestamp,
          events: events
        }
      )
    end
  end

  defp handle_geofence_events(socket, events) do
    Enum.each(events, fn event ->
      if event.event_type == "enter" do
        # Trigger automatic check-in
        auto_checkin_data = %{
          user_id: socket.assigns.user_id,
          org_id: socket.assigns.org_id,
          trip_id: event.trip_id,
          geofence_id: event.geofence_id,
          type: determine_checkin_type(event),
          lat: event.location.lat,
          lng: event.location.lon,
          method: "automatic"
        }
        
        case process_mobile_checkin(auto_checkin_data) do
          {:ok, result} ->
            broadcast_checkin(socket, result)
            push(socket, "auto_checkin", result)
          
          {:error, reason} ->
            Logger.error("Auto check-in failed: #{inspect(reason)}")
        end
      end
    end)
  end

  defp process_mobile_checkin(checkin_data) do
    # Enhanced check-in processing for mobile
    attrs = %{
      orgId: checkin_data.org_id,
      tripId: checkin_data.trip_id,
      driverId: checkin_data.user_id,
      type: checkin_data.type,
      location: %{
        lat: checkin_data.lat,
        lng: checkin_data.lng,
        accuracy: checkin_data[:accuracy] || 10.0
      },
      method: checkin_data.method,
      timestamp: DateTime.utc_now(),
      notes: checkin_data[:notes],
      photos: checkin_data[:photos]
    }
    
    case Storage.CheckIn.create(attrs) do
      {:ok, checkin} ->
        # Create geofence event
        geofence_event = %{
          userId: checkin_data.user_id,
          tripId: checkin_data.trip_id,
          orgId: checkin_data.org_id,
          lat: checkin_data.lat,
          lon: checkin_data.lng,
          event: "enter",
          ts: DateTime.utc_now(),
          method: checkin_data.method
        }
        
        {:ok, _} = Geofencing.process_event(geofence_event)
        
        {:ok, %{
          checkin: checkin,
          next_action: determine_next_action(checkin),
          notifications_sent: true
        }}
      
      error ->
        error
    end
  end

  defp broadcast_checkin(socket, result) do
    org_id = socket.assigns.org_id
    trip_id = socket.assigns.trip_id || result.checkin["tripId"]
    
    # Broadcast to dispatch
    TruckingPlatformWeb.Endpoint.broadcast!(
      "org:#{org_id}:dispatch",
      "driver_checkin",
      %{
        checkin: result.checkin,
        trip_id: trip_id,
        timestamp: DateTime.utc_now()
      }
    )
    
    # Broadcast to trip channel
    if trip_id do
      TruckingPlatformWeb.Endpoint.broadcast!(
        "trip:#{trip_id}",
        "checkin_completed",
        %{
          checkin: result.checkin,
          next_action: result.next_action
        }
      )
    end
  end

  defp handle_emergency(emergency_data) do
    # Store emergency alert
    attrs = %{
      user_id: emergency_data.user_id,
      org_id: emergency_data.org_id,
      emergency_type: emergency_data.emergency_type,
      location: emergency_data.location,
      message: emergency_data.message,
      timestamp: emergency_data.timestamp,
      status: "active"
    }
    
    case Storage.Emergency.create(attrs) do
      {:ok, emergency} ->
        {:ok, emergency.id}
      
      error ->
        error
    end
  end

  defp broadcast_emergency(socket, emergency_data, emergency_id) do
    org_id = socket.assigns.org_id
    
    TruckingPlatformWeb.Endpoint.broadcast!(
      "org:#{org_id}:dispatch",
      "emergency_alert",
      %{
        emergency_id: emergency_id,
        user_id: emergency_data.user_id,
        emergency_type: emergency_data.emergency_type,
        location: emergency_data.location,
        message: emergency_data.message,
        timestamp: emergency_data.timestamp
      }
    )
  end

  defp broadcast_document_signed(socket, doc_id, signature) do
    org_id = socket.assigns.org_id
    trip_id = socket.assigns.trip_id
    
    payload = %{
      document_id: doc_id,
      signature_id: signature.id,
      user_id: signature.user_id,
      timestamp: DateTime.utc_now()
    }
    
    # Broadcast to dispatch
    TruckingPlatformWeb.Endpoint.broadcast!(
      "org:#{org_id}:dispatch",
      "document_signed",
      payload
    )
    
    # Broadcast to trip if applicable
    if trip_id do
      TruckingPlatformWeb.Endpoint.broadcast!(
        "trip:#{trip_id}",
        "document_signed",
        payload
      )
    end
  end

  defp process_document_signature(doc_id, user_id, signature_data) do
    attrs = %{
      document_id: doc_id,
      user_id: user_id,
      signature_data: signature_data["signature_svg"] || signature_data["signature_base64"],
      signature_type: signature_data["signature_type"] || "svg",
      field_id: signature_data["field_id"],
      location: signature_data["location"],
      device_info: signature_data["device_info"],
      timestamp: DateTime.utc_now()
    }
    
    Storage.DocumentSignature.create(attrs)
  end

  defp get_initial_mobile_state(user_id, org_id) do
    with {:ok, user} <- User.get(user_id, org_id),
         {:ok, active_trip} <- Trip.get_active_by_driver(user_id, org_id),
         {:ok, notifications} <- Storage.Notification.list_for_user(user_id, org_id, limit: 10) do
      
      {:ok, %{
        user: user,
        active_trip: active_trip,
        notifications: notifications,
        geofence_status: Geofencing.get_user_status(user_id, org_id),
        timestamp: DateTime.utc_now()
      }}
    end
  end

  defp determine_checkin_type(event) do
    # Determine check-in type based on geofence metadata
    case event.geofence_id do
      id when is_binary(id) ->
        if String.contains?(id, "pickup"), do: "pickup", else: "delivery"
      _ ->
        "unknown"
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
        message: "Continue with trip"
      }
    end
  end
end
