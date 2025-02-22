
import React, { useCallback, useEffect, useState } from 'react';
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
  Node,
  NodeChange,
} from '@xyflow/react';
import { Button } from "@/components/ui/button";
import FamilyNode from './FamilyNode';
import RelationshipNode from './RelationshipNode';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { FamilyNode as FamilyNodeType, RelationshipNode as RelationshipNodeType, RelationType } from '@/lib/types';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  family: FamilyNode,
  relationship: RelationshipNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const FamilyTreeCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationType[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch relationship types
        const { data: types, error: typesError } = await supabase
          .from('relationship_types')
          .select('*');
        
        if (typesError) throw typesError;
        if (!types) throw new Error('No relationship types found');
        
        setRelationshipTypes(types);

        // Fetch family members
        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select('*');

        if (membersError) throw membersError;
        if (!members) throw new Error('Failed to fetch members');

        // Fetch relationships with their types
        const { data: relationships, error: relationsError } = await supabase
          .from('relationships')
          .select(`
            *,
            relationship_types (*)
          `);

        if (relationsError) throw relationsError;
        if (!relationships) throw new Error('Failed to fetch relationships');

        // Fetch family relationship members
        const { data: familyRelMembers, error: membersRelError } = await supabase
          .from('family_relationship_members')
          .select('*');

        if (membersRelError) throw membersRelError;
        if (!familyRelMembers) throw new Error('Failed to fetch relationship members');

        // Convert members to nodes
        const familyNodes = members.map((member): FamilyNodeType => ({
          id: member.id,
          type: 'family',
          position: { x: member.position_x, y: member.position_y },
          data: member,
        }));

        // Convert relationships to nodes
        const relationshipNodes = relationships.map((rel): RelationshipNodeType => ({
          id: rel.id,
          type: 'relationship',
          position: { x: rel.position_x, y: rel.position_y },
          data: {
            relationship: rel,
            relationType: rel.relationship_types,
          },
        }));

        // Create edges from family relationship members
        const familyEdges = familyRelMembers.map((rel) => ({
          id: rel.id,
          source: rel.family_member_id,
          target: rel.relationship_id,
          data: {
            role: rel.role,
          },
        }));

        setNodes([...familyNodes, ...relationshipNodes]);
        setEdges(familyEdges);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load family tree');
      }
    };

    fetchData();
  }, []);

  // Handle node position updates
  const handleNodesChange = useCallback(
    async (changes: NodeChange[]) => {
      onNodesChange(changes);

      const positionChanges = changes.filter(
        (change) => change.type === 'position' && change.dragging === false
      );

      for (const change of positionChanges) {
        const node = nodes.find((n) => n.id === change.id);
        if (!node) continue;

        const table = node.type === 'family' ? 'family_members' : 'relationships';
        const { error } = await supabase
          .from(table)
          .update({
            position_x: node.position.x,
            position_y: node.position.y,
          })
          .eq('id', node.id);

        if (error) {
          console.error(`Error updating ${node.type} position:`, error);
          toast.error(`Failed to save ${node.type} position`);
        }
      }
    },
    [nodes, onNodesChange]
  );

  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      if (!params.source || !params.target) return;

      try {
        const sourceNode = nodes.find((n) => n.id === params.source);
        const targetNode = nodes.find((n) => n.id === params.target);

        if (!sourceNode || !targetNode) {
          throw new Error('Invalid connection');
        }

        // Only allow connections between family members and relationship nodes
        if (sourceNode.type === targetNode.type) {
          toast.error('Cannot connect two nodes of the same type');
          return;
        }

        // Determine the role based on the connection direction
        const role = sourceNode.type === 'family' ? 'parent' : 'child';
        const relationshipId = sourceNode.type === 'relationship' ? sourceNode.id : targetNode.id;
        const familyMemberId = sourceNode.type === 'family' ? sourceNode.id : targetNode.id;

        const { data, error } = await supabase
          .from('family_relationship_members')
          .insert([
            {
              relationship_id: relationshipId,
              family_member_id: familyMemberId,
              role,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from insert');

        const newEdge = {
          id: data.id,
          source: params.source,
          target: params.target,
          data: {
            role,
          },
        };

        setEdges((eds) => addEdge(newEdge, eds));
        toast.success('Connection added');
      } catch (error) {
        console.error('Error creating connection:', error);
        toast.error('Failed to create connection');
      }
    },
    [nodes, setEdges]
  );

  const addFamilyMember = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert([
          {
            name: 'New Member',
            position_x: Math.random() * 500,
            position_y: Math.random() * 500,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');

      const newNode: FamilyNodeType = {
        id: data.id,
        type: 'family',
        position: { x: data.position_x, y: data.position_y },
        data: data,
      };

      setNodes((nodes) => [...nodes, newNode]);
      toast.success('Family member added');
    } catch (error) {
      console.error('Error adding family member:', error);
      toast.error('Failed to add family member');
    }
  }, [setNodes]);

  const addRelationship = useCallback(async () => {
    try {
      if (!relationshipTypes.length) {
        throw new Error('No relationship types available');
      }

      const { data, error } = await supabase
        .from('relationships')
        .insert([
          {
            type_id: relationshipTypes[0].id,
            position_x: Math.random() * 500,
            position_y: Math.random() * 500,
          },
        ])
        .select(`
          *,
          relationship_types (*)
        `)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');

      const newNode: RelationshipNodeType = {
        id: data.id,
        type: 'relationship',
        position: { x: data.position_x, y: data.position_y },
        data: {
          relationship: data,
          relationType: data.relationship_types,
        },
      };

      setNodes((nodes) => [...nodes, newNode]);
      toast.success('Relationship added');
    } catch (error) {
      console.error('Error adding relationship:', error);
      toast.error('Failed to add relationship');
    }
  }, [relationshipTypes, setNodes]);

  return (
    <div className="w-full h-screen">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button onClick={addFamilyMember} className="shadow-lg">
          Add Family Member
        </Button>
        <Button onClick={addRelationship} className="shadow-lg">
          Add Relationship
        </Button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
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
