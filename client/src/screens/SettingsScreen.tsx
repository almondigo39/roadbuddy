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
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">הגדרות</h1>
      </header>

      <div className="flex-1 px-5 py-6">
        {/* Do Not Disturb */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Moon className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-text">נא לא להפריע</h3>
                <p className="text-sm text-text-light">
                  {doNotDisturb ? 'מופעל' : 'כבוי'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDndToggle}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                doNotDisturb ? 'bg-secondary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                  doNotDisturb ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-8 py-4 bg-white text-danger font-semibold rounded-2xl border border-gray-100 shadow-sm hover:bg-red-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          <span>התנתקות</span>
        </button>
      </div>
    </div>
  )
}
