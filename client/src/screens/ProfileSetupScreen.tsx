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
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <h1 className="text-2xl font-bold text-text mb-8">הגדרת פרופיל</h1>

      {/* Avatar placeholder */}
      <div className="relative mb-8">
        <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center">
          <User className="w-14 h-14 text-text-light" />
        </div>
        <button className="absolute bottom-0 left-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <Camera className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="w-full max-w-sm">
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-light mb-2">
            שם
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלכם"
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-text-light mb-2">
            ביו
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="ספרו קצת על עצמכם..."
            rows={3}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        {error && (
          <p className="text-danger text-sm mb-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="w-full py-4 bg-primary text-white text-lg font-semibold rounded-2xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            'שמירה והמשך'
          )}
        </button>
      </form>
    </div>
  )
}
