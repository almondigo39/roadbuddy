import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginScreen from './screens/LoginScreen'
import VerifyOTPScreen from './screens/VerifyOTPScreen'
import ProfileSetupScreen from './screens/ProfileSetupScreen'
import MainScreen from './screens/MainScreen'
import FriendsScreen from './screens/FriendsScreen'
import SettingsScreen from './screens/SettingsScreen'
import CallScreen from './components/CallScreen'
import IncomingCallModal from './components/IncomingCallModal'
import { useCall } from './contexts/CallContext'

function App() {
  const { activeCall, incomingCall, acceptCall, rejectCall, endCall } = useCall()

  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/verify" element={<VerifyOTPScreen />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/setup"
          element={
            <ProtectedRoute>
              <ProfileSetupScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsScreen />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Global call overlays */}
      {activeCall && (
        <CallScreen
          callId={activeCall.callId}
          participants={activeCall.participants}
          onEnd={endCall}
        />
      )}

      {incomingCall && !activeCall && (
        <IncomingCallModal
          callId={incomingCall.callId}
          caller={incomingCall.caller}
          onAccept={() => acceptCall(incomingCall.callId)}
          onReject={() => rejectCall(incomingCall.callId)}
        />
      )}
    </div>
  )
}

export default App
