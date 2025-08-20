```swift
// iOS: CLLocationManager region monitoring + Phoenix emit
import CoreLocation

class GeoManager: NSObject, CLLocationManagerDelegate {
  let manager = CLLocationManager()
  var socket: PHXSocket? // from Swift Phoenix client or your WS emitter
  var channel: PHXChannel?

  override init() {
    super.init()
    manager.delegate = self
    manager.requestAlwaysAuthorization()
    manager.allowsBackgroundLocationUpdates = true
  }

  func startMonitoring(geofence: CLCircularRegion) {
    geofence.notifyOnEntry = true
    geofence.notifyOnExit = true
    manager.startMonitoring(for: geofence)
  }

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    sendEvent(region: region, event: "enter")
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    sendEvent(region: region, event: "exit")
  }

  private func sendEvent(region: CLRegion, event: String) {
    guard let circ = region as? CLCircularRegion, let loc = manager.location else { return }
    let payload: [String: Any] = [
      "userId": currentUserId,
      "tripId": currentTripId,
      "geofenceId": circ.identifier,
      "lat": loc.coordinate.latitude,
      "lon": loc.coordinate.longitude,
      "ts": Int(Date().timeIntervalSince1970 * 1000),
      "event": event,
      "accuracy": loc.horizontalAccuracy,
      "speed": loc.speed
    ]
    channel?.push(event: "event", payload: payload)
  }
}
```

Offline queue and retry strategy (outline):

- Store events locally (Core Data/SQLite) when socket is offline.
- Use BackgroundTasks or reachability callbacks to retry with exponential backoff.
- Include the idempotency key `${userId}:${tripId}:${geofenceId}:${event}:${roundedTs}` to dedupe.
- Respect iOS background execution limits and request additional time when necessary.
