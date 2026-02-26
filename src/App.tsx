import { useState, useEffect } from 'react'
import { Feed } from './components/Feed'
import { LeftSidebar } from './components/LeftSidebar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { MobileHeader } from './components/MobileHeader'
import { MessagesPage } from './components/MessagesPage'
import { NotificationsPage } from './components/NotificationsPage'
import { ProfilePage } from './components/ProfilePage'
import { SavedFilesPage } from './components/SavedFilesPage'
import { RateDetailPage } from './components/RateDetailPage'
import { SearchPage } from './components/SearchPage'
import { RightSidebar } from './components/RightSidebar'
import { EntryGate } from './components/EntryGate'
import { loadProfile, getDefaultProfile, clearProfile, type UserProfile } from './lib/profileStorage'
import { API_BASE } from './lib/apiBase'

function App() {
  const [composeOpen, setComposeOpen] = useState(false)
  const [view, setView] = useState<'feed' | 'profile' | 'notifications' | 'messages' | 'saved' | 'search' | 'rate-detail' | 'entry'>('feed')
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewProfileUsername, setViewProfileUsername] = useState<string | null>(null)
  const [viewMessagesWithUsername, setViewMessagesWithUsername] = useState<string | null>(null)
  const [viewRateId, setViewRateId] = useState<string | null>(null)
  const [rateDetailReturnView, setRateDetailReturnView] = useState<'feed' | 'search' | 'saved'>('feed')
  const [profileReturnView, setProfileReturnView] = useState<'feed' | 'search' | 'saved' | 'rate-detail'>('feed')
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)

  useEffect(() => {
    setProfile(loadProfile() ?? getDefaultProfile())

    // if the URL contains a verification token we need to show the entry gate so that
    // `EntryGate` can pick it up and advance the signup process.  (The email link reloads
    // the front end, so this effect runs on the landing page.)
    const params = new URLSearchParams(window.location.search)
    if (params.has('verifyToken')) {
      setView('entry')
    }
  }, [])

  const currentProfileForFetch = profile ?? getDefaultProfile()
  useEffect(() => {
    const username = currentProfileForFetch?.username?.trim()
    if (!username) {
      setNotificationUnreadCount(0)
      return
    }
    fetch(`${API_BASE}/api/notifications/unread-count?username=${encodeURIComponent(username)}`)
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => setNotificationUnreadCount(typeof data.count === 'number' ? data.count : 0))
      .catch(() => setNotificationUnreadCount(0))
  }, [currentProfileForFetch?.username])

  // Always show main UI; use default profile if none saved (Create Account flow can be added later)
  const currentProfile = profile ?? getDefaultProfile()
  const isGuest = currentProfile.id === 'guest' || !currentProfile.email

  const handleSignOut = () => {
    clearProfile()
    setProfile(null)
    setView('entry')
  }

  // Entry gate (sign in / create account) — when open, show full-screen then close and go to feed on success
  if (view === 'entry') {
    return (
      <div className="flex min-h-screen flex-col bg-surface text-[var(--color-text)]">
        <EntryGate
          onProfileCreated={(p) => {
            setProfile(p)
            setView('feed')
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-[var(--color-text)]">
      <MobileHeader onSignOut={handleSignOut} />
      <div className="flex min-h-screen w-full flex-1 flex-col md:flex-row md:max-w-[1225px] md:mx-auto">
        {/* Left sidebar — desktop only, in flow */}
        <div className="hidden md:block md:sticky md:top-0 md:h-screen md:w-[var(--sidebar-width)] md:flex-shrink-0">
          <LeftSidebar
            profile={currentProfile}
            onFeedClick={() => { setView('feed'); setActiveTab('for-you') }}
            onFollowingClick={() => { setView('feed'); setActiveTab('following') }}
            onRateClick={() => setComposeOpen(true)}
            onProfileClick={() => { setView('profile'); setViewProfileUsername(null) }}
            onNotificationsClick={() => setView('notifications')}
            onMessagesClick={() => setView('messages')}
            onSavedFilesClick={() => setView('saved')}
            onSignOut={handleSignOut}
            notificationUnreadCount={notificationUnreadCount}
            isFeedActive={view === 'feed' && activeTab === 'for-you'}
            isFollowingActive={view === 'feed' && activeTab === 'following'}
            isProfileActive={view === 'profile'}
            isNotificationsActive={view === 'notifications'}
            isMessagesActive={view === 'messages'}
            isSavedFilesActive={view === 'saved'}
          />
        </div>

        {/* Center — feed, notifications, or profile */}
        <div className="min-h-screen w-full min-w-0 max-w-[var(--feed-max-width)] flex-1 pb-20 md:pb-0">
          {view === 'profile' ? (
            <ProfilePage
              profile={currentProfile}
              onProfileChange={setProfile}
              onBack={() => {
                setViewProfileUsername(null)
                if (profileReturnView === 'rate-detail') {
                  setView('rate-detail')
                } else {
                  setView(profileReturnView)
                }
                setProfileReturnView('feed')
              }}
              onOpenEntryGate={isGuest ? () => setView('entry') : undefined}
              viewUsername={viewProfileUsername}
              onMessageClick={(username) => { setViewMessagesWithUsername(username); setView('messages') }}
            />
          ) : view === 'notifications' ? (
            <NotificationsPage profile={currentProfile} onNotificationsUpdated={() => {
              const u = currentProfile?.username?.trim()
              if (!u) return
              fetch(`${API_BASE}/api/notifications/unread-count?username=${encodeURIComponent(u)}`)
                .then((res) => (res.ok ? res.json() : { count: 0 }))
                .then((data) => setNotificationUnreadCount(typeof data.count === 'number' ? data.count : 0))
                .catch(() => {})
            }} />
          ) : view === 'messages' ? (
            <MessagesPage profile={currentProfile} initialWithUsername={viewMessagesWithUsername} onClearInitialWith={() => setViewMessagesWithUsername(null)} />
          ) : view === 'saved' ? (
            <SavedFilesPage profile={currentProfile} onViewProfile={(username) => { setViewProfileUsername(username); setView('profile') }} onViewRate={(id: string) => { setViewRateId(id); setRateDetailReturnView('saved'); setView('rate-detail') }} />
          ) : view === 'search' ? (
            <SearchPage
              profile={currentProfile}
              initialQuery={searchQuery}
              onViewProfile={(username) => { setViewProfileUsername(username); setProfileReturnView('search'); setView('profile') }}
              onViewRate={(id) => { setViewRateId(id); setRateDetailReturnView('search'); setView('rate-detail') }}
            />
          ) : view === 'rate-detail' && viewRateId ? (
            <RateDetailPage
              rateId={viewRateId}
              profile={currentProfile}
              onBack={() => { setViewRateId(null); setView(rateDetailReturnView) }}
              onViewProfile={(username) => { setViewProfileUsername(username); setProfileReturnView('rate-detail'); setView('profile') }}
            />
          ) : (
            <Feed
              profile={currentProfile}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              composeOpen={composeOpen}
              onComposeOpen={() => setComposeOpen(true)}
              onComposeClose={() => setComposeOpen(false)}
              className="min-h-[calc(100vh-80px)] md:min-h-screen"
              onViewProfile={(username) => { setViewProfileUsername(username); setProfileReturnView('feed'); setView('profile') }}
              onViewRate={(id: string) => { setViewRateId(id); setRateDetailReturnView('feed'); setView('rate-detail') }}
            />
          )}
        </div>

        {/* Right sidebar — desktop only */}
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen lg:min-w-0 lg:w-[300px] lg:flex-shrink-0 xl:w-[var(--right-sidebar-width)]">
          <RightSidebar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchNavigate={() => setView('search')}
          />
        </div>
      </div>

      {/* Mobile bottom nav — fixed, outside flow */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <MobileBottomNav
          onHomeClick={() => setView('feed')}
          onSearchClick={() => setView('search')}
          onRateClick={() => setComposeOpen(true)}
          onNotificationsClick={() => setView('notifications')}
          onMessagesClick={() => setView('messages')}
          notificationUnreadCount={notificationUnreadCount}
          isHomeActive={view === 'feed'}
          isSearchActive={view === 'search'}
          isNotificationsActive={view === 'notifications'}
          isMessagesActive={view === 'messages'}
        />
      </div>
    </div>
  )
}

export default App
