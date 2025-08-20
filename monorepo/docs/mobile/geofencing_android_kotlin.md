```kotlin
// Android: GeofencingClient + BroadcastReceiver + Phoenix emit
class GeofenceBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val geofencingEvent = GeofencingEvent.fromIntent(intent) ?: return
    val transition = geofencingEvent.geofenceTransition
    val loc = geofencingEvent.triggeringLocation ?: return
    val event = when (transition) {
      Geofence.GEOFENCE_TRANSITION_ENTER -> "enter"
      Geofence.GEOFENCE_TRANSITION_EXIT -> "exit"
      else -> return
    }

    val geofenceId = geofencingEvent.triggeringGeofences?.firstOrNull()?.requestId ?: return

    val payload = mapOf(
      "userId" to currentUserId,
      "tripId" to currentTripId,
      "geofenceId" to geofenceId,
      "lat" to loc.latitude,
      "lon" to loc.longitude,
      "ts" to System.currentTimeMillis(),
      "event" to event,
      "accuracy" to loc.accuracy,
      "speed" to loc.speed
    )

    PhoenixClient.channel("geo:${currentOrgId}")?.push("event", payload)
  }
}

// Register PendingIntent for background processing
val geofencingClient = LocationServices.getGeofencingClient(context)
val geofence = Geofence.Builder()
  .setRequestId("GEOFENCE_123")
  .setCircularRegion(lat, lon, radiusMeters)
  .setExpirationDuration(Geofence.NEVER_EXPIRE)
  .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
  .build()

val geofencingRequest = GeofencingRequest.Builder()
  .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
  .addGeofence(geofence)
  .build()

val pendingIntent = PendingIntent.getBroadcast(
  context,
  0,
  Intent(context, GeofenceBroadcastReceiver::class.java),
  PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
)

geofencingClient.addGeofences(geofencingRequest, pendingIntent)
```

Offline queue and retry strategy (outline):

- Persist pending events in Room/SQLite when push fails (no network).
- Use WorkManager with exponential backoff to drain the queue when connectivity returns.
- Include idempotency key `${userId}:${tripId}:${geofenceId}:${event}:${roundedTs}` with each payload.
- Drop stale items beyond reasonable TTL and log metrics for observability.
