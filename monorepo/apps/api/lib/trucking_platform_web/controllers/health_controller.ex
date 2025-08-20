defmodule TruckingPlatformWeb.HealthController do
  use TruckingPlatformWeb, :controller

  def check(conn, _params) do
    json(conn, %{
      status: "ok",
      service: "trucking_platform_api",
      time: DateTime.utc_now()
    })
  end
end
