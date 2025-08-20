defmodule TruckingPlatformWeb.UserSocket do
  use Phoenix.Socket

  # Define channels
  channel "room:*", TruckingPlatformWeb.RoomChannel
  channel "presence:*", TruckingPlatformWeb.PresenceChannel
  channel "geo:*", TruckingPlatformWeb.GeoChannel
  channel "doc:*", TruckingPlatformWeb.DocChannel

  # Socket params are passed from the client and can
  # be used to verify and authenticate a user.
  @impl true
  def connect(%{"token" => token} = _params, socket, _connect_info) do
    # Dev convenience: accept a special token to allow local testing without Azure
    if Mix.env() == :dev and token == "dev" do
      socket =
        socket
        |> assign(:user_id, "dev-user")
        |> assign(:org_id, "dev-org")
        |> assign(:token, token)

      {:ok, socket}
    else
      case TruckingPlatform.Auth.verify_token(token) do
        {:ok, user_id, org_id} ->
          socket =
            socket
            |> assign(:user_id, user_id)
            |> assign(:org_id, org_id)
            |> assign(:token, token)

          {:ok, socket}

        {:error, _reason} ->
          :error
      end
    end
  end

  @impl true
  def connect(_params, socket, _connect_info) do
    # Optional dev-mode anonymous connect if enabled via config
    if Mix.env() == :dev and Application.get_env(:trucking_platform, :dev_allow_anonymous_socket, false) do
      socket =
        socket
        |> assign(:user_id, "anon-dev")
        |> assign(:org_id, "dev-org")
        |> assign(:token, "anon")
      {:ok, socket}
    else
      :error
    end
  end

  # Socket ID for identifying connections
  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"
end
