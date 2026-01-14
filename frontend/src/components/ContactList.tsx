import React, { useState, useEffect } from 'react'
import { Building2, UserPlus, Pencil } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../auth/AuthProvider'
import EditContactModal from './EditContactModal'
import { API_BASE_URL } from '../config'

interface Contact {
    id: number
    company_name: string
    hr_name: string | null
    email: string | null
    status: string
    context: string | null
    row_index: number
    assigned_to_id?: number | null
}

interface User {
    id: number
    name: string
    role: string
}

interface ContactListProps {
    contacts: Contact[]
    onSelect: (contact: Contact) => void
    selectedId?: number
    onAssign?: (contactIds: number[], userId: number) => void
    onUpdate?: () => void
}

const ContactList: React.FC<ContactListProps> = ({ contacts, onSelect, selectedId, onAssign, onUpdate }) => {
    const { user } = useAuth()
    const [team, setTeam] = useState<User[]>([])
    const [assignOpenId, setAssignOpenId] = useState<number | null>(null)
    const [editingContact, setEditingContact] = useState<Contact | null>(null)

    // Fetch team if Core
    useEffect(() => {
        if (user?.role === 'core') {
            fetch(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            })
                .then(res => res.json())
                .then(data => setTeam(data))
                .catch(err => console.error("Failed to load team", err))
        }
    }, [user])

    const handleAssign = (contactId: number, userId: number) => {
        if (onAssign) {
            onAssign([contactId], userId)
            setAssignOpenId(null)
        }
    }

    const handleEditClick = (e: React.MouseEvent, contact: Contact) => {
        e.stopPropagation()
        setEditingContact(contact)
    }

    if (contacts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Building2 size={20} className="opacity-50" />
                </div>
                <p className="text-sm">No contacts found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-2 pb-2">
            {contacts.map((contact) => (
                <div
                    key={contact.id}
                    onClick={() => onSelect(contact)}
                    className={clsx(
                        "p-3 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-visible", // overflow-visible for dropdown
                        selectedId === contact.id
                            ? "border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-100 ring-1 ring-indigo-500/20"
                            : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50 hover:shadow-sm"
                    )}
                >
                    {selectedId === contact.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                    )}

                    <div className="flex justify-between items-start pl-2">
                        <div className="flex-1 min-w-0">
                            <h3 className={clsx(
                                "font-semibold truncate pr-2",
                                selectedId === contact.id ? "text-indigo-900" : "text-slate-900"
                            )}>{contact.company_name}</h3>

                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        selectedId === contact.id ? "bg-indigo-200 text-indigo-700" : "bg-slate-200 text-slate-600"
                                    )}>
                                        {contact.hr_name ? contact.hr_name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className="truncate max-w-[100px]">{contact.hr_name || "Unknown HR"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handleEditClick(e, contact)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Details"
                                >
                                    <Pencil size={14} />
                                </button>
                                <span className={clsx(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                    contact.status === 'Sent' ? "bg-emerald-100 text-emerald-700" :
                                        contact.status === 'Generated' ? "bg-blue-100 text-blue-700" :
                                            "bg-slate-100 text-slate-500"
                                )}>
                                    {contact.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Assignment UI for Core */}
                    {user?.role === 'core' && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between pl-2" onClick={e => e.stopPropagation()}>
                            <div className="text-xs text-slate-400 font-medium">
                                {contact.assigned_to_id ? (
                                    <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        Assigned to {team.find(u => u.id === contact.assigned_to_id)?.name || 'Unknown'}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                        Unassigned
                                    </span>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setAssignOpenId(assignOpenId === contact.id ? null : contact.id)}
                                    className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-100"
                                    title="Assign to team member"
                                >
                                    <UserPlus size={14} />
                                </button>

                                {assignOpenId === contact.id && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Assign to...
                                        </div>
                                        <div className="max-h-48 overflow-y-auto p-1">
                                            {team.map(member => (
                                                <button
                                                    key={member.id}
                                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                                                    onClick={() => handleAssign(contact.id, member.id)}
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <span className="truncate">{member.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {editingContact && user && (
                <EditContactModal
                    contact={editingContact}
                    isOpen={true}
                    onClose={() => setEditingContact(null)}
                    onSave={() => {
                        onUpdate?.()
                    }}
                    token={user.token}
                />
            )}
        </div>
    )
}

export default ContactList
