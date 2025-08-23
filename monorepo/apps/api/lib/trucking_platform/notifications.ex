defmodule TruckingPlatform.Notifications do
  @moduledoc """
  Push notification system for mobile devices.
  Supports FCM (Firebase Cloud Messaging) for cross-platform notifications.
  """

  alias TruckingPlatform.Storage.{User, Device, Notification}
  require Logger

  @fcm_url "https://fcm.googleapis.com/fcm/send"

  # Send push notification to specific users
  def send_push_notification(org_id, user_ids, notification_data) when is_list(user_ids) do
    Enum.each(user_ids, fn user_id ->
      send_push_notification(org_id, user_id, notification_data)
    end)
  end

  def send_push_notification(org_id, user_id, notification_data) when is_binary(user_id) do
    with {:ok, devices} <- Device.list_by_user(user_id, org_id),
         {:ok, _} <- store_notification(org_id, user_id, notification_data) do
      
      # Send to all registered devices
      devices
      |> Enum.filter(&(&1.push_enabled))
      |> Enum.each(&send_to_device(&1, notification_data))
      
      {:ok, :sent}
    else
      {:error, reason} ->
        Logger.error("Failed to send push notification: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Send to users by role
  def send_push_notification(org_id, roles, notification_data) when is_list(roles) do
    case User.list_by_roles(org_id, roles) do
      {:ok, users} ->
        user_ids = Enum.map(users, & &1.id)
        send_push_notification(org_id, user_ids, notification_data)
      
      {:error, reason} ->
        Logger.error("Failed to get users by roles: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Send geofence-related notifications
  def send_geofence_notification(org_id, trip_id, user_id, event_type, location) do
    notification_data = %{
      title: format_geofence_title(event_type),
      body: format_geofence_body(event_type, trip_id),
      type: "geofence_event",
      trip_id: trip_id,
      data: %{
        event_type: event_type,
        trip_id: trip_id,
        user_id: user_id,
        location: location,
        timestamp: DateTime.utc_now()
      }
    }
    
    # Send to dispatchers and admins
    send_push_notification(org_id, ["dispatcher", "admin"], notification_data)
  end

  # Send check-in notifications
  def send_checkin_notification(org_id, trip_id, driver_id, checkin_type) do
    notification_data = %{
      title: "Driver Check-in",
      body: "Driver checked in for #{checkin_type}",
      type: "checkin",
      trip_id: trip_id,
      data: %{
        trip_id: trip_id,
        driver_id: driver_id,
        checkin_type: checkin_type,
        timestamp: DateTime.utc_now()
      }
    }
    
    send_push_notification(org_id, ["dispatcher", "admin"], notification_data)
  end

  # Send document signing notifications
  def send_document_notification(org_id, document_id, user_id, action) do
    notification_data = %{
      title: format_document_title(action),
      body: format_document_body(action, document_id),
      type: "document",
      document_id: document_id,
      data: %{
        document_id: document_id,
        user_id: user_id,
        action: action,
        timestamp: DateTime.utc_now()
      }
    }
    
    case action do
      "requires_signature" ->
        # Send to specific user
        send_push_notification(org_id, user_id, notification_data)
      
      "signed" ->
        # Send to dispatchers and admins
        send_push_notification(org_id, ["dispatcher", "admin"], notification_data)
      
      _ ->
        send_push_notification(org_id, user_id, notification_data)
    end
  end

  # Send trip assignment notifications
  def send_trip_assignment_notification(org_id, trip_id, driver_id, trip_details) do
    notification_data = %{
      title: "New Trip Assignment",
      body: "Trip #{trip_details.po_number} assigned",
      type: "trip_assignment",
      trip_id: trip_id,
      urgent: true,
      data: %{
        trip_id: trip_id,
        po_number: trip_details.po_number,
        pickup_location: trip_details.pickup_location,
        delivery_location: trip_details.delivery_location,
        estimated_pickup: trip_details.estimated_pickup
      },
      actions: [
        %{
          action: "view_trip",
          title: "View Trip"
        },
        %{
          action: "call_dispatcher",
          title: "Call Dispatcher"
        }
      ]
    }
    
    send_push_notification(org_id, driver_id, notification_data)
  end

  # Send emergency notifications
  def send_emergency_notification(org_id, user_id, emergency_type, location) do
    notification_data = %{
      title: "EMERGENCY ALERT",
      body: format_emergency_body(emergency_type),
      type: "emergency",
      urgent: true,
      priority: "high",
      data: %{
        emergency_type: emergency_type,
        user_id: user_id,
        location: location,
        timestamp: DateTime.utc_now()
      },
      actions: [
        %{
          action: "call_emergency",
          title: "Call 911"
        },
        %{
          action: "locate_driver",
          title: "Locate Driver"
        }
      ]
    }
    
    # Send to all dispatchers and admins immediately
    send_push_notification(org_id, ["dispatcher", "admin"], notification_data)
    
    # Also send SMS/phone call alerts
    send_emergency_sms(org_id, user_id, emergency_type, location)
  end

  # Register device for push notifications
  def register_device(user_id, org_id, device_attrs) do
    attrs = Map.merge(device_attrs, %{
      user_id: user_id,
      org_id: org_id,
      push_enabled: true,
      registered_at: DateTime.utc_now()
    })
    
    case Device.create_or_update(attrs) do
      {:ok, device} ->
        Logger.info("Device registered for push notifications: #{device.id}")
        {:ok, device}
      
      {:error, reason} ->
        Logger.error("Failed to register device: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Unregister device
  def unregister_device(device_token, user_id) do
    case Device.get_by_token(device_token, user_id) do
      {:ok, device} ->
        Device.update(device, %{push_enabled: false})
        {:ok, :unregistered}
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  # Test notification for debugging
  def send_test_notification(org_id, user_id) do
    notification_data = %{
      title: "Test Notification",
      body: "This is a test notification from LogiChat",
      type: "test",
      data: %{
        test: true,
        timestamp: DateTime.utc_now()
      }
    }
    
    send_push_notification(org_id, user_id, notification_data)
  end

  # Private helper functions

  defp send_to_device(device, notification_data) do
    case device.platform do
      "ios" -> send_apns_notification(device, notification_data)
      "android" -> send_fcm_notification(device, notification_data)
      "web" -> send_web_push_notification(device, notification_data)
      _ -> Logger.warn("Unknown device platform: #{device.platform}")
    end
  end

  defp send_fcm_notification(device, notification_data) do
    headers = [
      {"Authorization", "key=#{get_fcm_server_key()}"},
      {"Content-Type", "application/json"}
    ]
    
    payload = %{
      to: device.token,
      notification: %{
        title: notification_data.title,
        body: notification_data.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        click_action: determine_click_action(notification_data),
        tag: notification_data.type
      },
      data: notification_data.data || %{},
      priority: if(notification_data[:urgent], do: "high", else: "normal"),
      time_to_live: 86400, # 24 hours
      collapse_key: notification_data.type
    }
    
    case HTTPoison.post(@fcm_url, Jason.encode!(payload), headers) do
      {:ok, %HTTPoison.Response{status_code: 200}} ->
        Logger.info("FCM notification sent successfully")
        {:ok, :sent}
      
      {:ok, %HTTPoison.Response{status_code: status, body: body}} ->
        Logger.error("FCM notification failed: #{status} - #{body}")
        {:error, {:fcm_error, status, body}}
      
      {:error, reason} ->
        Logger.error("FCM notification request failed: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp send_apns_notification(device, notification_data) do
    # Implement APNS notification sending
    # This would use a library like :pigeon or direct HTTP/2 requests
    Logger.info("APNS notification not implemented yet")
    {:ok, :not_implemented}
  end

  defp send_web_push_notification(device, notification_data) do
    # Implement Web Push notification
    # This would use the WebPush protocol
    Logger.info("Web Push notification not implemented yet")
    {:ok, :not_implemented}
  end

  defp store_notification(org_id, user_id, notification_data) do
    attrs = %{
      org_id: org_id,
      user_id: user_id,
      title: notification_data.title,
      message: notification_data.body,
      type: notification_data.type,
      data: notification_data.data || %{},
      urgent: notification_data[:urgent] || false,
      read: false,
      sent_at: DateTime.utc_now()
    }
    
    Notification.create(attrs)
  end

  defp format_geofence_title("enter"), do: "Driver Arrived"
  defp format_geofence_title("exit"), do: "Driver Departed"
  defp format_geofence_title(_), do: "Location Update"

  defp format_geofence_body("enter", trip_id), do: "Driver has arrived at location for trip #{trip_id}"
  defp format_geofence_body("exit", trip_id), do: "Driver has left location for trip #{trip_id}"
  defp format_geofence_body(_, trip_id), do: "Location update for trip #{trip_id}"

  defp format_document_title("requires_signature"), do: "Signature Required"
  defp format_document_title("signed"), do: "Document Signed"
  defp format_document_title("uploaded"), do: "New Document"
  defp format_document_title(_), do: "Document Update"

  defp format_document_body("requires_signature", doc_id), do: "Document #{doc_id} requires your signature"
  defp format_document_body("signed", doc_id), do: "Document #{doc_id} has been signed"
  defp format_document_body("uploaded", doc_id), do: "New document #{doc_id} uploaded"
  defp format_document_body(_, doc_id), do: "Document #{doc_id} updated"

  defp format_emergency_body("panic"), do: "Driver activated panic button"
  defp format_emergency_body("accident"), do: "Driver reported an accident"
  defp format_emergency_body("breakdown"), do: "Vehicle breakdown reported"
  defp format_emergency_body("medical"), do: "Medical emergency reported"
  defp format_emergency_body(_), do: "Emergency situation reported"

  defp determine_click_action(notification_data) do
    case notification_data.type do
      "trip_assignment" -> "/trips/#{notification_data.trip_id}"
      "checkin" -> "/trips/#{notification_data.trip_id}"
      "document" -> "/documents/#{notification_data.document_id}"
      "geofence_event" -> "/trips/#{notification_data.trip_id}"
      "emergency" -> "/emergency/#{notification_data.data.user_id}"
      _ -> "/"
    end
  end

  defp send_emergency_sms(org_id, user_id, emergency_type, location) do
    # Implement SMS sending for emergency situations
    # This would integrate with Twilio or similar service
    Task.start(fn ->
      Logger.info("Emergency SMS would be sent: #{emergency_type} for user #{user_id}")
      # TruckingPlatform.SMS.send_emergency_alert(org_id, user_id, emergency_type, location)
    end)
  end

  defp get_fcm_server_key do
    Application.get_env(:trucking_platform, :fcm_server_key) ||
      System.get_env("FCM_SERVER_KEY") ||
      raise "FCM_SERVER_KEY not configured"
  end
end
