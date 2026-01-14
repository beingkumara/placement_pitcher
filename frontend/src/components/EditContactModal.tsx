import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Contact {
    id: number;
    company_name: string;
    hr_name: string | null;
    email: string | null;
    status: string;
    context: string | null;
    row_index: number;
    assigned_to_id?: number | null;
}

interface EditContactModalProps {
    contact: Contact;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedContact: Contact) => void;
    token: string;
}

const EditContactModal: React.FC<EditContactModalProps> = ({ contact, isOpen, onClose, onSave, token }) => {
    const [hrName, setHrName] = useState(contact.hr_name || '');
    const [email, setEmail] = useState(contact.email || '');
    const [context, setContext] = useState(contact.context || '');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/contacts/${contact.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    hr_name: hrName,
                    email: email,
                    context: context
                })
            });

            if (res.ok) {
                const updated = await res.json();
                onSave(updated);
                onClose();
            } else {
                alert("Failed to update contact");
            }
        } catch (error) {
            console.error("Error updating contact:", error);
            alert("Error updating contact");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="font-semibold text-slate-900">Edit Contact Details</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-500 text-sm font-medium border border-slate-100">
                            {contact.company_name}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">HR Name</label>
                        <input
                            type="text"
                            value={hrName}
                            onChange={e => setHrName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            placeholder="e.g. Jane Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            placeholder="e.g. jane@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Context / Notes</label>
                        <textarea
                            value={context}
                            onChange={e => setContext(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                            placeholder="Add notes about hiring needs, specific roles..."
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditContactModal;
