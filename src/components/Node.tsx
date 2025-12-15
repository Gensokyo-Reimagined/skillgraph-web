import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Html } from '@react-three/drei';
import { useGraphStore, type NodeData } from '../store/useGraphStore';
import { nodeRefs } from '../store/nodeRefs';
import * as THREE from 'three';

// Module-level timer for debouncing stack clear
let clearStackTimer: ReturnType<typeof setTimeout> | null = null;

export const Node: React.FC<NodeData> = (props) => {
    const { id, x, y, z, displayName, radius, color, changes } = props;
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
            const axis = options.canvasAxis || 'XZ';

            // Are we in the hovered stack?
            // Check based on axis
            let isStack = false;
            if (axis === 'XZ') {
                isStack = Math.abs(hoveredStack.x - x) < 0.1 && Math.abs(hoveredStack.z - z) < 0.1;
            } else {
                isStack = Math.abs(hoveredStack.x - x) < 0.1 && Math.abs(hoveredStack.z - y) < 0.1;
                // Note: hoveredStack stores (x, z) but we treat second coord as "vertical" axis in 2D.
                // In XZ mode, vertical is Z. In XY mode, vertical is Y.
                // Wait, hoveredStack is {x, z} typed.
                // Let's reuse 'z' property of hoveredStack to mean "the second dimension".
            }

            if (isStack) {
                // Yes. Calculate our offset.
                const nodes = useGraphStore.getState().nodes;
                let stack = [];
                if (axis === 'XZ') {
                    stack = nodes.filter(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1);
                } else {
                    stack = nodes.filter(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.y - y) < 0.1);
                }

                if (stack.length > 1) {
                    const index = stack.findIndex(n => n.id === id);
                    const angle = (index / stack.length) * Math.PI * 2;
                    const offsetR = radius * 3; // Flower radius

                    if (axis === 'XZ') {
                        targetX = x + Math.cos(angle) * offsetR;
                        targetZ = z + Math.sin(angle) * offsetR;
                    } else {
                        targetX = x + Math.cos(angle) * offsetR;
                        targetY = y + Math.sin(angle) * offsetR;
                    }
                }
            }
        }

        // Lerp
        // If we are being dragged, don't lerp! Let TransformControls handle it.
        // We only lerp if we are NOT selected OR if we are selected but NOT dragging.
        if (!isSelected || !isDragging) {
            groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.2;
            groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.2;
            groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.2;
        }
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
    }, [id, radius]);

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

    const hasChanges = changes && changes.length > 0;

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
                    const hits = e.intersections
                        .map(i => i.object.parent?.name)
                        .filter(name => name && name.startsWith('node_'));

                    const uniqueHits = Array.from(new Set(hits));
                    if (uniqueHits.length > 1) {
                        const selectedInStack = uniqueHits.find(hitId => selection.includes(hitId || ""));
                        if (selectedInStack) {
                            const selIndex = uniqueHits.indexOf(selectedInStack);
                            const nextIndex = (selIndex + 1) % uniqueHits.length;
                            selectNode(uniqueHits[nextIndex] || id, e.shiftKey);
                        } else {
                            selectNode(uniqueHits[0] || id, e.shiftKey);
                        }
                    } else {
                        selectNode(id, e.shiftKey);
                    }
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);

                // Cancel pending clear if we entered a node (debouncing)
                if (clearStackTimer) {
                    clearTimeout(clearStackTimer);
                    clearStackTimer = null;
                }

                // Check if we are part of a stack (>1 node at approx loc)
                // Check if we are part of a stack (>1 node at approx loc)
                const state = useGraphStore.getState();
                const axis = state.options.canvasAxis || 'XZ';

                let stack = [];
                if (axis === 'XZ') {
                    stack = state.nodes.filter(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1);
                } else {
                    stack = state.nodes.filter(n => Math.abs(n.x - x) < 0.1 && Math.abs(n.y - y) < 0.1);
                }

                if (stack.length > 1) {
                    if (axis === 'XZ') {
                        state.setHoveredStack({ x, z });
                    } else {
                        // We reuse 'z' property to store the 2nd dimension (Y)
                        state.setHoveredStack({ x, z: y });
                    }
                }
            }}
            onPointerOut={() => {
                setHovered(false);

                // Clear the hovered stack after a longer delay (300ms)
                if (clearStackTimer) clearTimeout(clearStackTimer);

                clearStackTimer = setTimeout(() => {
                    useGraphStore.getState().setHoveredStack(null);
                    clearStackTimer = null;
                }, 300);
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
                        outlineColor="black"
                    >
                        {displayName}
                    </Text>
                </Billboard>
            )}

            {/* Change Indicator */}
            {hasChanges && (
                <Billboard position={[radius, radius, 0]}>
                    <Text fontSize={0.8} color="#fbbf24">!</Text>
                </Billboard>
            )}

            {/* Tooltip for Canvas Mode */}
            {options.canvasMode && hovered && (
                <Html position={[0, radius + 1.2, 0]} center pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    <div className="bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap backdrop-blur-sm border border-white/20">
                        <div className="font-bold text-gray-300 mb-1">ID: {id}</div>

                        {(() => {
                            const state = useGraphStore.getState();
                            const stackCount = state.nodes.filter(n =>
                                Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1
                            ).length;

                            return stackCount > 1 ? (
                                <div className="text-yellow-400 mb-1 flex items-center gap-1">
                                    <span>Stack: {stackCount} Nodes</span>
                                </div>
                            ) : null;
                        })()}

                        <div className="grid grid-cols-2 gap-x-2 font-mono opacity-80">
                            <span>X</span> <span>{x.toFixed(2)}</span>
                            <span>Y</span> <span>{y.toFixed(2)}</span>
                            <span>Z</span> <span>{z.toFixed(2)}</span>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};
