defmodule TruckingPlatformWeb.PresenceChannel do
  use TruckingPlatformWeb, :channel

  alias TruckingPlatformWeb.Presence

  @impl true
  def join("presence:" <> _topic, _payload, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} = Presence.track(socket, socket.assigns.user_id, %{online_at: System.system_time(:second)})
    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end
end
