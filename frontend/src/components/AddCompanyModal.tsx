import React, { useState } from 'react'
import { X, Loader2, Building2, User, Mail, Phone, Linkedin, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import { API_BASE_URL } from '../config'

interface AddCompanyModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        company_name: '',
        hr_name: '',
        email: '',
        phone: '',
        linkedin: '',
        context: ''
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Split emails and phones if comma separated
            const emails = formData.email.split(',').map(s => s.trim()).filter(Boolean)
            const phones = formData.phone.split(',').map(s => s.trim()).filter(Boolean)

            const primaryEmail = emails[0] || null
            const additionalEmails = emails.slice(1).join(', ') || null

            const primaryPhone = phones[0] || null
            const phoneNumbers = phones.slice(1).join(', ') || null

            const body = {
                company_name: formData.company_name,
                hr_name: formData.hr_name || null,
                email: primaryEmail,
                additional_emails: additionalEmails,
                phone: primaryPhone,
                phone_numbers: phoneNumbers,
                linkedin: formData.linkedin || null,
                context: formData.context || null,
                status: 'Pending',
                row_index: 0, // Manual add
                assigned_to_id: user?.role === 'coordinator' ? user.id : null // Backend also handles this, but safe to send
            }

            const res = await fetch(`${API_BASE_URL}/api/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error('Failed to create company')

            toast.success('Company added successfully')
            onSuccess()
            onClose()
            setFormData({
                company_name: '',
                hr_name: '',
                email: '',
                phone: '',
                linkedin: '',
                context: ''
            })
        } catch (error) {
            toast.error('Failed to add company')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900">Add New Company</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">Company Name</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400"><Building2 size={16} /></div>
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                    placeholder="e.g. Google"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">HR Name</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-slate-400"><User size={16} /></div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="Jane Doe"
                                        value={formData.hr_name}
                                        onChange={e => setFormData({ ...formData, hr_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">LinkedIn</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-slate-400"><Linkedin size={16} /></div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="Profile URL"
                                        value={formData.linkedin}
                                        onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">Email Address(es)</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400"><Mail size={16} /></div>
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                    placeholder="Comma separated emails"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">Phone Number(s)</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400"><Phone size={16} /></div>
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                    placeholder="Comma separated phones"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">Context / Notes</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400"><FileText size={16} /></div>
                                <textarea
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm min-h-[80px]"
                                    placeholder="Any specific details for the pitch..."
                                    value={formData.context}
                                    onChange={e => setFormData({ ...formData, context: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Add Company
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddCompanyModal
