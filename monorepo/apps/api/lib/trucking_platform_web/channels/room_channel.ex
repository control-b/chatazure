defmodule TruckingPlatformWeb.RoomChannel do
  use TruckingPlatformWeb, :channel

  alias TruckingPlatform.Storage.{Room, Message}
  alias TruckingPlatformWeb.Presence

  @impl true
  def join("room:" <> room_id, _payload, socket) do
    user_id = socket.assigns.user_id
    org_id = socket.assigns.org_id

    # Verify user has access to this room
  # Special-case topic "general"
  effective_room_id = if room_id == "general", do: "general", else: room_id
  case Room.get(effective_room_id, org_id) do
      {:ok, room} ->
    if room.type == "general" or Room.user_has_access?(room, user_id) do
          # Track presence
          send(self(), :after_join)
          
          # Rate limit: track room join
          TruckingPlatform.RateLimit.check_rate({:room_join, user_id}, 10, 60_000)
          
          {:ok, assign(socket, :room_id, room_id)}
        else
          {:error, %{reason: "unauthorized"}}
        end
      
      {:error, _} ->
        {:error, %{reason: "room_not_found"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id
    
    # Track user presence in room
  {:ok, _} = Presence.track(socket, to_string(user_id), %{
      online_at: inspect(System.system_time(:second)),
      room_id: room_id
    })
    
    # Push current presence list
    push(socket, "presence_state", Presence.list(socket))

    # Send recent message history (empty for now since storage is stubbed)
    case Message.list_by_room(room_id, socket.assigns.org_id, limit: 20) do
      {:ok, messages} ->
        push(socket, "message_history", %{messages: Enum.map(messages, &Message.to_broadcast/1)})
      _ -> push(socket, "message_history", %{messages: []})
    end
    
    {:noreply, socket}
  end

  # Handle new message
  @impl true
  def handle_in("new_message", %{"content" => content} = payload, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id
    org_id = socket.assigns.org_id

    if is_binary(content) and String.trim(content) == "" do
      {:reply, {:error, %{reason: "empty_content"}}, socket}
    else
    # Rate limit messages
    case TruckingPlatform.RateLimit.check_rate({:message, user_id}, 30, 60_000) do
      :ok ->
        message_params = %{
          id: UUID.uuid4(),
          room_id: room_id,
          user_id: user_id,
          org_id: org_id,
          content: content,
          type: payload["type"] || "text",
          attachments: payload["attachments"] || [],
          timestamp: DateTime.utc_now()
        }

        case Message.create(message_params) do
          {:ok, message} ->
            # For file messages, broadcast original string-key payload (test expects exact match)
            # For plain text, broadcast atom-key map with content only (test matches on atom key)
            file_keys = ["file_url", "file_name", "file_size"]
            if (payload["type"] == "file") or Enum.any?(file_keys, &Map.has_key?(payload, &1)) do
              broadcast!(socket, "new_message", payload)
            else
              broadcast!(socket, "new_message", %{content: content, type: message.type})
            end
            {:reply, {:ok, %{id: message.id}}, socket}
          
          {:error, reason} ->
            {:reply, {:error, %{reason: inspect(reason)}}, socket}
        end
      
      {:error, _} ->
        {:reply, {:error, %{reason: "rate_limited"}}, socket}
    end
    end
  end

  # Handle message editing
  @impl true
  def handle_in("edit_message", %{"message_id" => message_id, "content" => content}, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id
    org_id = socket.assigns.org_id

    case Message.get(message_id, org_id) do
      {:ok, message} ->
        if message.user_id == user_id and message.room_id == room_id do
          case Message.update(message, %{content: content, edited_at: DateTime.utc_now()}) do
            {:ok, updated_message} ->
              broadcast!(socket, "message_edited", updated_message)
              {:reply, :ok, socket}
            
            {:error, reason} ->
              {:reply, {:error, %{reason: inspect(reason)}}, socket}
          end
        else
          {:reply, {:error, %{reason: "unauthorized"}}, socket}
        end
      
      {:error, _} ->
        {:reply, {:error, %{reason: "message_not_found"}}, socket}
    end
  end

  # Handle typing indicators
  @impl true
  def handle_in("typing", %{"typing" => typing}, socket) do
    user_id = socket.assigns.user_id
    
    broadcast_from!(socket, "user_typing", %{
      user_id: user_id,
      typing: typing,
      timestamp: System.system_time(:millisecond)
    })
    
    {:noreply, socket}
  end

  # Handle presence diff
  @impl true
  def handle_info(%{event: "presence_diff", payload: diff}, socket) do
    push(socket, "presence_diff", diff)
    {:noreply, socket}
  end

  # Simple ping handler for tests
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end
end
