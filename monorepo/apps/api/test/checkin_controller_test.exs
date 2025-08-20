defmodule TruckingPlatformWeb.CheckInControllerTest do
  use ExUnit.Case, async: true
  use Plug.Test
  alias TruckingPlatformWeb.Router

  @opts Router.init([])

  test "POST /api/checkins validates and stores checkin" do
    params = %{
      "orgId" => "org1",
      "tripId" => "trip1",
      "driverId" => "driver1",
      "driverName" => "Alice",
      "phone" => "+12345678901",
      "poNumber" => "PO123",
      "vehicle" => %{tractor: "T1", trailer: "TR1"},
      "facility" => "FAC1"
    }
  conn = conn(:post, "/api/checkins", Jason.encode!(params))
  |> put_req_header("content-type", "application/json")
  |> put_req_header("x-user-id", "u1")
  |> put_req_header("x-org-id", "org1")
    conn = Router.call(conn, @opts)
    assert conn.status == 200
  body = Jason.decode!(conn.resp_body)
  assert body["driverName"] == "Alice"
  assert String.contains?(body["phone"], "+12-345-***-")
  end

  test "POST /api/checkins rejects invalid phone" do
    params = %{
      "orgId" => "org1",
      "tripId" => "trip1",
      "driverId" => "driver1",
      "driverName" => "Bob",
      "phone" => "5551234",
      "poNumber" => "PO124",
      "vehicle" => %{tractor: "T2", trailer: "TR2"},
      "facility" => "FAC2"
    }
  conn = conn(:post, "/api/checkins", Jason.encode!(params))
  |> put_req_header("content-type", "application/json")
  |> put_req_header("x-user-id", "u1")
  |> put_req_header("x-org-id", "org1")
    conn = Router.call(conn, @opts)
    assert conn.status == 400
  end
end
