// Modal shown when receiving an incoming call

import { Phone, PhoneOff, User } from 'lucide-react'

interface IncomingCallModalProps {
  callId: string
  caller: {
    id: string
    name: string
    avatarUrl?: string
  }
  onAccept: () => void
  onReject: () => void
}

export default function IncomingCallModal({ caller, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" dir="rtl">
      {/* Pulsing card */}
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-pulse-slow text-center">
        {/* Caller avatar */}
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
          {caller.avatarUrl ? (
            <img src={caller.avatarUrl} alt={caller.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-text-light" />
          )}
        </div>

        {/* Caller name */}
        <h2 className="text-2xl font-bold text-text mb-1">{caller.name || 'משתמש'}</h2>
        <p className="text-text-light text-lg mb-8">שיחה נכנסת</p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-8">
          {/* Reject */}
          <button
            onClick={onReject}
            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors active:scale-95 shadow-lg"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            className="w-16 h-16 bg-available rounded-full flex items-center justify-center text-white hover:bg-available-dark transition-colors active:scale-95 shadow-lg"
          >
            <Phone className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  )
}
