import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import clsx from 'clsx';

// Helper component for buffered inputs (commits on blur/enter)
const BufferedInput = ({
    value,
    onChange,
    type = "text",
    className = "",
    step
}: {
    value: string | number,
    onChange: (val: string) => void,
    type?: string,
    className?: string,
    step?: string
}) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleCommit = () => {
        if (localValue !== value) {
            onChange(localValue.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input
            type={type}
            step={step}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            className={className}
        />
    );
};

export const Sidebar: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const {
        nodes,
        selection,
        updateNode,
        updateNodeId,
        removeNode,
        addRelationship,
        removeRelationship,
        addChange,
        updateChange,
        removeChange
    } = useGraphStore();

    // Determine what to show based on selection
    const primaryId = selection.length > 0 ? selection[selection.length - 1] : null;
    const selectedNode = nodes.find(n => n.id === primaryId);

    // Helper to handle color picker
    const handleColorPick = (hex: string) => {
        if (!selectedNode) return;
        // Hex is #RRGGBB, we need FF + RRGGBB
        const val = hex.replace('#', '');
        updateNode(selectedNode.id, { color: "FF" + val.toUpperCase() });
    };

    const handleColorText = (val: string) => {
        if (!selectedNode) return;
        updateNode(selectedNode.id, { color: val });
    };

    // Render Content
    const renderContent = () => {
        if (selection.length === 0) {
            return <div className="text-gray-500 text-center mt-10">Select a node to edit</div>;
        }

        if (selection.length > 1) {
            return (
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-4 text-white">Multiple Selection</h2>
                    <div className="text-gray-400 mb-4">{selection.length} nodes selected</div>

                    <div className="bg-gray-800 p-4 rounded border border-gray-700 mb-4">
                        <p className="text-sm text-gray-300 mb-2">Bulk Actions</p>
                        <button
                            onClick={() => selection.forEach(id => removeNode(id))}
                            className="w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Delete All Selected
                        </button>
                    </div>

                    <div className="text-xs text-gray-500">
                        Bulk property editing is not yet supported.
                    </div>
                </div>
            );
        }

        if (!selectedNode) return null;

        const hexForPicker = "#" + selectedNode.color.substring(2);

        return (
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                <h2 className="text-xl font-bold mb-4 text-white">Node Properties</h2>

                {/* Basic Info */}
                <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-1">ID (Unique)</label>
                    <BufferedInput
                        value={selectedNode.id}
                        onChange={(val) => updateNodeId(selectedNode.id, val)}
                        className="w-full bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-1">Display Name</label>
                    <BufferedInput
                        value={selectedNode.displayName}
                        onChange={(val) => updateNode(selectedNode.id, { displayName: val })}
                        className="w-full bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Cost</label>
                        <BufferedInput
                            type="number"
                            value={selectedNode.cost}
                            onChange={(val) => updateNode(selectedNode.id, { cost: parseInt(val) })}
                            className="w-full bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Radius</label>
                        <BufferedInput
                            type="number"
                            step="0.1"
                            value={selectedNode.radius}
                            onChange={(val) => updateNode(selectedNode.id, { radius: parseFloat(val) })}
                            className="w-full bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-1">Color (Alpha + Hex)</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={hexForPicker}
                            onChange={(e) => handleColorPick(e.target.value)}
                            className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                        />
                        <BufferedInput
                            value={selectedNode.color}
                            onChange={(val) => handleColorText(val)}
                            className="flex-1 bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <small className="text-gray-500 text-xs">Format: AARRGGBB (Hex)</small>
                </div>

                <div className="border-b border-[#444] mb-4 pb-1 text-white font-bold">Position</div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {['x', 'y', 'z'].map((axis) => (
                        <div key={axis}>
                            <label className="block text-xs text-gray-400 mb-1">{axis.toUpperCase()}</label>
                            <BufferedInput
                                type="number"
                                step="0.5"
                                value={(selectedNode as any)[axis]}
                                onChange={(val) => updateNode(selectedNode.id, { [axis]: parseFloat(val) })}
                                className="w-full bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    ))}
                </div>

                {/* Relationships */}
                <div className="border-b border-[#444] mb-4 pb-1 text-white font-bold">Relationships</div>

                {['requires', 'orRequires', 'conflicts'].map((type) => (
                    <div key={type} className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1 capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <div className="space-y-1 mb-2">
                            {(selectedNode as any)[type].map((targetId: string) => (
                                <div key={targetId} className="flex justify-between items-center bg-[#252525] border border-[#333] p-2 rounded text-sm text-gray-300">
                                    <span>{targetId}</span>
                                    <button onClick={() => removeRelationship(selectedNode.id, targetId, type as any)} className="text-red-500 hover:text-red-400">✕</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            <select
                                id={`add-${type}`}
                                className="flex-1 bg-[#2a2a2a] border border-[#444] text-white p-1 rounded text-sm"
                            >
                                <option value="">Select Node...</option>
                                {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                                    <option key={n.id} value={n.id}>{n.displayName} ({n.id})</option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    const select = document.getElementById(`add-${type}`) as HTMLSelectElement;
                                    if (select.value) {
                                        addRelationship(selectedNode.id, select.value, type as any);
                                        select.value = "";
                                    }
                                }}
                                className="bg-[#4b5563] hover:bg-[#374151] text-white px-3 rounded"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))}

                {/* Changes */}
                <div className="border-b border-[#444] mb-4 pb-1 text-white font-bold">Changes / Rewards</div>
                <div className="space-y-2 mb-4">
                    {selectedNode.changes.map((change, idx) => (
                        <div key={idx} className="bg-[#2a2a2a] border-l-4 border-indigo-500 p-2 rounded">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-indigo-400 font-bold text-xs">{change.type}</span>
                                <button onClick={() => removeChange(selectedNode.id, idx)} className="text-red-500 hover:text-red-400">✕</button>
                            </div>

                            {change.type === 'STAT_CHANGE' ? (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <label className="block text-gray-500">Stat Type</label>
                                        <BufferedInput
                                            value={change.statType || ''}
                                            onChange={(val) => updateChange(selectedNode.id, idx, { statType: val })}
                                            className="w-full bg-[#1a1a1a] border border-[#444] text-white p-1 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500">Value</label>
                                        <BufferedInput
                                            type="number"
                                            value={change.value || 0}
                                            onChange={(val) => updateChange(selectedNode.id, idx, { value: parseFloat(val) })}
                                            className="w-full bg-[#1a1a1a] border border-[#444] text-white p-1 rounded"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-gray-500">Modifier</label>
                                        <select
                                            value={change.statModifierType}
                                            onChange={(e) => updateChange(selectedNode.id, idx, { statModifierType: e.target.value })}
                                            className="w-full bg-[#1a1a1a] border border-[#444] text-white p-1 rounded"
                                        >
                                            <option value="ADDITIVE">Additive</option>
                                            <option value="ADDITIVE_MULTIPLIER">Additive Multiplier</option>
                                            <option value="COMPOUND_MULTIPLIER">Compound Multiplier</option>
                                            <option value="SETTER">Setter</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="col-span-2">
                                        <label className="block text-gray-500">Spell ID</label>
                                        <BufferedInput
                                            value={change.id || ''}
                                            onChange={(val) => updateChange(selectedNode.id, idx, { id: val })}
                                            className="w-full bg-[#1a1a1a] border border-[#444] text-white p-1 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500">Level</label>
                                        <BufferedInput
                                            type="number"
                                            value={change.level || 1}
                                            onChange={(val) => updateChange(selectedNode.id, idx, { level: parseInt(val) })}
                                            className="w-full bg-[#1a1a1a] border border-[#444] text-white p-1 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-500">Source</label>
                                        <BufferedInput
                                            value={change.sourceData || ''}
                                            onChange={(val) => updateChange(selectedNode.id, idx, { sourceData: val })}
                                            className="w-full bg-[#1a1a1a] border border-[#444] text-white p-1 rounded"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <label className="block text-white font-bold text-sm mb-1">Add New Change</label>
                    <div className="flex gap-1">
                        <select id="new-change-type" className="flex-1 bg-[#2a2a2a] border border-[#444] text-white p-1 rounded text-sm">
                            <option value="STAT_CHANGE">Stat Change</option>
                            <option value="SPELL_CHANGE">Spell Change</option>
                        </select>
                        <button
                            onClick={() => {
                                const select = document.getElementById('new-change-type') as HTMLSelectElement;
                                addChange(selectedNode.id, select.value);
                            }}
                            className="bg-[#4b5563] hover:bg-[#374151] text-white px-3 rounded text-sm"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="mt-8 border-t border-[#666] pt-4">
                    <button
                        onClick={() => removeNode(selectedNode.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded flex items-center justify-center gap-2"
                    >
                        <Trash2 size={16} /> Delete Node
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={clsx(
            "absolute right-0 top-14 bottom-0 bg-[#1e1e1e]/95 border-l border-[#444] backdrop-blur transition-transform duration-300 z-10 w-[380px] flex flex-col",
            collapsed && "translate-x-full"
        )}>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -left-8 top-4 bg-[#1e1e1e] p-1 rounded-l border-y border-l border-[#444] text-white"
            >
                {collapsed ? <ChevronLeft /> : <ChevronRight />}
            </button>
            {renderContent()}
        </div>
    );
};
