import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { UserPlus, Users, Loader2, CheckCircle, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
}

const TeamManagement: React.FC = () => {
    const { user } = useAuth();
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // New user form state
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchTeam = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setTeam(data);
            }
        } catch (error) {
            console.error("Failed to fetch team:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, [user]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setSuccessMsg('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    role: 'COORDINATOR'
                })
            });

            if (response.ok) {
                setSuccessMsg(`Invitation sent to ${newEmail}`);
                setNewName('');
                setNewEmail('');
                fetchTeam();
                setTimeout(() => setSuccessMsg(''), 5000);
            } else {
                const err = await response.json();
                alert(err.detail || 'Failed to create user');
            }
        } catch (error) {
            console.error("Failed to create user:", error);
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="grid grid-cols-12 gap-8 h-full">
            {/* Left: User List */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><Users size={18} /></div>
                            Team Members
                        </h3>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-slate-200">
                            {team.length}
                        </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {team.map((member) => (
                            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{member.name}</p>
                                        <p className="text-sm text-slate-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${member.role === 'core'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                    {member.role.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Add User Form */}
            <div className="col-span-12 lg:col-span-5 h-full">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 sticky top-0">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-green-50 text-green-600"><UserPlus size={18} /></div>
                            Add Coordinator
                        </h3>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            {successMsg && (
                                <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                                    <CheckCircle size={16} /> {successMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    placeholder="e.g. john@example.com"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {createLoading ? <Loader2 className="animate-spin" size={18} /> : 'Create Account'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                            <Shield size={14} className="mt-0.5 shrink-0" />
                            <p>New coordinators will receive an invitation email to set up their account and password.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamManagement;
