defmodule TruckingPlatformWeb.ChannelCase do
  @moduledoc """
  This module defines the test case to be used by
  channel tests.

  Such tests rely on `Phoenix.ChannelTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  we enable the SQL sandbox, so changes done to the database
  during each test are rolled back at the end of the test.
  If you are using PostgreSQL, you can even run database
  tests asynchronously by setting `use TruckingPlatformWeb.ChannelCase,
  async: true`, although this option is not recommended for other
  databases.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # Import conveniences for testing with channels
      import Phoenix.ChannelTest
      import TruckingPlatformWeb.ChannelCase

      # The default endpoint for testing
      @endpoint TruckingPlatformWeb.Endpoint
    end
  end

  setup tags do
  # No database sandbox; ensure endpoint is started for channel tests
    seed_general_room()
    :ok
  end

  defp seed_general_room do
    # Put a general room into the stubbed Cosmos so joins work
    case TruckingPlatform.Storage.Room.create(%{
           id: "general",
           org_id: "org_456",
           name: "General",
           type: "general",
           members: [],
           created_by: "system"
         }) do
      {:ok, _} -> :ok
      {:error, %{"code" => "Conflict"}} -> :ok
      other -> other
    end

    # Seed a private room in org_456 to test unauthorized access from a different org
    case TruckingPlatform.Storage.Room.create(%{
           id: "private_room",
           org_id: "org_456",
           name: "Private",
           type: "private",
           members: ["user_123"],
           created_by: "system"
         }) do
      {:ok, _} -> :ok
      {:error, %{"code" => "Conflict"}} -> :ok
      other -> other
    end
  end
end
