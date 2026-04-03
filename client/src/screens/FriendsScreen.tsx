import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, UserPlus, Check, X, User, Search } from 'lucide-react'
import api from '../services/api'

interface Friend {
  id: string
  friendshipId: string
  name: string
  phoneNumber: string
  avatarUrl?: string
  isAvailable?: boolean
}

interface FriendRequest {
  id: string
  from: {
    id: string
    name: string
    phoneNumber: string
    avatarUrl?: string
  }
}

type Tab = 'friends' | 'requests' | 'add'

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [searchPhone, setSearchPhone] = useState('')
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [addError, setAddError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadFriends()
    loadRequests()
  }, [])

  const loadFriends = async () => {
    try {
      const res = await api.get('/friends')
      setFriends(res.data.data)
    } catch {
      // empty
    }
  }

  const loadRequests = async () => {
    try {
      const res = await api.get('/friends/requests')
      setRequests(res.data.data)
    } catch {
      // empty
    }
  }

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchPhone.trim()) return

    setAddStatus('loading')
    setAddError('')
    try {
      await api.post('/friends/request', { phoneNumber: searchPhone.trim() })
      setAddStatus('sent')
      setSearchPhone('')
    } catch {
      setAddStatus('error')
      setAddError('לא ניתן לשלוח בקשה. בדקו את המספר ונסו שוב.')
    }
  }

  const handleAccept = async (requestId: string) => {
    try {
      await api.put(`/friends/${requestId}/accept`)
      setRequests(prev => prev.filter(r => r.id !== requestId))
      loadFriends()
    } catch {
      // error
    }
  }

  const handleDecline = async (requestId: string) => {
    try {
      await api.delete(`/friends/requests/${requestId}`)
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch {
      // error
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'friends', label: 'חברים' },
    { key: 'requests', label: 'בקשות' },
    { key: 'add', label: 'הוספה' },
  ]

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
        <h1 className="text-xl font-bold text-text">חברים</h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.key ? 'text-primary' : 'text-text-light'
            }`}
          >
            {tab.label}
            {tab.key === 'requests' && requests.length > 0 && (
              <span className="absolute top-2 mr-1 inline-flex items-center justify-center w-5 h-5 text-xs bg-danger text-white rounded-full">
                {requests.length}
              </span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 px-5 py-4">
        {/* Friends list tab */}
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-3">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-text-light">אין לך חברים עדיין</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="text-primary font-semibold mt-2 hover:underline"
                >
                  הוסיפו חברים
                </button>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <User className="w-6 h-6 text-text-light" />
                      )}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        friend.isAvailable ? 'bg-available' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{friend.name}</h3>
                    <p className="text-sm text-text-light">
                      {friend.isAvailable ? 'זמין/ה' : 'לא זמין/ה'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending requests tab */}
        {activeTab === 'requests' && (
          <div className="flex flex-col gap-3">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-light">אין בקשות ממתינות</p>
              </div>
            ) : (
              requests.map(request => (
                <div key={request.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {request.from.avatarUrl ? (
                      <img src={request.from.avatarUrl} alt={request.from.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-6 h-6 text-text-light" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{request.from.name}</h3>
                    <p className="text-sm text-text-light">{request.from.phoneNumber}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="w-10 h-10 bg-available rounded-xl flex items-center justify-center text-white hover:bg-available-dark transition-colors active:scale-95"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center text-text-light hover:bg-gray-300 transition-colors active:scale-95"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add friend tab */}
        {activeTab === 'add' && (
          <div>
            <p className="text-text-light mb-4 text-center">
              הזינו מספר טלפון של חבר/ה כדי לשלוח בקשת חברות
            </p>
            <form onSubmit={handleSendRequest} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="tel"
                  value={searchPhone}
                  onChange={(e) => {
                    setSearchPhone(e.target.value)
                    setAddStatus('idle')
                  }}
                  placeholder="050-1234567"
                  className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-primary transition-colors text-right"
                  dir="ltr"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
              </div>

              <button
                type="submit"
                disabled={!searchPhone.trim() || addStatus === 'loading'}
                className="w-full py-4 bg-primary text-white font-semibold rounded-2xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {addStatus === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>שליחת בקשת חברות</span>
                  </>
                )}
              </button>

              {addStatus === 'sent' && (
                <p className="text-available text-center font-medium">
                  בקשת החברות נשלחה בהצלחה!
                </p>
              )}
              {addStatus === 'error' && (
                <p className="text-danger text-center text-sm">{addError}</p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
