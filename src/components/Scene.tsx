import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import { useGraphStore, type NodeData } from '../store/useGraphStore';
import { useStore } from 'zustand';
import { nodeRefs } from '../store/nodeRefs';
import { Node } from './Node';
import { Connection } from './Connection';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const SceneContent: React.FC = () => {
    const { nodes, selection, updateNode } = useGraphStore();
    // Subscribe to temporal store to get history updates
    const temporalState = useStore(useGraphStore.temporal) as any;
    const past = temporalState?.past || [];
    const future = temporalState?.future || [];

    // console.log('Temporal State:', temporalState);

    const orbitRef = useRef<OrbitControlsImpl>(null);
    const [selectedObj, setSelectedObj] = useState<THREE.Object3D | undefined>(undefined);

    // Update selected object when selection changes
    useEffect(() => {
        // Use the last selected node as the "primary" node for controls
        const primaryId = selection[selection.length - 1];
        if (primaryId && nodeRefs[primaryId]) {
            setSelectedObj(nodeRefs[primaryId]);
        } else {
            setSelectedObj(undefined);
        }
    }, [selection, nodes]); // Depend on nodes to re-attach if nodes regenerate

    // Delete Key and Copy/Paste Handler
    useEffect(() => {
        // Local clipboard state (closure)
        let clipboard: NodeData[] = [];

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                return;
            }

            const state = useGraphStore.getState();

            // Delete
            if (e.key === 'Delete') {
                state.selection.forEach(id => {
                    state.removeNode(id);
                });
            }

            // Copy (Ctrl+C)
            if (e.ctrlKey && e.key === 'c') {
                const selectedNodes = state.nodes.filter(n => state.selection.includes(n.id));
                if (selectedNodes.length > 0) {
                    // Deep copy
                    clipboard = JSON.parse(JSON.stringify(selectedNodes));
                    console.log('Copied nodes:', clipboard.length);
                }
            }

            // Paste (Ctrl+V)
            if (e.ctrlKey && e.key === 'v') {
                if (clipboard.length > 0) {
                    // Create mapping from old ID to new ID
                    const idMap: Record<string, string> = {};
                    clipboard.forEach(node => {
                        idMap[node.id] = "node_" + Math.floor(Math.random() * 1000000);
                    });

                    // Create new nodes with mapped IDs and relationships
                    const newNodes = clipboard.map(node => {
                        const newId = idMap[node.id];
                        return {
                            ...node,
                            id: newId,
                            x: node.x + 1,
                            z: node.z + 1,
                            // Map relationships
                            requires: node.requires.map((reqId: string) => idMap[reqId] || reqId),
                            orRequires: node.orRequires.map((reqId: string) => idMap[reqId] || reqId),
                            conflicts: node.conflicts.map((reqId: string) => idMap[reqId] || reqId),
                        };
                    });

                    state.addNodes(newNodes);
                    console.log('Pasted nodes:', newNodes.length);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus Logic
    const focusTrigger = useGraphStore(state => state.focusTrigger);
    const prevTriggerRef = useRef(focusTrigger);

    const handleFocus = () => {
        const state = useGraphStore.getState();
        const lastSelected = state.selection[state.selection.length - 1];
        if (!lastSelected) return;

        const node = state.nodes.find(n => n.id === lastSelected);
        if (!node || !orbitRef.current) return;

        // Animate camera and target
        const targetPos = new THREE.Vector3(node.x, node.y, node.z);
        const cameraOffset = new THREE.Vector3(0, 5, 10); // Offset from node
        const newCameraPos = targetPos.clone().add(cameraOffset);

        // We can't easily tween without a library or custom frame loop here for now.
        // For MVP, we'll just set it.
        // Ideally we would use GSAP or similar, but let's try a simple lerp in useFrame if we want smooth,
        // or just direct set for now as per plan.

        // Direct set for responsiveness
        orbitRef.current.target.copy(targetPos);
        orbitRef.current.object.position.copy(newCameraPos);
        orbitRef.current.update();
    };

    // Trigger on store signal
    useEffect(() => {
        if (focusTrigger !== prevTriggerRef.current) {
            handleFocus();
            prevTriggerRef.current = focusTrigger;
        }
    }, [focusTrigger]);

    // Trigger on 'F' key
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'f') {
                // Check if we are not in an input
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

                handleFocus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={0.8} />

            <Grid infiniteGrid fadeDistance={50} sectionColor="#444" cellColor="#222" raycast={() => null} />

            <OrbitControls
                ref={orbitRef}
                makeDefault
                mouseButtons={{
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN
                }}
            />

            {/* Render Connections */}
            {/* Render Connections */}
            {nodes.map(node => {
                // Refined logic:
                // Iterate over connections and decide for each one.
                return (
                    <group key={`connections-${node.id}`}>
                        {node.requires.map(targetId => {
                            const isVisible = !useGraphStore.getState().options.showSelectedLinesOnly ||
                                selection.includes(node.id) ||
                                selection.includes(targetId);
                            if (!isVisible) return null;
                            return <Connection key={`${node.id}-req-${targetId}`} fromId={node.id} toId={targetId} type="requires" />;
                        })}
                        {node.orRequires.map(targetId => {
                            const isVisible = !useGraphStore.getState().options.showSelectedLinesOnly ||
                                selection.includes(node.id) ||
                                selection.includes(targetId);
                            if (!isVisible) return null;
                            return <Connection key={`${node.id}-or-${targetId}`} fromId={node.id} toId={targetId} type="orRequires" />;
                        })}
                        {node.conflicts.map(targetId => {
                            const isVisible = !useGraphStore.getState().options.showSelectedLinesOnly ||
                                selection.includes(node.id) ||
                                selection.includes(targetId);
                            if (!isVisible) return null;
                            return <Connection key={`${node.id}-con-${targetId}`} fromId={node.id} toId={targetId} type="conflicts" />;
                        })}
                    </group>
                );
            })}

            {/* Render Nodes */}
            {nodes.map((node) => (
                <Node key={node.id} {...node} />
            ))}

            {/* Transform Controls for Selection */}
            {selectedObj && selection.length > 0 && (
                <TransformControls
                    // Remount controls when history changes (Undo/Redo) to force position sync
                    key={`controls-${selection.join(',')}-${past.length}-${future.length}`}
                    object={selectedObj}
                    translationSnap={useGraphStore.getState().options.snap ? 1 : null}
                    onMouseDown={() => {
                        if (orbitRef.current) orbitRef.current.enabled = false;
                    }}
                    onChange={() => {
                        // Multi-selection drag logic
                        if (selection.length > 1 && selectedObj) {
                            // We need to track delta, but TransformControls doesn't give it directly easily in this context without tracking previous state.
                            // However, since we are in a controlled environment, we can just let the user drag the "primary" node (the last selected one usually or the one attached to controls)
                            // and then we update the others in onMouseUp.
                            // BUT, for visual feedback, we want them to move together.

                            // Actually, a simpler way for visual feedback is to rely on the fact that we will update ALL positions on drag end.
                            // For real-time visual feedback of multiple nodes moving, we would need to manually update the positions of other nodes based on the delta of the primary node.
                            // Let's implement a simple delta tracker.
                        }
                    }}
                    onMouseUp={() => {
                        if (orbitRef.current) orbitRef.current.enabled = true;

                        if (selectedObj) {
                            // Calculate the new position of the primary node
                            const newX = parseFloat(selectedObj.position.x.toFixed(2));
                            const newY = parseFloat(selectedObj.position.y.toFixed(2));
                            const newZ = parseFloat(selectedObj.position.z.toFixed(2));

                            // Find the original position of the primary node from the store to calculate delta
                            const primaryNode = nodes.find(n => n.id === selection[selection.length - 1]);
                            if (primaryNode) {
                                const dx = newX - primaryNode.x;
                                const dy = newY - primaryNode.y;
                                const dz = newZ - primaryNode.z;

                                // Update ALL selected nodes by this delta
                                selection.forEach(id => {
                                    const node = nodes.find(n => n.id === id);
                                    if (node) {
                                        updateNode(id, {
                                            x: parseFloat((node.x + dx).toFixed(2)),
                                            y: parseFloat((node.y + dy).toFixed(2)),
                                            z: parseFloat((node.z + dz).toFixed(2))
                                        });
                                    }
                                });
                            }
                        }
                    }}
                    mode="translate"
                />
            )}
        </>
    );
};

export const Scene: React.FC = () => {
    return (
        <Canvas
            camera={{ position: [10, 10, 10], fov: 75 }}
            className="w-full h-full bg-[#111]"
            onPointerMissed={() => {
                const state = useGraphStore.getState();
                // Only deselect if we are NOT in picking mode
                if (!state.pickingMode.isActive) {
                    state.selectNode(null);
                }
            }}
        >
            <SceneContent />
        </Canvas>
    );
};
