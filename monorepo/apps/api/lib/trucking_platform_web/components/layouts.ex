defmodule TruckingPlatformWeb.Layouts do
  use Phoenix.Component
  use Phoenix.VerifiedRoutes,
    endpoint: TruckingPlatformWeb.Endpoint,
    router: TruckingPlatformWeb.Router,
    statics: TruckingPlatformWeb.static_paths()

  embed_templates "../templates/layout/*"
end
