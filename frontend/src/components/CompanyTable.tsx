import React, { useState, useEffect } from 'react'
import { Check, X, Pencil, Trash2, ExternalLink, ChevronDown, CheckCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import AddCompanyModal from './AddCompanyModal'

interface Contact {
    id: number
    company_name: string
    hr_name: string | null
    email: string | null
    additional_emails?: string | null
    phone: string | null
    phone_numbers?: string | null
    linkedin: string | null
    status: string
    context: string | null
    assigned_to_id?: number | null
    assigned_to_name?: string | null
    created_by_id?: number | null
    row_index: number
    replies?: EmailReply[]
    sent_emails?: SentEmail[]
}

interface EmailReply {
    id: number
    subject: string
    received_at: string
    body: string
    sender_email: string
}

interface SentEmail {
    id: number
    subject: string
    sent_at: string
    body: string
}

interface User {
    id: number
    name: string
}

interface CompanyTableProps {
    contacts: Contact[]
    onUpdate: () => void
    onAssign: (contactIds: number[], userId: number) => void
    onSelect?: (contact: Contact) => void
    selectedId?: number
}

const CompanyTable: React.FC<CompanyTableProps> = ({ contacts, onUpdate, onAssign, onSelect, selectedId }) => {
    const { user } = useAuth()
    const [team, setTeam] = useState<User[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<Partial<Contact>>({})
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    useEffect(() => {
        if (user?.role === 'core') {
            fetch('http://localhost:8000/api/users', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            })
                .then(res => res.json())
                .then(data => setTeam(data))
                .catch(err => console.error("Failed to load team", err))
        }
    }, [user])

    const startEdit = (contact: Contact) => {
        setEditingId(contact.id)

        // Combine primary and additional for display
        const emailDisplay = [contact.email, contact.additional_emails].filter(Boolean).join(', ')
        const phoneDisplay = [contact.phone, contact.phone_numbers].filter(Boolean).join(', ')

        setEditForm({
            ...contact,
            email: emailDisplay,
            phone: phoneDisplay
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditForm({})
    }

    const saveEdit = async () => {
        if (!editingId) return

        try {
            // Split back to primary and additional
            const emails = (editForm.email || '').split(',').map(s => s.trim()).filter(Boolean)
            const phones = (editForm.phone || '').split(',').map(s => s.trim()).filter(Boolean)

            const body = {
                hr_name: editForm.hr_name,
                context: editForm.context,
                linkedin: editForm.linkedin,

                email: emails[0] || null,
                additional_emails: emails.slice(1).join(', ') || null,

                phone: phones[0] || null,
                phone_numbers: phones.slice(1).join(', ') || null
            }

            const res = await fetch(`http://localhost:8000/api/contacts/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error("Failed to update")

            toast.success("Updated successfully")
            setEditingId(null)
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to update contact")
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this contact?")) return

        try {
            const res = await fetch(`http://localhost:8000/api/contacts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to delete")
            }

            toast.success("Contact deleted")
            // If deleted contact was selected, user parent should handle unselection if desired, 
            // but for now onUpdate will refresh list.
            onUpdate()
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><Building2 size={18} /></div>
                    Company List
                </h3>
                <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-slate-200">
                        {contacts.length} Records
                    </span>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Plus size={14} /> Add New
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">#</th>
                            <th className="px-4 py-3 min-w-[150px]">Company</th>
                            <th className="px-4 py-3 min-w-[120px]">HR Name</th>
                            <th className="px-4 py-3 min-w-[150px]">Assigned To</th>
                            <th className="px-4 py-3 min-w-[200px]">Email</th>
                            <th className="px-4 py-3 min-w-[120px]">Phone</th>
                            <th className="px-4 py-3 w-16 text-center">Link</th>
                            <th className="px-4 py-3 w-16 text-center">Sent</th>
                            <th className="px-4 py-3 min-w-[200px]">Status / Feedback</th>
                            <th className="px-4 py-3 w-20 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {contacts.map((contact, index) => {
                            const isEditing = editingId === contact.id

                            // Determine if user can delete
                            const canDelete = user?.role === 'core' || contact.created_by_id === user?.id
                            // Highlight if selected
                            const isSelected = selectedId === contact.id

                            return (
                                <tr
                                    key={contact.id}
                                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}
                                    onClick={() => !isEditing && onSelect?.(contact)}
                                >
                                    <td className="px-4 py-3 text-center text-slate-400 text-xs">{index + 1}</td>

                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {contact.company_name}
                                    </td>

                                    <td className="px-4 py-3">
                                        {isEditing ? (
                                            <input
                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                                value={editForm.hr_name || ''}
                                                onChange={e => setEditForm({ ...editForm, hr_name: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            contact.hr_name || <span className="text-slate-300">--</span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        {user?.role === 'core' ? (
                                            <div className="relative group">
                                                <select
                                                    className="appearance-none w-full bg-slate-50 border border-transparent hover:border-slate-200 rounded px-2 py-1 text-xs pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    value={contact.assigned_to_id || ''}
                                                    onChange={(e) => onAssign([contact.id], Number(e.target.value))}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {team.map(member => (
                                                        <option key={member.id} value={member.id}>{member.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                                {contact.assigned_to_name || 'Unassigned'}
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        {isEditing ? (
                                            <textarea
                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs min-h-[60px] resize-none"
                                                value={editForm.email || ''}
                                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="Emails (comma separated)"
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-1 max-w-[220px]">
                                                {[contact.email, contact.additional_emails].filter(Boolean).map((segment, i) =>
                                                    // Handle if the segment itself contains commas
                                                    (segment || '').split(',').map(s => s.trim()).filter(Boolean).map((email, j) => (
                                                        <div key={`${i}-${j}`} className="truncate" title={email}>{email}</div>
                                                    ))
                                                )}
                                                {!contact.email && !contact.additional_emails && <span className="text-slate-300">--</span>}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        {isEditing ? (
                                            <textarea
                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs min-h-[60px] resize-none"
                                                value={editForm.phone || ''}
                                                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="Phones (comma separated)"
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-1 max-w-[140px]">
                                                {[contact.phone, contact.phone_numbers].filter(Boolean).map((segment, i) =>
                                                    (segment || '').split(',').map(s => s.trim()).filter(Boolean).map((phone, j) => (
                                                        <div key={`${i}-${j}`} className="truncate" title={phone}>{phone}</div>
                                                    ))
                                                )}
                                                {!contact.phone && !contact.phone_numbers && <span className="text-slate-300">--</span>}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                        {isEditing ? (
                                            <input
                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                                placeholder="URL"
                                                value={editForm.linkedin || ''}
                                                onChange={e => setEditForm({ ...editForm, linkedin: e.target.value })}
                                            />
                                        ) : (
                                            contact.linkedin ? (
                                                <a href={contact.linkedin} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center justify-center">
                                                    <ExternalLink size={14} />
                                                </a>
                                            ) : <span className="text-slate-300">--</span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {contact.status === 'Sent' ? (
                                            <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                                        ) : contact.status === 'Generated' ? (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto" title="Generated"></div>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto" title="Pending"></div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        {isEditing ? (
                                            <textarea
                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs min-h-[40px] resize-none"
                                                value={editForm.context || ''}
                                                onChange={e => setEditForm({ ...editForm, context: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {(() => {
                                                    // Calculate the latest sent email time
                                                    const lastSentTime = contact.sent_emails?.length
                                                        ? Math.max(...contact.sent_emails.map(e => new Date(e.sent_at).getTime()))
                                                        : 0;

                                                    // Filter replies that came AFTER the last sent email
                                                    const unreplied = contact.replies?.filter(r => new Date(r.received_at).getTime() > lastSentTime) || [];

                                                    if (unreplied.length > 0) {
                                                        return (
                                                            <div className="flex flex-wrap gap-1">
                                                                {unreplied.map(r => (
                                                                    <span key={r.id} className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200" title={`Reply: ${r.subject}`}>
                                                                        Reply Rx
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                <div className="text-xs text-slate-500 line-clamp-2" title={contact.context || ''}>
                                                    {contact.context || <span className="text-slate-300 italic">No notes</span>}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={saveEdit} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"><Check size={14} /></button>
                                                    <button onClick={cancelEdit} className="text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"><X size={14} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(contact)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"><Pencil size={14} /></button>
                                                    {canDelete && (
                                                        <button onClick={() => handleDelete(contact.id)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <AddCompanyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={onUpdate}
            />
        </div>
    )
}

function Building2({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>
    )
}

export default CompanyTable
