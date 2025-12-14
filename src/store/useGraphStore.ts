import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export interface ChangeData {
    type: string;
    // Stat Change
    statType?: string;
    statModifierType?: string;
    value?: number;
    // Spell Change
    id?: string;
    level?: number;
    sourceData?: string;
}

export interface NodeData {
    id: string;
    displayName: string;
    x: number;
    y: number;
    z: number;
    cost: number;
    radius: number;
    color: string; // AARRGGBB
    requires: string[];
    orRequires: string[];
    conflicts: string[];
    activatedItem?: { id: string; count: number };
    deactivatedItem?: { id: string; count: number };
    activatableItem?: { id: string; count: number };
    changes: ChangeData[];
}

interface GraphState {
    nodes: NodeData[];
    selection: string[]; // Changed to array
    options: {
        snap: boolean;
        glow: boolean;
        showNames: boolean;
        showSelectedLinesOnly: boolean;
        canvasMode: boolean;
    };
    pickingMode: {
        isActive: boolean;
        type: 'requires' | 'orRequires' | 'conflicts' | null;
        sourceId: string | null;
    };

    // Interaction State
    isDragging: boolean;
    hoveredStack: { x: number, z: number } | null;

    // Actions
    addNode: () => void;
    addNodes: (nodes: NodeData[]) => void;
    updateNode: (id: string, data: Partial<NodeData>) => void;
    updateNodeId: (oldId: string, newId: string) => boolean;
    removeNode: (id: string) => void;

    selectNode: (id: string | null, multi?: boolean) => void;

    // Relationship Actions
    addRelationship: (sourceId: string, targetId: string, type: 'requires' | 'orRequires' | 'conflicts') => void;
    removeRelationship: (sourceId: string, targetId: string, type: 'requires' | 'orRequires' | 'conflicts') => void;

    // Change Actions
    addChange: (nodeId: string, type: string) => void;
    updateChange: (nodeId: string, index: number, data: Partial<ChangeData>) => void;
    removeChange: (nodeId: string, index: number) => void;

    toggleOption: (key: keyof GraphState['options']) => void;
    importGraph: (data: Record<string, any>) => void;

    focusTrigger: number;
    triggerFocus: () => void;

    startPicking: (sourceId: string, type: 'requires' | 'orRequires' | 'conflicts') => void;
    stopPicking: () => void;

    setIsDragging: (isDragging: boolean) => void;
    setHoveredStack: (stack: { x: number, z: number } | null) => void;
}

