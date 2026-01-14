import React, { useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import axios from 'axios';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface FileUploadProps {
    onUpload: (contacts: any[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
    const { user } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file || !user) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${user.token}`
                },
            });
            onUpload(response.data);
        } catch (error) {
            console.error("Upload failed", error);
            // Use parent error handling if possible, or toast
        } finally {
            setIsUploading(false);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div
            className={`group relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer border-2 border-dashed
        ${isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]'
                    : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                }
        ${isUploading ? 'pointer-events-none' : ''}
      `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                className="hidden"
                accept=".xlsx,.xls,.csv"
            />

            <div className="p-8 flex flex-col items-center justify-center text-center relative z-10">
                {isUploading ? (
                    <>
                        <div className="relative mb-4">
                            <div className="absolute inset-0 rounded-full blur-md bg-indigo-400/30 animate-pulse"></div>
                            <Loader2 className="animate-spin text-indigo-600 relative z-10" size={32} />
                        </div>
                        <p className="text-sm font-semibold text-indigo-900">Processing Data...</p>
                        <p className="text-xs text-indigo-500 mt-1">Parsing your contact list</p>
                    </>
                ) : (
                    <>
                        <div className={`p-3 rounded-full mb-3 transition-colors duration-300 ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                            <FileSpreadsheet size={24} />
                        </div>
                        <p className="font-semibold text-slate-700 group-hover:text-indigo-900 transition-colors">
                            Click to upload
                        </p>
                        <p className="text-xs text-slate-400 mt-1 group-hover:text-slate-500">
                            or drag and drop Excel/CSV
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
