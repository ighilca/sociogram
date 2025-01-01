export interface TeamMember {
  id: string;
  label: string;
  role: string;
  department: string;
  x?: number;
  y?: number;
}

export interface CollaborationEdge {
  source: string;
  target: string;
  score: number;  // 0-4 scale
  direction: 'outgoing' | 'incoming';
  timestamp: string;
}

export interface GraphData {
  nodes: TeamMember[];
  edges: CollaborationEdge[];
}

export interface CollaborationScore {
  from: string;
  to: string;
  score: number;
  timestamp: string;
}

export const COLLABORATION_COLORS = {
  0: '#ef4444', // red - no collaboration
  1: '#f97316', // orange - minimal
  2: '#facc15', // yellow - moderate
  3: '#84cc16', // lime - good
  4: '#22c55e', // green - optimal
}; 