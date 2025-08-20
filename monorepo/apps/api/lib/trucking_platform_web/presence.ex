defmodule TruckingPlatformWeb.Presence do
  @moduledoc """
  Provides presence tracking to processes and channels.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :trucking_platform,
    pubsub_server: TruckingPlatform.PubSub

  def fetch(_topic, entries) do
    # Fetch user details for presence; handle string IDs gracefully
    user_ids = entries |> Map.keys()
    users_by_id =
      TruckingPlatform.Storage.User.get_by_ids(user_ids)
      |> Enum.into(%{}, fn u -> {to_string(u.id), u} end)

    for {key, %{metas: [meta | _]}} <- entries, into: %{} do
      user = Map.get(users_by_id, key, %{id: key, name: "User #{key}", email: nil, role: "user", avatar_url: nil})

      {key, %{
        user: %{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        },
        online_at: meta.online_at,
        room_id: meta.room_id
      }}
    end
  end
end
