import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import CompanyTable from './components/CompanyTable'
import EmailPreview from './components/EmailPreview'
import SentEmailsList from './components/SentEmailsList'
import TeamManagement from './components/TeamManagement'
import Login from './components/Login'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Toaster, toast } from 'sonner'
import { Upload, Mail, Users, Send, LayoutDashboard, Settings, LogOut, UserCheck, RefreshCw } from 'lucide-react'
import SetupAccount from './components/SetupAccount'
import AddCore from './components/AddCore'
import { API_BASE_URL } from './config'


// Types locally defined or imported
interface Contact {
  id: string
  company_name: string
  hr_name: string | null
  email: string | null
  additional_emails?: string | null
  phone: string | null
  phone_numbers?: string | null
  linkedin: string | null
  status: string
  context: string | null
  row_index: number
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  created_by_id?: string | null
  replies?: EmailReply[]
  sent_emails?: ContactSentEmail[]
}

interface EmailReply {
  id: string
  subject: string
  body: string
  received_at: string
  sender_email: string
}

// For the nested history
interface ContactSentEmail {
  id: string
  subject: string
  body: string
  sent_at: string
  attachment_names?: string | null
}

// For the main "Sent" tab list
interface SentEmailSummary {
  id: string
  subject: string
  sent_at: string
  contact_company: string
  contact_email: string
}

interface Draft {
  subject: string
  body: string
  hasGenerated: boolean
}

interface Settings {
  id?: string
  placementStats: {
    totalStudents: number
    placedInterns: number
    securedPPO: number
  }
  brochureUrl: string
}

