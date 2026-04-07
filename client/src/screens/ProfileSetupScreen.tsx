import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function ProfileSetupScreen() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setError('')
    setIsLoading(true)

    try {
      const res = await api.put('/users/me', { name: name.trim(), bio: bio.trim() })
      updateUser(res.data.data)
      navigate('/', { replace: true })
    } catch {
      setError('שגיאה בשמירת הפרופיל. נסו שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-120px] right-[-80px] w-[280px] h-[280px] rounded-full blur-3xl opacity-40 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #33CCFF 0%, transparent 70%)' }} />

      <h1 className="text-2xl font-bold text-text mb-8 tracking-tight relative z-10">הגדרת פרופיל</h1>

      {/* Avatar placeholder */}
      <div className="relative mb-8 z-10 animate-ios-pop">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center ring-4 ring-white shadow-xl"
          style={{ background: 'linear-gradient(135deg, #5DD7FF 0%, #00A8E0 100%)' }}
        >
          <User className="w-14 h-14 text-white" />
        </div>
        <button
          type="button"
          className="absolute bottom-0 left-0 w-10 h-10 rounded-full flex items-center justify-center text-white press"
          style={{
            background: 'linear-gradient(135deg, #FF8800 0%, #FF6A00 100%)',
            boxShadow: '0 8px 20px -4px rgba(255, 136, 0, 0.6)',
          }}
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="w-full max-w-sm relative z-10">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-light mb-2 px-1">
            שם
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלכם"
            className="w-full px-5 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(51,204,255,0.15)] transition-all"
            style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 8px 20px rgba(20,33,61,0.05)' }}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-text-light mb-2 px-1">
            ביו
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="ספרו קצת על עצמכם..."
            rows={3}
            className="w-full px-5 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(51,204,255,0.15)] transition-all resize-none"
            style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 8px 20px rgba(20,33,61,0.05)' }}
          />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
            <p className="text-danger text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="w-full py-4 text-white text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed press"
          style={{
            background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
            boxShadow: '0 10px 30px -8px rgba(0, 168, 224, 0.6)',
          }}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            'שמירה והמשך'
          )}
        </button>
      </form>
    </div>
  )
}
