ExUnit.start()
case TruckingPlatform.Geofencing.State.start_link([]) do
	{:ok, _} -> :ok
	{:error, {:already_started, _}} -> :ok
end
