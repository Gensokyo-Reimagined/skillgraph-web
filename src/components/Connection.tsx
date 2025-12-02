import React, { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { nodeRefs } from '../store/nodeRefs';
import * as THREE from 'three';

interface ConnectionProps {
    fromId: string;
    toId: string;
    type: 'requires' | 'orRequires' | 'conflicts';
}

const COLORS = {
    requires: 0x00ff00,
    orRequires: 0xffaa00,
    conflicts: 0xff0000
};

import { useGraphStore } from '../store/useGraphStore';

export const Connection: React.FC<ConnectionProps> = ({ fromId, toId, type }) => {
    const { selection, options } = useGraphStore();
    const arrowRef = useRef<THREE.ArrowHelper>(null);

    // Initial setup
    useLayoutEffect(() => {
        if (arrowRef.current) {
            arrowRef.current.setColor(new THREE.Color(COLORS[type]));
        }
    }, [type]);

    useFrame(() => {
        if (!arrowRef.current) return;

        const fromNode = nodeRefs[fromId];
        const toNode = nodeRefs[toId];

        if (!fromNode || !toNode) {
            arrowRef.current.visible = false;
            return;
        }

        const startPos = fromNode.position;
        const endPos = toNode.position;
        const fromRadius = fromNode.userData.radius || 0.5;
        const toRadius = toNode.userData.radius || 0.5;

        const dir = new THREE.Vector3().subVectors(endPos, startPos);
        const dist = dir.length();

        // Hide if too close
        if (dist < fromRadius + toRadius + 0.2) {
            arrowRef.current.visible = false;
            return;
        }

        dir.normalize();

        // Calculate surface points
        const startSurface = startPos.clone().add(dir.clone().multiplyScalar(fromRadius));
        const arrowLength = dist - fromRadius - toRadius;

        arrowRef.current.position.copy(startSurface);
        arrowRef.current.setDirection(dir);
        arrowRef.current.setLength(arrowLength, 0.4, 0.2);
        arrowRef.current.visible = true;

        // Glow Effect
        if (options.glow && (selection.includes(fromId) || selection.includes(toId))) {
            // Simple highlight by changing color or scaling slightly (ArrowHelper doesn't support emissive easily without accessing children)
            // For now, let's just make it brighter or a specific color if selected
            // Accessing the line and cone meshes inside ArrowHelper
            if (arrowRef.current.line) (arrowRef.current.line.material as THREE.LineBasicMaterial).color.setHex(0xffff00);
            if (arrowRef.current.cone) (arrowRef.current.cone.material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
        } else {
            if (arrowRef.current.line) (arrowRef.current.line.material as THREE.LineBasicMaterial).color.setHex(COLORS[type]);
            if (arrowRef.current.cone) (arrowRef.current.cone.material as THREE.MeshBasicMaterial).color.setHex(COLORS[type]);
        }
    });

    return (
        <primitive object={new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), // Dummy dir
            new THREE.Vector3(0, 0, 0), // Dummy origin
            1, // Dummy length
            COLORS[type]
        )} ref={arrowRef} />
    );
};
