import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ArrowLeft } from 'lucide-react'
import { auth, RecaptchaVerifier, signInWithPhoneNumber, setConfirmationResult } from '../services/firebase'
import type { RecaptchaVerifier as RecaptchaVerifierType } from 'firebase/auth'

export default function LoginScreen() {
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const recaptchaRef = useRef<RecaptchaVerifierType | null>(null)
  const recaptchaWidgetId = useRef<number | null>(null)

  const setupRecaptcha = async () => {
    // Clear previous instance completely
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear()
      } catch (_) {}
      recaptchaRef.current = null
    }

    // Clear the container element to remove any leftover reCAPTCHA DOM
    const container = document.getElementById('recaptcha-container')
    if (container) {
      container.innerHTML = ''
    }

    // Create fresh reCAPTCHA
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    })
    recaptchaRef.current = verifier
    return verifier
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const verifier = await setupRecaptcha()
      const result = await signInWithPhoneNumber(auth, phone, verifier)
      setConfirmationResult(result)
      navigate('/verify', { state: { phone } })
    } catch (err: any) {
      console.error('Firebase phone auth error:', err)
      const code = err?.code || ''
      const msg = err?.message || ''

      if (code === 'auth/invalid-phone-number') {
        setError('מספר טלפון לא תקין. ודאו שהמספר בפורמט +972...')
      } else if (code === 'auth/too-many-requests') {
        setError('יותר מדי ניסיונות. נסו שוב מאוחר יותר.')
      } else if (code === 'auth/operation-not-allowed') {
        setError('אימות טלפוני לא מופעל בפרויקט Firebase.')
      } else if (code === 'auth/captcha-check-failed' || code === 'auth/recaptcha-not-enabled') {
        setError('בעיית reCAPTCHA — בדקו הגדרות Firebase.')
      } else {
        setError(`שגיאה: ${code || msg || 'לא ידוע'}`)
      }
      console.error('Error code:', code, 'Message:', msg)
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear()
        } catch (_) {}
      }
      recaptchaRef.current = null
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-container"></div>

      {/* Logo / Title area */}
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Phone className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-text mb-2">
          ברוכים הבאים ל-RoadBuddy
        </h1>
        <p className="text-text-light text-lg">
          חברים בדרך, תמיד לצידך
        </p>
      </div>

      {/* Phone input form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <label className="block text-sm font-medium text-text-light mb-2">
          הזינו מספר טלפון (בפורמט +972...)
        </label>
        <div className="relative mb-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+972501234567"
            className="w-full px-4 py-4 text-lg bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-primary transition-colors text-right"
            dir="ltr"
          />
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
        </div>

        {error && (
          <p className="text-danger text-sm mb-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={!phone || isLoading}
          className="w-full py-4 bg-primary text-white text-lg font-semibold rounded-2xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>שליחת קוד</span>
              <ArrowLeft className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
