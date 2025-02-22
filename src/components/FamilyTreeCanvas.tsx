
import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from '@xyflow/react';
import { Button } from "@/components/ui/button";
import FamilyNode from './FamilyNode';
import { toast } from 'sonner';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  family: FamilyNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const FamilyTreeCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addFamilyMember = useCallback(() => {
    const id = `family-${nodes.length + 1}`;
    const newNode = {
      id,
      type: 'family',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        name: 'New Member',
        birthDate: '',
      },
    };
    setNodes((nodes) => [...nodes, newNode]);
    toast.success('Family member added');
  }, [nodes, setNodes]);

  return (
    <div className="w-full h-screen">
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={addFamilyMember} className="shadow-lg">
          Add Family Member
        </Button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        fitView
        className="bg-slate-50"
      >
        <Background color="#ccc" variant="cross" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default FamilyTreeCanvas;
