import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Html } from '@react-three/drei';
import { useGraphStore, type NodeData } from '../store/useGraphStore';
import { nodeRefs } from '../store/nodeRefs';
import * as THREE from 'three';

export const Node: React.FC<NodeData> = (props) => {
    const { id, x, y, z, displayName, radius, color } = props;
    const {
        selectNode,
        selection,
        options,
        pickingMode,
        addRelationship,
        hoveredStack,
        isDragging
    } = useGraphStore();

    const groupRef = useRef<THREE.Group>(null);
    const isSelected = selection.includes(id);
    const [hovered, setHovered] = React.useState(false);

    // Calc target pos
    useFrame(() => {
        if (!groupRef.current) return;

        let targetX = x;
        let targetY = y;
        let targetZ = z;

        // Flower/Fan-out Logic
        if (options.canvasMode && hoveredStack && !isDragging) {
            // Are we in the hovered stack?
            if (Math.abs(hoveredStack.x - x) < 0.1 && Math.abs(hoveredStack.z - z) < 0.1) {
                // Yes. Calculate our offset.
                // We need to know our index in the stack.
                // This is expensive to do every frame if we query store.
                // Optimization: Store keeps 'nodes' sorted? Yes, usually.
                // Can we just rely on filtering once?
                // No, useFrame runs 60fps.

                // Ideally we should cache this calc, but for <100 nodes it's fast enough.
                const nodes = useGraphStore.getState().nodes;
                const stack = nodes
                    .filter(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1)
                // .sort((a,b) => a.id.localeCompare(b.id)); // Ensure determinism

                if (stack.length > 1) {
                    const index = stack.findIndex(n => n.id === id);
                    const angle = (index / stack.length) * Math.PI * 2;
                    const offsetR = radius * 3; // Flower radius

                    targetX = x + Math.cos(angle) * offsetR;
                    targetZ = z + Math.sin(angle) * offsetR;
                    // Keep Y same
                }
            }
        }

        // Lerp
        groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.2;
        groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.2;
        groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.2;
    });

    // Register ref and force position sync (initial only, let useFrame handle updates)
    useLayoutEffect(() => {
        if (groupRef.current) {
            nodeRefs[id] = groupRef.current;
            groupRef.current.userData.radius = radius;
            // Set initial pos to avoid jump
            groupRef.current.position.set(x, y, z);
        }
        return () => {
            if (nodeRefs[id] === groupRef.current) {
                delete nodeRefs[id];
            }
        };
    }, [id, radius]); // Removed x,y,z dep to prevent fighting with useFrame, but if x/y/z changes externally (undo/redo), we need to update? 
    // Actually, if x/y/z changes, 'targetX' in useFrame updates, so it lerps there. Good.


    // Parse Color (AARRGGBB to Hex + Opacity)
    const { colorHex, opacity } = useMemo(() => {
        let hexStr = color.replace('0x', '').replace('#', '');
        let opacity = 1.0;
        let colorHex = 0xffffff;

        if (hexStr.length === 8) {
            const alpha = parseInt(hexStr.substring(0, 2), 16);
            opacity = alpha / 255;
            colorHex = parseInt(hexStr.substring(2), 16);
        } else {
            colorHex = parseInt(hexStr, 16);
        }
        return { colorHex, opacity };
    }, [color]);

    return (
        <group
            ref={groupRef}
            name={id}
            position={[x, y, z]}
            onClick={(e) => {
                e.stopPropagation();
                if (pickingMode.isActive && pickingMode.sourceId && pickingMode.type) {
                    if (pickingMode.sourceId !== id) {
                        addRelationship(pickingMode.sourceId, id, pickingMode.type);
                    }
                } else {
                    // Cycle Selection Logic for Canvas Mode (or general overlap)
                    // Get all intersections sorted by distance
                    const hits = e.intersections
                        .map(i => i.object.parent?.name)
                        .filter(name => name && name.startsWith('node_'));

                    // Remove duplicates (same node hit multiple times)
                    const uniqueHits = Array.from(new Set(hits));

                    if (uniqueHits.length > 1) {
                        // We have a stack
                        const currentIndex = uniqueHits.indexOf(id);
                        // However, 'id' is THIS node. 'uniqueHits' logic ensures we know which ones are there.
                        // We want to select the NEXT one in the stack if the current one is already selected.

                        // Check if any of these are currently selected
                        const selectedInStack = uniqueHits.find(hitId => selection.includes(hitId || ""));

                        if (selectedInStack) {
                            // If something in this stack is selected, pick the next one
                            const selIndex = uniqueHits.indexOf(selectedInStack);
                            const nextIndex = (selIndex + 1) % uniqueHits.length;
                            selectNode(uniqueHits[nextIndex] || id, e.shiftKey);
                        } else {
                            // If none selected, pick the first one (which is usually this one)
                            selectNode(uniqueHits[0] || id, e.shiftKey);
                        }
                    } else {
                        // Standard selection
                        selectNode(id, e.shiftKey);
                    }
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                // Check if we are part of a stack (>1 node at approx loc)
                const state = useGraphStore.getState();
                const stack = state.nodes.filter(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1);
                if (stack.length > 1) {
                    state.setHoveredStack({ x, z });
                }
            }}
            onPointerOut={() => {
                setHovered(false);
                // We don't clear hoveredStack immediately here because we might be moving to a fanned out node.
                // However, if we leave the stack area entirely, we should clear it.
                // To simplify: if we leave 'this' node, we shouldn't necessarily clear it if we entered another sibling.
                // For now, let's try clearing it and see if the re-entry is fast enough, or use a debounce/global check.
                // A better way: Scene handles clearing if nothing is hovered, but that's expensive.

                // Let's clear it, but maybe the next onPointerOver will catch it?
                // Visual flickering might occur.
                // Actually, if we fan out, the nodes move.

                // Keep it simple: don't clear on out, clear if we pick nothing?
                // Or clear if we hover something else that ISN'T in the stack?
                // Let's rely on a timeout that is cancelled by the next hover?

                // MVP: Clear it. If it flickers, we fix it.
                // Actually, if we fan out, the gap between nodes is click-through.
                // If we go to the gap, they collapse. That's annoying.

                // Better: Check if we are still hovering 'any' node in the stack?
                // We can't easily know.

                // Let's try NOT clearing it here. Let's clear it if we hover a DIFFERENT stack or background?
                // Scene.tsx onPointerMissed clears selection, maybe onPointerMove on background clears stack?
                // That might be too heavy.

                // Let's try clearing on timeout.
                setTimeout(() => {
                    const state = useGraphStore.getState();
                    // If we are still hovering THIS node or another in stack, don't clear.
                    // But we don't know that.

                    // Let's just set it to null and see.
                    // state.setHoveredStack(null);
                }, 100);
            }}
        >
            <mesh>
                <sphereGeometry args={[radius, 32, 32]} />
                <meshPhysicalMaterial
                    color={colorHex}
                    transparent={true}
                    opacity={opacity}
                    metalness={0.1}
                    roughness={0.5}
                    clearcoat={0.5}
                />
                {options.glow && (isSelected) && (
                    <meshBasicMaterial color={colorHex} transparent opacity={0.2} side={THREE.BackSide} />
                )}
            </mesh>

            {/* Selection Ring */}
            {isSelected && (
                <mesh>
                    <ringGeometry args={[radius * 1.1, radius * 1.2, 32]} />
                    <meshBasicMaterial color="#6366f1" side={THREE.DoubleSide} />
                </mesh>
            )}

            {options.showNames && (
                <Billboard
                    position={[0, radius + 0.5, 0]}
                    follow={true}
                    lockX={false}
                    lockY={false}
                    lockZ={false}
                >
                    <Text
                        fontSize={0.5}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.05}
                        outlineColor="#000000"
                    >
                        {displayName}
                    </Text>
                    {isSelected && props.changes && props.changes.length > 0 && (
                        <Text
                            position={[0, -0.6, 0]}
                            fontSize={0.3}
                            color="#fbbf24" // Amber-400
                            anchorX="center"
                            anchorY="top"
                            outlineWidth={0.02}
                            outlineColor="#000000"
                        >
                            {props.changes.map(c => {
                                if (c.type === 'STAT_CHANGE') {
                                    return `${c.statType}: ${c.statModifierType === 'ADDITIVE' ? '+' : ''}${c.value}`;
                                } else {
                                    return `${c.id} (Lvl ${c.level})`;
                                }
                            }).join('\n')}
                        </Text>
                    )}
                </Billboard>
            )}
            {/* Canvas Mode Coordinate Tooltip */}
            {options.canvasMode && hovered && (
                <Html position={[0, radius + 1.2, 0]} center pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    <div className="bg-black/90 text-white text-[10px] px-2 py-1 rounded border border-gray-600 whitespace-nowrap flex flex-col items-start gap-0.5 shadow-xl backdrop-blur-sm z-[100]">
                        <div className="font-mono text-indigo-300">ID: {id}</div>

                        {/* Check for overlaps to show hint */}
                        {(() => {
                            // Simple client-side check for overlaps in this store snapshot
                            // Note: full raycast overlap is precise, but x/z proximity is good enough for hint
                            const state = useGraphStore.getState();
                            const stackCount = state.nodes.filter(n =>
                                Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1
                            ).length;

                            return stackCount > 1 ? (
                                <div className="text-yellow-400 font-bold border-b border-gray-700 w-full mb-0.5 pb-0.5">
                                    Stack: {stackCount} Nodes (Click to cycle)
                                </div>
                            ) : null;
                        })()}

                        <div className="grid grid-cols-[10px_1fr] gap-x-1">
                            <span className="text-red-400 font-bold">X</span> <span>{x.toFixed(2)}</span>
                            <span className="text-green-400 font-bold">Y</span> <span>{y.toFixed(2)}</span>
                            <span className="text-blue-400 font-bold">Z</span> <span>{z.toFixed(2)}</span>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};
