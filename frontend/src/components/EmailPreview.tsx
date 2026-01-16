import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Send, Loader2, RefreshCw, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthProvider';
import { API_BASE_URL } from '../config';


interface Contact {
    id: string;
    company_name: string;
    hr_name: string | null;
    email: string | null;
    additional_emails?: string | null;
    phone: string | null;
    phone_numbers?: string | null;
    linkedin: string | null;
    status: string;
    context: string | null;
    row_index: number;
    replies?: { id: string; subject: string; body: string; received_at: string; sender_email: string; message_id?: string; messageId?: string }[];
    sent_emails?: { id: string; subject: string; body: string; sent_at: string; attachment_names?: string | null; message_id?: string; messageId?: string }[];
}

interface Draft {
    subject: string;
    body: string;
    hasGenerated: boolean;
}

interface EmailPreviewProps {
    contact: Contact;
    initialDraft?: Draft;
    onDraftUpdate?: (draft: Draft) => void;
    onEmailSent: (contact: Contact) => void;
}

const EmailPreview: React.FC<EmailPreviewProps> = ({ contact, initialDraft, onDraftUpdate, onEmailSent }) => {
    const { user } = useAuth();
    const [subject, setSubject] = useState(initialDraft?.subject || '');
    const [body, setBody] = useState(initialDraft?.body || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(initialDraft?.hasGenerated || false);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Reset state when contact changes, prioritizing initialDraft if available
    useEffect(() => {
        if (initialDraft) {
            setSubject(initialDraft.subject);
            setBody(initialDraft.body);
            setHasGenerated(initialDraft.hasGenerated);
        } else {
            // Check for history to pre-fill subject (Re: ...)
            const rawReplies = contact.replies || (contact as any).replies || [];
            const rawSent = contact.sent_emails || (contact as any).sentEmails || [];

            const replies = rawReplies.map((r: any) => ({
                date: new Date(r.received_at || r.receivedAt),
                subject: r.subject
            }));
            const sents = rawSent.map((s: any) => ({
                date: new Date(s.sent_at || s.sentAt),
                subject: s.subject
            }));

            const thread = [...replies, ...sents].sort((a, b) => a.date.getTime() - b.date.getTime());

            if (thread.length > 0) {
                const lastSubject = thread[thread.length - 1].subject;
                // Prevent stacking Re: Re:
                const cleanSubject = lastSubject.replace(/^(Re:\s*)+/i, '');
                setSubject(`Re: ${cleanSubject}`);
            } else {
                setSubject('');
            }

            setBody('');
            setHasGenerated(false);
            setFiles([]);
        }
    }, [contact.id, initialDraft]); // dependency on contact.id is key

    // Sync changes back to parent
    useEffect(() => {
        if (onDraftUpdate) {
            if (subject || body || hasGenerated) {
                onDraftUpdate({
                    subject,
                    body,
                    hasGenerated
                });
            }
        }
    }, [subject, body, hasGenerated]);

    const handleGenerate = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/generate-email`, {
                contact_id: contact.id
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setSubject(response.data.subject);
            setBody(response.data.body);
            setHasGenerated(true);
            toast.success("Draft generated successfully!");
        } catch (error) {
            console.error("Generation failed", error);
            toast.error("Failed to generate email.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!user) return;
        if (!contact.email) {
            toast.error("No email address for this contact.");
            return;
        }
        setIsSending(true);
        try {
            // Find the last message ID to reply to
            console.log("Contact object for threading:", contact);
            let lastMessageId = "";

            // Robust access to arrays (snake_case or camelCase)
            const rawReplies = contact.replies || (contact as any).replies || [];
            const rawSentEmails = contact.sent_emails || (contact as any).sentEmails || [];

            const replies = rawReplies.map((r: any) => ({
                date: new Date(r.received_at || r.receivedAt),
                // Handle both snake_case (API default) and camelCase (potential override)
                messageId: r.message_id || r.messageId
            }));

            const sents = rawSentEmails.map((s: any) => ({
                date: new Date(s.sent_at || s.sentAt),
                messageId: s.message_id || s.messageId
            }));

            const thread = [...replies, ...sents].sort((a, b) => a.date.getTime() - b.date.getTime());
            console.log("Thread sorted:", thread);

            if (thread.length > 0) {
                const lastMsg = thread[thread.length - 1];
                if (lastMsg.messageId) {
                    lastMessageId = lastMsg.messageId;
                    console.log("Found lastMessageId:", lastMessageId);
                } else {
                    console.warn("Last message in thread has no messageId!", lastMsg);
                }
            }

            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('body', body);
            formData.append('contact_email', contact.email);
            formData.append('contact_company_name', contact.company_name);

            if (lastMessageId) {
                formData.append('in_reply_to_message_id', lastMessageId);
            } else {
                console.warn("No in_reply_to_message_id found to append. New thread will be created.");
            }

            files.forEach(file => {
                formData.append('files', file);
            });

            await axios.post(`${API_BASE_URL}/api/send-email`, formData, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success(`Email sent successfully to ${contact.email}!`);
            onEmailSent({ ...contact, status: 'Sent' });
            setSubject('');
            setBody('');
            setHasGenerated(false);
            setFiles([]);
        } catch (error) {
            console.error("Sending failed", error);
            toast.error("Failed to send email. Check SMTP configuration.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-start gap-4 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm">
                    {contact.company_name.charAt(0)}
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">{contact.company_name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-semibold uppercase">To</span>
                            <span className="font-medium text-slate-700">{contact.hr_name || "Hiring Manager"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-semibold uppercase">Email</span>
                            <span className="font-medium text-slate-700 font-mono bg-slate-100 px-1 rounded">{contact.email || "N/A"}</span>
                        </div>
                    </div>
                </div>
                {contact.context && (
                    <div className="max-w-xs bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                        <span className="font-bold mb-1 block">Context Notes:</span>
                        {contact.context}
                    </div>
                )}
            </div>

            {/* Thread History - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 border-b border-slate-100 min-h-0">
                {(() => {
                    const rawReplies = contact.replies || (contact as any).replies || [];
                    const rawSent = contact.sent_emails || (contact as any).sentEmails || [];

                    const replies = rawReplies.map((r: any) => ({
                        type: 'received',
                        id: r.id,
                        date: new Date(r.received_at || r.receivedAt),
                        subject: r.subject,
                        body: r.body,
                        sender: r.sender_email || r.fromEmail
                    }));

                    const sents = rawSent.map((s: any) => ({
                        type: 'sent',
                        id: s.id,
                        date: new Date(s.sent_at || s.sentAt),
                        subject: s.subject,
                        body: s.body,
                        sender: 'You',
                        attachments: (s.attachment_names || s.attachmentNames) ? (s.attachment_names || s.attachmentNames).split(',') : []
                    }));

                    const thread = [...replies, ...sents].sort((a, b) => a.date.getTime() - b.date.getTime());

                    if (thread.length === 0) {
                        return (
                            <div className="text-center text-slate-400 py-8 text-sm italic">
                                No history found.
                            </div>
                        )
                    }

                    return thread.map((msg) => (
                        <div key={`${msg.type}-${msg.id}`} className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.type === 'sent'
                                ? 'bg-indigo-600 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                                }`}>
                                <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                                    <span className="font-bold">{msg.type === 'sent' ? 'To: ' + contact.hr_name : msg.sender}</span>
                                    <span>{msg.date.toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}</span>
                                </div>
                                <div className="font-bold text-sm mb-1 opacity-90 border-b border-white/20 pb-1">{msg.subject}</div>
                                <div className="text-sm whitespace-pre-wrap leading-relaxed mt-1">{msg.body}</div>
                                {(msg as any).attachments && (msg as any).attachments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                                        {(msg as any).attachments.map((att: string, i: number) => (
                                            <div key={i} className="flex items-center gap-1 bg-black/10 px-2 py-1 rounded text-xs">
                                                <Paperclip size={10} />
                                                <span className="truncate max-w-[150px]">{att}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                })()}
            </div>

            {/* Compose Area - Fixed Height */}
            <div className="h-[400px] flex-shrink-0 flex flex-col border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 bg-white">
                {!hasGenerated && !subject ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-pattern-dots">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="relative px-8 py-4 bg-white ring-1 ring-slate-900/5 rounded-full leading-none flex items-center gap-3 shadow-xl transform transition-transform group-hover:scale-105"
                            >
                                {isGenerating ? (
                                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                                ) : (
                                    <Sparkles className="text-indigo-600" size={24} />
                                )}
                                <span className="font-bold text-lg text-indigo-900">
                                    {isGenerating ? "Generating Magic..." : "Generate AI Pitch"}
                                </span>
                            </button>
                        </div>
                        <p className="text-slate-400 mt-6 text-sm max-w-md text-center">
                            Our agent will analyze the company context and draft a personalized outreach email for you to review.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
                        <div className="relative">
                            <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-bold text-indigo-600 uppercase tracking-widest z-10 shadow-sm border border-slate-100 rounded">Subject</label>
                            <input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium text-slate-800 shadow-sm transition-all hover:border-indigo-300"
                            />
                        </div>

                        <div className="flex-1 relative flex flex-col min-h-0">
                            <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-bold text-indigo-600 uppercase tracking-widest z-10 shadow-sm border border-slate-100 rounded">Message Body</label>
                            <div className="flex-1 border border-slate-200 rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent shadow-sm transition-all hover:border-indigo-300 bg-white">
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="w-full h-full p-4 outline-none resize-none font-sans text-slate-700 leading-relaxed text-base rounded-md"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleGenerate}
                                    className="text-slate-400 hover:text-indigo-600 text-sm font-medium flex items-center gap-1.5 transition-colors mr-2"
                                >
                                    <RefreshCw size={14} /> Regenerate
                                </button>

                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-slate-500 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                                    title="Attach files"
                                >
                                    <Paperclip size={18} />
                                </button>
                                {files.length > 0 && (
                                    <div className="flex gap-2 ml-2">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center gap-1 bg-slate-100 text-xs text-slate-700 px-2 py-1 rounded-full border border-slate-200">
                                                <span className="truncate max-w-[100px]">{f.name}</span>
                                                <button onClick={() => removeFile(i)} className="hover:text-red-500"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={isSending || !contact.email}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5"
                            >
                                {isSending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                                Send Email
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailPreview;
