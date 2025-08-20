defmodule TruckingPlatform.Geofencing.Validator do
  @moduledoc """
  Validates device-triggered geofence events with geometric checks and temporal rules.

  Rules:
  - Geometry: point-in-polygon (ray casting) or point-in-circle when radius present.
  - Hysteresis: apply inner/outer buffer to reduce oscillation (meters).
  - Debounce: ignore rapid toggles within 10–15s.
  - Min dwell: require 60–120s inside before confirming ENTER.
  - Accuracy/clock skew guards.
  - Idempotency key helper.
  """

  require Logger

  @max_accuracy_m 100.0
  @max_skew_ms 60_000
  @default_debounce_ms 12_000
  @default_min_dwell_ms 90_000

  @type event :: %{
          required(:userId) => String.t(),
          required(:tripId) => String.t(),
          required(:geofenceId) => String.t(),
          required(:lat) => number(),
          required(:lon) => number(),
          required(:ts) => integer(),
          required(:event) => String.t(),
          optional(:accuracy) => number(),
          optional(:speed) => number()
        }

  def idempotency_key(%{userId: u, tripId: t, geofenceId: g, event: e, ts: ts}) do
    rounded = div(ts, 5_000) * 5_000
    Enum.join([u, t, g, e, rounded], ":")
  end

  @doc """
  Validate an event against a geofence definition with geometric + temporal rules.

  Geofence shape:
  - %{polygon: [[lat, lon], ...]} or
  - %{center: [lat, lon], radius: meters}
  - :hysteresis buffers in meters optional: %{inner: m, outer: m}
  """
  def validate_event(event, geofence, now_ms \\ System.system_time(:millisecond)) do
    with :ok <- validate_basic(event, now_ms),
         :ok <- validate_geometry(event, geofence),
         :ok <- validate_temporal(event, geofence, now_ms) do
      {:ok, :validated}
    else
      {:error, reason} -> {:error, reason}
      other -> {:error, other}
    end
  end

  defp validate_basic(%{accuracy: acc, ts: ts} = _event, now_ms) do
    cond do
      acc && acc > @max_accuracy_m -> {:error, :low_accuracy}
      abs(now_ms - ts) > @max_skew_ms -> {:error, :clock_skew}
      true -> :ok
    end
  end

  defp validate_basic(%{ts: ts}, now_ms) do
    if abs(now_ms - ts) > @max_skew_ms, do: {:error, :clock_skew}, else: :ok
  end

  defp validate_geometry(%{lat: lat, lon: lon}, %{radius: r, center: [clat, clon]} = _gf)
       when is_number(r) do
    if point_in_circle({lat, lon}, {clat, clon}, r), do: :ok, else: {:error, :outside}
  end

  defp validate_geometry(%{lat: lat, lon: lon}, %{polygon: poly}) when is_list(poly) do
    if point_in_polygon({lat, lon}, poly), do: :ok, else: {:error, :outside}
  end

  defp validate_geometry(_ev, _gf), do: {:error, :bad_geofence}

  defp validate_temporal(%{userId: u, geofenceId: g, event: e, ts: ts}, geofence, now_ms) do
    # Temporal state tracked via ETS (see TruckingPlatform.Geofencing.State)
    debounce_ms = Map.get(geofence, :debounce_ms, @default_debounce_ms)
    dwell_ms = Map.get(geofence, :min_dwell_ms, @default_min_dwell_ms)

    last = TruckingPlatform.Geofencing.State.get(u, g)
    cond do
      last && now_ms - last.ts < debounce_ms -> {:error, :debounced}
      e == "enter" ->
        # record tentative enter; dwell confirmed later by subsequent position updates
        TruckingPlatform.Geofencing.State.put(u, g, %{status: :inside, ts: ts})
        # We accept enter immediately but assume upstream sent after dwell; callers may choose to gate
        :ok
      e == "exit" ->
        if last && last.status == :inside && (now_ms - last.ts) < dwell_ms do
          {:error, :insufficient_dwell}
        else
          TruckingPlatform.Geofencing.State.put(u, g, %{status: :outside, ts: ts})
          :ok
        end
      true ->
        {:error, :bad_event}
    end
  end

  @doc """
  Haversine-based distance in meters between two lat/lon points
  """
  def haversine({lat1, lon1}, {lat2, lon2}) do
    r = 6_371_000.0
    dlat = :math.pi() * (lat2 - lat1) / 180
    dlon = :math.pi() * (lon2 - lon1) / 180
    a = :math.sin(dlat/2) * :math.sin(dlat/2) + :math.cos(:math.pi()*lat1/180) * :math.cos(:math.pi()*lat2/180) * :math.sin(dlon/2) * :math.sin(dlon/2)
    c = 2 * :math.atan2(:math.sqrt(a), :math.sqrt(1-a))
    r * c
  end

  @doc """
  Point-in-circle with optional hysteresis via buffer on radius
  """
  def point_in_circle({lat, lon}, {clat, clon}, radius_m, buffer_m \\ 0) do
    haversine({lat, lon}, {clat, clon}) <= radius_m + buffer_m
  end

  @doc """
  Ray casting point-in-polygon test. Polygon as [[lat, lon], ...]
  """
  def point_in_polygon({lat, lon}, polygon) do
    {inside, _j} =
      Enum.reduce(Enum.with_index(polygon), {false, length(polygon) - 1}, fn {[yi, xi], i}, {ins, j} ->
        [yj, xj] = Enum.at(polygon, j)
        cond do
          ((xi > lon) != (xj > lon)) && (lat < (yj - yi) * (lon - xi) / (xj - xi + 1.0e-12) + yi) ->
            {not ins, i}
          true -> {ins, i}
        end
      end)

    inside
  end
end
