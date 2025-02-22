
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
        };
        Insert: {
          id?: string;
          name: string;
          birth_date?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          image_url?: string | null;
        };
      };
      relationships: {
        Row: {
          id: string;
          from_member_id: string;
          to_member_id: string;
          relationship_type: 'parent' | 'spouse' | 'sibling';
          created_at: string;
        };
        Insert: {
          id?: string;
          from_member_id: string;
          to_member_id: string;
          relationship_type: 'parent' | 'spouse' | 'sibling';
        };
      };
    };
  };
}

export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Relationship = Database['public']['Tables']['relationships']['Row'];

export interface FamilyNode {
  id: string;
  type: 'family';
  position: { x: number; y: number };
  data: FamilyMember;
}

export interface FamilyEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    relationship_type: 'parent' | 'spouse' | 'sibling';
  };
}
