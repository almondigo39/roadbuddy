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
  const containerIdRef = useRef(0)

  const setupRecaptcha = () => {
    // Clear previous instance
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear()
      } catch (_) {}
      recaptchaRef.current = null
    }

    // Remove old container and create a brand new one
    const oldContainer = document.getElementById('recaptcha-container')
    if (oldContainer) {
      oldContainer.remove()
    }
    containerIdRef.current += 1
    const newContainer = document.createElement('div')
    newContainer.id = 'recaptcha-container'
    document.body.appendChild(newContainer)

    // Create fresh reCAPTCHA on the new element
    const verifier = new RecaptchaVerifier(auth, newContainer, {
      size: 'invisible',
    })
    recaptchaRef.current = verifier
    return verifier
  }

  // Convert local Israeli number (05xx) to international format (+9725xx)
  const normalizePhone = (input: string): string => {
    const digits = input.trim()
    if (digits.startsWith('0')) {
      return '+972' + digits.slice(1)
    }
    if (digits.startsWith('+')) {
      return digits
    }
    return '+972' + digits
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const normalizedPhone = normalizePhone(phone)

    try {
      const verifier = await setupRecaptcha()
      const result = await signInWithPhoneNumber(auth, normalizedPhone, verifier)
      setConfirmationResult(result)
      navigate('/verify', { state: { phone: normalizedPhone } })
    } catch (err: any) {
      console.error('Firebase phone auth error:', err)
      const code = err?.code || ''
      const msg = err?.message || ''

      if (code === 'auth/invalid-phone-number') {
        setError('מספר טלפון לא תקין')
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
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-120px] right-[-80px] w-[280px] h-[280px] rounded-full blur-3xl opacity-40"
           style={{ background: 'radial-gradient(circle, #33CCFF 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-120px] left-[-80px] w-[280px] h-[280px] rounded-full blur-3xl opacity-30"
           style={{ background: 'radial-gradient(circle, #FFD400 0%, transparent 70%)' }} />

      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-container"></div>

      {/* Logo / Title area */}
      <div className="mb-12 text-center relative z-10 animate-ios-pop">
        <div
          className="w-24 h-24 rounded-[28px] flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
            boxShadow: '0 20px 50px -10px rgba(0, 168, 224, 0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          <Phone className="w-11 h-11 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold text-text mb-2 tracking-tight">
          ברוכים הבאים ל-RoadBuddy
        </h1>
        <p className="text-text-light text-base">
          חברים בדרך, תמיד לצידך
        </p>
      </div>

      {/* Phone input form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm relative z-10 animate-slide-up">
        <label className="block text-sm font-semibold text-text-light mb-2 px-1">
          מספר טלפון
        </label>
        <div className="relative mb-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0501234567"
            className="w-full px-5 py-4 text-lg bg-white border border-border rounded-2xl focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(51,204,255,0.15)] transition-all text-right"
            dir="ltr"
            style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 8px 20px rgba(20,33,61,0.05)' }}
          />
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
            <p className="text-danger text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!phone || isLoading}
          className="w-full py-4 text-white text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed press flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
            boxShadow: '0 10px 30px -8px rgba(0, 168, 224, 0.6)',
          }}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
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
