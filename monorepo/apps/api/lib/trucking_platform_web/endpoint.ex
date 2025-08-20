defmodule TruckingPlatformWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :trucking_platform

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_trucking_platform_key",
    signing_salt: "trucking_platform",
    same_site: "Lax"
  ]

  socket "/socket", TruckingPlatformWeb.UserSocket,
    websocket: [
      timeout: 45_000,
      transport_log: false,
      check_origin: false
    ],
    longpoll: false

  socket "/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]]

  # Serve at "/" the static files from "priv/static" directory.
  plug Plug.Static,
    at: "/",
    from: :trucking_platform,
    gzip: false,
    only_matching: TruckingPlatformWeb.static_paths()

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  # Note: No Phoenix.Ecto.CheckRepoStatus plug since this app does not use Ecto
  end

  plug Phoenix.LiveDashboard.RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options

  # CORS configuration for Azure Front Door
  plug CORSPlug,
    origin: [
      "https://localhost:3000",
      ~r/https:\/\/.*\.azurecontainerapps\.io$/,
      ~r/https:\/\/.*\.azurefd\.net$/
    ],
    credentials: true,
    max_age: 86400

  # Handle proxy headers from Azure Front Door
  # plug RemoteIp,
  #   headers: ["x-forwarded-for", "x-real-ip", "x-azure-clientip"],
  #   proxies: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]

  plug TruckingPlatformWeb.Router
end
