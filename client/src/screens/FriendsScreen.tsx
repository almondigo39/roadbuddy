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
          <h1 className="text-xl font-bold text-text tracking-tight">חברים</h1>
        </div>
      </header>

      {/* Segmented tabs */}
      <div className="px-5 pt-4 relative z-10">
        <div className="p-1 bg-white/70 backdrop-blur rounded-2xl shadow-sm border border-white flex relative">
          <div
            className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out pointer-events-none"
            style={{
              width: 'calc(33.333% - 4px)',
              right: tabs.findIndex(t => t.key === activeTab) === 0
                ? '4px'
                : tabs.findIndex(t => t.key === activeTab) === 1
                ? 'calc(33.333% + 1px)'
                : 'calc(66.666% - 2px)',
              background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
              boxShadow: '0 4px 14px -4px rgba(0, 168, 224, 0.55)',
            }}
          />
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key ? 'text-white' : 'text-text-light'
              }`}
            >
              {tab.label}
              {tab.key === 'requests' && requests.length > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-danger text-white rounded-full shadow-md">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-5 py-5 relative z-10">
        {/* Friends list tab */}
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-3 animate-slide-up">
            {friends.length === 0 ? (
              <div className="text-center py-16">
                <UserPlus className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                <p className="text-text-light mb-3">אין לך חברים עדיין</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="font-semibold press"
                  style={{ color: '#00A8E0' }}
                >
                  הוסיפו חברים
                </button>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="ios-card p-4 border border-white flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-md"
                      style={{ background: 'linear-gradient(135deg, #5DD7FF 0%, #00A8E0 100%)' }}
                    >
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                      style={{ background: friend.isAvailable ? '#2ED573' : '#B0BCCC' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{friend.name}</h3>
                    <p className="text-xs text-text-light">
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
          <div className="flex flex-col gap-3 animate-slide-up">
            {requests.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-text-light">אין בקשות ממתינות</p>
              </div>
            ) : (
              requests.map(request => (
                <div key={request.id} className="ios-card p-4 border border-white flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-md flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #5DD7FF 0%, #00A8E0 100%)' }}
                  >
                    {request.from.avatarUrl ? (
                      <img src={request.from.avatarUrl} alt={request.from.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{request.from.name}</h3>
                    <p className="text-xs text-text-light" dir="ltr">{request.from.phoneNumber}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAccept(request.id)}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white press"
                      style={{
                        background: 'linear-gradient(135deg, #2ED573 0%, #20BF6B 100%)',
                        boxShadow: '0 6px 16px -4px rgba(46, 213, 115, 0.55)',
                      }}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(request.id)}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-100 text-text-light press"
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
          <div className="animate-slide-up">
            <p className="text-text-light mb-4 text-center text-sm">
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
                  placeholder="0501234567"
                  className="w-full px-5 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(51,204,255,0.15)] transition-all text-right"
                  dir="ltr"
                  style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 8px 20px rgba(20,33,61,0.05)' }}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
              </div>

              <button
                type="submit"
                disabled={!searchPhone.trim() || addStatus === 'loading'}
                className="w-full py-4 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed press flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
                  boxShadow: '0 10px 30px -8px rgba(0, 168, 224, 0.6)',
                }}
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
                <div className="px-4 py-3 rounded-2xl bg-green-50 border border-green-100">
                  <p className="text-center font-medium text-sm" style={{ color: '#20BF6B' }}>
                    ✓ בקשת החברות נשלחה בהצלחה!
                  </p>
                </div>
              )}
              {addStatus === 'error' && (
                <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
                  <p className="text-danger text-center text-sm font-medium">{addError}</p>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
