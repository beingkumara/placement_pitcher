import React, { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const AddCore: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [secret, setSecret] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/create-core`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    admin_secret: secret
                })
            });

            if (response.ok) {
                setMsg({ type: 'success', text: `Core user ${email} created successfully! Invitation sent.` });
                setName('');
                setEmail('');
                setSecret('');
            } else {
                const contentType = response.headers.get("content-type");
                let errorMessage = 'Failed to create core user';

                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    errorMessage = data.detail || errorMessage;
                } else {
                    const text = await response.text();
                    errorMessage = text || response.statusText;
                }

                setMsg({ type: 'error', text: errorMessage });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Network error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                        <Shield className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Create Core Admin</h2>
                    <p className="text-slate-400 text-sm mt-1">Restricted Area - Authorized Personnel Only</p>
                </div>

                <div className="p-8">
                    {msg && (
                        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {msg.type === 'success' ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                            <p>{msg.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                placeholder="Core Admin Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                placeholder="admin@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Secret</label>
                            <input
                                type="password"
                                required
                                value={secret}
                                onChange={e => setSecret(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm"
                                placeholder="Enter secret key"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Core Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                            ← Return to Login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddCore;
