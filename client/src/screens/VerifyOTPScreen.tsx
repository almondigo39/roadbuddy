import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
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
      const res = await api.post('/auth/verify-otp', { phoneNumber: phone, code: otp })
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
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">
          הזינו את הקוד שקיבלתם
        </h1>
        <p className="text-text-light">
          שלחנו קוד אימות ל-{phone}
        </p>
      </div>

      {/* OTP Input - 6 digits */}
      <div className="flex gap-2 mb-6" dir="ltr">
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
            className="w-12 h-14 text-center text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
          />
        ))}
      </div>

      {error && (
        <p className="text-danger text-sm mb-4 text-center">{error}</p>
      )}

      {isLoading && (
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      )}

      <button
        onClick={() => navigate('/login')}
        className="mt-6 text-primary text-sm hover:underline"
      >
        שינוי מספר טלפון
      </button>
    </div>
  )
}
