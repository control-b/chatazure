defmodule TruckingPlatformWeb.Router do
  use TruckingPlatformWeb, :router
  import Phoenix.LiveView.Router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
  plug :fetch_live_flash
  plug :put_layout, {TruckingPlatformWeb.LayoutView, :app}
    plug :put_root_layout, {TruckingPlatformWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug Plug.Parsers,
      parsers: [:urlencoded, :multipart, :json],
      pass: ["*/*"],
      json_decoder: Jason
    plug TruckingPlatformWeb.Auth.Pipeline
    plug TruckingPlatformWeb.RateLimit.Plug
  end

  pipeline :auth_required do
    plug TruckingPlatformWeb.Auth.EnsureAuth
  end

  scope "/api", TruckingPlatformWeb do
    pipe_through :api

    # Health checks for production deployment
    get "/health", HealthController, :check
    get "/health/detailed", HealthController, :health
    get "/ready", HealthController, :ready
    get "/live", HealthController, :live

    # Authentication
    post "/auth/token", AuthController, :token
    post "/auth/refresh", AuthController, :refresh

    # Protected routes
    scope "/" do
      pipe_through :auth_required

      # Upload and SAS token generation
      post "/uploads/sas", UploadController, :generate_sas
      post "/uploads/complete", UploadController, :complete

      # Organizations
      resources "/orgs", OrgController, except: [:new, :edit] do
        # Rooms within organization
        resources "/rooms", RoomController, except: [:new, :edit] do
          # Messages within room
          resources "/messages", MessageController, except: [:new, :edit, :show]
          
          # Room members
          get "/members", RoomController, :members
          post "/members", RoomController, :add_member
          delete "/members/:user_id", RoomController, :remove_member
        end

        # Users within organization
        resources "/users", UserController, except: [:new, :edit]
        
        # Geofences within organization
        resources "/geofences", GeofenceController, except: [:new, :edit]
      end

      # Documents
      resources "/docs", DocController, except: [:new, :edit] do
        post "/sign", DocController, :sign
        get "/download", DocController, :download
      end

  # Geo events (trip audit)
  get "/trips/:tripId/geoevents", GeoEventController, :index

  # Check-ins
  post "/checkins", CheckInController, :create
  get "/trips/:tripId/checkins", CheckInController, :index

      # User profile
      get "/profile", UserController, :profile
      put "/profile", UserController, :update_profile
    end
  end

  # Minimal landing page to verify Tailwind & Phoenix rendering
  scope "/", TruckingPlatformWeb do
    pipe_through :browser
    get "/", PageController, :home
  end

  # Phoenix LiveDashboard
  if Application.compile_env(:trucking_platform, :dev_routes) do
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]
      live_dashboard "/dashboard", metrics: TruckingPlatformWeb.Telemetry
    end
  end
end
