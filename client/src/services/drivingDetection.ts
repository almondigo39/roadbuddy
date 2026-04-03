// Driving detection service using the browser Geolocation API.
// Monitors device speed to determine if the user is driving.

const DRIVING_SPEED_THRESHOLD = 4.2 // ~15 km/h in m/s
const STOPPED_SPEED_THRESHOLD = 1.4 // ~5 km/h in m/s
const DRIVING_CONFIRM_MS = 30_000 // 30 seconds above threshold to confirm driving
const STOPPED_CONFIRM_MS = 60_000 // 60 seconds below threshold to confirm stopped

type DrivingChangeCallback = (isDriving: boolean) => void

let watchId: number | null = null
let callback: DrivingChangeCallback | null = null
let isDriving = false

// Timestamps for tracking consecutive speed readings
let drivingStartTime: number | null = null
let stoppedStartTime: number | null = null

function reset() {
  watchId = null
  callback = null
  isDriving = false
  drivingStartTime = null
  stoppedStartTime = null
}

function handlePosition(position: GeolocationPosition) {
  // speed is in m/s, can be null if not available
  const speed = position.coords.speed ?? 0
  const now = Date.now()

  if (!isDriving) {
    // Currently not driving — check if we should transition to driving
    if (speed > DRIVING_SPEED_THRESHOLD) {
      if (drivingStartTime === null) {
        drivingStartTime = now
      }
      // Check if we've been above threshold long enough
      if (now - drivingStartTime >= DRIVING_CONFIRM_MS) {
        isDriving = true
        stoppedStartTime = null
        console.log('[DrivingDetection] Driving detected — speed:', speed.toFixed(1), 'm/s')
        callback?.(true)
      }
    } else {
      // Speed dropped below threshold, reset the driving timer
      drivingStartTime = null
    }
  } else {
    // Currently driving — check if we should transition to stopped
    if (speed < STOPPED_SPEED_THRESHOLD) {
      if (stoppedStartTime === null) {
        stoppedStartTime = now
      }
      // Check if we've been below threshold long enough
      if (now - stoppedStartTime >= STOPPED_CONFIRM_MS) {
        isDriving = false
        drivingStartTime = null
        console.log('[DrivingDetection] Stopped driving — speed:', speed.toFixed(1), 'm/s')
        callback?.(false)
      }
    } else {
      // Speed went back up, reset the stopped timer
      stoppedStartTime = null
    }
  }
}

function handleError(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      console.warn('[DrivingDetection] Location permission denied by user')
      break
    case error.POSITION_UNAVAILABLE:
      console.warn('[DrivingDetection] Location information unavailable')
      break
    case error.TIMEOUT:
      console.warn('[DrivingDetection] Location request timed out')
      break
    default:
      console.warn('[DrivingDetection] Unknown geolocation error:', error.message)
  }
}

/**
 * Start monitoring device speed to detect driving.
 * Calls onDrivingChange(true) when driving is detected and
 * onDrivingChange(false) when the user appears to have stopped.
 */
export function startDetection(onDrivingChange: DrivingChangeCallback): void {
  if (watchId !== null) {
    console.log('[DrivingDetection] Already detecting, stopping previous session')
    stopDetection()
  }

  if (!navigator.geolocation) {
    console.warn('[DrivingDetection] Geolocation API not available in this browser')
    return
  }

  callback = onDrivingChange
  isDriving = false
  drivingStartTime = null
  stoppedStartTime = null

  console.log('[DrivingDetection] Starting detection')

  watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000,
  })
}

/**
 * Stop monitoring device speed.
 */
export function stopDetection(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    console.log('[DrivingDetection] Detection stopped')
  }
  reset()
}

/**
 * Returns true if the detection service is currently active.
 */
export function isDetecting(): boolean {
  return watchId !== null
}
