import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { useGraphStore, type NodeData } from '../store/useGraphStore';
import { nodeRefs } from '../store/nodeRefs';
import * as THREE from 'three';

export const Node: React.FC<NodeData> = (props) => {
    const { id, x, y, z, displayName, radius, color } = props;
    const {
        selectNode,
        selection,
        options
    } = useGraphStore();

    const groupRef = useRef<THREE.Group>(null);
    const isSelected = selection.includes(id);

    // Register ref and force position sync
    useLayoutEffect(() => {
        if (groupRef.current) {
            nodeRefs[id] = groupRef.current;
            groupRef.current.userData.radius = radius;
            // Force position sync to handle Undo/Redo correctly
            groupRef.current.position.set(x, y, z);
        }
        return () => {
            if (nodeRefs[id] === groupRef.current) {
                delete nodeRefs[id];
            }
        };
    }, [id, radius, x, y, z]);

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
                selectNode(id, e.shiftKey);
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
        </group>
    );
};
