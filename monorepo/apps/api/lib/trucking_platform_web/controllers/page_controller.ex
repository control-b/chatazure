defmodule TruckingPlatformWeb.PageController do
  use TruckingPlatformWeb, :controller

  def home(conn, _params) do
  render(conn, "home.html")
  end
end
