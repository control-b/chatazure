defmodule TruckingPlatformWeb.CheckInController do
  use TruckingPlatformWeb, :controller
  alias TruckingPlatform.Storage.CheckIn

  def create(conn, params) do
  with {:ok, attrs} <- validate(params),
         {:ok, checkin} <- CheckIn.create(attrs) do
      # TODO: Broadcast to trip room, dispatcher, shipper
      # TODO: Publish webhook
      json(conn, mask_phone(checkin))
    else
      {:error, reason} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(400, Jason.encode!(%{error: inspect(reason)}))
    end
  end

  def index(conn, %{"tripId" => trip_id}) do
    case CheckIn.list_by_trip(trip_id) do
      {:ok, checkins} -> json(conn, Enum.map(checkins, &mask_phone/1))
      {:error, reason} -> send_resp(conn, 500, Jason.encode!(%{error: inspect(reason)}))
    end
  end

  defp validate(params) do
    # Required: orgId, tripId, driverId, driverName, phone, poNumber, vehicle, facility
    required = ~w(orgId tripId driverId driverName phone poNumber vehicle facility)a
    missing = Enum.filter(required, fn key ->
      !(Map.has_key?(params, key) or Map.has_key?(params, Atom.to_string(key)))
    end)
    if missing != [], do: {:error, {:missing, missing}}, else: normalize(params)
  end

  defp normalize(params) do
    # allow string or atom keys
    phone = normalize_phone(params["phone"] || params[:phone])
    if phone == nil, do: {:error, :invalid_phone}, else:
      {:ok,
        params
        |> stringify_keys()
        |> Map.put("phone", phone)
      }
  end

  defp normalize_phone(phone) do
    # E.164 normalization (simple)
    phone = to_string(phone)
    case Regex.run(~r/^\+\d{10,15}$/, phone) do
      nil -> nil
      _ -> phone
    end
  end

  defp mask_phone(checkin) do
    phone = checkin["phone"] || checkin[:phone]
    masked = if phone, do: String.replace(phone, ~r/(\+\d{2})(\d{3})(\d{3})(\d+)/, "\\1-\\2-***-\\4"), else: nil
    Map.put(checkin, "phone", masked)
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {k, v} ->
      key = if is_atom(k), do: Atom.to_string(k), else: k
      {key, (if is_map(v), do: stringify_keys(v), else: v)}
    end)
  end
end