function DashboardContent() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'sent' | 'team'>('dashboard')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [sentEmails, setSentEmails] = useState<SentEmailSummary[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [settings, setSettings] = useState<Settings>({
    placementStats: { totalStudents: 0, placedInterns: 0, securedPPO: 0 },
    brochureUrl: ''
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Drafts state persisted in localStorage
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const saved = localStorage.getItem('pitch_drafts')
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    localStorage.setItem('pitch_drafts', JSON.stringify(drafts))
  }, [drafts])

  const fetchData = async () => {
    try {
      if (!user) return

      const headers = { 'Authorization': `Bearer ${user.token}` }

      const contactsRes = await fetch(`${API_BASE_URL}/api/contacts`, { headers })
      if (contactsRes.ok) {
        const data = await contactsRes.json()
        setContacts(data as Contact[])

        // Update selectedContact if it exists to show new data (like new sent email)
        if (selectedContact) {
          const updated = (data as Contact[]).find(c => c.id === selectedContact.id)
          if (updated) {
            setSelectedContact(updated)
          }
        }
      }

      const emailsRes = await fetch(`${API_BASE_URL}/api/sent-emails`, { headers })
      if (emailsRes.ok) {
        const data = await emailsRes.json()
        setSentEmails(data)
      }

      const settingsRes = await fetch(`${API_BASE_URL}/api/settings`, { headers })
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        // Ensure structure if backend returns nulls or default
        if (!data.placementStats) {
          data.placementStats = { totalStudents: 0, placedInterns: 0, securedPPO: 0 }
        }
        setSettings(data)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }
  }

  const checkReplies = async () => {
    try {
      if (!user) return
      const promise = fetch(`${API_BASE_URL}/api/check-replies`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      }).then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || "Failed")
        return data
      })

      toast.promise(promise, {
        loading: 'Checking inbox for new replies...',
        success: (data: any) => {
          fetchData()
          return data.message
        },
        error: 'Failed to check replies'
      })

    } catch (error) {
      console.error("Failed to check replies:", error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, user])

  const handleDraftUpdate = (contactId: string, draft: Draft) => {
    setDrafts(prev => ({ ...prev, [contactId]: draft }))
  }

  const handleDraftClear = (contactId: string) => {
    setDrafts(prev => {
      const newDrafts = { ...prev }
      delete newDrafts[contactId]
      return newDrafts
    })
  }

  const handleAssign = async (contactIds: string[], userId: string) => {
    try {
      if (!user) return

      const res = await fetch(`${API_BASE_URL}/api/contacts/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ contact_ids: contactIds, user_id: userId })
      })

      if (res.ok) {
        // Refresh contacts to show assignment
        fetchData()
      } else {
        alert("Failed to assign contacts")
      }
    } catch (e) {
      console.error("Assignment error:", e)
    }
  }

  const handleSaveSettings = async () => {
    try {
      if (!user) return
      setIsSavingSettings(true)
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        toast.success("Settings saved successfully")
      } else {
        toast.error("Failed to save settings")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error saving settings")
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-800 font-sans">
      <Toaster position="top-right" theme="light" closeButton richColors />

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <Send size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Placement<br /><span className="text-indigo-400">Pitcher</span></h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">Main</div>
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem
            icon={<Users size={20} />}
            label="Contacts" // Renamed from Companies to Contacts to match
            active={activeTab === 'contacts'}
            onClick={() => setActiveTab('contacts')}
          />
          <SidebarItem
            icon={<Send size={20} />}
            label="Sent"
            active={activeTab === 'sent'}
            onClick={() => setActiveTab('sent')}
          />

          {user?.role === 'core' && (
            <>
              <div className="mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">Admin</div>
              <SidebarItem
                icon={<UserCheck size={20} />}
                label="Team Management"
                active={activeTab === 'team'}
                onClick={() => setActiveTab('team')}
              />
            </>
          )}

          <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">System</div>
          <SidebarItem
            icon={<Settings size={20} />}
            label="Settings"
            active={activeTab === 'dashboard' ? false : activeTab === 'contacts' ? false : activeTab === 'sent' ? false : activeTab === 'team' ? false : true}
            onClick={() => setActiveTab('settings' as any)}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center font-bold text-slate-900 text-xs">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none" />

        <header className="px-8 py-6 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">{activeTab === 'team' ? 'Team Management' : activeTab}</h2>
            <p className="text-slate-500">
              {activeTab === 'dashboard' && 'Overview of your placement activities'}
              {activeTab === 'contacts' && 'Manage your company contacts and pitches'}
              {activeTab === 'sent' && 'History of sent emails'}
              {activeTab === 'team' && 'Manage team members and assignments'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={checkReplies}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Check Replies</span>
            </button>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase border border-indigo-100">
              {user?.role} Mode
            </span>
          </div>
        </header>

        <div className="flex-1 p-8 pt-0 overflow-y-auto min-h-0">

          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Total Contacts</h3>
                  <p className="text-3xl font-bold text-slate-900">{contacts.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Emails Sent</h3>
                  <p className="text-3xl font-bold text-indigo-600">{sentEmails.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Pending</h3>
                  <p className="text-3xl font-bold text-amber-500">{contacts.filter(c => c.status === 'Pending').length}</p>
                </div>
              </div>

              <div className="h-[600px]">
                <CompanyTable
                  contacts={contacts}
                  onUpdate={fetchData}
                  onAssign={handleAssign}
                  onSelect={(c) => {
                    setSelectedContact(c)
                    setActiveTab('contacts')
                  }}
                  selectedId={selectedContact?.id}
                />
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="grid grid-cols-12 gap-8 h-full">
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full pb-4">
                {user?.role === 'core' && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 card-hover">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Upload size={18} /></div>
                      Import Data
                    </h3>
                    <FileUpload onUpload={() => {
                      // After upload, we should refresh data properly
                      fetchData()
                    }} />
                  </div>
                )}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col min-h-0 overflow-hidden card-hover">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600"><Users size={18} /></div>
                      Select Contact
                    </h3>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-slate-200">
                      {contacts.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {contacts.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedContact?.id === contact.id
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                          : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-semibold text-sm ${selectedContact?.id === contact.id ? 'text-indigo-700' : 'text-slate-900'}`}>{contact.company_name}</h4>
                          {contact.status === 'Sent' && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Sent"></div>}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                          <span className="font-medium text-slate-700">{contact.hr_name || 'No Name'}</span>
                          <span className="truncate">{contact.email || 'No Email'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8 h-full pb-4">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 h-full flex flex-col overflow-hidden relative">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><Mail size={18} /></div>
                      Pitch Generator
                    </h3>
                  </div>

                  <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                    {selectedContact ? (
                      <EmailPreview
                        contact={selectedContact}
                        initialDraft={selectedContact.id ? drafts[selectedContact.id] : undefined}
                        onDraftUpdate={(draft) => selectedContact.id && handleDraftUpdate(selectedContact.id, draft)}
                        onEmailSent={(updatedContact) => {
                          if (selectedContact.id) handleDraftClear(selectedContact.id)
                          // Update local state
                          setContacts(contacts.map(c => c.row_index === updatedContact.row_index ? updatedContact : c))
                          fetchData()
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <Mail size={40} className="text-indigo-200 mb-4" />
                        <p>Select a contact to generate email</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-white">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-50 text-green-600"><Send size={18} /></div>
                    Sent History
                  </h3>
                </div>
                <div className="p-6">
                  <SentEmailsList emails={sentEmails} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && user?.role === 'core' && (
            <TeamManagement />
          )}

          {activeTab === ('settings' as any) && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-white">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600"><Settings size={18} /></div>
                    Global Settings
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Configure global settings for the AI agent (e.g. placement stats, brochure).</p>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-4">Placement Stats (Context for AI)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Total Students</label>
                        <input
                          type="number"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                          value={settings.placementStats.totalStudents}
                          onChange={(e) => setSettings({
                            ...settings,
                            placementStats: { ...settings.placementStats, totalStudents: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Secured Internship</label>
                        <input
                          type="number"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                          value={settings.placementStats.placedInterns}
                          onChange={(e) => setSettings({
                            ...settings,
                            placementStats: { ...settings.placementStats, placedInterns: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Secured PPO</label>
                        <input
                          type="number"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                          value={settings.placementStats.securedPPO}
                          onChange={(e) => setSettings({
                            ...settings,
                            placementStats: { ...settings.placementStats, securedPPO: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">These stats will be formatted and provided to the AI to demonstrate placement success.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Brochure URL</label>
                    <input
                      type="url"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="https://example.com/brochure.pdf"
                      value={settings.brochureUrl}
                      onChange={(e) => setSettings({ ...settings, brochureUrl: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"
                    >
                      {isSavingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-medium'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}>
      <div className={active ? '' : 'text-slate-500 group-hover:text-white transition-colors'}>{icon}</div>
      <span>{label}</span>
    </button>
  )
}

function App() {
  const [setupToken, setSetupToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for token in URL
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    if (token) {
      setSetupToken(token);
    }
  }, []);

  if (setupToken) {
    return <SetupAccount token={setupToken} onSuccess={() => {
      // Clear token from URL and state
      window.history.replaceState({}, document.title, window.location.pathname);
      setSetupToken(null);
    }} />
  }

  // Check for admin route
  if (window.location.pathname === '/secret-core-setup') {
    return <AddCore />
  }

  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  )
}

function AuthWrapper() {
  const { user } = useAuth()
  if (!user) return <Login />
  return <DashboardContent />
}

export default App
