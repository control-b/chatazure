defmodule TruckingPlatform.RateLimit do
  @moduledoc """
  Lightweight wrapper over Hammer for rate limiting. Provides check_rate/3.
  """
  def check_rate(bucket, limit, period_ms) do
    case Hammer.check_rate(bucket, period_ms, limit) do
      {:allow, _count} -> :ok
      {:deny, _limit} -> {:error, :rate_limited}
    end
  end

  defmodule RateLimitSupervisor do
    use Supervisor
    @impl true
    def start_link(args), do: Supervisor.start_link(__MODULE__, args, name: __MODULE__)

    @impl true
    def init(_args) do
      children = [
        {Hammer.Backend.ETS, [expiry_ms: 60_000 * 60 * 4, cleanup_interval_ms: 60_000 * 10]}
      ]
      Supervisor.init(children, strategy: :one_for_one)
    end
  end
end
