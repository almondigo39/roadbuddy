import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ArrowLeft } from 'lucide-react'
import api from '../services/api'

export default function LoginScreen() {
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.post('/auth/send-otp', { phoneNumber: phone })
      // Navigate to verify screen, passing phone via state
      navigate('/verify', { state: { phone } })
    } catch {
      setError('שגיאה בשליחת הקוד. נסו שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
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
          הזינו מספר טלפון
        </label>
        <div className="relative mb-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-1234567"
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
