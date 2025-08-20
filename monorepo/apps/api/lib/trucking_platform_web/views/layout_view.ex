defmodule TruckingPlatformWeb.LayoutView do
  use TruckingPlatformWeb, :view
  use Phoenix.VerifiedRoutes,
    endpoint: TruckingPlatformWeb.Endpoint,
    router: TruckingPlatformWeb.Router,
    statics: TruckingPlatformWeb.static_paths()
end
