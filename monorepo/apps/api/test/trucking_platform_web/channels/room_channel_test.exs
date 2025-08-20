defmodule TruckingPlatformWeb.RoomChannelTest do
  use TruckingPlatformWeb.ChannelCase

  setup do
    {:ok, _, socket} =
      TruckingPlatformWeb.UserSocket
      |> socket("user_123", %{user_id: "user_123", org_id: "org_456"})
      |> subscribe_and_join(TruckingPlatformWeb.RoomChannel, "room:general")

    %{socket: socket}
  end

  test "ping replies with status ok", %{socket: socket} do
    ref = push(socket, "ping", %{"hello" => "there"})
    assert_reply ref, :ok, %{"hello" => "there"}
  end

  test "new_message broadcasts to room:general", %{socket: socket} do
    push(socket, "new_message", %{"content" => "Hello world"})
    assert_broadcast "new_message", %{content: "Hello world"}
  end

  test "typing indicator broadcasts typing status", %{socket: socket} do
    push(socket, "typing", %{"typing" => true})
    assert_broadcast "user_typing", %{user_id: "user_123", typing: true}
  end

  test "message with empty content is rejected", %{socket: socket} do
    ref = push(socket, "new_message", %{"content" => ""})
    assert_reply ref, :error, %{reason: "empty_content"}
  end

  test "file upload message includes metadata", %{socket: socket} do
    message = %{
      "content" => "Shared a file",
      "type" => "file",
      "file_url" => "https://example.com/file.pdf",
      "file_name" => "document.pdf",
      "file_size" => 1024
    }
    
    push(socket, "new_message", message)
    assert_broadcast "new_message", ^message
  end

  test "unauthorized user cannot join private room" do
    assert {:error, %{reason: "unauthorized"}} =
      TruckingPlatformWeb.UserSocket
      |> socket("user_789", %{user_id: "user_789", org_id: "different_org"})
      |> subscribe_and_join(TruckingPlatformWeb.RoomChannel, "room:private_room")
  end

  test "message history is sent on join", %{socket: socket} do
    # This would test that recent messages are sent when joining
    # Implementation depends on your message storage logic
    assert_push "message_history", %{messages: messages}
    assert is_list(messages)
  end
end
