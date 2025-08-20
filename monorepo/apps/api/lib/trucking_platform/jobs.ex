defmodule TruckingPlatform.Jobs do
  @moduledoc """
  Background job processor using Oban for 20M+ DAU scale.
  Handles webhook delivery, email notifications, data export, and cleanup jobs.
  """
  
  use Oban.Worker,
    queue: :default,
    max_attempts: 3,
    unique: [period: 300]
  
  require Logger
  
  # Job types
  @webhook_delivery "webhook_delivery"
  @email_notification "email_notification" 
  @check_in_broadcast "check_in_broadcast"
  @room_cleanup "room_cleanup"
  @user_export "user_export"
  @metrics_aggregation "metrics_aggregation"
  
  # Client API
  
  def deliver_webhook(payload, webhook_url, tenant_id) do
    %{
      type: @webhook_delivery,
      payload: payload,
      webhook_url: webhook_url,
      tenant_id: tenant_id
    }
    |> new(queue: :webhooks, max_attempts: 5)
    |> Oban.insert()
  end
  
  def send_notification(user_id, type, data) do
    %{
      type: @email_notification,
      user_id: user_id,
      notification_type: type,
      data: data
    }
    |> new(queue: :notifications)
    |> Oban.insert()
  end
  
  def broadcast_check_in(check_in_data) do
    %{
      type: @check_in_broadcast,
      check_in: check_in_data
    }
    |> new(queue: :broadcasts, max_attempts: 1)
    |> Oban.insert()
  end
  
  def schedule_room_cleanup(room_id, after_minutes \\ 60) do
    %{
      type: @room_cleanup,
      room_id: room_id
    }
    |> new(
      queue: :cleanup,
      schedule_in: {after_minutes, :minute},
      unique: [fields: [:type, :room_id], period: 3600]
    )
    |> Oban.insert()
  end
  
  def export_user_data(user_id, export_type) do
    %{
      type: @user_export,
      user_id: user_id,
      export_type: export_type
    }
    |> new(queue: :exports, max_attempts: 1)
    |> Oban.insert()
  end
  
  def schedule_metrics_aggregation do
    %{
      type: @metrics_aggregation
    }
    |> new(
      queue: :metrics,
      schedule_in: {5, :minute},
      unique: [fields: [:type], period: 300]
    )
    |> Oban.insert()
  end
  
  # Worker implementation
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"type" => @webhook_delivery} = args}) do
    case HTTPoison.post(
      args["webhook_url"],
      Jason.encode!(args["payload"]),
      [
        {"Content-Type", "application/json"},
        {"X-Tenant-ID", args["tenant_id"]},
        {"X-Webhook-Signature", generate_signature(args["payload"], args["tenant_id"])}
      ],
      timeout: 30_000,
      recv_timeout: 30_000
    ) do
      {:ok, %{status_code: code}} when code in 200..299 ->
        Logger.info("Webhook delivered successfully to #{args["webhook_url"]}")
        :ok
        
      {:ok, %{status_code: code}} ->
        Logger.warn("Webhook failed with status #{code}: #{args["webhook_url"]}")
        {:error, "HTTP #{code}"}
        
      {:error, reason} ->
        Logger.error("Webhook delivery failed: #{inspect(reason)}")
        {:error, reason}
    end
  end
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"type" => @email_notification} = args}) do
    case send_user_notification(args["user_id"], args["notification_type"], args["data"]) do
      :ok ->
        Logger.info("Notification sent to user #{args["user_id"]}")
        :ok
        
      {:error, reason} ->
        Logger.error("Failed to send notification: #{inspect(reason)}")
        {:error, reason}
    end
  end
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"type" => @check_in_broadcast} = args}) do
    check_in = args["check_in"]
    
    # Broadcast to room subscribers
    TruckingPlatformWeb.Endpoint.broadcast(
      "room:#{check_in["room_id"]}",
      "check_in",
      %{
        type: "check_in",
        user_id: check_in["user_id"],
        location: check_in["location"],
        timestamp: check_in["timestamp"],
        status: check_in["status"]
      }
    )
    
    # Update room last activity
    TruckingPlatform.Cache.invalidate_room(check_in["room_id"])
    
    Logger.info("Check-in broadcasted for room #{check_in["room_id"]}")
    :ok
  end
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"type" => @room_cleanup} = args}) do
    room_id = args["room_id"]
    
    # Check if room is still active
    case TruckingPlatform.Storage.Room.get(room_id) do
      {:ok, room} ->
        # Only cleanup if no recent activity
        last_activity = DateTime.from_iso8601(room["last_activity_at"])
        cutoff = DateTime.utc_now() |> DateTime.add(-3600, :second) # 1 hour ago
        
        case last_activity do
          {:ok, activity_time, _} when activity_time < cutoff ->
            cleanup_inactive_room(room_id)
            
          _ ->
            Logger.info("Room #{room_id} still active, skipping cleanup")
            :ok
        end
        
      {:error, _} ->
        Logger.info("Room #{room_id} not found, already cleaned up")
        :ok
    end
  end
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"type" => @user_export} = args}) do
    case export_user_data_to_blob(args["user_id"], args["export_type"]) do
      {:ok, download_url} ->
        # Send notification with download link
        send_notification(args["user_id"], "data_export_ready", %{
          export_type: args["export_type"],
          download_url: download_url,
          expires_at: DateTime.utc_now() |> DateTime.add(24 * 3600, :second)
        })
        
      {:error, reason} ->
        Logger.error("User data export failed: #{inspect(reason)}")
        {:error, reason}
    end
  end
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"type" => @metrics_aggregation}}) do
    try do
      # Aggregate metrics for the last 5 minutes
      end_time = DateTime.utc_now()
      start_time = DateTime.add(end_time, -300, :second)
      
      metrics = %{
        active_connections: count_active_connections(),
        messages_sent: count_messages_in_period(start_time, end_time),
        check_ins_received: count_check_ins_in_period(start_time, end_time),
        rooms_active: count_active_rooms(),
        timestamp: end_time
      }
      
      # Store in time series database or send to monitoring
      store_metrics(metrics)
      
      Logger.info("Metrics aggregated: #{inspect(metrics)}")
      :ok
      
    rescue
      e ->
        Logger.error("Metrics aggregation failed: #{inspect(e)}")
        {:error, e}
    end
  end
  
  # Private helpers
  
  defp generate_signature(payload, tenant_id) do
    secret = System.get_env("WEBHOOK_SECRET", "default_secret")
    data = Jason.encode!(payload) <> tenant_id
    :crypto.mac(:hmac, :sha256, secret, data) |> Base.encode16()
  end
  
  defp send_user_notification(user_id, type, data) do
    # Implementation for email/SMS notifications
    Logger.info("Sending #{type} notification to user #{user_id}: #{inspect(data)}")
    :ok
  end
  
  defp cleanup_inactive_room(room_id) do
    # Archive old messages
    TruckingPlatform.Storage.Message.archive_room_messages(room_id)
    
    # Clear cache
    TruckingPlatform.Cache.invalidate_room(room_id)
    
    # Update room status
    TruckingPlatform.Storage.Room.mark_inactive(room_id)
    
    Logger.info("Cleaned up inactive room #{room_id}")
  end
  
  defp export_user_data_to_blob(user_id, export_type) do
    # Gather user data
    data = gather_user_export_data(user_id, export_type)
    
    # Upload to blob storage
    filename = "user_export_#{user_id}_#{export_type}_#{DateTime.utc_now() |> DateTime.to_unix()}.json"
    blob_data = Jason.encode!(data, pretty: true)
    
    case TruckingPlatform.Storage.Blob.upload(filename, blob_data, "application/json") do
      {:ok, blob_url} ->
        {:ok, blob_url}
        
      error ->
        error
    end
  end
  
  defp gather_user_export_data(user_id, "messages") do
    # Export user's messages
    %{
      user_id: user_id,
      export_type: "messages",
      exported_at: DateTime.utc_now(),
      data: TruckingPlatform.Storage.Message.list_by_user(user_id)
    }
  end
  
  defp gather_user_export_data(user_id, "check_ins") do
    # Export user's check-ins
    %{
      user_id: user_id,
      export_type: "check_ins", 
      exported_at: DateTime.utc_now(),
      data: TruckingPlatform.Storage.CheckIn.list_by_user(user_id)
    }
  end
  
  defp count_active_connections do
    # Count WebSocket connections across cluster
    Phoenix.PubSub.node_name(TruckingPlatformWeb.PubSub)
    |> :pg.which_groups()
    |> Enum.reduce(0, fn group, acc ->
      case String.starts_with?(to_string(group), "room:") do
        true -> acc + length(:pg.get_members(TruckingPlatformWeb.PubSub, group))
        false -> acc
      end
    end)
  end
  
  defp count_messages_in_period(start_time, end_time) do
    # This would query the message storage for count
    0
  end
  
  defp count_check_ins_in_period(start_time, end_time) do
    # This would query the check-in storage for count
    0
  end
  
  defp count_active_rooms do
    # Count rooms with recent activity
    0
  end
  
  defp store_metrics(metrics) do
    # Store in time series database or send to monitoring service
    Logger.info("Storing metrics: #{inspect(metrics)}")
  end
end
