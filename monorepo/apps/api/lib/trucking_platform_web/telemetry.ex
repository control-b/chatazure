defmodule TruckingPlatformWeb.Telemetry do
  use Supervisor
  @moduledoc """
  Minimal stub for Telemetry supervisor. Replace with real metrics setup.
  """
  def start_link(_arg), do: Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  def init(_arg), do: Supervisor.init([], strategy: :one_for_one)
end
