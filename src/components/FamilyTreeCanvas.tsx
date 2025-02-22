
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FamilyNode from './FamilyNode';
import RelationshipNode from './RelationshipNode';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { FamilyNode as FamilyNodeType, RelationshipNode as RelationshipNodeType, RelationType, FamilyMember } from '@/lib/types';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  family: FamilyNode,
  relationship: RelationshipNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const EditFamilyMemberDialog = ({ 
  member, 
  open, 
  onOpenChange,
  onSave 
}: { 
  member: FamilyMember | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<FamilyMember>) => void;
}) => {
  const [name, setName] = useState(member?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(member?.gender || 'other');
  const [birthDate, setBirthDate] = useState(member?.birth_date || '');

  const handleSave = () => {
    onSave({ name, gender, birth_date: birthDate });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Family Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={(value: 'male' | 'female' | 'other') => setGender(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="birthDate">Birth Date</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditRelationshipDialog = ({ 
  relationshipId, 
  currentTypeId,
  relationshipTypes,
  open, 
  onOpenChange,
  onSave 
}: { 
  relationshipId: string | null;
  currentTypeId: string | null;
  relationshipTypes: RelationType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (typeId: string) => void;
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState(currentTypeId || '');

  const handleSave = () => {
    onSave(selectedTypeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Relationship</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Relationship Type</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {relationshipTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FamilyTreeCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationType[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<{ id: string; typeId: string } | null>(null);
  const [editRelationshipOpen, setEditRelationshipOpen] = useState(false);

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

        // Convert members to nodes with type casting for gender
        const familyNodes = members.map((member): FamilyNodeType => ({
          id: member.id,
          type: 'family',
          position: { x: member.position_x, y: member.position_y },
          data: {
            ...member,
            gender: (member.gender || 'other') as 'male' | 'female' | 'other'
          },
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
            role: rel.role as 'parent' | 'child',
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
        (change): change is NodeChange & { id: string } => 
          change.type === 'position' && 
          change.dragging === false && 
          'id' in change
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
            role: role as 'parent' | 'child',
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
            gender: 'other' as const,
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
        data: {
          ...data,
          gender: data.gender as 'male' | 'female' | 'other',
        },
      };

      setNodes((nodes) => [...nodes, newNode]);
      toast.success('Family member added');
      
      // Open edit dialog for the new member
      setSelectedMember(newNode.data);
      setEditMemberOpen(true);
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
      
      // Open edit dialog for the new relationship
      setSelectedRelationship({ id: data.id, typeId: data.type_id });
      setEditRelationshipOpen(true);
    } catch (error) {
      console.error('Error adding relationship:', error);
      toast.error('Failed to add relationship');
    }
  }, [relationshipTypes, setNodes]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.type === 'family') {
      setSelectedMember(node.data);
      setEditMemberOpen(true);
    } else if (node.type === 'relationship') {
      setSelectedRelationship({
        id: node.id,
        typeId: node.data.relationship.type_id,
      });
      setEditRelationshipOpen(true);
    }
  };

  const handleUpdateMember = async (data: Partial<FamilyMember>) => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .update(data)
        .eq('id', selectedMember.id);

      if (error) throw error;

      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === selectedMember.id && node.type === 'family'
            ? {
                ...node,
                data: { ...node.data, ...data },
              }
            : node
        )
      );

      toast.success('Family member updated');
    } catch (error) {
      console.error('Error updating family member:', error);
      toast.error('Failed to update family member');
    }
  };

  const handleUpdateRelationship = async (typeId: string) => {
    if (!selectedRelationship) return;

    try {
      const { error } = await supabase
        .from('relationships')
        .update({ type_id: typeId })
        .eq('id', selectedRelationship.id);

      if (error) throw error;

      const relationType = relationshipTypes.find((type) => type.id === typeId);
      if (!relationType) throw new Error('Relationship type not found');

      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === selectedRelationship.id && node.type === 'relationship'
            ? {
                ...node,
                data: {
                  ...node.data,
                  relationship: {
                    ...node.data.relationship,
                    type_id: typeId,
                  },
                  relationType,
                },
              }
            : node
        )
      );

      toast.success('Relationship updated');
    } catch (error) {
      console.error('Error updating relationship:', error);
      toast.error('Failed to update relationship');
    }
  };

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
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        fitView
        className="bg-slate-50"
      >
        <Background color="#ccc" variant={BackgroundVariant.Lines} />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <EditFamilyMemberDialog
        member={selectedMember}
        open={editMemberOpen}
        onOpenChange={setEditMemberOpen}
        onSave={handleUpdateMember}
      />

      <EditRelationshipDialog
        relationshipId={selectedRelationship?.id || null}
        currentTypeId={selectedRelationship?.typeId || null}
        relationshipTypes={relationshipTypes}
        open={editRelationshipOpen}
        onOpenChange={setEditRelationshipOpen}
        onSave={handleUpdateRelationship}
      />
    </div>
  );
};

export default FamilyTreeCanvas;
