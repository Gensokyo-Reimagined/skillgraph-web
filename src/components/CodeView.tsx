import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface CodeViewProps {
    isOpen: boolean;
    onClose: () => void;
    data: Record<string, any>;
}

export const CodeView: React.FC<CodeViewProps> = ({ isOpen, onClose, data }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const jsonString = JSON.stringify(data, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[#1e1e1e] border border-[#444] rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#444]">
                    <h2 className="text-xl font-bold text-white">Graph Data (JSON)</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 bg-[#111] custom-scrollbar">
                    <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
                        {jsonString}
                    </pre>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#444] flex justify-end">
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};
