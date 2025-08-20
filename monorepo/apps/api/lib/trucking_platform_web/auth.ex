defmodule TruckingPlatformWeb.Auth do
  @moduledoc false
  defmodule EnsureAuth do
    import Plug.Conn
    def init(opts), do: opts
    def call(conn, _opts) do
      # In production this would validate bearer JWT etc.; in tests, allow if user assigned
      if conn.assigns[:user_id], do: conn, else: conn |> send_resp(401, "unauthenticated") |> halt()
    end
  end

  defmodule Pipeline do
    import Plug.Conn
    def init(opts), do: opts
    def call(conn, _opts) do
      # For dev/tests, optionally look for x-user-id/x-org-id headers
      user = get_req_header(conn, "x-user-id") |> List.first()
      org = get_req_header(conn, "x-org-id") |> List.first()
      conn
      |> assign(:user_id, user)
      |> assign(:org_id, org)
    end
  end
end
