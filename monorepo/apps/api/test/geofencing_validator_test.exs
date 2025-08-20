defmodule TruckingPlatform.GeofencingValidatorTest do
  use ExUnit.Case, async: true
  alias TruckingPlatform.Geofencing.Validator

  test "point in circle" do
    assert Validator.point_in_circle({0,0}, {0,0}, 10)
    refute Validator.point_in_circle({0,0.001}, {0,0}, 10)
  end

  test "point in polygon simple square" do
    square = [[0,0],[0,1],[1,1],[1,0]]
    assert Validator.point_in_polygon({0.5,0.5}, square)
    refute Validator.point_in_polygon({1.5,0.5}, square)
  end

  test "debounce rejects rapid re-entry within threshold" do
    now = System.system_time(:millisecond)
    ev = %{userId: "u", tripId: "t", geofenceId: "g", lat: 0.0, lon: 0.0, ts: now, event: "enter"}
    gf = %{center: [0.0, 0.0], radius: 100.0, debounce_ms: 15_000}

    assert {:ok, :validated} = Validator.validate_event(ev, gf, now)
    assert {:error, :debounced} = Validator.validate_event(%{ev | ts: now + 1000}, gf, now + 1000)
  end

  test "exit rejected if dwell < threshold" do
    now = System.system_time(:millisecond)
    ev_enter = %{userId: "u2", tripId: "t2", geofenceId: "g2", lat: 0.0, lon: 0.0, ts: now, event: "enter"}
    gf = %{center: [0.0, 0.0], radius: 100.0, min_dwell_ms: 120_000}
    assert {:ok, :validated} = Validator.validate_event(ev_enter, gf, now)

    ev_exit = %{ev_enter | event: "exit", ts: now + 30_000}
    assert {:error, :insufficient_dwell} = Validator.validate_event(ev_exit, gf, now + 30_000)
  end
end
