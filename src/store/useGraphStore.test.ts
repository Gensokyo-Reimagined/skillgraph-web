import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './useGraphStore';

describe('useGraphStore Undo/Redo', () => {
    beforeEach(() => {
        useGraphStore.setState({
            nodes: [],
            selection: [],
            options: { snap: false, glow: true, showNames: true, showSelectedLinesOnly: false, canvasMode: false, canvasAxis: 'XZ' }
        });
        useGraphStore.temporal.getState().clear();
    });

    it('should track history for updateNode', () => {
        const { addNode, updateNode } = useGraphStore.getState();

        // 1. Add Node
        addNode();
        const nodeId = useGraphStore.getState().nodes[0].id;
        expect(useGraphStore.getState().nodes[0].x).toBe(0);

        // 2. Move Node
        updateNode(nodeId, { x: 10, y: 10, z: 10 });
        expect(useGraphStore.getState().nodes[0].x).toBe(10);

        // 3. Undo
        useGraphStore.temporal.getState().undo();
        expect(useGraphStore.getState().nodes[0].x).toBe(0);

        // 4. Redo
        useGraphStore.temporal.getState().redo();
        expect(useGraphStore.getState().nodes[0].x).toBe(10);
    });

    it('should track history for multiple moves', () => {
        const { addNode, updateNode } = useGraphStore.getState();
        addNode();
        const nodeId = useGraphStore.getState().nodes[0].id;

        updateNode(nodeId, { x: 5 });
        updateNode(nodeId, { x: 10 });
        updateNode(nodeId, { x: 15 });

        expect(useGraphStore.getState().nodes[0].x).toBe(15);

        useGraphStore.temporal.getState().undo();
        expect(useGraphStore.getState().nodes[0].x).toBe(10);

        useGraphStore.temporal.getState().undo();
        expect(useGraphStore.getState().nodes[0].x).toBe(5);

        useGraphStore.temporal.getState().undo();
        expect(useGraphStore.getState().nodes[0].x).toBe(0);
    });

    it('should handle description field', () => {
        const { addNode, updateNode } = useGraphStore.getState();
        addNode();
        const nodeId = useGraphStore.getState().nodes[0].id;

        // Check default description
        expect(useGraphStore.getState().nodes[0].description).toBe("");

        // Update description
        updateNode(nodeId, { description: "Test Description" });
        expect(useGraphStore.getState().nodes[0].description).toBe("Test Description");

        // Verify it persists in export
        const state = useGraphStore.getState();
        expect(state.nodes[0].description).toBe("Test Description");
    });
});
