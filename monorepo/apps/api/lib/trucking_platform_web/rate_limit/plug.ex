defmodule TruckingPlatformWeb.RateLimit.Plug do
  @moduledoc """
  Simple API rate-limiting plug using TruckingPlatform.RateLimit.
  Limits each IP to 120 requests per minute by default.
  """
  import Plug.Conn

  @limit 120
  @period_ms 60_000

  def init(opts), do: opts

  def call(conn, _opts) do
    bucket = {:ip, conn.remote_ip}
    case TruckingPlatform.RateLimit.check_rate(bucket, @limit, @period_ms) do
      :ok -> conn
      {:error, :rate_limited} ->
        conn
        |> send_resp(429, "rate_limited")
        |> halt()
    end
  end
end
