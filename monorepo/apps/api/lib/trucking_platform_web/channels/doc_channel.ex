defmodule TruckingPlatformWeb.DocChannel do
  use TruckingPlatformWeb, :channel

  @impl true
  def join("doc:" <> _id, _payload, socket), do: {:ok, socket}
end
