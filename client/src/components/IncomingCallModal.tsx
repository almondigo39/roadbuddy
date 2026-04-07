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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-dark" dir="rtl">
      {/* Sheet */}
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center animate-ios-pop"
           style={{ boxShadow: '0 30px 80px -10px rgba(0,0,0,0.5)' }}>
        {/* Caller avatar with pulse rings */}
        <div className="relative w-28 h-28 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full ring-pulse" />
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, #5DD7FF 0%, #00A8E0 100%)' }}
          >
            {caller.avatarUrl ? (
              <img src={caller.avatarUrl} alt={caller.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-14 h-14 text-white" />
            )}
          </div>
        </div>

        {/* Caller name */}
        <h2 className="text-2xl font-bold text-text mb-1 tracking-tight">{caller.name || 'משתמש'}</h2>
        <p className="text-text-light text-base mb-8">שיחה נכנסת...</p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-10">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white press"
              style={{
                background: 'linear-gradient(135deg, #FF6B7A 0%, #FF4757 100%)',
                boxShadow: '0 14px 30px -8px rgba(255, 71, 87, 0.6)',
              }}
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-text-light font-medium">דחייה</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white press"
              style={{
                background: 'linear-gradient(135deg, #2ED573 0%, #20BF6B 100%)',
                boxShadow: '0 14px 30px -8px rgba(46, 213, 115, 0.65)',
              }}
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-xs text-text-light font-medium">מענה</span>
          </div>
        </div>
      </div>
    </div>
  )
}
