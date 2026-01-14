import { Mail, Calendar, User } from 'lucide-react'

interface SentEmail {
    id: number
    subject: string
    sent_at: string
    contact_company: string
    contact_email: string
}

interface SentEmailsListProps {
    emails: SentEmail[]
}

export default function SentEmailsList({ emails }: SentEmailsListProps) {
    if (emails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Mail size={48} className="mb-4 opacity-20" />
                <p>No emails sent yet</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {emails.map((email) => (
                <div
                    key={email.id}
                    className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200"
                >
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-800">{email.subject}</h4>
                        <div className="flex items-center text-xs text-slate-400 gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                            <Calendar size={12} />
                            {new Date(email.sent_at).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-700">{email.contact_company}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Mail size={14} className="text-slate-400" />
                            <span>{email.contact_email}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
