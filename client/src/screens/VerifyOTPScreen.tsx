import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getConfirmationResult } from '../services/firebase'
import api from '../services/api'

export default function VerifyOTPScreen() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const phone = (location.state as { phone?: string })?.phone || ''

  // Redirect back to login if no phone number
  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true })
    }
  }, [phone, navigate])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const otp = code.join('')
    if (otp.length !== 6) return

    setError('')
    setIsLoading(true)

    try {
      // Step 1: Verify with Firebase
      const confirmationResult = getConfirmationResult()
      if (!confirmationResult) {
        setError('שגיאה באימות. חזרו למסך ההתחברות.')
        setIsLoading(false)
        return
      }

      const firebaseResult = await confirmationResult.confirm(otp)
      const idToken = await firebaseResult.user.getIdToken()

      // Step 2: Send Firebase token to our backend
      const res = await api.post('/auth/firebase-verify', {
        idToken,
        phoneNumber: phone,
      })
      const { token, user } = res.data.data
      login(token, user)

      // Redirect to profile setup if new user, otherwise main screen
      if (!user.name || user.name.startsWith('User ')) {
        navigate('/profile/setup', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setError('הקוד שהוזן שגוי. נסו שוב.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (code.every(d => d !== '')) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-120px] right-[-80px] w-[280px] h-[280px] rounded-full blur-3xl opacity-40 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #33CCFF 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-120px] left-[-80px] w-[280px] h-[280px] rounded-full blur-3xl opacity-30 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #FFD400 0%, transparent 70%)' }} />

      <div className="mb-10 text-center relative z-10 animate-ios-pop">
        <div
          className="w-24 h-24 rounded-[28px] flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
            boxShadow: '0 20px 50px -10px rgba(0, 168, 224, 0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          <ShieldCheck className="w-11 h-11 text-white" strokeWidth={2.4} />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2 tracking-tight">
          הזינו את הקוד שקיבלתם
        </h1>
        <p className="text-text-light text-sm">
          שלחנו קוד אימות ל-<span dir="ltr" className="font-mono">{phone}</span>
        </p>
      </div>

      {/* OTP Input - 6 digits */}
      <div className="flex gap-2 mb-6 relative z-10 animate-slide-up" dir="ltr">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-bold bg-white border border-border rounded-2xl focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(51,204,255,0.15)] transition-all"
            style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 8px 20px rgba(20,33,61,0.05)' }}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 relative z-10">
          <p className="text-danger text-sm text-center font-medium">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin relative z-10" />
      )}

      <button
        type="button"
        onClick={() => navigate('/login')}
        className="mt-6 text-sm font-semibold relative z-10 press"
        style={{ color: '#00A8E0' }}
      >
        שינוי מספר טלפון
      </button>
    </div>
  )
}
