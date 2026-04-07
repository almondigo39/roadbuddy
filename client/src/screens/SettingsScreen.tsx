import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function SettingsScreen() {
  const { user, updateUser, logout } = useAuth()
  const [doNotDisturb, setDoNotDisturb] = useState(user?.doNotDisturb || false)
  const navigate = useNavigate()

  const handleDndToggle = async () => {
    const newDnd = !doNotDisturb
    setDoNotDisturb(newDnd)
    try {
      await api.put('/users/me', { doNotDisturb: newDnd })
      updateUser({ doNotDisturb: newDnd })
    } catch {
      setDoNotDisturb(!newDnd)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="absolute top-0 inset-x-0 h-[200px] pointer-events-none"
           style={{ background: 'linear-gradient(180deg, rgba(51,204,255,0.18) 0%, rgba(51,204,255,0) 100%)' }} />

      {/* Glass header */}
      <header className="sticky top-0 z-30 glass border-b border-white/40">
        <div className="flex items-center gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 press shadow-sm"
          >
            <ArrowRight className="w-5 h-5 text-text" />
          </button>
          <h1 className="text-xl font-bold text-text tracking-tight">הגדרות</h1>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 relative z-10">
        {/* Do Not Disturb */}
        <div className="ios-card p-5 mb-4 border border-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
                style={{
                  background: 'linear-gradient(135deg, #6B7AE8 0%, #4A5BC4 100%)',
                  boxShadow: '0 6px 16px -4px rgba(74, 91, 196, 0.5)',
                }}
              >
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text">נא לא להפריע</h3>
                <p className="text-sm text-text-light">
                  {doNotDisturb ? 'מופעל' : 'כבוי'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDndToggle}
              className="relative w-14 h-8 rounded-full transition-all duration-300"
              style={{
                background: doNotDisturb
                  ? 'linear-gradient(135deg, #6B7AE8 0%, #4A5BC4 100%)'
                  : '#D1D9E3',
              }}
            >
              <div
                className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300"
                style={{ right: doNotDisturb ? '4px' : 'calc(100% - 28px)' }}
              />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-8 py-4 bg-white text-danger font-semibold rounded-2xl press flex items-center justify-center gap-2"
          style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 8px 24px rgba(255, 71, 87, 0.15)' }}
        >
          <LogOut className="w-5 h-5" />
          <span>התנתקות</span>
        </button>
      </div>
    </div>
  )
}
