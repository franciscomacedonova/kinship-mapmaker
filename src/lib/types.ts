
export interface FamilyMember {
  id: string;
  name: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  image_url?: string;
}

export interface Relationship {
  id: string;
  from_member_id: string;
  to_member_id: string;
  relationship_type: 'parent' | 'spouse' | 'sibling';
}

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
