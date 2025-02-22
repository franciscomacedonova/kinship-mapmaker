
export interface Database {
  public: {
    Tables: {
      family_members: {
        Row: {
          id: string;
          name: string;
          birth_date: string | null;
          gender: 'male' | 'female' | 'other' | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
          position_x: number;
          position_y: number;
        };
        Insert: {
          id?: string;
          name: string;
          birth_date?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          image_url?: string | null;
          position_x?: number;
          position_y?: number;
        };
      };
      relationships: {
        Row: {
          id: string;
          type_id: string;
          position_x: number;
          position_y: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          type_id: string;
          position_x?: number;
          position_y?: number;
        };
      };
      relationship_types: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_at: string;
        };
      };
      family_relationship_members: {
        Row: {
          id: string;
          relationship_id: string;
          family_member_id: string;
          role: 'parent' | 'child';
          created_at: string;
        };
        Insert: {
          id?: string;
          relationship_id: string;
          family_member_id: string;
          role: 'parent' | 'child';
        };
      };
    };
  };
}

export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Relationship = Database['public']['Tables']['relationships']['Row'];
export type RelationType = Database['public']['Tables']['relationship_types']['Row'];
export type FamilyRelationshipMember = Database['public']['Tables']['family_relationship_members']['Row'];

export interface FamilyNode {
  id: string;
  type: 'family';
  position: { x: number; y: number };
  data: FamilyMember;
}

export interface RelationshipNode {
  id: string;
  type: 'relationship';
  position: { x: number; y: number };
  data: {
    relationship: Relationship;
    relationType: RelationType;
  };
}

export interface FamilyEdge {
  id: string;
  source: string;
  target: string;
  data: {
    role: 'parent' | 'child';
  };
}
