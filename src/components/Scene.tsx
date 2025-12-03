import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import { useGraphStore } from '../store/useGraphStore';
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

    // Delete Key Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete') {
                const state = useGraphStore.getState();
                state.selection.forEach(id => {
                    state.removeNode(id);
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={0.8} />

            <Grid infiniteGrid fadeDistance={50} sectionColor="#444" cellColor="#222" />

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
            {nodes.map(node => (
                <group key={`connections-${node.id}`}>
                    {node.requires.map(targetId => (
                        <Connection key={`${node.id}-req-${targetId}`} fromId={node.id} toId={targetId} type="requires" />
                    ))}
                    {node.orRequires.map(targetId => (
                        <Connection key={`${node.id}-or-${targetId}`} fromId={node.id} toId={targetId} type="orRequires" />
                    ))}
                    {node.conflicts.map(targetId => (
                        <Connection key={`${node.id}-con-${targetId}`} fromId={node.id} toId={targetId} type="conflicts" />
                    ))}
                </group>
            ))}

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
        >
            <SceneContent />
        </Canvas>
    );
};
