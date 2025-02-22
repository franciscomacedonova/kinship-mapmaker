
import React, { useCallback, useEffect } from 'react';
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
  BackgroundVariant,
} from '@xyflow/react';
import { Button } from "@/components/ui/button";
import FamilyNode from './FamilyNode';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { FamilyNode as FamilyNodeType, FamilyEdge, Relationship, Database } from '@/lib/types';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  family: FamilyNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const FamilyTreeCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch initial data
  useEffect(() => {
    const fetchFamilyData = async () => {
      try {
        // Fetch family members
        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select('*');

        if (membersError) throw membersError;

        // Fetch relationships
        const { data: relationships, error: relationsError } = await supabase
          .from('relationships')
          .select('*');

        if (relationsError) throw relationsError;

        if (!members || !relationships) {
          throw new Error('Failed to fetch data');
        }

        // Convert members to nodes
        const familyNodes = members.map((member) => ({
          id: member.id,
          type: 'family' as const,
          position: { x: Math.random() * 500, y: Math.random() * 500 },
          data: member,
        }));

        // Convert relationships to edges
        const familyEdges = relationships.map((rel: Relationship) => ({
          id: rel.id,
          source: rel.from_member_id,
          target: rel.to_member_id,
          data: {
            relationship_type: rel.relationship_type,
          },
        }));

        setNodes(familyNodes);
        setEdges(familyEdges);
      } catch (error) {
        console.error('Error fetching family data:', error);
        toast.error('Failed to load family tree');
      }
    };

    fetchFamilyData();
  }, []);

  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      if (!params.source || !params.target) return;

      try {
        // Save the relationship to Supabase
        const { data, error } = await supabase
          .from('relationships')
          .insert([
            {
              from_member_id: params.source,
              to_member_id: params.target,
              relationship_type: 'parent' as const,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from insert');

        // Update the edges in the UI
        const newEdge = {
          ...params,
          id: data.id,
          data: {
            relationship_type: data.relationship_type,
          },
        };
        
        setEdges((eds) => addEdge(newEdge, eds));
        toast.success('Relationship added');
      } catch (error) {
        console.error('Error creating relationship:', error);
        toast.error('Failed to create relationship');
      }
    },
    [setEdges]
  );

  const addFamilyMember = useCallback(async () => {
    try {
      // Create new family member in Supabase
      const { data, error } = await supabase
        .from('family_members')
        .insert([
          {
            name: 'New Member',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');

      // Add new node to the UI
      const newNode: FamilyNodeType = {
        id: data.id,
        type: 'family',
        position: { x: Math.random() * 500, y: Math.random() * 500 },
        data: data,
      };

      setNodes((nodes) => [...nodes, newNode]);
      toast.success('Family member added');
    } catch (error) {
      console.error('Error adding family member:', error);
      toast.error('Failed to add family member');
    }
  }, [setNodes]);

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
        <Background color="#ccc" variant={BackgroundVariant.Lines} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default FamilyTreeCanvas;