export const useGraphStore = create<GraphState>()(
    temporal(
        persist(
            (set, get) => ({
                nodes: [],
                selection: [],
                options: {
                    snap: false,
                    glow: true,
                    showNames: true,
                    showSelectedLinesOnly: false,
                    canvasMode: false,
                },
                pickingMode: {
                    isActive: false,
                    type: null,
                    sourceId: null
                },

                isDragging: false,
                hoveredStack: null,

                addNode: () => set((state) => {
                    const id = "node_" + Math.floor(Math.random() * 10000);
                    return {
                        nodes: [...state.nodes, {
                            id,
                            displayName: "New Skill",
                            x: 0, y: 2, z: 0,
                            cost: 1,
                            radius: 0.5,
                            color: "FFFFFFFF",
                            requires: [],
                            orRequires: [],
                            conflicts: [],
                            changes: [],
                            activatedItem: { id: "minecraft:iron_block", count: 1 },
                            deactivatedItem: { id: "minecraft:redstone_block", count: 1 },
                            activatableItem: { id: "minecraft:netherrack", count: 1 }
                        }],
                        selection: [id] // Select new node
                    };
                }),

                addNodes: (newNodes) => set((state) => ({
                    nodes: [...state.nodes, ...newNodes],
                    selection: newNodes.map(n => n.id)
                })),

                updateNode: (id, data) => {
                    set((state) => ({
                        nodes: state.nodes.map((node) =>
                            node.id === id ? { ...node, ...data } : node
                        )
                    }));
                },

                updateNodeId: (oldId, newId) => {
                    const state = get();
                    if (state.nodes.some(n => n.id === newId)) return false;

                    set((state) => {
                        const updatedNodes = state.nodes.map(n =>
                            n.id === oldId ? { ...n, id: newId } : n
                        );

                        const finalNodes = updatedNodes.map(n => ({
                            ...n,
                            requires: n.requires.map(r => r === oldId ? newId : r),
                            orRequires: n.orRequires.map(r => r === oldId ? newId : r),
                            conflicts: n.conflicts.map(r => r === oldId ? newId : r),
                        }));

                        return {
                            nodes: finalNodes,
                            selection: state.selection.map(s => s === oldId ? newId : s)
                        };
                    });
                    return true;
                },

                removeNode: (id) => set((state) => ({
                    nodes: state.nodes
                        .filter((n) => n.id !== id)
                        .map(n => ({
                            ...n,
                            requires: n.requires.filter(r => r !== id),
                            orRequires: n.orRequires.filter(r => r !== id),
                            conflicts: n.conflicts.filter(r => r !== id),
                        })),
                    selection: state.selection.filter(s => s !== id),
                })),

                selectNode: (id, multi = false) => set((state) => {
                    if (id === null) return { selection: [] };
                    if (multi) {
                        if (state.selection.includes(id)) {
                            return { selection: state.selection.filter(s => s !== id) };
                        } else {
                            return { selection: [...state.selection, id] };
                        }
                    }
                    return { selection: [id] };
                }),

                addRelationship: (sourceId, targetId, type) => set((state) => ({
                    nodes: state.nodes.map(n => {
                        if (n.id !== sourceId) return n;
                        if (n[type].includes(targetId)) return n;
                        return { ...n, [type]: [...n[type], targetId] };
                    })
                })),

                removeRelationship: (sourceId, targetId, type) => set((state) => ({
                    nodes: state.nodes.map(n => {
                        if (n.id !== sourceId) return n;
                        return { ...n, [type]: n[type].filter(t => t !== targetId) };
                    })
                })),

                addChange: (nodeId, type) => set((state) => ({
                    nodes: state.nodes.map(n => {
                        if (n.id !== nodeId) return n;
                        const newChange: ChangeData = { type };
                        if (type === 'STAT_CHANGE') {
                            newChange.statType = "HEALTH";
                            newChange.statModifierType = "ADDITIVE";
                            newChange.value = 10;
                        } else {
                            newChange.id = "fireball";
                            newChange.level = 1;
                            newChange.sourceData = "";
                        }
                        return { ...n, changes: [...n.changes, newChange] };
                    })
                })),

                updateChange: (nodeId, index, data) => set((state) => ({
                    nodes: state.nodes.map(n => {
                        if (n.id !== nodeId) return n;
                        const newChanges = [...n.changes];
                        newChanges[index] = { ...newChanges[index], ...data };
                        return { ...n, changes: newChanges };
                    })
                })),

                removeChange: (nodeId, index) => set((state) => ({
                    nodes: state.nodes.map(n => {
                        if (n.id !== nodeId) return n;
                        return { ...n, changes: n.changes.filter((_, i) => i !== index) };
                    })
                })),

                toggleOption: (key) => set((state) => ({
                    options: { ...state.options, [key]: !state.options[key] }
                })),

                importGraph: (data) => {
                    const newNodes: NodeData[] = [];
                    for (const id in data) {
                        const d = data[id];
                        newNodes.push({
                            id: id,
                            displayName: d.displayName || id,
                            x: d.x || 0,
                            y: d.y || 0,
                            z: d.z || 0,
                            cost: d.cost || 1,
                            radius: d.radius || 0.5,
                            color: d.color || "FFFFFFFF",
                            requires: d.requires || [],
                            orRequires: d.orRequires || [],
                            conflicts: d.conflicts || [],
                            changes: d.changes || [],
                            activatedItem: d.activatedItem || { id: "minecraft:iron_block", count: 1 },
                            deactivatedItem: d.deactivatedItem || { id: "minecraft:redstone_block", count: 1 },
                            activatableItem: d.activatableItem || { id: "minecraft:netherrack", count: 1 }
                        });
                    }

                    // Preserve selection if nodes still exist
                    const currentSelection = get().selection;
                    const validSelection = currentSelection.filter(id => newNodes.some(n => n.id === id));

                    set({ nodes: newNodes, selection: validSelection });
                },

                focusTrigger: 0,
                triggerFocus: () => set((state) => ({ focusTrigger: state.focusTrigger + 1 })),

                startPicking: (sourceId, type) => set({
                    pickingMode: { isActive: true, sourceId, type }
                }),

                stopPicking: () => set({
                    pickingMode: { isActive: false, sourceId: null, type: null }
                }),

                setIsDragging: (isDragging) => set({ isDragging }),
                setHoveredStack: (hoveredStack) => set({ hoveredStack }),
            }),
            {
                // Persist Options
                name: 'skillgraph-storage',
                version: 8, // Bump version
                partialize: (state) => ({
                    nodes: state.nodes,
                    options: state.options
                }),
                onRehydrateStorage: () => (state) => {
                    console.log('Storage Rehydrated', state);
                }
            }
        ),
        {
            // Temporal Options: Track everything by default
        }
    )
);
