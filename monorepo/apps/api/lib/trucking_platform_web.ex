defmodule TruckingPlatformWeb do
  def static_paths, do: ["assets", "fonts", "images", "favicon.ico", "robots.txt"]
  def controller do
    quote do
      use Phoenix.Controller, namespace: TruckingPlatformWeb
      import Plug.Conn
      import TruckingPlatformWeb.Router.Helpers
      import TruckingPlatformWeb.Gettext
    end
  end

  def channel do
    quote do
      use Phoenix.Channel
      import TruckingPlatformWeb.Gettext
    end
  end

  def router do
    quote do
      use Phoenix.Router
    end
  end

  def view do
    quote do
      use Phoenix.View, root: "lib/trucking_platform_web/templates", namespace: TruckingPlatformWeb
      import Phoenix.Controller, only: [get_flash: 1, get_flash: 2, view_module: 1]
      import TruckingPlatformWeb.Router.Helpers
      import TruckingPlatformWeb.Gettext
    end
  end

  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
