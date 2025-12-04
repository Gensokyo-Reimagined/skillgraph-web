import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface CodeViewProps {
    isOpen: boolean;
    onClose: () => void;
    data: Record<string, any>;
    onUpdate: (data: Record<string, any>) => void;
}

export const CodeView: React.FC<CodeViewProps> = ({ isOpen, onClose, data, onUpdate }) => {
    const [copied, setCopied] = useState(false);
    const [jsonString, setJsonString] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Initialize state when data changes or modal opens
    React.useEffect(() => {
        if (isOpen) {
            setJsonString(JSON.stringify(data, null, 2));
            setError(null);
        }
    }, [isOpen, data]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUpdate = () => {
        try {
            const parsed = JSON.parse(jsonString);
            onUpdate(parsed);
            onClose();
        } catch (e) {
            setError((e as Error).message);
        }
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
                <div className="flex-1 p-4 bg-[#111] flex flex-col gap-2">
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 p-2 rounded text-sm">
                            Invalid JSON: {error}
                        </div>
                    )}
                    <textarea
                        value={jsonString}
                        onChange={(e) => setJsonString(e.target.value)}
                        className="flex-1 w-full bg-[#111] text-green-400 font-mono text-sm p-2 resize-none focus:outline-none custom-scrollbar"
                        spellCheck={false}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#444] flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Edit the JSON and click Update to apply changes.
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                                }`}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={handleUpdate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors"
                        >
                            Update Graph
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
